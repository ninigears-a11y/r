"use client";

import type { Mode } from "@/lib/presets";

const MODES: { id: Mode; title: string; body: string; badge?: string }[] = [
  { id: "swap", title: "GIF → Character", body: "Same moves, new star. Swap the character in any GIF.", badge: "Signature" },
  { id: "image", title: "Image → GIF", body: "Bring a still character to life with a motion prompt." },
  { id: "text", title: "Text → GIF", body: "Describe a scene — optionally starring your character." },
];

/** Tiny diagrams of each workflow, drawn in the studio's ink + violet. */
function Glyph({ mode, active }: { mode: Mode; active: boolean }) {
  const ink = active ? "#fff" : "#121215";
  const soft = active ? "rgb(255 255 255 / 0.18)" : "#ecebf2";
  return (
    <svg viewBox="0 0 64 40" className="h-9 w-14" aria-hidden="true">
      {mode === "swap" && (
        <>
          <rect x="2" y="6" width="22" height="28" rx="6" fill={soft} />
          <rect x="6" y="10" width="22" height="28" rx="6" fill="none" stroke={ink} strokeWidth="2" />
          <path d="M33 22h10m0 0-4-4m4 4-4 4" stroke="#7655f7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="47" y="10" width="15" height="11" rx="4" fill={ink} />
          <path d="M50.5 17q2-3 4 0m2 0q2-3 4 0" stroke={active ? "#121215" : "#fff"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <rect x="50" y="23" width="9" height="11" rx="3" fill="none" stroke={ink} strokeWidth="2" />
        </>
      )}
      {mode === "image" && (
        <>
          <rect x="4" y="6" width="26" height="28" rx="6" fill="none" stroke={ink} strokeWidth="2" />
          <circle cx="13" cy="15" r="3" fill={ink} />
          <path d="m6 30 8-8 5 5 4-3 6 6" stroke={ink} strokeWidth="2" fill="none" strokeLinejoin="round" />
          <path d="M37 20h10m0 0-4-4m4 4-4 4" stroke="#7655f7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M52 12c4 2 6 5 6 8s-2 6-6 8" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M55 8c6 3 8 8 8 12s-2 9-8 12" stroke={soft === "#ecebf2" ? "#c9c7d6" : "rgb(255 255 255 / 0.4)"} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
      {mode === "text" && (
        <>
          <rect x="2" y="8" width="30" height="24" rx="6" fill={soft} />
          <path d="M8 16h18M8 22h12" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M37 20h10m0 0-4-4m4 4-4 4" stroke="#7655f7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="51" y="9" width="12" height="22" rx="4" fill="none" stroke={ink} strokeWidth="2" />
          <path d="m55 16 4 4-4 4Z" fill={ink} />
        </>
      )}
    </svg>
  );
}

export function ModePicker({ value, onChange, disabled }: { value: Mode; onChange: (m: Mode) => void; disabled?: boolean }) {
  return (
    <div role="tablist" aria-label="Animation mode" className="mt-6 grid gap-2.5 sm:grid-cols-3">
      {MODES.map((m, i) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            id={`mode-${m.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="mode-panel"
            disabled={disabled && !active}
            onClick={() => onChange(m.id)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const next = MODES[(i + (e.key === "ArrowRight" ? 1 : MODES.length - 1)) % MODES.length];
              onChange(next.id);
              document.getElementById(`mode-${next.id}`)?.focus();
            }}
            tabIndex={active ? 0 : -1}
            className={`group relative flex items-start gap-3.5 rounded-[22px] border p-4 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 sm:flex-col sm:gap-4 sm:p-5 ${
              active ? "border-ink bg-ink text-white shadow-ink" : "border-line bg-canvas hover:-translate-y-0.5 hover:border-line-strong hover:shadow-float"
            }`}
          >
            <Glyph mode={m.id} active={active} />
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="font-display text-lg font-bold tracking-[-0.02em]">{m.title}</span>
                {m.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${active ? "bg-brand text-white" : "bg-brand-soft text-brand-hover"}`}>
                    {m.badge}
                  </span>
                )}
              </span>
              <span className={`mt-1 block text-sm leading-snug ${active ? "text-white/70" : "text-muted"}`}>{m.body}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
