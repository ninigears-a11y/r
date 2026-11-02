import "server-only";

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";

import { buildFfmpegArgs, type GifSource } from "./gif-args";
import type { GifOptions } from "./presets";

/** Vercel rejects function responses above 4.5 MB, so stay safely under it. */
export const MAX_GIF_BYTES = 4.2 * 1024 * 1024;
const MAX_DOWNLOAD_BYTES = 80 * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = 50_000;

function ffmpegBinary(): string {
  const bin = process.env.FFMPEG_PATH || ffmpegStatic;
  if (!bin) throw new Error("FFmpeg binary not found. Set FFMPEG_PATH or install ffmpeg-static.");
  return bin;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBinary(), args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000); // keep the tail only
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("FFmpeg timed out."));
    }, FFMPEG_TIMEOUT_MS);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.trim().split("\n").slice(-3).join(" | ")}`));
    });
  });
}

/** Stream a remote file to disk, aborting if it exceeds the size cap. */
async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { redirect: "error" });
  if (!res.ok || !res.body) throw new Error(`Failed to download source media (HTTP ${res.status}).`);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_DOWNLOAD_BYTES) throw new Error("Source media is too large.");

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      throw new Error("Source media is too large.");
    }
    chunks.push(value);
  }
  await writeFile(dest, Buffer.concat(chunks));
}

export type GifInput =
  | { kind: "video"; url: string }
  | { kind: "image"; bytes: Buffer }
  | { kind: "demo" };

/**
 * Turn a video URL, a still image, or a procedural demo into an optimised,
 * infinitely looping GIF. Retries with a smaller palette / frame rate if the
 * first encode is too big to return from a serverless function.
 */
export async function createGif(input: GifInput, options: GifOptions): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "gif-"));
  try {
    let source: GifSource;
    if (input.kind === "video") {
      const file = path.join(dir, "source.mp4");
      await downloadToFile(input.url, file);
      source = { kind: "video", path: file };
    } else if (input.kind === "image") {
      const file = path.join(dir, "source.img");
      await writeFile(file, input.bytes);
      source = { kind: "image", path: file };
    } else {
      source = { kind: "demo" };
    }

    const out = path.join(dir, "out.gif");
    const attempts = [
      { maxColors: 256, fps: options.fps },
      { maxColors: 128, fps: Math.max(6, Math.round(options.fps * 0.75)) },
      { maxColors: 64, fps: Math.max(5, Math.round(options.fps * 0.5)) },
    ];

    let gif: Buffer | null = null;
    for (const attempt of attempts) {
      await runFfmpeg(
        buildFfmpegArgs(source, { ...options, fps: attempt.fps }, out, attempt.maxColors),
      );
      gif = await readFile(out);
      if (gif.length <= MAX_GIF_BYTES) return gif;
    }
    throw new Error(
      `GIF is ${(gif!.length / 1024 / 1024).toFixed(1)} MB even after optimisation. Try a smaller resolution or shorter duration.`,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
