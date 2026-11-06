import { GifStudio } from "@/components/GifStudio";
import { Hero } from "@/components/Hero";
import { Logo, Nome } from "@/components/Nome";
import { SiteHeader } from "@/components/SiteHeader";

const PIPELINE = [
  {
    title: "Read every frame",
    body: "Your GIF is unpacked with its real frame delays, flattened and upscaled to a resolution video models understand.",
    tech: "FFmpeg",
  },
  {
    title: "Find the original star",
    body: "The model segments the character in each frame and tracks its pose, limbs and facial expression.",
    tech: "Wan 2.2 Animate",
  },
  {
    title: "Re-animate as your character",
    body: "Your character is driven by that motion frame by frame — not pasted on top — then blended to match the scene.",
    tech: "Wan 2.2 Animate",
  },
  {
    title: "Composite into the scene",
    body: "The new character is blended back into the original background, keeping the camera and composition.",
    tech: "Replace mode",
  },
  {
    title: "Rebuild the loop",
    body: "Frames are re-timed to the original length and speed and packed with an optimised palette into a looping GIF.",
    tech: "FFmpeg",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="top" className="flex-1">
        <Hero />
        <GifStudio />

        <section id="how" className="scroll-mt-16 bg-night text-white">
          <div className="dot-grid-night">
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
              <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold text-lilac">How GIF → Character works</p>
                  <h2 className="mt-1 font-display text-3xl font-bold tracking-[-0.03em] text-balance sm:text-5xl">
                    Real motion transfer, not a sticker on top.
                  </h2>
                  <p className="mt-4 max-w-xl text-white/60">
                    Every frame is re-generated with your character in it. Image → GIF and Text → GIF use image-to-video
                    and text-to-video models; when you add a character to a text prompt, a first frame with your
                    character is drawn before it&apos;s animated.
                  </p>
                </div>
                <Nome mood="wow" size={140} className="hidden w-32 lg:block" />
              </div>
              <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {PIPELINE.map((step, i) => (
                  <li key={step.title} className="flex flex-col rounded-[22px] border border-night-line bg-night-2 p-5 transition-colors hover:border-white/20">
                    <span className="flex size-8 items-center justify-center rounded-full bg-white font-display text-sm font-bold text-night">{i + 1}</span>
                    <h3 className="mt-5 font-semibold">{step.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{step.body}</p>
                    <span className="mt-5 w-fit rounded-full border border-night-line px-2.5 py-1 font-mono text-[11px] text-white/60">{step.tech}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <Logo />
          <p className="text-sm text-muted">Open source. Uploads go only to the AI model; your GIFs stay in this browser unless you make a share link.</p>
        </div>
      </footer>
    </>
  );
}
