// Tiny dependency-free GIF header/frame parser. Pure, so it runs in the
// browser (to describe an upload instantly) and on the server (to keep the
// original timing when rebuilding a GIF).

export interface GifInfo {
  width: number;
  height: number;
  frames: number;
  /** Total length of one loop, in milliseconds (as browsers play it). */
  durationMs: number;
  /** Average frames per second. */
  fps: number;
  /** True if the GIF asks to loop (NETSCAPE2.0 extension). */
  loops: boolean;
}

/** Browsers treat delays of 0–1 centiseconds as 10 (100 ms). Match that. */
const effectiveDelay = (cs: number) => (cs <= 1 ? 10 : cs);

export function isGif(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 6 &&
    bytes[0] === 0x47 && // G
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x38 && // 8
    (bytes[4] === 0x37 || bytes[4] === 0x39) && // 7 | 9
    bytes[5] === 0x61 // a
  );
}

/** Returns null if the bytes aren't a readable GIF. */
export function parseGifInfo(bytes: Uint8Array): GifInfo | null {
  if (!isGif(bytes) || bytes.length < 13) return null;
  const u16 = (p: number) => bytes[p] | (bytes[p + 1] << 8);

  const width = u16(6);
  const height = u16(8);
  const packed = bytes[10];
  let p = 13;
  if (packed & 0x80) p += 3 * (1 << ((packed & 0x07) + 1)); // global colour table

  /** Skip a chain of data sub-blocks; returns the index after the terminator. */
  const skipSubBlocks = (start: number) => {
    let q = start;
    while (q < bytes.length) {
      const size = bytes[q];
      q += 1;
      if (size === 0) return q;
      q += size;
    }
    return -1;
  };

  let frames = 0;
  let totalCs = 0;
  let pendingDelay = 0;
  let loops = false;

  while (p < bytes.length) {
    const marker = bytes[p];
    if (marker === 0x3b) break; // trailer
    if (marker === 0x21) {
      const label = bytes[p + 1];
      if (label === 0xf9 && bytes[p + 2] === 4) {
        pendingDelay = u16(p + 4);
      } else if (label === 0xff && bytes[p + 2] === 11) {
        const id = String.fromCharCode(...bytes.subarray(p + 3, p + 14));
        if (id === "NETSCAPE2.0" || id === "ANIMEXTS1.0") loops = true;
      }
      p = skipSubBlocks(p + 2);
    } else if (marker === 0x2c) {
      const localPacked = bytes[p + 9];
      p += 10;
      if (localPacked & 0x80) p += 3 * (1 << ((localPacked & 0x07) + 1));
      p += 1; // LZW minimum code size
      p = skipSubBlocks(p);
      frames += 1;
      totalCs += effectiveDelay(pendingDelay);
      pendingDelay = 0;
    } else {
      break; // corrupt or unknown block — report what we have
    }
    if (p < 0) break;
  }

  if (frames === 0 || width === 0 || height === 0) return null;
  // A single-frame GIF isn't animated; give it a nominal length.
  const durationMs = frames === 1 ? 0 : totalCs * 10;
  return {
    width,
    height,
    frames,
    durationMs,
    fps: durationMs > 0 ? Math.round((frames / (durationMs / 1000)) * 10) / 10 : 0,
    loops,
  };
}
