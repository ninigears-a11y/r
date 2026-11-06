import Image from "next/image";

/**
 * Nome, the studio mascot. Always drawn from the original artwork
 * (public/nome/*), so his look never drifts. Other moods are shown by
 * redrawing only the eyes on his visor, the way a screen face would.
 */
export type Mood = "happy" | "idle" | "work" | "wow" | "sleep" | "oops";

// Visor geometry measured from the artwork (760×780 canvas).
const VISOR = { cx: 368, cy: 350, angle: -9.6 };

/** Eye shapes, centred on (0,0), spaced like Nome's original eyes. */
export function Eyes({ mood, spacing = 98 }: { mood: Mood; spacing?: number }) {
  const stroke = { stroke: "#fff", strokeWidth: 24, strokeLinecap: "round" as const, fill: "none" };
  const pair = (draw: (x: number) => React.ReactNode, className?: string) => (
    <g className={className} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
      {draw(-spacing)}
      {draw(spacing)}
    </g>
  );
  switch (mood) {
    case "happy":
      return pair((x) => <path key={x} d={`M${x - 46} 22 Q${x} -46 ${x + 46} 22`} {...stroke} />);
    case "idle":
      return pair((x) => <rect key={x} x={x - 19} y={-36} width={38} height={72} rx={19} fill="#fff" />, "animate-blink");
    case "work":
      return pair((x) => <rect key={x} x={x - 19} y={-30} width={38} height={60} rx={19} fill="#fff" />, "animate-glance");
    case "wow":
      return pair((x) => <circle key={x} cx={x} cy={0} r={30} {...stroke} />);
    case "sleep":
      return pair((x) => <path key={x} d={`M${x - 42} -6 Q${x} 34 ${x + 42} -6`} {...stroke} />);
    case "oops":
      return pair((x) => (
        <path key={x} d={`M${x - 28} -28 L${x + 28} 28 M${x + 28} -28 L${x - 28} 28`} {...stroke} />
      ));
  }
}

interface NomeProps {
  mood?: Mood;
  /** Show the little "!!" excitement marks (animated). */
  marks?: boolean;
  className?: string;
  priority?: boolean;
  /** Rendered width in px, for next/image's `sizes`. */
  size?: number;
}

export function Nome({ mood = "happy", marks = true, className = "", priority, size = 320 }: NomeProps) {
  return (
    <div className={`@container relative aspect-[760/780] select-none ${className}`}>
      <Image
        src="/nome/nome-body.png"
        alt=""
        fill
        priority={priority}
        sizes={`${size}px`}
        className="pointer-events-none object-contain"
      />
      {mood !== "happy" && (
        <svg viewBox="0 0 760 780" className="absolute inset-0 size-full" aria-hidden="true">
          <g transform={`rotate(${VISOR.angle} ${VISOR.cx} ${VISOR.cy}) translate(${VISOR.cx} ${VISOR.cy})`}>
            {/* Cover the original eyes with visor black, then draw the mood. */}
            <rect x={-178} y={-74} width={356} height={150} rx={64} fill="#18181b" />
            <g transform="translate(0 6) scale(0.92)">
              <Eyes mood={mood} />
            </g>
          </g>
        </svg>
      )}
      {marks && mood !== "sleep" && mood !== "oops" && (
        <Image
          src="/nome/nome-marks.png"
          alt=""
          width={187}
          height={160}
          className="animate-pop pointer-events-none absolute"
          style={{ left: "72.1%", top: "3.2%", width: "24.6%", height: "auto", transformOrigin: "10% 90%" }}
        />
      )}
      {mood === "sleep" && (
        <span className="pointer-events-none absolute top-[2%] right-[6%] font-display text-[11cqw] font-bold text-ink" aria-hidden>
          <span className="animate-zzz inline-block">z</span>
          <span className="animate-zzz inline-block text-[0.75em] [animation-delay:0.9s]">z</span>
        </span>
      )}
    </div>
  );
}

/** Nome's visor as a full screen: used for the studio stage. */
export function VisorFace({ mood, className = "" }: { mood: Mood; className?: string }) {
  return (
    <svg viewBox="-200 -90 400 180" className={className} aria-hidden="true">
      <Eyes mood={mood} spacing={88} />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative block size-8 overflow-hidden">
        <Image src="/nome/nome-body.png" alt="" width={32} height={33} className="size-8 object-contain" />
      </span>
      <span className="font-display text-[19px] leading-none font-bold tracking-[-0.03em] text-ink">
        nome
        <span className="ml-1 align-top text-[10px] font-semibold tracking-normal text-muted">studio</span>
      </span>
    </span>
  );
}
