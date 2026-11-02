import {
  LIMITS,
  RESOLUTIONS,
  STYLE_IDS,
  type GifOptions,
  type Mode,
  type Resolution,
  type StyleId,
} from "./presets";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

export interface DecodedImage {
  mime: string;
  bytes: Buffer;
}

/** Parse a base64 image data URL, enforcing type and size limits. */
export function decodeImageDataUrl(input: unknown): Result<DecodedImage> {
  if (typeof input !== "string") return fail("Image must be a data URL string.");
  const match = DATA_URL_RE.exec(input);
  if (!match) return fail("Image must be a PNG, JPEG, WebP or GIF data URL.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0) return fail("Image is empty.");
  if (bytes.length > LIMITS.imageMaxBytes) {
    return fail(`Image is larger than ${LIMITS.imageMaxBytes / 1024 / 1024} MB.`);
  }
  return ok({ mime: match[1], bytes });
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseStyle(value: unknown): StyleId {
  return STYLE_IDS.includes(value as StyleId) ? (value as StyleId) : "none";
}

export function parseGifOptions(raw: Record<string, unknown>): GifOptions {
  const width = Number(raw.width);
  return {
    fps: clampInt(raw.fps, LIMITS.fps.min, LIMITS.fps.max, LIMITS.fps.default),
    width: (RESOLUTIONS as readonly number[]).includes(width)
      ? (width as Resolution)
      : 384,
    duration: clampInt(
      raw.duration,
      LIMITS.duration.min,
      LIMITS.duration.max,
      LIMITS.duration.default,
    ),
    boomerang: raw.boomerang === true,
    style: parseStyle(raw.style),
  };
}

export interface GenerateRequest {
  mode: Mode;
  prompt: string;
  style: StyleId;
  image?: DecodedImage;
}

/** Validate the body of POST /api/generate. */
export function parseGenerateRequest(body: unknown): Result<GenerateRequest> {
  if (!body || typeof body !== "object") return fail("Request body must be JSON.");
  const raw = body as Record<string, unknown>;

  const mode = raw.mode;
  if (mode !== "text" && mode !== "image") return fail('mode must be "text" or "image".');

  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  if (prompt.length > LIMITS.promptMaxLength) {
    return fail(`Prompt must be at most ${LIMITS.promptMaxLength} characters.`);
  }
  if (mode === "text" && prompt.length < 3) {
    return fail("Please describe the GIF you want (at least 3 characters).");
  }

  const style = parseStyle(raw.style);

  if (mode === "image") {
    const image = decodeImageDataUrl(raw.image);
    if (!image.ok) return image;
    return ok({ mode, prompt, style, image: image.value });
  }
  return ok({ mode, prompt, style });
}

/**
 * Only fetch generated media from Replicate's CDN. This prevents the /api/gif
 * route from being abused to make the server download arbitrary URLs (SSRF).
 */
export function isAllowedMediaUrl(input: unknown): input is string {
  if (typeof input !== "string") return false;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return host === "replicate.delivery" || host.endsWith(".replicate.delivery");
}
