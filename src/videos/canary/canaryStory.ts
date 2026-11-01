// "The Bird That Saved the Miners" — 20 s TEST cut. Timeline, cameras, lens blur and story events.
// Every time below comes from shorts/canary/voice/words.json (placeholder espeak voice): reactions land 0-3 f
// before their word. Mine tunnel runs along -z around x = 0; the pit head is a separate set at x = PX.
export const FPS = 30;
export const TOTAL = 600;
export const FLASH_AT = 106; // white flash after the hook ("...size of a fist.")
export type V3 = [number, number, number];
export type Light = "day" | "golden" | "lamp";

// word frames (words.json x 30)
export const W = {
  fist: 77, owen: 110, laughs: 204, pet: 232, fine: 269, stops: 313, drops: 346,
  see: 366, tiny: 417, teacup: 478, bucket: 500, oxygen: 563, canary: 585,
};
export const DROP_AT = W.drops - 3;          // the bird leaves the perch
export const PX = 200;                       // pit-head set origin (x)

export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 108, light: "lamp", sunAz: 55, sunEl: 22 },     // hook: canary close-up, pull back to Owen + tunnel
  { id: 2, a: 108, b: 196, light: "lamp", sunAz: -50, sunEl: 26 },  // Owen carries the cage deeper
  { id: 3, a: 196, b: 246, light: "lamp", sunAz: 60, sunEl: 24 },   // crew laughs
  { id: 4, a: 246, b: 290, light: "lamp", sunAz: 70, sunEl: 20 },   // foreman: the air smells fine
  { id: 5, a: 290, b: 356, light: "lamp", sunAz: 55, sunEl: 24 },   // singing stops, bird drops
  { id: 6, a: 356, b: 414, light: "golden", sunAz: 8, sunEl: 7 },   // pit head at sunset: "You see"
  { id: 7, a: 414, b: 512, light: "golden", sunAz: 20, sunEl: 8 },  // teacup vs bucket
  { id: 8, a: 512, b: 600, light: "golden", sunAz: 14, sunEl: 7 },  // the oxygen cage
];
/** crossfade length (frames) INTO a shot id: only at the place/time change */
export const XFADE: Record<number, number> = { 6: 8 };

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const t = clamp01(x); return t * t * t * (t * (6 * t - 15) + 10); }; // smootherstep
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------------- cameras ----------------
// Each shot: a glide from k0 to k1 over [g0, g1] (smootherstep), then a creeping push-in toward the look point
// (creep %/frame) so no hold is ever static. Rolls in degrees.
type Key = { pos: V3; look: V3; fov: number; roll: number };
type Cam = { k0: Key; k1: Key; g0: number; g1: number; creep: number; punch?: [number, number][] };
const Z_CREW = -20; // crew / Owen stand here in shots 3-5
export const CAMS: Record<number, Cam> = {
  1: { k0: { pos: [0.5, 0.48, -4.3], look: [0.44, 0.42, -4.94], fov: 34, roll: -2 },
       k1: { pos: [0.05, 1.05, -1.9], look: [0.15, 0.62, -5.1], fov: 40, roll: 4 }, g0: 34, g1: 104, creep: 0.002 },
  2: { k0: { pos: [0.15, 0.95, -13.9], look: [0.05, 0.85, -17.6], fov: 38, roll: 0 },
       k1: { pos: [0.25, 0.9, -11.5], look: [0.05, 0.85, -15.1], fov: 38, roll: -1.5 }, g0: 108, g1: 196, creep: 0 },
  3: { k0: { pos: [0.2, 0.62, -15.6], look: [-0.15, 1.0, Z_CREW], fov: 40, roll: 4.4 },
       k1: { pos: [0.2, 0.62, -15.9], look: [-0.15, 1.0, Z_CREW], fov: 40, roll: 4.4 }, g0: 196, g1: 246, creep: 0.0025, punch: [[W.laughs - 2, 0.006]] },
  4: { k0: { pos: [-0.3, 1.3, -18.0], look: [-0.75, 1.22, Z_CREW], fov: 34, roll: -4 },
       k1: { pos: [-0.38, 1.29, -18.4], look: [-0.75, 1.22, Z_CREW], fov: 34, roll: -4 }, g0: 246, g1: 290, creep: 0.002 },
  5: { k0: { pos: [0.42, 0.66, -19.0], look: [0.62, 0.44, Z_CREW + 0.2], fov: 38, roll: 3 },
       k1: { pos: [0.48, 0.62, -19.22], look: [0.62, 0.42, Z_CREW + 0.2], fov: 38, roll: 4.5 }, g0: 290, g1: DROP_AT, creep: 0.002 },
  6: { k0: { pos: [PX + 1.4, 1.05, -1.6], look: [PX + 0.1, 1.05, -7], fov: 40, roll: 0 },
       k1: { pos: [PX + 0.9, 1.0, -2.6], look: [PX + 0.05, 1.0, -7], fov: 40, roll: -4 }, g0: 352, g1: 414, creep: 0.002 },
  7: { k0: { pos: [PX + 3.05, 1.2, -2.6], look: [PX + 3.1, 0.98, -4.0], fov: 36, roll: 0 },
       k1: { pos: [PX + 3.1, 1.15, -2.95], look: [PX + 3.1, 0.98, -4.0], fov: 36, roll: 3 }, g0: 414, g1: 512, creep: 0.002, punch: [[W.teacup - 2, 0.005]] },
  8: { k0: { pos: [PX + 3.1, 1.45, -1.3], look: [PX + 3.05, 1.12, -4.0], fov: 40, roll: -3 },
       k1: { pos: [PX + 3.1, 1.3, -2.55], look: [PX + 3.05, 1.08, -4.0], fov: 40, roll: -4.5 }, g0: 512, g1: 600, creep: 0.0015, punch: [[W.canary - 3, 0.006]] },
};
/** impact flip-shakes: sign flips every frame, decays over 7 f */
export const KICKS: { f: number; amp: number }[] = [{ f: DROP_AT + 3, amp: 0.035 }, { f: W.laughs - 1, amp: 0.012 }];

export const camAt = (id: number, f: number) => {
  const c = CAMS[id];
  const k = smooth((f - c.g0) / Math.max(1, c.g1 - c.g0));
  let pos = lerp3(c.k0.pos, c.k1.pos, k);
  const look = lerp3(c.k0.look, c.k1.look, k);
  const fov = c.k0.fov + (c.k1.fov - c.k0.fov) * k, roll = c.k0.roll + (c.k1.roll - c.k0.roll) * k;
  // creep: the camera keeps moving toward the look point (extra push on punch words)
  const s = SHOTS[id - 1];
  let push = Math.max(0, f - s.a) * c.creep;
  for (const [pf, amt] of c.punch ?? []) push += amt * Math.max(0, Math.min(8, f - pf));
  pos = lerp3(pos, look, Math.min(0.5, push));
  // kicks
  let kick = 0;
  for (const kk of KICKS) { const n = f - kk.f; if (n >= 0 && n < 7) kick += kk.amp * (1 - n / 7) * (n % 2 ? -1 : 1); }
  return { pos: [pos[0] + kick * 0.6, pos[1] + kick, pos[2]] as V3, look, fov, roll: (roll * Math.PI) / 180 + kick * 0.6 };
};

// ---------------- lens blur (cInf px at 1080 wide) ----------------
// Close-ups 12-14, mediums 10-12, wides 0; focus on the eyes / the bird.
type Dof = { f: number; cInf: number; dur?: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 15, focus: () => [0.44, 0.42, -4.94] },
  { f: 60, cInf: 10, dur: 40, focus: () => [0.1, 0.9, -5.05] },
  { f: 108, cInf: 10, focus: (f) => [0.05, 0.9, owenZ(f)] },
  { f: 196, cInf: 11, focus: () => [-0.3, 1.2, Z_CREW] },
  { f: 246, cInf: 13, focus: () => [-0.75, 1.22, Z_CREW] },
  { f: 290, cInf: 14, focus: () => [0.66, 0.46, Z_CREW + 0.2] },
  { f: DROP_AT + 2, cInf: 12, dur: 8, focus: () => [0.66, 0.36, Z_CREW + 0.2] },
  { f: 356, cInf: 9, focus: () => [PX, 0.95, -6.2] },
  { f: 414, cInf: 12, focus: () => [PX + 3.1, 0.98, -4.0] },
  { f: 512, cInf: 11, focus: () => [PX + 3.05, 1.1, -4.0] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

// ---------------- story state ----------------
/** Owen's walk in shot 2: toward the lens (cards always face the camera), the camera backs off ahead of him */
export const owenZ = (f: number) => (f < 108 ? -5 : f < 196 ? -17.4 + 2.5 * ((f - 108) / 88) : Z_CREW);
export const ZC = Z_CREW;
/** singing amount 0..1 at frame f (stops on "stops") */
export const singAt = (f: number) => (f < W.stops - 2 ? 0.5 + 0.5 * Math.sin(f * 0.9) : 0);
/** the bird: perch -> sway (from "stops") -> fallen (DROP_AT) -> wake in the oxygen cage */
export const birdAt = (f: number): { pose: "perch" | "sway" | "fallen" | "wake"; sway: number; fall: number } => {
  if (f < W.stops + 4) return { pose: "perch", sway: 0, fall: 0 };
  if (f < DROP_AT) { const u = (f - W.stops - 4) / (DROP_AT - W.stops - 4); return { pose: "sway", sway: Math.sin(u * 9) * (8 + 22 * u), fall: 0 }; }
  return { pose: "fallen", sway: 0, fall: clamp01((f - DROP_AT) / 4) };
};
/** water fill 0..1 in the teacup and the bucket (shot 7): same tap flow, the cup is ~25x smaller */
export const fillAt = (f: number) => {
  const t = Math.max(0, f - 420) / FPS;
  return { cup: clamp01(t / 1.9), bucket: clamp01(t / 48), overflow: clamp01((f - 420 - 1.9 * FPS) / 6) };
};
