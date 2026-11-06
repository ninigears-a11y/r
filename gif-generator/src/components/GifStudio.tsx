"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteGif, listGifs, MAX_STORED, saveGif } from "@/lib/client/gif-store";
import { nomeCharacter, type GifUpload } from "@/lib/client/media";
import {
  DEFAULT_GIF_OPTIONS,
  LIMITS,
  RESOLUTIONS,
  type GifOptions,
  type Mode,
  type Resolution,
  type StyleId,
  type SwapScene,
} from "@/lib/presets";
import { CharacterPicker, type Character } from "./CharacterPicker";
import { FineTune } from "./FineTune";
import { GifDrop } from "./GifDrop";
import { ChevronIcon } from "./icons";
import { ModePicker } from "./ModePicker";
import { IdeasSection, MyGifsSection, type Idea } from "./Sections";
import { ResultActions } from "./ResultActions";
import { Stage, type Phase } from "./Stage";
import { StylePicker } from "./StylePicker";

type Source = { videoUrl: string } | { image: string } | { demo: true };

interface Recipe {
  mode: Mode;
  prompt: string;
  style: StyleId;
  character: Character;
  gif: GifUpload | null;
  scene: SwapScene;
  options: GifOptions;
}

export interface Creation {
  id: string;
  url: string;
  blob: Blob;
  size: number;
  fileName: string;
  title: string;
  mode: Mode;
  demo: boolean;
  createdAt: number;
  /** Present for GIFs made in this visit: allows "Edit animation" and "Try again". */
  source?: Source;
  options?: GifOptions;
  recipe?: Recipe;
}

interface Job {
  id: string;
  status: string;
  output: string | null;
  error: string | null;
  demo?: boolean;
  stage?: "keyframe" | "video" | "swap";
}

const POLL_MS = 3000;

const MOTIONS = ["Dance happily", "Wave hello", "Jump for joy", "Fall asleep", "Spin around", "Laugh out loud"];

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "nome";

function characterName(c: Character) {
  return c.kind === "nome" ? "Nome" : c.kind === "upload" ? "your character" : "";
}

/** Output settings that reproduce a source GIF's own size and timing. */
function optionsForGif(gif: GifUpload): GifOptions {
  const { info } = gif;
  const fits = [...RESOLUTIONS].reverse().find((w) => w <= info.width) ?? RESOLUTIONS[0];
  return {
    fps: Math.min(LIMITS.fps.max, Math.max(LIMITS.fps.min, Math.round(info.fps) || 12)),
    width: fits as Resolution,
    duration: Math.min(LIMITS.swapMaxSeconds, Math.max(LIMITS.outputDuration.min, Math.round(info.durationMs / 100) / 10)),
    boomerang: false,
    style: "none",
  };
}

function stepsFor(r: Recipe): string[] {
  if (r.mode === "swap") {
    return ["Reading the GIF's frames", "Tracking the original character", "Re-animating it frame by frame", "Rebuilding the loop"];
  }
  if (r.mode === "image") return ["Uploading your character", "Bringing it to life", "Building the GIF"];
  if (r.character.kind !== "none") return [`Drawing ${characterName(r.character)} into the scene`, "Animating the scene", "Building the GIF"];
  return ["Imagining the scene", "Animating the scene", "Building the GIF"];
}

export function GifStudio() {
  const [server, setServer] = useState<{ ai: boolean; sharing: boolean } | null>(null);

  const [mode, setMode] = useState<Mode>("swap");
  const [gif, setGif] = useState<GifUpload | null>(null);
  const [upload, setUpload] = useState<Extract<Character, { kind: "upload" }> | null>(null);
  const [characters, setCharacters] = useState<Record<Mode, Character>>({
    swap: { kind: "nome" },
    image: { kind: "nome" },
    text: { kind: "none" },
  });
  const [scene, setScene] = useState<SwapScene>("original");
  const [prompts, setPrompts] = useState({ image: "", text: "" });
  const [style, setStyle] = useState<StyleId>("none");
  const [options, setOptions] = useState<Record<Mode, GifOptions>>({
    swap: { ...DEFAULT_GIF_OPTIONS, style: "none" },
    image: { ...DEFAULT_GIF_OPTIONS, style: "none" },
    text: { ...DEFAULT_GIF_OPTIONS, style: "none" },
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Creation | null>(null);
  const [meta, setMeta] = useState<{ w: number; h: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editOptions, setEditOptions] = useState<GifOptions>(DEFAULT_GIF_OPTIONS);
  const [gallery, setGallery] = useState<Creation[]>([]);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(0);
  const galleryRef = useRef<Creation[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const busy = phase === "busy";
  const character = characters[mode];
  const prompt = mode === "text" ? prompts.text : prompts.image;

  // ── Boot: server capabilities + saved GIFs ─────────────────────────
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: { ai: boolean; sharing: boolean }) => setServer(s))
      .catch(() => setServer({ ai: false, sharing: false }));

    let live = true;
    void listGifs().then((stored) => {
      if (!live) return;
      const restored: Creation[] = stored.map((g) => ({ ...g, size: g.blob.size, url: URL.createObjectURL(g.blob) }));
      setGallery((prev) => [...prev, ...restored.filter((r) => !prev.some((p) => p.id === r.id))]);
    });
    return () => {
      live = false;
      abortRef.current?.abort();
      galleryRef.current.forEach((g) => URL.revokeObjectURL(g.url));
    };
  }, []);

  useEffect(() => {
    galleryRef.current = gallery;
  }, [gallery]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), []);

  // ── Pipeline helpers ────────────────────────────────────────────────
  async function post(body: Record<string, unknown>, signal: AbortSignal): Promise<Job> {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not start the AI model.");
    return data as Job;
  }

  async function poll(id: string, signal: AbortSignal, onStatus?: (status: string) => void): Promise<string> {
    for (;;) {
      const res = await fetch(`/api/generate/${id}`, { signal, cache: "no-store" });
      const job = (await res.json().catch(() => ({}))) as Partial<Job>;
      if (!res.ok) throw new Error(job.error ?? "Lost track of the AI job.");
      onStatus?.(job.status ?? "");
      if (job.status === "succeeded") {
        if (!job.output) throw new Error("The model finished without an output.");
        return job.output;
      }
      if (job.status === "failed" || job.status === "canceled") {
        throw new Error(job.error ? `The AI model failed: ${job.error}` : "The AI model failed. Please try again.");
      }
      await sleep(POLL_MS, signal);
    }
  }

  async function encode(source: Source, opts: GifOptions, signal: AbortSignal): Promise<Blob> {
    const res = await fetch("/api/gif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...source, ...opts }),
      signal,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not build the GIF.");
    return res.blob();
  }

  function addCreation(c: Omit<Creation, "id" | "url" | "size" | "createdAt">) {
    const creation: Creation = { ...c, id: crypto.randomUUID(), url: URL.createObjectURL(c.blob), size: c.blob.size, createdAt: Date.now() };
    setCurrent(creation);
    setMeta(null);
    setGallery((prev) => {
      const next = [creation, ...prev];
      next.slice(MAX_STORED).forEach((g) => URL.revokeObjectURL(g.url));
      return next.slice(0, MAX_STORED);
    });
    void saveGif({
      id: creation.id,
      blob: creation.blob,
      title: creation.title,
      mode: creation.mode,
      fileName: creation.fileName,
      createdAt: creation.createdAt,
      demo: creation.demo,
    });
    return creation;
  }

  /** On stacked (mobile/tablet) layouts, bring Nome's screen into view. */
  function revealStage() {
    const stacked = window.matchMedia("(max-width: 1023px)").matches;
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: stacked ? "start" : "nearest" });
  }

  function begin(stepLabels: string[]) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    startedRef.current = Date.now();
    setElapsed(0);
    setSteps(stepLabels);
    setStep(0);
    setError(null);
    setEditing(false);
    setPhase("busy");
    return ctrl.signal;
  }

  function fail(err: unknown) {
    if ((err as Error).name === "AbortError") {
      setPhase(current ? "done" : "idle");
      return;
    }
    setError(err instanceof Error ? err.message : "Something went wrong.");
    setPhase("error");
  }

  // ── Generate ─────────────────────────────────────────────────────────
  async function run(recipe: Recipe) {
    const signal = begin(stepsFor(recipe));
    revealStage();
    try {
      const char =
        recipe.character.kind === "nome"
          ? await nomeCharacter()
          : recipe.character.kind === "upload"
            ? recipe.character.dataUrl
            : null;
      let source: Source;
      let demo = false;

      if (recipe.mode === "swap") {
        if (!recipe.gif || !char) throw new Error("Add a GIF and a character first.");
        const job = await post({ mode: "swap", gif: recipe.gif.dataUrl, character: char, scene: recipe.scene }, signal);
        setStep(1);
        const video = await poll(job.id, signal, (s) => s === "processing" && setStep(2));
        source = { videoUrl: video };
        setStep(3);
      } else if (recipe.mode === "image") {
        if (!char) throw new Error("Choose a character to animate.");
        const job = await post({ mode: "image", prompt: recipe.prompt, style: recipe.style, image: char }, signal);
        if (job.demo) {
          demo = true;
          source = { image: char };
        } else {
          setStep(1);
          source = { videoUrl: await poll(job.id, signal) };
        }
        setStep(2);
      } else {
        const job = await post(
          { mode: "text", prompt: recipe.prompt, style: recipe.style, character: char ?? undefined },
          signal,
        );
        if (job.demo) {
          demo = true;
          source = char ? { image: char } : { demo: true };
        } else if (job.stage === "keyframe") {
          const keyframe = await poll(job.id, signal);
          setStep(1);
          const video = await post({ mode: "image", prompt: recipe.prompt, style: recipe.style, imageUrl: keyframe }, signal);
          source = { videoUrl: await poll(video.id, signal) };
        } else {
          setStep(1);
          source = { videoUrl: await poll(job.id, signal) };
        }
        setStep(2);
      }

      // Style presets also steer how FFmpeg scales and dithers the GIF.
      const opts: GifOptions = { ...recipe.options, style: recipe.mode === "swap" ? "none" : recipe.style };
      const blob = await encode(source, opts, signal);
      const title =
        recipe.mode === "swap"
          ? `${characterName(recipe.character) === "Nome" ? "Nome" : "Your character"} in ${recipe.gif?.name.replace(/\.gif$/i, "")}`
          : recipe.prompt || "Animated character";
      addCreation({
        blob,
        title,
        fileName: `${slug(title)}.gif`,
        mode: recipe.mode,
        demo,
        source,
        options: opts,
        recipe,
      });
      setPhase("done");
    } catch (err) {
      fail(err);
    }
  }

  async function reencode() {
    if (!current?.source) return;
    const base = current;
    const signal = begin(["Rebuilding the GIF"]);
    try {
      const blob = await encode(base.source!, editOptions, signal);
      addCreation({ ...base, blob, options: editOptions });
      setPhase("done");
    } catch (err) {
      fail(err);
    }
  }

  const recipe: Recipe = { mode, prompt: prompt.trim(), style, character, gif, scene, options: options[mode] };
  const needsAi = mode === "swap" && server?.ai === false;
  const ready =
    !busy &&
    !needsAi &&
    (mode === "swap" ? Boolean(gif) && character.kind !== "none" : mode === "image" ? character.kind !== "none" : prompt.trim().length >= 3);

  const cta =
    mode === "swap"
      ? `Swap in ${character.kind === "nome" ? "Nome" : "my character"}`
      : mode === "image"
        ? `Animate ${character.kind === "nome" ? "Nome" : "my character"}`
        : "Generate GIF";

  const missing =
    mode === "swap"
      ? !gif
        ? "Add a GIF to start"
        : null
      : mode === "text" && prompt.trim().length < 3
        ? "Describe your animation"
        : null;

  const idleHint =
    mode === "swap"
      ? "Give me a GIF and a character. I'll keep every move and swap the star."
      : mode === "image"
        ? "Pick a character and tell me how it should move."
        : "Describe a scene. Add a character if you want them to star in it.";

  function setPrompt(value: string) {
    setPrompts((p) => (mode === "text" ? { ...p, text: value } : { ...p, image: value }));
  }

  function chooseGif(next: GifUpload | null) {
    setGif(next);
    if (next) setOptions((o) => ({ ...o, swap: optionsForGif(next) }));
  }

  function applyIdea(idea: Idea) {
    setMode(idea.mode);
    setPrompts((p) => ({ ...p, [idea.mode === "text" ? "text" : "image"]: idea.prompt }));
    setCharacters((c) => ({ ...c, [idea.mode]: idea.withNome ? { kind: "nome" } : { kind: "none" } }));
    if (idea.style) setStyle(idea.style);
    document.getElementById("create")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => promptRef.current?.focus({ preventScroll: true }), 500);
  }

  function openCreation(id: string) {
    const found = gallery.find((g) => g.id === id);
    if (!found) return;
    setCurrent(found);
    setMeta(null);
    setEditing(false);
    setError(null);
    setPhase("done");
    revealStage();
  }

  function removeCreation(id: string) {
    setGallery((prev) => {
      const gone = prev.find((g) => g.id === id);
      if (gone && gone.id !== current?.id) URL.revokeObjectURL(gone.url);
      return prev.filter((g) => g.id !== id);
    });
    void deleteGif(id);
  }

  const fineDuration = mode === "swap";
  const maxDuration = mode === "swap" && gif ? optionsForGif(gif).duration : LIMITS.duration.max;

  return (
    <>
      <section id="create" className="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand">The studio</p>
            <h2 className="mt-1 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">What are we making?</h2>
          </div>
          {server && !server.ai && (
            <p className="max-w-md rounded-xl border border-line bg-warning-soft px-3.5 py-2.5 text-xs leading-relaxed text-[#7a5200]">
              <strong className="font-semibold">Demo mode.</strong> This server has no{" "}
              <code className="font-mono">REPLICATE_API_TOKEN</code>, so AI is off. Image and text modes make a local
              preview animation instead; GIF swaps need the AI.
            </p>
          )}
        </div>

        <ModePicker value={mode} onChange={(m) => !busy && setMode(m)} disabled={busy} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-8">
          {/* ── Inputs ─────────────────────────────────────────── */}
          <div key={mode} id="mode-panel" role="tabpanel" aria-labelledby={`mode-${mode}`} className="animate-fade-up space-y-7 rounded-[28px] border border-line bg-canvas p-5 shadow-card sm:p-7">
            {mode === "swap" && (
              <>
                <Field n={1} title="The original GIF" hint="The motion, timing and scene come from here.">
                  <GifDrop value={gif} onChange={chooseGif} disabled={busy} />
                </Field>
                <Field n={2} title="Who should star in it?" hint="Full-body characters with clear arms and legs work best.">
                  <CharacterPicker
                    label="Character"
                    value={character}
                    onChange={(c) => setCharacters((s) => ({ ...s, swap: c }))}
                    upload={upload}
                    onUpload={setUpload}
                    disabled={busy}
                  />
                </Field>
                <Field n={3} title="Scene">
                  <div role="radiogroup" aria-label="Scene" className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ["original", "Keep the GIF's scene", "Replace the character, keep the background and lighting."],
                        ["character", "Use my character's image", "Your character performs the moves in its own picture."],
                      ] as const
                    ).map(([id, title, body]) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={scene === id}
                        onClick={() => setScene(id)}
                        disabled={busy}
                        className={`rounded-2xl border p-3.5 text-left transition-all ${scene === id ? "border-ink shadow-[0_0_0_1px_var(--color-ink)]" : "border-line hover:border-line-strong hover:bg-subtle"}`}
                      >
                        <span className="block text-sm font-semibold">{title}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted">{body}</span>
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {mode === "image" && (
              <>
                <Field n={1} title="Your character" hint="A clear picture of one character on a simple background.">
                  <CharacterPicker
                    label="Character"
                    value={character}
                    onChange={(c) => setCharacters((s) => ({ ...s, image: c }))}
                    upload={upload}
                    onUpload={setUpload}
                    disabled={busy}
                  />
                </Field>
                <Field n={2} title="What should they do?" optional>
                  <PromptBox
                    ref={promptRef}
                    value={prompts.image}
                    onChange={setPrompt}
                    rows={2}
                    placeholder="Dance happily, waving both arms…"
                    disabled={busy}
                    onSubmit={() => ready && void run(recipe)}
                  />
                  <Chips items={MOTIONS} onPick={(m) => setPrompt(m)} disabled={busy} />
                </Field>
                <Field n={3} title="Style">
                  <StylePicker value={style} onChange={setStyle} disabled={busy} />
                </Field>
              </>
            )}

            {mode === "text" && (
              <>
                <Field n={1} title="Describe the animation">
                  <PromptBox
                    ref={promptRef}
                    value={prompts.text}
                    onChange={setPrompt}
                    rows={3}
                    placeholder={character.kind === "none" ? "Paper boats drifting down a rainy street…" : "Dancing happily in outer space…"}
                    disabled={busy}
                    onSubmit={() => ready && void run(recipe)}
                  />
                </Field>
                <Field n={2} title="Featuring" optional hint="Add a character and it will star in your scene.">
                  <CharacterPicker
                    label="Featured character"
                    allowNone
                    value={character}
                    onChange={(c) => setCharacters((s) => ({ ...s, text: c }))}
                    upload={upload}
                    onUpload={setUpload}
                    disabled={busy}
                  />
                </Field>
                <Field n={3} title="Style">
                  <StylePicker value={style} onChange={setStyle} disabled={busy} />
                </Field>
              </>
            )}

            <details className="group rounded-2xl border border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors hover:bg-subtle">
                <span>
                  Fine-tune
                  <span className="ml-2 font-normal text-muted">
                    {options[mode].fps} fps · {options[mode].duration.toFixed(fineDuration ? 1 : 0)}s · {options[mode].width}px
                    {options[mode].boomerang ? " · boomerang" : ""}
                  </span>
                </span>
                <ChevronIcon className="size-4 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-line px-4 py-5">
                <FineTune
                  options={options[mode]}
                  onChange={(o) => setOptions((s) => ({ ...s, [mode]: o }))}
                  disabled={busy}
                  fineDuration={fineDuration}
                  maxDuration={maxDuration}
                />
                {mode === "swap" && gif && (
                  <button type="button" onClick={() => chooseGif(gif)} className="mt-4 text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
                    Match the original GIF again
                  </button>
                )}
              </div>
            </details>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                {needsAi
                  ? "GIF swaps need the AI model — add a Replicate token on the server."
                  : missing ?? (mode === "swap" ? "Takes about 1–3 minutes." : "Takes about a minute.")}
              </p>
              <button
                type="button"
                onClick={() => void run(recipe)}
                disabled={!ready}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-white shadow-ink transition-all hover:-translate-y-0.5 hover:bg-black active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-white disabled:shadow-none"
              >
                {busy ? (
                  <>
                    <span className="animate-spin-slow size-4 rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                    Working…
                  </>
                ) : (
                  <>
                    {cta}
                    <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Output ─────────────────────────────────────────── */}
          <div ref={stageRef} className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
            <Stage
              phase={phase}
              steps={steps}
              step={step}
              elapsed={elapsed}
              idleHint={idleHint}
              error={error}
              result={current}
              meta={meta}
              onMeta={setMeta}
              onCancel={() => abortRef.current?.abort()}
            />
            {phase === "done" && current && (
              <div className="mt-4 animate-fade-up">
                <p className="mb-3 truncate px-1 text-sm font-medium" title={current.title}>{current.title}</p>
                <ResultActions
                  gif={current}
                  sharing={Boolean(server?.sharing)}
                  onToast={notify}
                  onTryAgain={current.recipe ? () => void run(current.recipe!) : undefined}
                  onEdit={
                    current.source
                      ? () => {
                          setEditOptions(current.options ?? DEFAULT_GIF_OPTIONS);
                          setEditing((e) => !e);
                        }
                      : undefined
                  }
                  editing={editing}
                />
                {editing && current.source && (
                  <div className="mt-3 animate-fade-up rounded-2xl border border-line bg-canvas p-4 shadow-card">
                    <FineTune
                      options={editOptions}
                      onChange={setEditOptions}
                      fineDuration={current.mode === "swap"}
                      maxDuration={current.recipe?.gif ? optionsForGif(current.recipe.gif).duration : LIMITS.duration.max}
                    />
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted">Re-builds the GIF from the same animation — no AI wait.</p>
                      <button type="button" onClick={() => void reencode()} className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black">
                        Update GIF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {phase === "error" && (
              <div className="mt-4 flex justify-center">
                <button type="button" onClick={() => void run(recipe)} disabled={!ready} className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:bg-subtle disabled:opacity-50">
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <MyGifsSection gifs={gallery} activeId={current?.id ?? null} onOpen={openCreation} onDelete={removeCreation} />
      <IdeasSection onUse={applyIdea} />

      {toast && (
        <div key={toast.id} role="status" className="fixed inset-x-4 bottom-5 z-50 mx-auto w-fit max-w-[calc(100vw-32px)] animate-fade-up rounded-full bg-ink px-4 py-2.5 text-center text-sm font-medium text-white shadow-float">
          {toast.text}
        </div>
      )}
    </>
  );
}

function Field({
  n,
  title,
  hint,
  optional,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{n}</span>
        <div>
          <h3 className="font-semibold">
            {title}
            {optional && <span className="ml-2 text-xs font-normal text-muted">Optional</span>}
          </h3>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function PromptBox({
  ref,
  value,
  onChange,
  rows,
  placeholder,
  disabled,
  onSubmit,
}: {
  ref: React.Ref<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder: string;
  disabled?: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
        rows={rows}
        maxLength={LIMITS.promptMaxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Prompt"
        className="w-full resize-none rounded-2xl border border-line bg-subtle px-4 pt-3.5 pb-7 text-[15px] leading-relaxed placeholder:text-muted/70 transition focus:border-ink/40 focus:bg-canvas focus:ring-4 focus:ring-brand/10 focus:outline-none disabled:opacity-60"
      />
      <span className="pointer-events-none absolute right-3.5 bottom-2.5 text-[11px] text-muted tabular-nums">
        {value.length}/{LIMITS.promptMaxLength}
      </span>
    </div>
  );
}

function Chips({ items, onPick, disabled }: { items: string[]; onPick: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          disabled={disabled}
          className="rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-muted transition-all hover:-translate-y-px hover:border-line-strong hover:text-ink disabled:opacity-50"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
