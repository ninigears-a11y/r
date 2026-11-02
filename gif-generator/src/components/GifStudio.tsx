"use client";

import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_GIF_OPTIONS,
  LIMITS,
  RESOLUTIONS,
  STYLE_IDS,
  STYLE_PRESETS,
  type GifOptions,
  type Mode,
  type Resolution,
} from "@/lib/presets";
import { ImageDropzone } from "./ImageDropzone";
import { PreviewModal } from "./PreviewModal";

type Phase = "idle" | "generating" | "encoding" | "done" | "error";

/** What the last GIF was made from, so it can be re-encoded with new settings for free. */
type Source = { videoUrl: string } | { image: string } | { demo: true };

interface Result {
  url: string;
  size: number;
  fileName: string;
}

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000;

const EXAMPLES = [
  "A pixel art cat dancing in space",
  "A tiny robot watering a glowing plant",
  "Waves crashing on a neon beach at sunset",
];

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

export function GifStudio() {
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [options, setOptions] = useState<GifOptions>(DEFAULT_GIF_OPTIONS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Free the blob URL when it is replaced or the component unmounts.
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const busy = phase === "generating" || phase === "encoding";
  const canSubmit = !busy && (mode === "text" ? prompt.trim().length >= 3 : Boolean(image));
  const set = <K extends keyof GifOptions>(key: K, value: GifOptions[K]) =>
    setOptions((o) => ({ ...o, [key]: value }));

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
    setResult({
      url: URL.createObjectURL(blob),
      size: blob.size,
      fileName: `${slugify(prompt || "animated-photo")}.gif`,
    });
    setPhase("done");
    setStatus("");
    setPreviewOpen(true);
  }

  async function run(task: (signal: AbortSignal) => Promise<void>) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
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
      setStatus("Sending your prompt to the AI model…");
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
        const secs = Math.round((Date.now() - started) / 1000);
        setStatus(`AI is animating your idea… ${job.status} (${secs}s)`);
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* ── Input panel ─────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div role="tablist" className="mb-5 inline-flex rounded-xl bg-black/30 p-1">
          {(["text", "image"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              disabled={busy}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                mode === m ? "bg-violet-500 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {m === "text" ? "✍️ Text → GIF" : "🖼️ Image → GIF"}
            </button>
          ))}
        </div>

        {mode === "image" && (
          <div className="mb-4">
            <ImageDropzone value={image} onChange={setImage} disabled={busy} />
          </div>
        )}

        <label htmlFor="prompt" className="mb-2 block text-sm font-medium text-zinc-300">
          {mode === "text" ? "Describe your GIF" : "Describe the motion (optional)"}
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) void generate();
          }}
          maxLength={LIMITS.promptMaxLength}
          rows={3}
          disabled={busy}
          placeholder={mode === "text" ? "A pixel art cat dancing in space" : "Hair blowing gently in the wind"}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
        />
        {mode === "text" && (
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                disabled={busy}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 hover:border-violet-400/50 hover:text-white"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={!canSubmit}
            className="rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? "Working…" : "✨ Generate GIF"}
          </button>
          {busy && (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="rounded-xl px-4 py-3 text-sm text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
          )}
          {result && !busy && (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-xl border border-white/15 px-4 py-3 text-sm hover:bg-white/5"
            >
              👀 Preview last GIF
            </button>
          )}
        </div>

        <div aria-live="polite" className="mt-4 min-h-6 text-sm">
          {busy && (
            <p className="flex items-center gap-2 text-zinc-300">
              <span className="size-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
              {status}
            </p>
          )}
          {error && <p className="text-red-400">⚠️ {error}</p>}
          {demo && phase === "done" && (
            <p className="text-amber-300/90">
              Demo mode: no <code>REPLICATE_API_TOKEN</code> is set, so this GIF was made locally
              {mode === "image" ? " by animating your photo" : " from a procedural animation"}.
            </p>
          )}
        </div>
      </section>

      {/* ── Settings panel ──────────────────────────── */}
      <aside className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="font-semibold">Settings</h2>

        <fieldset>
          <legend className="mb-2 text-sm text-zinc-300">Style preset</legend>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => set("style", id)}
                aria-pressed={options.style === id}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  options.style === id
                    ? "border-violet-400 bg-violet-500/15 text-white"
                    : "border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {STYLE_PRESETS[id].label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1 flex justify-between text-sm text-zinc-300">
            Loop speed <span className="text-zinc-400">{options.fps} FPS</span>
          </span>
          <input
            type="range"
            min={LIMITS.fps.min}
            max={LIMITS.fps.max}
            value={options.fps}
            onChange={(e) => set("fps", Number(e.target.value))}
            className="w-full accent-violet-500"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex justify-between text-sm text-zinc-300">
            Duration <span className="text-zinc-400">{options.duration}s</span>
          </span>
          <input
            type="range"
            min={LIMITS.duration.min}
            max={LIMITS.duration.max}
            value={options.duration}
            onChange={(e) => set("duration", Number(e.target.value))}
            className="w-full accent-violet-500"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-300">Resolution (width)</span>
          <select
            value={options.width}
            onChange={(e) => set("width", Number(e.target.value) as Resolution)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
          >
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {r}px {r <= 320 ? "· smallest file" : r >= 480 ? "· sharpest" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={options.boomerang}
            onChange={(e) => set("boomerang", e.target.checked)}
            className="size-4 accent-violet-500"
          />
          Boomerang loop (play forward then backward)
        </label>

        {source && !busy && (
          <button
            type="button"
            onClick={() => void reencode()}
            className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm hover:bg-white/5"
          >
            ♻️ Re-render with these settings
          </button>
        )}
        <p className="text-xs text-zinc-500">
          Speed, size, duration and loop changes re-render instantly without another AI call. The
          style preset applies to the next generation.
        </p>
      </aside>

      {previewOpen && result && (
        <PreviewModal
          gifUrl={result.url}
          sizeBytes={result.size}
          fileName={result.fileName}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
