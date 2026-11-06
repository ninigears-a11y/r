import { gifToMp4, MAX_GIF_BYTES } from "@/lib/ffmpeg";
import { parseGifInfo } from "@/lib/gif-info";

export const maxDuration = 60;

/**
 * POST /api/mp4 — body: raw image/gif bytes (a GIF made by this app).
 * Responds with an H.264 MP4 that plays everywhere GIFs don't.
 */
export async function POST(request: Request) {
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_GIF_BYTES + 64 * 1024) {
    return Response.json({ error: "Send a GIF of up to 4 MB." }, { status: 400 });
  }
  const info = parseGifInfo(bytes);
  if (!info) return Response.json({ error: "That isn't a GIF." }, { status: 400 });

  try {
    const mp4 = await gifToMp4(bytes, info);
    return new Response(new Uint8Array(mp4), {
      headers: { "Content-Type": "video/mp4", "Content-Length": String(mp4.length), "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[mp4]", err);
    return Response.json({ error: "Could not convert to MP4." }, { status: 500 });
  }
}
