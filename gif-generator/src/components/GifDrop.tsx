"use client";

import { useEffect, useState } from "react";
import { formatBytes, formatSeconds, gifFilmstrip, readGif, type GifUpload } from "@/lib/client/media";
import { LIMITS } from "@/lib/presets";
import { FilmIcon } from "./icons";
import { useFileDrop } from "./useFileDrop";

interface Props {
  value: GifUpload | null;
  onChange: (gif: GifUpload | null) => void;
  disabled?: boolean;
}

/** Upload area for the source GIF in "GIF to character" mode. */
export function GifDrop({ value, onChange, disabled }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [strip, setStrip] = useState<{ src: string; frames: string[] } | null>(null);

  const drop = useFileDrop(
    async (file) => {
      try {
        setError(null);
        onChange(await readGif(file));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read that GIF.");
      }
    },
    { accept: "image/gif,.gif", disabled },
  );

  useEffect(() => {
    if (!value) return;
    let live = true;
    void gifFilmstrip(value.dataUrl).then((frames) => live && setStrip({ src: value.dataUrl, frames }));
    return () => {
      live = false;
    };
  }, [value]);
  const frames = value && strip?.src === value.dataUrl ? strip.frames : [];

  if (value) {
    const { info } = value;
    const trimmed = info.durationMs > LIMITS.swapMaxSeconds * 1000;
    return (
      <div {...drop.dropProps} className={`overflow-hidden rounded-2xl border bg-canvas transition-colors ${drop.dragging ? "border-brand ring-4 ring-brand/10" : "border-line"}`}>
        <div className="checkerboard relative flex h-52 items-center justify-center sm:h-60">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
          <img src={value.dataUrl} alt="Your original GIF" className="max-h-full max-w-full object-contain" />
          <span className="absolute top-2.5 left-2.5 rounded-full bg-night/85 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">Original</span>
        </div>
        {frames.length > 0 && (
          <div className="flex gap-1 overflow-hidden border-t border-line bg-subtle px-3 py-2" aria-label="Frames from your GIF">
            {frames.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- generated thumbnails
              <img key={i} src={f} alt="" className="h-9 min-w-0 flex-1 rounded-md object-cover ring-1 ring-line" />
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line px-3.5 py-3">
          <p className="min-w-0 flex-1 truncate text-sm font-medium" title={value.name}>{value.name}</p>
          <ul className="flex flex-wrap gap-1.5 text-xs text-muted tabular-nums">
            <li className="rounded-md bg-subtle px-2 py-1">{info.frames} frames</li>
            <li className="rounded-md bg-subtle px-2 py-1">{formatSeconds(info.durationMs)}</li>
            <li className="rounded-md bg-subtle px-2 py-1">{Math.round(info.fps)} fps</li>
            <li className="rounded-md bg-subtle px-2 py-1">{info.width}×{info.height}</li>
            <li className="rounded-md bg-subtle px-2 py-1">{formatBytes(value.size)}</li>
          </ul>
          <div className="flex gap-1.5">
            <button type="button" onClick={drop.open} disabled={disabled} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-subtle disabled:opacity-50">
              Replace
            </button>
            <button type="button" onClick={() => onChange(null)} disabled={disabled} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-subtle hover:text-ink disabled:opacity-50">
              Remove
            </button>
          </div>
        </div>
        {trimmed && (
          <p className="border-t border-line bg-warning-soft px-3.5 py-2 text-xs text-[#8a5a00]">
            Only the first {LIMITS.swapMaxSeconds} seconds will be animated.
          </p>
        )}
        <input {...drop.inputProps} />
        {error && <p className="px-3.5 pb-3 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div
        {...drop.dropProps}
        onClick={drop.open}
        className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-dashed px-6 py-10 text-center transition-all duration-200 sm:py-12 ${
          drop.dragging ? "border-brand bg-brand-soft" : "border-line-strong bg-subtle hover:border-ink/30 hover:bg-paper"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {/* Stacked "frames" illustration */}
        <span className="relative mb-5 h-14 w-20" aria-hidden>
          <span className="absolute inset-0 translate-x-3 -translate-y-1.5 rotate-6 rounded-xl border border-line bg-canvas transition-transform duration-300 group-hover:translate-x-5 group-hover:rotate-12" />
          <span className="absolute inset-0 translate-x-1.5 -translate-y-0.5 rotate-3 rounded-xl border border-line bg-canvas transition-transform duration-300 group-hover:translate-x-2.5 group-hover:rotate-6" />
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-night text-white shadow-ink">
            <FilmIcon className="size-6" />
          </span>
        </span>
        <p className="font-medium">{drop.dragging ? "Drop your GIF" : "Drop an animated GIF here"}</p>
        <p className="mt-1 text-sm text-muted">One clear character works best · up to {formatBytes(LIMITS.gifMaxBytes)}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            drop.open();
          }}
          disabled={disabled}
          className="mt-5 rounded-full bg-canvas px-4 py-2 text-sm font-medium shadow-card ring-1 ring-line transition hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Choose GIF
        </button>
        <input {...drop.inputProps} />
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
