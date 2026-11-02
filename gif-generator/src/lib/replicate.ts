import "server-only";

import type { Mode } from "./presets";
import type { DecodedImage } from "./validation";

/**
 * Minimal Replicate REST client (no SDK needed).
 * Docs: https://replicate.com/docs/reference/http
 *
 * Models are configurable so you can swap in whatever text/image-to-video model
 * is best (or cheapest) today without touching code.
 */
const API = "https://api.replicate.com/v1";

const DEFAULT_MODELS: Record<Mode, string> = {
  text: "wan-video/wan-2.2-t2v-fast",
  image: "wan-video/wan-2.2-i2v-fast",
};

export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export interface PredictionView {
  id: string;
  status: PredictionStatus;
  /** URL of the generated video/animation once status === "succeeded". */
  output: string | null;
  error: string | null;
}

interface ReplicatePrediction {
  id: string;
  status: PredictionStatus;
  output: unknown;
  error: unknown;
}

export function isReplicateConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN);
}

function token(): string {
  const t = process.env.REPLICATE_API_TOKEN;
  if (!t) throw new Error("REPLICATE_API_TOKEN is not set.");
  return t;
}

export function modelFor(mode: Mode): string {
  const env = mode === "text" ? process.env.REPLICATE_TEXT_MODEL : process.env.REPLICATE_IMAGE_MODEL;
  return env || DEFAULT_MODELS[mode];
}

/** Extra model inputs, e.g. {"resolution":"480p","num_frames":81}. */
function extraInput(): Record<string, unknown> {
  const raw = process.env.REPLICATE_EXTRA_INPUT;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.warn("REPLICATE_EXTRA_INPUT is not valid JSON; ignoring it.");
    return {};
  }
}

async function replicateFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Replicate API error ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** Upload an image to Replicate's Files API and return a URL models can read. */
async function uploadImage(image: DecodedImage): Promise<string> {
  const form = new FormData();
  const ext = image.mime.split("/")[1];
  form.append("content", new Blob([new Uint8Array(image.bytes)], { type: image.mime }), `upload.${ext}`);
  const file = await replicateFetch<{ urls: { get: string } }>("/files", { method: "POST", body: form });
  return file.urls.get;
}

/** Pick the first media URL out of a model's output (string or array of strings). */
export function extractOutputUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const urls = output.filter((o): o is string => typeof o === "string");
    return urls.find((u) => /\.(mp4|webm|gif|mov)(\?|$)/i.test(u)) ?? urls.at(-1) ?? null;
  }
  if (output && typeof output === "object" && "video" in output) {
    return extractOutputUrl((output as { video: unknown }).video);
  }
  return null;
}

function toView(p: ReplicatePrediction): PredictionView {
  return {
    id: p.id,
    status: p.status,
    output: p.status === "succeeded" ? extractOutputUrl(p.output) : null,
    error: p.error ? String(p.error) : null,
  };
}

export async function createPrediction(args: {
  mode: Mode;
  prompt: string;
  image?: DecodedImage;
}): Promise<PredictionView> {
  const input: Record<string, unknown> = { prompt: args.prompt, ...extraInput() };
  if (args.mode === "image") {
    if (!args.image) throw new Error("Image mode requires an image.");
    input.image = await uploadImage(args.image);
  }

  const prediction = await replicateFetch<ReplicatePrediction>(
    `/models/${modelFor(args.mode)}/predictions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    },
  );
  return toView(prediction);
}

export async function getPrediction(id: string): Promise<PredictionView> {
  if (!/^[a-z0-9]+$/i.test(id)) throw new Error("Invalid prediction id.");
  return toView(await replicateFetch<ReplicatePrediction>(`/predictions/${id}`));
}
