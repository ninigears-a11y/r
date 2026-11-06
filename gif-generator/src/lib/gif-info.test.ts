import { describe, expect, it } from "vitest";
import { tinyGifBytes } from "@/test/fixtures";
import { isGif, parseGifInfo } from "./gif-info";

describe("parseGifInfo", () => {
  it("reads size, frame count, timing and looping", () => {
    expect(parseGifInfo(tinyGifBytes())).toEqual({
      width: 8,
      height: 6,
      frames: 3,
      durationMs: 600,
      fps: 5,
      loops: true,
    });
  });

  it("rejects non-GIF data", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isGif(png)).toBe(false);
    expect(parseGifInfo(png)).toBeNull();
    expect(parseGifInfo(new Uint8Array())).toBeNull();
  });

  it("survives a truncated file", () => {
    const bytes = tinyGifBytes();
    const info = parseGifInfo(bytes.subarray(0, bytes.length - 40));
    expect(info === null || info.frames <= 3).toBe(true);
  });
});
