import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // ffmpeg-static resolves its binary relative to its own folder, so it must be
  // required natively instead of bundled…
  serverExternalPackages: ["ffmpeg-static"],
  // …and the ~80 MB binary must be copied into every function that runs it.
  outputFileTracingIncludes: {
    "/api/gif": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/generate": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/mp4": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
