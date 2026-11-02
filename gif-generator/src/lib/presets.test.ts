import { describe, expect, it } from "vitest";
import { buildPrompt } from "./presets";

describe("buildPrompt", () => {
  it("appends style modifiers and a loop hint", () => {
    const p = buildPrompt("  a cat   dancing ", "pixel-art");
    expect(p.startsWith("a cat dancing, pixel art")).toBe(true);
    expect(p).toContain("seamless looping animation");
  });

  it("adds no style text for the 'none' preset", () => {
    expect(buildPrompt("waves", "none")).toBe("waves, seamless looping animation");
  });
});
