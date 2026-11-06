import { describe, expect, it } from "vitest";
import {
  decodeImageDataUrl,
  isAllowedMediaUrl,
  parseGenerateRequest,
  parseGifOptions,
} from "./validation";
import { TINY_GIF_DATA_URL } from "@/test/fixtures";

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
    expect(r.ok && r.value.mode === "image" && "mime" in r.value.image && r.value.image.mime).toBe("image/png");
  });

  it("accepts a keyframe URL in image mode, but only from Replicate", () => {
    const good = parseGenerateRequest({ mode: "image", imageUrl: "https://replicate.delivery/k.png" });
    expect(good.ok && good.value.mode === "image" && good.value.image).toEqual({ url: "https://replicate.delivery/k.png" });
    expect(parseGenerateRequest({ mode: "image", imageUrl: "https://evil.example/k.png" }).ok).toBe(false);
  });

  it("accepts an optional character in text mode", () => {
    const r = parseGenerateRequest({ mode: "text", prompt: "Nome dancing in space", character: PNG_1PX });
    expect(r.ok && r.value.mode === "text" && r.value.character?.mime).toBe("image/png");
    expect(parseGenerateRequest({ mode: "text", prompt: "a cat", character: "nope" }).ok).toBe(false);
  });

  it("validates swap requests: an animated GIF plus a character", () => {
    const r = parseGenerateRequest({ mode: "swap", gif: TINY_GIF_DATA_URL, character: PNG_1PX, scene: "character" });
    expect(r.ok).toBe(true);
    if (r.ok && r.value.mode === "swap") {
      expect(r.value.scene).toBe("character");
      expect(r.value.gif.info.frames).toBe(3);
    }
    // Defaults to keeping the original scene.
    const d = parseGenerateRequest({ mode: "swap", gif: TINY_GIF_DATA_URL, character: PNG_1PX });
    expect(d.ok && d.value.mode === "swap" && d.value.scene).toBe("original");
    // A PNG is not a GIF; a character is required.
    expect(parseGenerateRequest({ mode: "swap", gif: PNG_1PX, character: PNG_1PX }).ok).toBe(false);
    expect(parseGenerateRequest({ mode: "swap", gif: TINY_GIF_DATA_URL }).ok).toBe(false);
  });

  it("falls back to the 'none' style for unknown presets", () => {
    const r = parseGenerateRequest({ mode: "text", prompt: "a cat", style: "<script>" });
    expect(r.ok && r.value.mode === "text" && r.value.style).toBe("none");
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
      fps: 30,
      width: 384,
      duration: 0.5,
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
