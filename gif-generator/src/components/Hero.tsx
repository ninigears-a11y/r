import { Nome } from "./Nome";

/** A plain silhouette standing in for "any character in any GIF". */
function Silhouette() {
  return (
    <svg viewBox="0 0 60 80" className="h-full w-full" aria-hidden="true">
      <g fill="#121215">
        <circle cx="30" cy="14" r="9" />
        <path d="M22 26h16l3 26h-6l-2 24h-6l-2-24h-6z" />
        <path d="M22 28 8 16l-3 4 15 14zM38 28l13-14 3 4-14 15z" />
      </g>
    </svg>
  );
}

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28">
      <div>
        <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-line bg-canvas py-1 pr-3 pl-1 text-xs font-medium text-muted shadow-card">
          <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">New</span>
          AI character animation studio
        </p>
        <h1 className="mt-6 animate-fade-up font-display text-[44px] leading-[0.98] font-extrabold tracking-[-0.045em] text-balance [animation-delay:60ms] sm:text-6xl lg:text-[76px]">
          Any GIF, now starring{" "}
          <span className="relative inline-block whitespace-nowrap">
            your character.
            <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-brand" aria-hidden="true">
              <path d="M3 11c50-7 98-8 147-5s99 3 147-4" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <p className="mt-7 max-w-lg animate-fade-up text-lg leading-relaxed text-muted [animation-delay:120ms]">
          Drop in a GIF and your character — Nome keeps every move, beat and loop, and swaps in the new star. Or
          animate a still image, or just describe what you want to see.
        </p>
        <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:180ms]">
          <a href="#create" className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-white shadow-ink transition-all hover:-translate-y-0.5 hover:bg-black">
            Start creating
            <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
          </a>
          <a href="#how" className="inline-flex items-center rounded-full border border-line bg-canvas px-6 py-3.5 text-[15px] font-semibold transition-colors hover:border-line-strong hover:bg-subtle">
            How it works
          </a>
        </div>
        <ul className="mt-9 flex animate-fade-up flex-wrap gap-x-6 gap-y-2 text-sm text-muted [animation-delay:240ms]">
          {["Keeps the original timing", "Loops perfectly", "GIF & MP4 export"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-ink" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Visual: any GIF → starring Nome */}
      <div className="relative animate-fade-up [animation-delay:120ms]">
        <div className="dot-grid relative aspect-[1/0.9] overflow-hidden rounded-[36px] border border-line bg-paper">
          <div className="absolute top-[9%] left-[6%] w-[30%] -rotate-6 rounded-2xl border border-line bg-canvas p-2 shadow-float">
            <div className="relative aspect-[4/5] rounded-xl bg-subtle p-3">
              <Silhouette />
            </div>
            <p className="mt-1.5 flex items-center justify-between px-0.5 text-[11px] font-medium text-muted">
              <span>original.gif</span>
              <span className="tabular-nums">24f</span>
            </p>
          </div>

          <svg viewBox="0 0 120 60" className="absolute top-[30%] left-[33%] w-[18%] text-ink" aria-hidden="true">
            <path d="M6 44C30 6 76 2 106 26" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="2 9" />
            <path d="m96 16 12 11-15 4" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="absolute right-[5%] bottom-[3%] w-[52%]">
            <div className="animate-bob">
              <Nome priority size={420} />
            </div>
          </div>

          <div className="absolute top-[7%] right-[6%] max-w-[44%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-sm leading-snug font-medium text-white shadow-ink">
            Give me any GIF — I&apos;ll be the star!
          </div>
          <div className="absolute bottom-[8%] left-[6%] flex flex-col gap-2">
            <span className="w-fit rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold shadow-card ring-1 ring-line">✓ Same moves</span>
            <span className="w-fit rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold shadow-card ring-1 ring-line">✓ Same timing</span>
            <span className="w-fit rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold shadow-card ring-1 ring-line">✓ Loops ∞</span>
          </div>
        </div>
      </div>
    </section>
  );
}
