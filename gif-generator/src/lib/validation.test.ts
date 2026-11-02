import { describe, expect, it } from "vitest";
import {
  decodeImageDataUrl,
  isAllowedMediaUrl,
  parseGenerateRequest,
  parseGifOptions,
} from "./validation";

const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

describe("parseGenerateRequest", () => {
  it("accepts a valid text request", () => {
    const r = parseGenerateRequest({ mode: "text", prompt: "a cat", style: "anime" });
    expect(r).toEqual({ ok: true, value: { mode: "text", prompt: "a cat", style: "anime" } });
  });

  it("rejects short prompts in text mode", () => {
    expect(parseGenerateRequest({ mode: "text", prompt: "hi" }).ok).toBe(false);
  });

  it("rejects unknown modes and non-objects", () => {
    expect(parseGenerateRequest({ mode: "video", prompt: "a cat" }).ok).toBe(false);
    expect(parseGenerateRequest(null).ok).toBe(false);
  });

  it("requires a valid image in image mode", () => {
    expect(parseGenerateRequest({ mode: "image", prompt: "" }).ok).toBe(false);
    const r = parseGenerateRequest({ mode: "image", prompt: "", image: PNG_1PX });
    expect(r.ok && r.value.image?.mime).toBe("image/png");
  });

  it("falls back to the 'none' style for unknown presets", () => {
    const r = parseGenerateRequest({ mode: "text", prompt: "a cat", style: "<script>" });
    expect(r.ok && r.value.style).toBe("none");
  });
});

describe("decodeImageDataUrl", () => {
  it("rejects non-image data URLs", () => {
    expect(decodeImageDataUrl("data:text/html;base64,PGgxPg==").ok).toBe(false);
    expect(decodeImageDataUrl("https://example.com/cat.png").ok).toBe(false);
  });
});

describe("parseGifOptions", () => {
  it("clamps numbers and rejects unsupported widths", () => {
    expect(parseGifOptions({ fps: 999, width: 4000, duration: -2, boomerang: "yes" })).toEqual({
      fps: 24,
      width: 384,
      duration: 1,
      boomerang: false,
      style: "none",
    });
  });

  it("keeps valid values", () => {
    expect(parseGifOptions({ fps: 8, width: 256, duration: 4, boomerang: true, style: "anime" })).toEqual({
      fps: 8,
      width: 256,
      duration: 4,
      boomerang: true,
      style: "anime",
    });
  });
});

describe("isAllowedMediaUrl", () => {
  it.each([
    ["https://replicate.delivery/abc/out.mp4", true],
    ["https://pbxt.replicate.delivery/abc/out.mp4", true],
    ["http://replicate.delivery/abc/out.mp4", false],
    ["https://replicate.delivery.evil.com/x.mp4", false],
    ["https://169.254.169.254/latest/meta-data", false],
    ["file:///etc/passwd", false],
    ["not a url", false],
    [42, false],
  ])("%s → %s", (url, expected) => {
    expect(isAllowedMediaUrl(url)).toBe(expected);
  });
});
