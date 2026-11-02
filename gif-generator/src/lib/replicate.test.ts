import { describe, expect, it } from "vitest";
import { extractOutputUrl } from "./replicate";

describe("extractOutputUrl", () => {
  it("handles string, array and object outputs", () => {
    expect(extractOutputUrl("https://replicate.delivery/a.mp4")).toBe("https://replicate.delivery/a.mp4");
    expect(extractOutputUrl(["https://replicate.delivery/f.png", "https://replicate.delivery/v.mp4"])).toBe(
      "https://replicate.delivery/v.mp4",
    );
    expect(extractOutputUrl({ video: "https://replicate.delivery/v.mp4" })).toBe("https://replicate.delivery/v.mp4");
    expect(extractOutputUrl(null)).toBeNull();
  });
});
