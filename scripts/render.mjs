// usage: node scripts/render.mjs <out.mp4> [first-last] [dpr]   renders CanaryShort with renderMedia (SwiftShader, N tabs)
// NOTE: keep MSAA at 4 (default). MSAA=0 renders near-black frames with this post chain (seen 2026-11-01).
import fs from "node:fs";
import path from "node:path";
const { bundle } = await import("@remotion/bundler");
const { renderMedia, selectComposition } = await import("@remotion/renderer");
const [out, range, dpr = "0.5"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME || "/opt/pw-browsers/chromium";
const chromiumOptions = { gl: process.env.GL || "swangle" };
const inputProps = { post: { dpr: Number(dpr), msaa: Number(process.env.MSAA ?? 4) } };
fs.mkdirSync(path.dirname(out), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "CanaryShort", browserExecutable, chromiumOptions, inputProps });
const frameRange = range ? range.split("-").map(Number) : null;
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: out, inputProps, browserExecutable, chromiumOptions,
  scale: Number(dpr), concurrency: Number(process.env.CONC || 4), timeoutInMilliseconds: 600000, ...(frameRange ? { frameRange } : {}),
  onProgress: ({ renderedFrames }) => { const s = Math.floor((Date.now() - t0) / 1000); if (s - last >= 30) { last = s; console.log(`${s}s rendered ${renderedFrames}`); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
