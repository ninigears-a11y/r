// Fast preview: renders every Nth frame as JPEG (renderFrames + everyNthFrame), small buffer, no audio.
// usage: node scripts/preview.mjs <outDir> <everyNth> <scale>   (COMP env = composition id)
import fs from "node:fs";
import path from "node:path";
const { bundle } = await import("@remotion/bundler");
const { renderFrames, selectComposition } = await import("@remotion/renderer");
const [outDir, nth = "3", scale = "0.3333"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium", chromiumOptions = { gl: "swangle" };
const inputProps = { post: { dpr: Number(scale), msaa: 4 } }; // MSAA 0 renders black frames with this post chain
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "SnowShort", browserExecutable, chromiumOptions, inputProps });
const t0 = Date.now();
await renderFrames({ composition, serveUrl, inputProps, outputDir: outDir, imageFormat: "jpeg", jpegQuality: 85, scale: Number(scale),
  everyNthFrame: Number(nth), concurrency: Number(process.env.CONC || 3), browserExecutable, chromiumOptions, timeoutInMilliseconds: 900000,
  onStart: () => {}, onFrameUpdate: (n) => { if (n % 5 === 0) console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s frames ${n}`); } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
