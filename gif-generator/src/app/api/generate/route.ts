import { gifToModelVideo } from "@/lib/ffmpeg";
import { buildPrompt } from "@/lib/presets";
import {
  isReplicateConfigured,
  startCharacterSwap,
  startImageToVideo,
  startKeyframe,
  startTextToVideo,
} from "@/lib/replicate";
import { parseGenerateRequest } from "@/lib/validation";

// Swap mode transcodes the GIF and uploads two files before returning.
export const maxDuration = 60;

/**
 * POST /api/generate
 * Starts an AI job and returns immediately with its id; the client polls
 * GET /api/generate/:id (models take 30 s – a few minutes).
 *
 *  - swap:  GIF + character → Wan 2.2 Animate (replace / animation)
 *  - image: image (or a keyframe URL) + motion prompt → image-to-video
 *  - text:  prompt → text-to-video; with a character, first a keyframe
 *           (`stage: "keyframe"`) that the client then sends to image mode
 *
 * Without REPLICATE_API_TOKEN the app runs in demo mode: image/text requests
 * are answered with `demo: true` and the GIF route animates locally (no AI).
 * Character swap has no honest offline fallback, so it returns 501.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseGenerateRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const req = parsed.value;

  if (!isReplicateConfigured()) {
    if (req.mode === "swap") {
      return Response.json(
        {
          error:
            "GIF to Nome needs an AI model. Add a REPLICATE_API_TOKEN to the server's environment to enable it.",
          needsSetup: true,
        },
        { status: 501 },
      );
    }
    return Response.json({ id: "demo", status: "succeeded", output: null, error: null, demo: true });
  }

  try {
    if (req.mode === "swap") {
      const video = await gifToModelVideo(req.gif.bytes, req.gif.info);
      const job = await startCharacterSwap({
        video: { mime: "video/mp4", bytes: video },
        character: req.character,
        scene: req.scene,
      });
      return Response.json({ ...job, stage: "swap", demo: false }, { status: 201 });
    }
    if (req.mode === "image") {
      const job = await startImageToVideo(buildPrompt(req.prompt || "subtle natural motion", req.style), req.image);
      return Response.json({ ...job, stage: "video", demo: false }, { status: 201 });
    }
    if (req.character) {
      const job = await startKeyframe(buildPrompt(req.prompt, req.style).replace(/, seamless looping animation$/, ""), req.character);
      return Response.json({ ...job, stage: "keyframe", demo: false }, { status: 201 });
    }
    const job = await startTextToVideo(buildPrompt(req.prompt, req.style));
    return Response.json({ ...job, stage: "video", demo: false }, { status: 201 });
  } catch (err) {
    console.error("[generate]", err);
    return Response.json({ error: "Could not start generation. Please try again." }, { status: 502 });
  }
}
