import { GifStudio } from "@/components/GifStudio";
import { Logo, SiteHeader } from "@/components/SiteHeader";

const STEPS = [
  {
    title: "Describe or upload",
    body: "Write a prompt or drop in a photo. Pick a style that fits the mood.",
  },
  {
    title: "AI animates it",
    body: "A video model brings your idea to life, then FFmpeg packs it into a lightweight loop.",
  },
  {
    title: "Download and share",
    body: "Fine-tune speed, size and looping instantly, then download a GIF that plays anywhere.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="top" className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-24 sm:pb-14">
          <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-muted shadow-card">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            AI-powered GIF generator
          </p>
          <h1 className="mt-6 animate-fade-up text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-ink [animation-delay:60ms] sm:text-6xl">
            Bring your ideas to life.
          </h1>
          <p className="mx-auto mt-5 max-w-lg animate-fade-up text-base text-balance text-muted [animation-delay:120ms] sm:text-lg">
            Turn text and images into beautiful animated GIFs with AI.
          </p>
        </section>

        <GifStudio />

        {/* About */}
        <section id="about" className="scroll-mt-20 border-t border-line bg-subtle">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
              <p className="mt-3 text-muted">
                AI GIF is open source. It pairs modern video models with a carefully tuned FFmpeg
                pipeline, so every GIF loops smoothly and stays small enough to share.
              </p>
            </div>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-2xl border border-line bg-canvas p-6 shadow-card">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-sm font-semibold text-brand">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <Logo />
          <p>Built with Next.js, Replicate and FFmpeg. Open source under MIT.</p>
        </div>
      </footer>
    </>
  );
}
