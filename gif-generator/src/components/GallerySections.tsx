"use client";

import { STYLE_PRESETS, type StyleId } from "@/lib/presets";

export interface Idea {
  prompt: string;
  style: StyleId;
}

export const IDEAS: Idea[] = [
  { prompt: "A pixel art cat dancing in space", style: "pixel-art" },
  { prompt: "A tiny robot watering a glowing plant", style: "3d-render" },
  { prompt: "Cherry blossoms drifting past a quiet train station", style: "anime" },
  { prompt: "Waves crashing on a beach at golden hour", style: "cinematic" },
  { prompt: "A cozy coffee cup with steam swirling up", style: "3d-render" },
  { prompt: "A wizard casting a sparkling spell", style: "pixel-art" },
];

export function ExploreSection({ onUse }: { onUse: (idea: Idea) => void }) {
  return (
    <section id="explore" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Explore ideas</h2>
        <p className="mt-2 text-muted">Not sure where to start? Pick a prompt and make it your own.</p>
      </div>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {IDEAS.map((idea) => (
          <li key={idea.prompt}>
            <button
              type="button"
              onClick={() => onUse(idea)}
              className="group flex h-full w-full flex-col justify-between gap-6 rounded-2xl border border-line bg-canvas p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="text-[15px] leading-snug text-ink">&ldquo;{idea.prompt}&rdquo;</span>
              <span className="flex w-full items-center justify-between text-xs">
                <span className="rounded-full bg-subtle px-2 py-1 font-medium text-muted">
                  {STYLE_PRESETS[idea.style].label}
                </span>
                <span className="font-medium text-brand opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  Use prompt →
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface GifItem {
  id: string;
  url: string;
  size: number;
  fileName: string;
  prompt: string;
}

export function MyGifsSection({ gifs, onOpen }: { gifs: GifItem[]; onOpen: (id: string) => void }) {
  return (
    <section id="my-gifs" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">My GIFs</h2>
          <p className="mt-2 text-muted">GIFs you create in this session. Download the ones you want to keep.</p>
        </div>
        {gifs.length > 0 && (
          <span className="shrink-0 text-sm text-muted tabular-nums">{gifs.length} created</span>
        )}
      </div>

      {gifs.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-subtle px-6 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-line bg-canvas text-muted shadow-card" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="4" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="m3.5 13 3.8-3.6 3 2.8 2.2-2 4 3.6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="mt-4 font-medium">No GIFs yet</p>
          <p className="mt-1 text-sm text-muted">Your creations will appear here.</p>
          <a href="#create" className="mt-4 text-sm font-medium text-brand hover:text-brand-hover">
            Create your first GIF →
          </a>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gifs.map((gif) => (
            <li key={gif.id} className="animate-fade-up">
              <button
                type="button"
                onClick={() => onOpen(gif.id)}
                className="group w-full overflow-hidden rounded-2xl border border-line bg-canvas text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="block aspect-square overflow-hidden bg-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL */}
                  <img src={gif.url} alt={gif.prompt || "Generated GIF"} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                </span>
                <span className="block px-3 py-2.5">
                  <span className="block truncate text-sm text-ink">{gif.prompt || "Animated photo"}</span>
                  <span className="block text-xs text-muted tabular-nums">{gif.size >= 1048576 ? `${(gif.size / 1048576).toFixed(1)} MB` : `${Math.round(gif.size / 1024)} KB`}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
