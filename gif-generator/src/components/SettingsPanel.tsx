"use client";

import { useId } from "react";

import { DEFAULT_GIF_OPTIONS, LIMITS, RESOLUTIONS, type GifOptions, type Resolution } from "@/lib/presets";

interface Props {
  options: GifOptions;
  onChange: <K extends keyof GifOptions>(key: K, value: GifOptions[K]) => void;
  onReset: () => void;
  /** Shown when there is a finished source that can be re-encoded for free. */
  onRerender?: () => void;
  disabled?: boolean;
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <span className="rounded-md bg-subtle px-1.5 py-0.5 text-xs font-medium tabular-nums text-ink">
          {value} {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={`${id}-hint`}
        style={{ "--fill": fill } as React.CSSProperties}
        className="slider mt-3"
      />
      <p id={`${id}-hint`} className="mt-2 text-xs text-muted">
        {hint}
      </p>
    </div>
  );
}

export function SettingsPanel({ options, onChange, onReset, onRerender, disabled }: Props) {
  const resId = useId();
  const loopId = useId();
  const frames = options.fps * options.duration;
  const isDefault = (Object.keys(DEFAULT_GIF_OPTIONS) as (keyof GifOptions)[]).every(
    (k) => k === "style" || options[k] === DEFAULT_GIF_OPTIONS[k],
  );

  return (
    <aside aria-labelledby="settings-title" className="rounded-2xl border border-line bg-canvas shadow-card">
      <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
        <h2 id="settings-title" className="font-semibold tracking-tight">
          Settings
        </h2>
        <button
          type="button"
          onClick={onReset}
          disabled={isDefault}
          className="rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-0"
        >
          Reset
        </button>
      </div>

      <fieldset disabled={disabled} className="divide-y divide-line px-5 sm:px-6">
        <div className="space-y-6 py-5">
          <Slider
            label="Loop speed"
            unit="fps"
            hint="Higher is smoother, but makes a larger file."
            value={options.fps}
            min={LIMITS.fps.min}
            max={LIMITS.fps.max}
            onChange={(v) => onChange("fps", v)}
          />
          <Slider
            label="Duration"
            unit="s"
            hint="Length of one full loop."
            value={options.duration}
            min={LIMITS.duration.min}
            max={LIMITS.duration.max}
            onChange={(v) => onChange("duration", v)}
          />
        </div>

        <div className="py-5">
          <label htmlFor={resId} className="text-sm font-medium text-ink">
            Resolution
          </label>
          <div className="relative mt-2">
            <select
              id={resId}
              value={options.width}
              onChange={(e) => onChange("width", Number(e.target.value) as Resolution)}
              className="w-full appearance-none rounded-lg border border-line bg-canvas py-2.5 pr-9 pl-3 text-sm text-ink shadow-card transition-colors hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
            >
              {RESOLUTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}px wide{r <= 256 ? " (smallest file)" : r >= 480 ? " (sharpest)" : r === 384 ? " (recommended)" : ""}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="m3.5 5.25 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 py-5">
          <div>
            <span id={loopId} className="text-sm font-medium text-ink">
              Boomerang loop
            </span>
            <p className="mt-1 text-xs text-muted">Plays forward, then backward, for a seamless loop.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={options.boomerang}
            aria-labelledby={loopId}
            onClick={() => onChange("boomerang", !options.boomerang)}
            className={`relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              options.boomerang ? "bg-brand" : "bg-line-strong"
            }`}
          >
            <span
              className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                options.boomerang ? "translate-x-[18px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </fieldset>

      <div className="rounded-b-2xl border-t border-line bg-subtle px-5 py-4 sm:px-6">
        <p className="text-xs text-muted">
          Output: <span className="font-medium text-ink">{options.width}px wide</span> ·{" "}
          <span className="font-medium text-ink">{frames} frames</span>
          {options.boomerang && <> · forward + reverse</>}
        </p>
        {onRerender && (
          <button
            type="button"
            onClick={onRerender}
            disabled={disabled}
            className="mt-3 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink shadow-card transition-colors hover:border-line-strong hover:bg-canvas/60 disabled:opacity-50"
          >
            Apply to last GIF
          </button>
        )}
        <p className="mt-2 text-xs text-muted">
          {onRerender
            ? "Re-renders instantly, with no new AI generation."
            : "You can change these after generating, at no extra cost."}
        </p>
      </div>
    </aside>
  );
}
