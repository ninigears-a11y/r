import "server-only";

import type { SwapScene } from "./presets";
import type { DecodedImage } from "./validation";

/**
 * Minimal Replicate REST client (no SDK needed).
 * Docs: https://replicate.com/docs/reference/http
 *
 * Models are configurable so you can swap in whatever text/image-to-video model
 * is best (or cheapest) today without touching code.
 */
// Overridable so the full pipeline can be exercised against a local mock.
const API = process.env.REPLICATE_API_URL || "https://api.replicate.com/v1";

/**
 * One model per pipeline step. Each can be overridden with an env var.
 *  - text:     text → video
 *  - image:    image (+ motion prompt) → video
 *  - keyframe: character reference + prompt → a first frame featuring that character
 *  - swap:     video + character → same video with the character replaced
 *              (Wan 2.2 Animate "replace": tracks pose/expression, masks the
 *              original subject, relights and composites the new one per frame)
 *  - move:     video + character → the character performing the video's motion
 *              in the character image's own scene (Wan 2.2 Animate "animation")
 */
export type Step = "text" | "image" | "keyframe" | "swap" | "move";

const DEFAULT_MODELS: Record<Step, string> = {
  text: "wan-video/wan-2.2-t2v-fast",
  image: "wan-video/wan-2.2-i2v-fast",
  keyframe: "google/nano-banana",
  swap: "wan-video/wan-2.2-animate-replace",
  move: "wan-video/wan-2.2-animate-animation",
};

const MODEL_ENV: Record<Step, string> = {
  text: "REPLICATE_TEXT_MODEL",
  image: "REPLICATE_IMAGE_MODEL",
  keyframe: "REPLICATE_KEYFRAME_MODEL",
  swap: "REPLICATE_SWAP_MODEL",
  move: "REPLICATE_MOVE_MODEL",
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

export function modelFor(step: Step): string {
  return process.env[MODEL_ENV[step]] || DEFAULT_MODELS[step];
}

/**
 * Extra model inputs from a JSON env var, e.g. REPLICATE_EXTRA_INPUT=
 * {"resolution":"480p"} for the video models, or REPLICATE_SWAP_EXTRA_INPUT
 * for the character-swap models.
 */
function extraInput(name = "REPLICATE_EXTRA_INPUT"): Record<string, unknown> {
  const raw = process.env[name];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.warn(`${name} is not valid JSON; ignoring it.`);
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

/** Upload a file to Replicate's Files API and return a URL models can read. */
async function uploadFile(media: DecodedImage): Promise<string> {
  const form = new FormData();
  const ext = media.mime.split("/")[1];
  form.append("content", new Blob([new Uint8Array(media.bytes)], { type: media.mime }), `upload.${ext}`);
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

async function run(step: Step, input: Record<string, unknown>): Promise<PredictionView> {
  const prediction = await replicateFetch<ReplicatePrediction>(`/models/${modelFor(step)}/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  return toView(prediction);
}

/** Text → video. */
export function startTextToVideo(prompt: string) {
  return run("text", { prompt, ...extraInput() });
}

/** Image (+ motion prompt) → video. `image` may be bytes or a Replicate output URL. */
export async function startImageToVideo(prompt: string, image: DecodedImage | { url: string }) {
  const url = "url" in image ? image.url : await uploadFile(image);
  return run("image", { prompt, image: url, ...extraInput() });
}

/**
 * Character reference + prompt → a single keyframe that shows *that* character
 * in the described scene. It then feeds image → video, so text-to-GIF can star
 * the user's own character.
 */
export async function startKeyframe(prompt: string, character: DecodedImage) {
  return run("keyframe", {
    prompt:
      `${prompt}. The main character is exactly the character from the reference image: ` +
      "keep its shape, proportions, colours, outline and face identical. " +
      "One single frame, the character fully visible, clean composition.",
    image_input: [await uploadFile(character)],
    output_format: "png",
    ...extraInput("REPLICATE_KEYFRAME_EXTRA_INPUT"),
  });
}

/**
 * Original clip + character → the same animation performed by the character.
 * Field names follow the Wan 2.2 Animate models on Replicate (`video`,
 * `character_image`); override or extend them with REPLICATE_SWAP_EXTRA_INPUT.
 */
export async function startCharacterSwap(args: {
  video: DecodedImage;
  character: DecodedImage;
  scene: SwapScene;
}) {
  const [video, character] = await Promise.all([uploadFile(args.video), uploadFile(args.character)]);
  return run(args.scene === "original" ? "swap" : "move", {
    video,
    character_image: character,
    ...extraInput("REPLICATE_SWAP_EXTRA_INPUT"),
  });
}

export async function getPrediction(id: string): Promise<PredictionView> {
  if (!/^[a-z0-9]+$/i.test(id)) throw new Error("Invalid prediction id.");
  return toView(await replicateFetch<ReplicatePrediction>(`/predictions/${id}`));
}
