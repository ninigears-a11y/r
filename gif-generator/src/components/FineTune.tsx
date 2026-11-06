"use client";

import { LIMITS, RESOLUTIONS, type GifOptions } from "@/lib/presets";

interface Props {
  options: GifOptions;
  onChange: (next: GifOptions) => void;
  disabled?: boolean;
  /** Longest allowed length (swap mode follows the source GIF). */
  maxDuration?: number;
  /** Swap mode: length/speed snap to tenths so the original timing can be matched. */
  fineDuration?: boolean;
}

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  step = 1,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  hint: [string, string];
  onChange: (v: number) => void;
}) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <span className="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-ink tabular-nums">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider mt-3"
        style={{ "--fill": fill } as React.CSSProperties}
      />
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>{hint[0]}</span>
        <span>{hint[1]}</span>
      </div>
    </div>
  );
}

/** Output controls. These only change how the GIF is built — no AI re-run needed. */
export function FineTune({ options, onChange, disabled, maxDuration = LIMITS.duration.max, fineDuration }: Props) {
  const set = <K extends keyof GifOptions>(key: K, value: GifOptions[K]) => onChange({ ...options, [key]: value });
  const minDuration = fineDuration ? LIMITS.outputDuration.min : LIMITS.duration.min;

  return (
    <fieldset disabled={disabled} className="grid gap-6 disabled:opacity-60 sm:grid-cols-2">
      <legend className="sr-only">Fine-tune</legend>
      <Slider
        id="ft-fps"
        label="Speed"
        value={options.fps}
        display={`${options.fps} fps`}
        min={LIMITS.fps.min}
        max={LIMITS.fps.max}
        hint={["Choppy", "Smooth"]}
        onChange={(v) => set("fps", v)}
      />
      <Slider
        id="ft-duration"
        label="Length"
        value={Math.min(options.duration, maxDuration)}
        display={`${options.duration.toFixed(fineDuration ? 1 : 0)}s`}
        min={minDuration}
        max={maxDuration}
        step={fineDuration ? 0.1 : 1}
        hint={[`${minDuration}s`, `${maxDuration}s`]}
        onChange={(v) => set("duration", v)}
      />
      <div>
        <span id="ft-size" className="text-sm font-medium">Size</span>
        <div role="radiogroup" aria-labelledby="ft-size" className="mt-2.5 grid grid-cols-4 rounded-xl bg-subtle p-1 ring-1 ring-line ring-inset">
          {RESOLUTIONS.map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={options.width === w}
              onClick={() => set("width", w)}
              className={`rounded-lg py-1.5 text-sm font-medium tabular-nums transition-all ${
                options.width === w ? "bg-canvas text-ink shadow-card ring-1 ring-line" : "text-muted hover:text-ink"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted">Width in pixels · smaller files share faster</p>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span id="ft-boomerang" className="text-sm font-medium">Boomerang</span>
          <p className="mt-1 text-[11px] text-muted">Plays forward, then backward — for a seamless loop.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={options.boomerang}
          aria-labelledby="ft-boomerang"
          onClick={() => set("boomerang", !options.boomerang)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${options.boomerang ? "bg-ink" : "bg-line-strong"}`}
        >
          <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-card transition-transform duration-200 ${options.boomerang ? "translate-x-5" : ""}`} />
        </button>
      </div>
    </fieldset>
  );
}
