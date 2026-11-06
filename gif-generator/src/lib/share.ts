import "server-only";

/**
 * Public links for "Share" and "Copy link" are optional: they need somewhere
 * to host the GIF. With Vercel Blob connected (BLOB_READ_WRITE_TOKEN), GIFs
 * are uploaded there; otherwise the UI shares the file itself (Web Share API)
 * or offers a download.
 */
export function isSharingConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
