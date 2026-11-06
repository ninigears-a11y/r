import { Logo } from "./Nome";

const NAV = [
  ["Studio", "#create"],
  ["My GIFs", "#my-gifs"],
  ["Ideas", "#ideas"],
  ["How it works", "#how"],
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" aria-label="Nome Studio home" className="rounded-lg transition-opacity hover:opacity-80">
          <Logo />
        </a>
        <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-1">
          {NAV.map(([label, href], i) => (
            <a
              key={href}
              href={href}
              className={`rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-subtle hover:text-ink ${i === 1 ? "" : "hidden md:block"}`}
            >
              {label}
            </a>
          ))}
          <a href="#create" className="ml-1 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-ink transition-all hover:-translate-y-px hover:bg-black">
            Create
          </a>
        </nav>
      </div>
    </header>
  );
}
