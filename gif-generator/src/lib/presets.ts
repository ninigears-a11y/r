// Shared constants used by both the UI and the API routes.
// Keep this file free of Node-only imports so client components can use it.

export const STYLE_PRESETS = {
  none: {
    label: "No style",
    prompt: "",
    // How FFmpeg should scale + dither for this look.
    scaleFlags: "lanczos",
    dither: "sierra2_4a",
  },
  "pixel-art": {
    label: "Pixel Art",
    prompt:
      "pixel art, 16-bit retro game sprite style, crisp pixels, limited palette",
    scaleFlags: "neighbor",
    dither: "none",
  },
  "3d-render": {
    label: "3D Render",
    prompt:
      "3D render, octane render, soft studio lighting, high detail, smooth materials",
    scaleFlags: "lanczos",
    dither: "sierra2_4a",
  },
  anime: {
    label: "Anime",
    prompt:
      "anime style, cel shaded, vibrant colors, clean line art, studio animation",
    scaleFlags: "lanczos",
    dither: "bayer",
  },
  cinematic: {
    label: "Cinematic",
    prompt:
      "cinematic shot, dramatic lighting, shallow depth of field, film grain, 35mm",
    scaleFlags: "lanczos",
    dither: "sierra2_4a",
  },
} as const;

export type StyleId = keyof typeof STYLE_PRESETS;
export const STYLE_IDS = Object.keys(STYLE_PRESETS) as StyleId[];

export type Mode = "text" | "image";

/** Output widths offered in the UI. Height follows the source aspect ratio. */
export const RESOLUTIONS = [256, 320, 384, 480] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export const LIMITS = {
  fps: { min: 4, max: 24, default: 12 },
  duration: { min: 1, max: 6, default: 3 }, // seconds
  promptMaxLength: 500,
  // Vercel caps request bodies at 4.5 MB; the client downsizes uploads well below that.
  imageMaxBytes: 4 * 1024 * 1024,
} as const;

export interface GifOptions {
  fps: number;
  width: Resolution;
  duration: number;
  boomerang: boolean;
  style: StyleId;
}

export const DEFAULT_GIF_OPTIONS: GifOptions = {
  fps: LIMITS.fps.default,
  width: 384,
  duration: LIMITS.duration.default,
  boomerang: false,
  style: "pixel-art",
};

/** Combine the user's prompt with the chosen style preset's modifiers. */
export function buildPrompt(prompt: string, style: StyleId): string {
  const base = prompt.trim().replace(/\s+/g, " ");
  const modifiers = STYLE_PRESETS[style].prompt;
  const loopHint = "seamless looping animation";
  return [base, modifiers, loopHint].filter(Boolean).join(", ");
}
