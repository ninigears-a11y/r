"use client";

import { formatBytes } from "@/lib/client/media";
import { VisorFace, type Mood } from "./Nome";
import { CheckIcon } from "./icons";

export type Phase = "idle" | "busy" | "done" | "error";

interface Props {
  phase: Phase;
  steps: string[];
  step: number;
  elapsed: number;
  idleHint: string;
  error: string | null;
  result: { url: string; size: number; title: string; demo: boolean } | null;
  meta: { w: number; h: number } | null;
  onMeta: (m: { w: number; h: number }) => void;
  onCancel: () => void;
}

const MOOD: Record<Phase, Mood> = { idle: "idle", busy: "work", done: "happy", error: "oops" };

/**
 * The studio's output screen, built as Nome's own head: antenna, ear and
 * visor. His eyes show what's happening until the GIF takes over the screen.
 */
export function Stage({ phase, steps, step, elapsed, idleHint, error, result, meta, onMeta, onCancel }: Props) {
  const showGif = phase === "done" && result;

  return (
    <div className="relative pt-8">
      {/* Antenna */}
      <div className="absolute top-0 left-14 flex flex-col items-center" aria-hidden>
        <span className={`size-7 rounded-full border-[3px] border-ink transition-colors duration-500 ${phase === "busy" ? "animate-pulse bg-lilac" : "bg-white"}`} />
        <span className="h-3 w-2.5 bg-ink" />
      </div>
      {/* Ear */}
      <span className="absolute top-1/2 -left-[7px] h-20 w-3 -translate-y-1/2 rounded-l-full bg-ink" aria-hidden />

      <div className="relative rounded-[40px] border-[3px] border-ink bg-canvas p-3 shadow-float sm:p-3.5">
        <div
          className="dot-grid-night relative flex aspect-[5/4] items-center justify-center overflow-hidden rounded-[30px] bg-night text-white"
          aria-live="polite"
        >
          {showGif ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL */}
              <img
                key={result.url}
                src={result.url}
                alt={`Generated GIF: ${result.title}`}
                onLoad={(e) => onMeta({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                className="max-h-[88%] max-w-[88%] animate-fade-up rounded-xl object-contain shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)]"
              />
              <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-white">
                <CheckIcon className="size-3.5" />
                {result.demo ? "Demo preview" : "Ready"}
              </span>
              <span className="absolute right-3.5 bottom-3.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 tabular-nums backdrop-blur">
                {meta ? `${meta.w}×${meta.h} · ` : ""}
                {formatBytes(result.size)} · loops ∞
              </span>
            </>
          ) : (
            <div className="flex w-full flex-col items-center px-6">
              <VisorFace mood={MOOD[phase]} className="w-[46%] max-w-56 transition-all duration-300" />

              {phase === "idle" && <p className="mt-6 max-w-xs text-center text-sm text-balance text-white/60">{idleHint}</p>}

              {phase === "error" && (
                <p role="alert" className="mt-6 max-w-sm text-center text-sm text-balance text-white/80">
                  {error}
                </p>
              )}

              {phase === "busy" && (
                <div className="mt-6 w-full max-w-xs">
                  <ol className="space-y-2">
                    {steps.map((label, i) => (
                      <li key={label} className={`flex items-center gap-2.5 text-sm transition-colors duration-300 ${i < step ? "text-white/45" : i === step ? "text-white" : "text-white/25"}`}>
                        <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${i < step ? "bg-white/15" : i === step ? "bg-white text-night" : "ring-1 ring-white/20"}`}>
                          {i < step ? <CheckIcon className="size-3" /> : i + 1}
                        </span>
                        {label}
                        {i === step && <span className="ml-auto text-xs text-white/50 tabular-nums">{elapsed}s</span>}
                      </li>
                    ))}
                  </ol>
                  <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white/70 transition-[width] duration-700" style={{ width: `${((step + 0.5) / steps.length) * 100}%` }} />
                    <div className="animate-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                  </div>
                  <button type="button" onClick={onCancel} className="mx-auto mt-4 block rounded-full px-3 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
