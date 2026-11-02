"use client";

import { useEffect, useRef, useState } from "react";

import { DEFAULT_GIF_OPTIONS, LIMITS, type GifOptions, type Mode } from "@/lib/presets";
import { ExploreSection, IDEAS, MyGifsSection, type GifItem, type Idea } from "./GallerySections";
import { ImageDropzone } from "./ImageDropzone";
import { PreviewModal } from "./PreviewModal";
import { SettingsPanel } from "./SettingsPanel";
import { StylePicker } from "./StylePicker";

type Phase = "idle" | "generating" | "encoding" | "done" | "error";

/** What the last GIF was made from, so it can be re-encoded with new settings for free. */
type Source = { videoUrl: string } | { image: string } | { demo: true };

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000;
const MAX_HISTORY = 12;

async function errorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.error ?? `Request failed (${res.status}).`;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "ai-gif";
}

const MODES: { id: Mode; label: string }[] = [
  { id: "text", label: "Text to GIF" },
  { id: "image", label: "Image to GIF" },
];

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.75" />
      <path d="M14.25 8A6.25 6.25 0 0 0 8 1.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function Progress({ phase, status, elapsed, onCancel }: { phase: Phase; status: string; elapsed: number; onCancel: () => void }) {
  const steps = [
    { id: "generating", label: "Animating" },
    { id: "encoding", label: "Building GIF" },
  ];
  const current = steps.findIndex((s) => s.id === phase);
  return (
    <div className="animate-fade-up rounded-xl border border-line bg-subtle p-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <ol className="flex items-center gap-2 text-xs font-medium">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-4 bg-line-strong" aria-hidden />}
              <span className={`flex items-center gap-1.5 ${i <= current ? "text-ink" : "text-muted"}`}>
                <span
                  className={`flex size-4 items-center justify-center rounded-full text-[10px] ${
                    i < current ? "bg-brand text-white" : i === current ? "bg-brand-soft text-brand ring-1 ring-brand/30" : "bg-line text-muted"
                  }`}
                >
                  {i < current ? "✓" : i + 1}
                </span>
                {s.label}
              </span>
            </li>
          ))}
        </ol>
        <span className="text-xs text-muted tabular-nums">{elapsed}s</span>
      </div>
      <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-line">
        <div className="absolute inset-y-0 w-2/5 animate-shimmer rounded-full bg-brand" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{status}</p>
        <button type="button" onClick={onCancel} className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-muted transition-colors hover:bg-canvas hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function GifStudio() {
  const [mode, setMode] = useState<Mode>("text");
  const [textPrompt, setTextPrompt] = useState("");
  const [motionPrompt, setMotionPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [options, setOptions] = useState<GifOptions>(DEFAULT_GIF_OPTIONS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(0);
  const gifsRef = useRef<GifItem[]>([]);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const prompt = mode === "text" ? textPrompt : motionPrompt;
  const setPrompt = mode === "text" ? setTextPrompt : setMotionPrompt;
  const busy = phase === "generating" || phase === "encoding";
  const canSubmit = !busy && (mode === "text" ? textPrompt.trim().length >= 3 : Boolean(image));
  const preview = gifs.find((g) => g.id === previewId) ?? null;

  // Free every blob URL when the studio unmounts.
  useEffect(() => () => gifsRef.current.forEach((g) => URL.revokeObjectURL(g.url)), []);

  // Tick the elapsed-time counter while a job runs.
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const set = <K extends keyof GifOptions>(key: K, value: GifOptions[K]) =>
    setOptions((o) => ({ ...o, [key]: value }));

  function addGif(item: GifItem) {
    const next = [item, ...gifsRef.current];
    next.slice(MAX_HISTORY).forEach((g) => URL.revokeObjectURL(g.url));
    gifsRef.current = next.slice(0, MAX_HISTORY);
    setGifs(gifsRef.current);
  }

  async function encode(src: Source, signal: AbortSignal) {
    setPhase("encoding");
    setStatus("Stitching frames into a looping GIF…");
    const res = await fetch("/api/gif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...options, ...("demo" in src ? {} : src) }),
      signal,
    });
    if (!res.ok) throw new Error(await errorMessage(res));
    const blob = await res.blob();
    const id = crypto.randomUUID();
    addGif({
      id,
      url: URL.createObjectURL(blob),
      size: blob.size,
      fileName: `${slugify(prompt || "animated-photo")}.gif`,
      prompt: prompt.trim(),
    });
    setPhase("done");
    setStatus("");
    setPreviewId(id);
  }

  async function run(task: (signal: AbortSignal) => Promise<void>) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    startedRef.current = Date.now();
    setElapsed(0);
    setError(null);
    try {
      await task(controller.signal);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setPhase("idle");
        setStatus("");
        return;
      }
      setError((err as Error).message);
      setPhase("error");
    }
  }

  const generate = () =>
    run(async (signal) => {
      setPhase("generating");
      setStatus("Sending your idea to the AI model…");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, prompt, style: options.style, image: mode === "image" ? image : undefined }),
        signal,
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      let job = await res.json();
      setDemo(Boolean(job.demo));

      if (job.demo) {
        const src: Source = mode === "image" && image ? { image } : { demo: true };
        setSource(src);
        return encode(src, signal);
      }

      const started = Date.now();
      while (job.status !== "succeeded") {
        if (job.status === "failed" || job.status === "canceled") {
          throw new Error(job.error ?? "Generation failed.");
        }
        if (Date.now() - started > POLL_TIMEOUT_MS) throw new Error("Generation timed out.");
        setStatus(job.status === "starting" ? "Warming up the AI model…" : "AI is animating your idea…");
        await sleep(POLL_MS, signal);
        const poll = await fetch(`/api/generate/${job.id}`, { signal, cache: "no-store" });
        if (!poll.ok) throw new Error(await errorMessage(poll));
        job = await poll.json();
      }
      if (!job.output) throw new Error("The model returned no video.");
      const src: Source = { videoUrl: job.output };
      setSource(src);
      await encode(src, signal);
    });

  const reencode = () => source && run((signal) => encode(source, signal));

  function applyIdea(idea: Idea) {
    setMode("text");
    setTextPrompt(idea.prompt);
    set("style", idea.style);
    document.getElementById("create")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => promptRef.current?.focus({ preventScroll: true }), 400);
  }

  const modeIndex = MODES.findIndex((m) => m.id === mode);

  return (
    <>
      <section id="create" aria-label="GIF generator" className="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-6">
        <div className="grid animate-fade-up items-start gap-4 [animation-delay:180ms] lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
          {/* ── Workspace ─────────────────────────────── */}
          <div className="rounded-2xl border border-line bg-canvas p-4 shadow-card sm:p-6">
            {/* Segmented control */}
            <div role="tablist" aria-label="Generation mode" className="relative grid grid-cols-2 rounded-xl bg-subtle p-1 ring-1 ring-line ring-inset sm:inline-grid sm:w-80">
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-canvas shadow-card ring-1 ring-line transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
                style={{ transform: `translateX(${modeIndex * 100}%)` }}
              />
              {MODES.map((m) => (
                <button
                  key={m.id}
                  role="tab"
                  id={`tab-${m.id}`}
                  aria-selected={mode === m.id}
                  aria-controls="mode-panel"
                  onClick={() => setMode(m.id)}
                  disabled={busy}
                  className={`relative z-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-brand ${
                    mode === m.id ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div id="mode-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} className="mt-6 space-y-6">
              {mode === "image" && (
                <div key="image" className="animate-fade-up">
                  <ImageDropzone value={image} onChange={setImage} disabled={busy} />
                </div>
              )}

              <div key={mode} className="animate-fade-up">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="prompt" className="text-sm font-medium text-ink">
                    {mode === "text" ? "Describe your GIF" : "Describe the motion"}
                    {mode === "image" && <span className="ml-1.5 font-normal text-muted">Optional</span>}
                  </label>
                  <span className="text-xs text-muted tabular-nums">
                    {prompt.length}/{LIMITS.promptMaxLength}
                  </span>
                </div>
                <textarea
                  ref={promptRef}
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) void generate();
                  }}
                  maxLength={LIMITS.promptMaxLength}
                  rows={mode === "text" ? 4 : 2}
                  disabled={busy}
                  placeholder={mode === "text" ? "A pixel art cat dancing in space…" : "Hair blowing gently in the wind…"}
                  className="mt-2 w-full resize-none rounded-xl border border-line bg-canvas px-4 py-3 text-base leading-relaxed text-ink shadow-card transition-[border-color,box-shadow] duration-150 placeholder:text-[#a3a3a3] hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none disabled:bg-subtle disabled:text-muted"
                />
                {mode === "text" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted">Try:</span>
                    {IDEAS.slice(0, 3).map((idea) => (
                      <button
                        key={idea.prompt}
                        type="button"
                        onClick={() => {
                          setTextPrompt(idea.prompt);
                          promptRef.current?.focus();
                        }}
                        disabled={busy}
                        className="rounded-full border border-line bg-canvas px-3 py-1 text-xs text-muted transition-colors hover:border-brand/40 hover:bg-brand-soft/50 hover:text-brand-hover disabled:opacity-50"
                      >
                        {idea.prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <StylePicker value={options.style} onChange={(s) => set("style", s)} disabled={busy} />
            </div>

            {/* Action row */}
            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden text-xs text-muted sm:block">
                {mode === "image" && !image ? (
                  "Upload an image to get started."
                ) : (
                  <>
                    Press <kbd className="rounded border border-line bg-subtle px-1 font-sans">⌘</kbd>{" "}
                    <kbd className="rounded border border-line bg-subtle px-1 font-sans">Enter</kbd> to generate
                  </>
                )}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                {preview === null && gifs.length > 0 && !busy && (
                  <button
                    type="button"
                    onClick={() => setPreviewId(gifs[0].id)}
                    className="rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-subtle"
                  >
                    View last GIF
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void generate()}
                  disabled={!canSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-brand transition-all duration-150 hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#c9bdfb] disabled:shadow-none"
                >
                  {busy ? (
                    <>
                      <Spinner />
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M8 1.5 9.4 6.1 14 7.5 9.4 8.9 8 13.5 6.6 8.9 2 7.5l4.6-1.4L8 1.5Z" fill="currentColor" />
                      </svg>
                      Generate GIF
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="empty:hidden mt-4 space-y-3">
              {busy && <Progress phase={phase} status={status} elapsed={elapsed} onCancel={() => abortRef.current?.abort()} />}
              {error && (
                <div role="alert" className="flex animate-fade-up items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span aria-hidden>⚠</span>
                  <span>{error}</span>
                </div>
              )}
              {demo && phase === "done" && (
                <p className="animate-fade-up rounded-xl border border-amber-200/70 bg-warning-soft px-4 py-3 text-sm text-amber-800">
                  <strong className="font-medium">Demo mode.</strong> No <code className="font-mono text-xs">REPLICATE_API_TOKEN</code> is set, so
                  this GIF was made locally {source && "image" in source ? "by animating your photo" : "from a procedural animation"}.
                </p>
              )}
            </div>
          </div>

          {/* ── Settings ──────────────────────────────── */}
          <SettingsPanel
            options={options}
            onChange={set}
            onReset={() => setOptions((o) => ({ ...DEFAULT_GIF_OPTIONS, style: o.style }))}
            onRerender={source ? () => void reencode() : undefined}
            disabled={busy}
          />
        </div>
      </section>

      <ExploreSection onUse={applyIdea} />
      <MyGifsSection gifs={gifs} onOpen={setPreviewId} />

      {preview && (
        <PreviewModal
          key={preview.id}
          gifUrl={preview.url}
          sizeBytes={preview.size}
          fileName={preview.fileName}
          prompt={preview.prompt}
          onClose={() => setPreviewId(null)}
          onTryAgain={
            canSubmit
              ? () => {
                  setPreviewId(null);
                  void generate();
                }
              : undefined
          }
        />
      )}
    </>
  );
}
