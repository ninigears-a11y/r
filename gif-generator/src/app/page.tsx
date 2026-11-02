import { GifStudio } from "@/components/GifStudio";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-10 text-center">
        <p className="mb-3 inline-block rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
          Open source · Powered by AI video models + FFmpeg
        </p>
        <h1 className="bg-gradient-to-br from-white to-violet-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          AI GIF Generator
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400">
          Type a prompt or drop in a photo and get a lightweight, perfectly looping GIF in about a
          minute.
        </p>
      </header>
      <GifStudio />
      <footer className="mt-16 text-center text-sm text-zinc-500">
        Built with Next.js, Tailwind CSS, Replicate and FFmpeg.
      </footer>
    </main>
  );
}
