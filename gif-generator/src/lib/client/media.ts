// Browser-only helpers for reading uploads.
import { parseGifInfo, type GifInfo } from "@/lib/gif-info";
import { LIMITS } from "@/lib/presets";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIDE = 1024;

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Prepare a character image for the AI: downscale to ≤1024 px and flatten any
 * transparency onto white (a transparent PNG would otherwise turn black).
 */
export async function characterToDataUrl(source: Blob): Promise<string> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.92);
}

let nomeCache: Promise<string> | null = null;
/** Nome's own reference sheet, ready to send as a character. */
export function nomeCharacter(): Promise<string> {
  nomeCache ??= fetch("/nome/nome-character.png")
    .then((r) => r.blob())
    .then(characterToDataUrl)
    .catch((err) => {
      nomeCache = null;
      throw err;
    });
  return nomeCache;
}

export interface GifUpload {
  name: string;
  size: number;
  dataUrl: string;
  info: GifInfo;
}

/** Read and validate a GIF upload. Throws a user-facing message on failure. */
export async function readGif(file: File): Promise<GifUpload> {
  if (file.type !== "image/gif" && !file.name.toLowerCase().endsWith(".gif")) {
    throw new Error("Please choose a .gif file.");
  }
  if (file.size > LIMITS.gifMaxBytes) {
    throw new Error(`That GIF is ${formatBytes(file.size)}. Please use one under ${formatBytes(LIMITS.gifMaxBytes)}.`);
  }
  const info = parseGifInfo(new Uint8Array(await file.arrayBuffer()));
  if (!info) throw new Error("That file doesn't look like a valid GIF.");
  if (info.frames < 2) throw new Error("That GIF isn't animated — it only has one frame.");
  const dataUrl = await blobToDataUrl(file);
  return { name: file.name, size: file.size, info, dataUrl: dataUrl.replace(/^data:[^;]*;/, "data:image/gif;") };
}

/** Up to `count` evenly spaced frames, using WebCodecs where available. */
export async function gifFilmstrip(dataUrl: string, count = 6): Promise<string[]> {
  if (typeof window === "undefined" || !("ImageDecoder" in window)) return [];
  try {
    const data = await (await fetch(dataUrl)).arrayBuffer();
    const decoder = new ImageDecoder({ data, type: "image/gif" });
    await decoder.tracks.ready;
    const total = decoder.tracks.selectedTrack?.frameCount ?? 0;
    if (total < 2) return [];
    const picks = Array.from({ length: Math.min(count, total) }, (_, i) =>
      Math.round((i * (total - 1)) / Math.max(1, Math.min(count, total) - 1)),
    );
    const out: string[] = [];
    for (const frameIndex of picks) {
      const { image } = await decoder.decode({ frameIndex });
      const canvas = document.createElement("canvas");
      const h = 72;
      canvas.width = Math.round((image.displayWidth / image.displayHeight) * h);
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      out.push(canvas.toDataURL("image/png"));
    }
    decoder.close();
    return out;
  } catch {
    return [];
  }
}
