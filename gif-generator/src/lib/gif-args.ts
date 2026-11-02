// Pure FFmpeg argument builder — no I/O, so it is easy to unit test.
import { STYLE_PRESETS, type GifOptions } from "./presets";

export type GifSource =
  | { kind: "video"; path: string }
  | { kind: "image"; path: string }
  | { kind: "demo" };

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Builds an FFmpeg command that:
 *  1. turns the source into frames at the requested fps/size,
 *  2. optionally appends the reversed clip ("boomerang") for a seamless loop,
 *  3. generates an optimal 2-pass palette and encodes a looping GIF.
 */
export function buildFfmpegArgs(
  source: GifSource,
  options: GifOptions,
  outPath: string,
  maxColors = 256,
): string[] {
  const { fps, width, boomerang, style } = options;
  const preset = STYLE_PRESETS[style];
  // In boomerang mode each direction is half the requested length.
  const seconds = boomerang ? options.duration / 2 : options.duration;
  const t = seconds.toFixed(2);
  const w = even(width);

  const input: string[] = [];
  let sourceFilter: string;

  switch (source.kind) {
    case "video":
      input.push("-t", t, "-i", source.path);
      sourceFilter = `fps=${fps},scale=${w}:-2:flags=${preset.scaleFlags}`;
      break;
    case "image": {
      // "Ken Burns" breathing zoom. One full sine period over the clip makes the
      // last frame flow back into the first, so the loop is seamless.
      const frames = Math.max(2, Math.round(fps * seconds));
      const big = w * 2;
      input.push("-loop", "1", "-framerate", String(fps), "-t", t, "-i", source.path);
      sourceFilter = [
        `scale=${big}:${big}:force_original_aspect_ratio=increase`,
        `crop=${big}:${big}`,
        `zoompan=z='1.08+0.08*sin(2*PI*on/${frames})'` +
          `:x='iw/2-(iw/zoom/2)+iw*0.015*cos(2*PI*on/${frames})'` +
          `:y='ih/2-(ih/zoom/2)'` +
          `:d=1:s=${w}x${w}:fps=${fps}`,
        `scale=${w}:${w}:flags=${preset.scaleFlags}`,
      ].join(",");
      break;
    }
    case "demo": {
      // Procedural Game-of-Life animation used when no AI API token is set,
      // so the whole pipeline works offline and in CI.
      const cells = even(w / 4);
      input.push(
        "-f",
        "lavfi",
        "-t",
        t,
        "-i",
        `life=s=${cells}x${cells}:mold=10:rate=${fps}:ratio=0.12:` +
          `death_color=#0b0a1a:life_color=#a78bfa:mold_color=#4c1d95`,
      );
      sourceFilter = `scale=${w}:${w}:flags=neighbor`;
      break;
    }
  }

  const dither =
    preset.dither === "bayer" ? "bayer:bayer_scale=3" : preset.dither;

  const graph = [
    `[0:v]${sourceFilter},format=rgb24[base]`,
    boomerang
      ? `[base]split[fwd][tmp];[tmp]reverse[rev];[fwd][rev]concat=n=2:v=1:a=0[seq]`
      : `[base]null[seq]`,
    `[seq]split[s0][s1]`,
    `[s0]palettegen=max_colors=${maxColors}:stats_mode=diff[pal]`,
    `[s1][pal]paletteuse=dither=${dither}:diff_mode=rectangle`,
  ].join(";");

  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...input,
    "-filter_complex",
    graph,
    "-an",
    "-loop",
    "0",
    outPath,
  ];
}
