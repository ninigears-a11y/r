import { put } from "@vercel/blob";
import { MAX_GIF_BYTES } from "@/lib/ffmpeg";
import { parseGifInfo } from "@/lib/gif-info";
import { isSharingConfigured } from "@/lib/share";

/**
 * POST /api/share — body: raw image/gif bytes.
 * Hosts the GIF on Vercel Blob and returns a public URL to send to friends.
 */
export async function POST(request: Request) {
  if (!isSharingConfigured()) {
    return Response.json({ error: "Link sharing is not configured on this server." }, { status: 501 });
  }
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_GIF_BYTES + 64 * 1024 || !parseGifInfo(bytes)) {
    return Response.json({ error: "Send a GIF of up to 4 MB." }, { status: 400 });
  }
  try {
    const blob = await put("gifs/nome.gif", bytes, {
      access: "public",
      contentType: "image/gif",
      addRandomSuffix: true,
    });
    return Response.json({ url: blob.url }, { status: 201 });
  } catch (err) {
    console.error("[share]", err);
    return Response.json({ error: "Could not create a share link." }, { status: 502 });
  }
}
