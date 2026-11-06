"use client";

import { STYLE_IDS, STYLE_PRESETS, type StyleId } from "@/lib/presets";

const HINTS: Record<StyleId, string> = {
  none: "Natural look",
  "pixel-art": "Retro 16-bit",
  "3d-render": "Studio lighting",
  anime: "Cel-shaded",
  cinematic: "Film-like",
};

/** Tiny abstract swatches so each style is recognisable at a glance. */
function Swatch({ id }: { id: StyleId }) {
  const common = "size-6 shrink-0 rounded-full border border-black/10";
  switch (id) {
    case "pixel-art":
      return (
        <span className={`${common} grid grid-cols-3 grid-rows-3 overflow-hidden`} aria-hidden>
          {["#c9bcff", "#7655f7", "#c9bcff", "#7655f7", "#ffd27a", "#7655f7", "#c9bcff", "#7655f7", "#c9bcff"].map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </span>
      );
    case "3d-render":
      return <span className={common} style={{ background: "radial-gradient(circle at 35% 30%, #fff 0 8%, #b9c3ff 30%, #6a77d8 75%)" }} aria-hidden />;
    case "anime":
      return <span className={common} style={{ background: "linear-gradient(135deg, #ffd1e8 0 50%, #a8e4ff 50% 100%)" }} aria-hidden />;
    case "cinematic":
      return <span className={common} style={{ background: "linear-gradient(180deg, #1f2937 0 18%, #f59e72 18% 82%, #1f2937 82%)" }} aria-hidden />;
    default:
      return <span className={common} style={{ background: "linear-gradient(135deg, #f4f4f5, #d4d4d8)" }} aria-hidden />;
  }
}

interface Props {
  value: StyleId;
  onChange: (style: StyleId) => void;
  disabled?: boolean;
}

export function StylePicker({ value, onChange, disabled }: Props) {
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">Style</legend>
      <div className="flex flex-wrap gap-2">
        {STYLE_IDS.map((id) => {
          const active = value === id;
          return (
            <label
              key={id}
              title={HINTS[id]}
              className={`flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm font-medium transition-all duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/20 ${
                active ? "border-ink bg-ink text-white" : "border-line bg-canvas text-ink hover:border-line-strong hover:bg-subtle"
              }`}
            >
              <input type="radio" name="style" value={id} checked={active} onChange={() => onChange(id)} className="sr-only" />
              <Swatch id={id} />
              {STYLE_PRESETS[id].label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
