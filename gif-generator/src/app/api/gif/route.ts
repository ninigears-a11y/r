import { createGif, type GifInput } from "@/lib/ffmpeg";
import { isReplicateConfigured } from "@/lib/replicate";
import { decodeImageDataUrl, isAllowedMediaUrl, parseGifOptions } from "@/lib/validation";

// GIF encoding is CPU-bound; give it room on Vercel (Hobby allows up to 60s).
export const maxDuration = 60;

/**
 * POST /api/gif
 * Body: { videoUrl?, image?, fps, width, duration, boomerang, style }
 *  - videoUrl: a finished Replicate output → transcoded into a looping GIF
 *  - image (demo mode only): a still image → animated with a looping zoom
 *  - neither (demo mode only): a procedural animation
 * Responds with the raw image/gif bytes.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Request body must be JSON." }, { status: 400 });

  const options = parseGifOptions(body);
  let input: GifInput;

  if (body.videoUrl !== undefined) {
    if (!isAllowedMediaUrl(body.videoUrl)) {
      return Response.json({ error: "videoUrl must be a Replicate output URL." }, { status: 400 });
    }
    input = { kind: "video", url: body.videoUrl };
  } else if (isReplicateConfigured()) {
    // With a real API configured, only AI outputs are converted.
    return Response.json({ error: "videoUrl is required." }, { status: 400 });
  } else if (body.image !== undefined) {
    const image = decodeImageDataUrl(body.image);
    if (!image.ok) return Response.json({ error: image.error }, { status: 400 });
    input = { kind: "image", bytes: image.value.bytes };
  } else {
    input = { kind: "demo" };
  }

  try {
    const gif = await createGif(input, options);
    return new Response(new Uint8Array(gif), {
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": String(gif.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[gif]", err);
    const message = err instanceof Error && err.message.startsWith("GIF is")
      ? err.message
      : "Failed to build the GIF.";
    return Response.json({ error: message }, { status: 500 });
  }
}
