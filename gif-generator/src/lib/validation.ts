import {
  LIMITS,
  RESOLUTIONS,
  STYLE_IDS,
  type GifOptions,
  type Resolution,
  type StyleId,
  type SwapScene,
} from "./presets";
import { parseGifInfo, type GifInfo } from "./gif-info";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

export interface DecodedImage {
  mime: string;
  bytes: Buffer;
}

/** Parse a base64 image data URL, enforcing type and size limits. */
export function decodeImageDataUrl(
  input: unknown,
  maxBytes: number = LIMITS.imageMaxBytes,
): Result<DecodedImage> {
  if (typeof input !== "string") return fail("Image must be a data URL string.");
  const match = DATA_URL_RE.exec(input);
  if (!match) return fail("Image must be a PNG, JPEG, WebP or GIF data URL.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0) return fail("Image is empty.");
  if (bytes.length > maxBytes) {
    return fail(`File is larger than ${maxBytes / 1024 / 1024} MB.`);
  }
  return ok({ mime: match[1], bytes });
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Seconds, to 0.1 s — rebuilt GIFs can match a source GIF's exact length. */
function clampDuration(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return LIMITS.duration.default;
  const { min, max } = LIMITS.outputDuration;
  return Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;
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
    duration: clampDuration(raw.duration),
    boomerang: raw.boomerang === true,
    style: parseStyle(raw.style),
  };
}

export interface DecodedGif extends DecodedImage {
  info: GifInfo;
}

/** Decode a GIF data URL and make sure it is a real, animated GIF. */
export function decodeGifDataUrl(input: unknown): Result<DecodedGif> {
  const decoded = decodeImageDataUrl(input, LIMITS.gifMaxBytes);
  if (!decoded.ok) return decoded;
  const info = parseGifInfo(decoded.value.bytes);
  if (decoded.value.mime !== "image/gif" || !info) return fail("Please upload a GIF file.");
  if (info.frames < 2) return fail("That GIF has only one frame — please choose an animated GIF.");
  return ok({ ...decoded.value, info });
}

export type GenerateRequest =
  | {
      mode: "text";
      prompt: string;
      style: StyleId;
      /** Optional character reference: the server first draws a keyframe with it. */
      character?: DecodedImage;
    }
  | {
      mode: "image";
      prompt: string;
      style: StyleId;
      /** An uploaded image, or a keyframe URL produced by a previous step. */
      image: DecodedImage | { url: string };
    }
  | {
      mode: "swap";
      gif: DecodedGif;
      character: DecodedImage;
      scene: SwapScene;
    };

function parsePrompt(raw: Record<string, unknown>): Result<string> {
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  if (prompt.length > LIMITS.promptMaxLength) {
    return fail(`Prompt must be at most ${LIMITS.promptMaxLength} characters.`);
  }
  return ok(prompt);
}

/** Validate the body of POST /api/generate. */
export function parseGenerateRequest(body: unknown): Result<GenerateRequest> {
  if (!body || typeof body !== "object") return fail("Request body must be JSON.");
  const raw = body as Record<string, unknown>;
  const mode = raw.mode;

  if (mode === "swap") {
    const gif = decodeGifDataUrl(raw.gif);
    if (!gif.ok) return gif;
    const character = decodeImageDataUrl(raw.character);
    if (!character.ok) return fail(`Character image: ${character.error}`);
    const scene: SwapScene = raw.scene === "character" ? "character" : "original";
    return ok({ mode, gif: gif.value, character: character.value, scene });
  }

  if (mode !== "text" && mode !== "image") {
    return fail('mode must be "swap", "image" or "text".');
  }

  const prompt = parsePrompt(raw);
  if (!prompt.ok) return prompt;
  const style = parseStyle(raw.style);

  if (mode === "text") {
    if (prompt.value.length < 3) {
      return fail("Please describe the GIF you want (at least 3 characters).");
    }
    if (raw.character === undefined || raw.character === null) {
      return ok({ mode, prompt: prompt.value, style });
    }
    const character = decodeImageDataUrl(raw.character);
    if (!character.ok) return fail(`Character image: ${character.error}`);
    return ok({ mode, prompt: prompt.value, style, character: character.value });
  }

  if (raw.imageUrl !== undefined) {
    if (!isAllowedMediaUrl(raw.imageUrl)) return fail("imageUrl must be a Replicate output URL.");
    return ok({ mode, prompt: prompt.value, style, image: { url: raw.imageUrl } });
  }
  const image = decodeImageDataUrl(raw.image);
  if (!image.ok) return image;
  return ok({ mode, prompt: prompt.value, style, image: image.value });
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
