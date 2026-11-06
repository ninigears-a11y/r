"use client";

import { formatBytes } from "@/lib/client/media";
import type { Mode, StyleId } from "@/lib/presets";
import { Nome, type Mood } from "./Nome";
import { ArrowIcon, DownloadIcon, TrashIcon } from "./icons";

export interface Idea {
  mode: Exclude<Mode, "swap">;
  prompt: string;
  withNome: boolean;
  style?: StyleId;
  mood: Mood;
  tint: string;
}

const IDEAS: Idea[] = [
  { mode: "text", prompt: "Nome dancing happily in outer space, stars swirling around", withNome: true, mood: "happy", tint: "bg-[#1b1830] text-white", style: "3d-render" },
  { mode: "image", prompt: "Wave hello with a big friendly wave", withNome: true, mood: "idle", tint: "bg-[#f2eeff]" },
  { mode: "image", prompt: "Fall asleep, slowly nodding off", withNome: true, mood: "sleep", tint: "bg-[#eef4ff]" },
  { mode: "text", prompt: "Nome surfing a giant glassy wave at sunset", withNome: true, mood: "wow", tint: "bg-[#fff1e6]", style: "cinematic" },
  { mode: "image", prompt: "Jump for joy, landing with a little bounce", withNome: true, mood: "happy", tint: "bg-[#ecfdf3]" },
  { mode: "text", prompt: "Paper boats drifting down a rainy cobblestone street", withNome: false, mood: "idle", tint: "bg-[#f4f4f6]", style: "anime" },
];

const MODE_LABEL: Record<Idea["mode"], string> = { image: "Image → GIF", text: "Text → GIF" };

export function IdeasSection({ onUse }: { onUse: (idea: Idea) => void }) {
  return (
    <section id="ideas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-brand">Ideas</p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Not sure where to start?</h2>
          <p className="mt-3 text-muted">Pick one and it lands in the studio, ready to generate. Make it your own from there.</p>
        </div>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {IDEAS.map((idea) => {
          const dark = idea.tint.includes("text-white");
          return (
            <li key={idea.prompt}>
              <button
                type="button"
                onClick={() => onUse(idea)}
                className="group flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-line bg-canvas text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className={`relative flex h-44 items-end justify-center overflow-hidden ${idea.tint}`}>
                  {dark && <span className="dot-grid-night absolute inset-0" aria-hidden />}
                  {idea.withNome ? (
                    <Nome mood={idea.mood} size={150} className="relative -mb-6 w-36 transition-transform duration-500 group-hover:-translate-y-2 group-hover:-rotate-3" />
                  ) : (
                    <span className="mb-10 font-display text-5xl" aria-hidden>⛵︎</span>
                  )}
                  <span className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${dark ? "bg-white/15 text-white" : "bg-canvas/90 text-ink shadow-card"}`}>
                    {MODE_LABEL[idea.mode]}
                  </span>
                </span>
                <span className="flex flex-1 flex-col justify-between gap-4 p-5">
                  <span className="text-[15px] leading-snug">&ldquo;{idea.prompt}&rdquo;</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                    Use this idea
                    <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export interface GalleryItem {
  id: string;
  url: string;
  size: number;
  fileName: string;
  title: string;
  demo: boolean;
}

export function MyGifsSection({
  gifs,
  activeId,
  onOpen,
  onDelete,
}: {
  gifs: GalleryItem[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section id="my-gifs" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20 sm:px-6 sm:pt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand">Library</p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">My GIFs</h2>
          <p className="mt-2 text-muted">Saved in this browser only — download the ones you want to keep forever.</p>
        </div>
        {gifs.length > 0 && <span className="text-sm text-muted tabular-nums">{gifs.length} saved</span>}
      </div>

      {gifs.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-[28px] border border-dashed border-line-strong bg-subtle px-6 py-12 text-center sm:flex-row sm:gap-8 sm:px-12 sm:text-left">
          <Nome mood="sleep" size={120} className="w-28 shrink-0" />
          <div className="mt-4 sm:mt-0">
            <p className="font-display text-xl font-bold tracking-[-0.02em]">Nothing here yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted">Nome is napping until you make something. Your GIFs will collect here.</p>
            <a href="#create" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline">
              Make your first GIF <ArrowIcon className="size-4" />
            </a>
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {gifs.map((gif) => (
            <li key={gif.id} className="group relative animate-fade-up">
              <button
                type="button"
                onClick={() => onOpen(gif.id)}
                aria-current={gif.id === activeId}
                className={`block w-full overflow-hidden rounded-[20px] border bg-canvas text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${gif.id === activeId ? "border-ink" : "border-line"}`}
              >
                <span className="block aspect-square overflow-hidden bg-night">
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL */}
                  <img src={gif.url} alt={gif.title} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                </span>
                <span className="block px-3 py-2.5">
                  <span className="block truncate text-sm font-medium">{gif.title}</span>
                  <span className="block text-xs text-muted tabular-nums">
                    {formatBytes(gif.size)}
                    {gif.demo && " · demo"}
                  </span>
                </span>
              </button>
              <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <a href={gif.url} download={gif.fileName} aria-label={`Download ${gif.title}`} className="flex size-8 items-center justify-center rounded-full bg-canvas/95 shadow-card ring-1 ring-line transition hover:bg-canvas">
                  <DownloadIcon className="size-4" />
                </a>
                <button type="button" onClick={() => onDelete(gif.id)} aria-label={`Delete ${gif.title}`} className="flex size-8 items-center justify-center rounded-full bg-canvas/95 text-muted shadow-card ring-1 ring-line transition hover:bg-canvas hover:text-danger">
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
