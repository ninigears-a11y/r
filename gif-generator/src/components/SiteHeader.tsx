/** Brand mark: three stacked frames — a still becoming an animation. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
        <rect width="28" height="28" rx="8" fill="#7655F7" />
        <rect x="6" y="9" width="11" height="11" rx="2.5" fill="#fff" opacity="0.35" />
        <rect x="8.5" y="7.5" width="11" height="11" rx="2.5" fill="#fff" opacity="0.6" />
        <rect x="11" y="6" width="11" height="11" rx="2.5" fill="#fff" />
        <path d="M15.2 9.3v4.4l3.6-2.2-3.6-2.2Z" fill="#7655F7" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        AI GIF
      </span>
    </span>
  );
}

const NAV = [
  { href: "#explore", label: "Explore" },
  { href: "#my-gifs", label: "My GIFs" },
  { href: "#about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <a href="#top" aria-label="AI GIF home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
          <Logo />
        </a>
        <nav aria-label="Main">
          <ul className="flex items-center gap-0.5 sm:gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-brand sm:px-3"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
