import { describe, expect, it } from "vitest";
import { buildFfmpegArgs, buildModelVideoArgs, buildMp4Args, modelVideoSize, mp4Loops } from "./gif-args";
import { DEFAULT_GIF_OPTIONS } from "./presets";

const graphOf = (args: string[]) => args[args.indexOf("-filter_complex") + 1];

describe("buildFfmpegArgs", () => {
  it("encodes a video with a 2-pass palette and infinite loop", () => {
    const args = buildFfmpegArgs({ kind: "video", path: "/tmp/in.mp4" }, { ...DEFAULT_GIF_OPTIONS, style: "cinematic" }, "/tmp/out.gif");
    const graph = graphOf(args);
    expect(args).toContain("/tmp/in.mp4");
    expect(args.slice(-3)).toEqual(["-loop", "0", "/tmp/out.gif"]);
    expect(graph).toContain("fps=12,scale=384:-2:flags=lanczos");
    expect(graph).toContain("palettegen=max_colors=256");
    expect(graph).toContain("paletteuse=dither=sierra2_4a");
  });

  it("uses nearest-neighbour scaling and no dithering for pixel art", () => {
    const graph = graphOf(buildFfmpegArgs({ kind: "video", path: "in.mp4" }, { ...DEFAULT_GIF_OPTIONS, style: "pixel-art" }, "o.gif"));
    expect(graph).toContain("flags=neighbor");
    expect(graph).toContain("dither=none");
  });

  it("halves the clip and appends a reversed copy in boomerang mode", () => {
    const args = buildFfmpegArgs({ kind: "video", path: "in.mp4" }, { ...DEFAULT_GIF_OPTIONS, duration: 4, boomerang: true }, "o.gif");
    expect(args[args.indexOf("-t") + 1]).toBe("2.00");
    expect(graphOf(args)).toContain("reverse");
  });

  it("loops a still image with a seamless sine zoom", () => {
    const args = buildFfmpegArgs({ kind: "image", path: "in.jpg" }, { ...DEFAULT_GIF_OPTIONS, fps: 10, duration: 3 }, "o.gif");
    expect(args).toContain("-loop");
    expect(graphOf(args)).toContain("sin(2*PI*on/30)");
  });

  it("uses a lavfi source in demo mode and honours maxColors", () => {
    const args = buildFfmpegArgs({ kind: "demo" }, DEFAULT_GIF_OPTIONS, "o.gif", 64);
    expect(args).toContain("lavfi");
    expect(graphOf(args)).toContain("max_colors=64");
  });
});

describe("character-swap and MP4 helpers", () => {
  it("upscales small GIFs to model resolution and keeps sizes even", () => {
    expect(modelVideoSize(200, 150)).toEqual({ width: 640, height: 480 });
    expect(modelVideoSize(1920, 1080)).toEqual({ width: 1280, height: 720 });
    expect(modelVideoSize(481, 481)).toEqual({ width: 482, height: 482 });
  });

  it("builds a constant-frame-rate MP4 for the model, capped in length", () => {
    const args = buildModelVideoArgs("in.gif", "out.mp4", { width: 640, height: 480 }, 8);
    expect(args.slice(args.indexOf("-t"), args.indexOf("-t") + 2)).toEqual(["-t", "8"]);
    expect(args.join(" ")).toContain("fps=24,scale=640:480");
    expect(args).toContain("libx264");
  });

  it("loops short GIFs so the MP4 lasts a few seconds", () => {
    expect(mp4Loops(600)).toBe(5);
    expect(mp4Loops(4000)).toBe(1);
    expect(mp4Loops(0)).toBe(1);
    expect(buildMp4Args("a.gif", "b.mp4", 5)).toContain("4");
  });
});
