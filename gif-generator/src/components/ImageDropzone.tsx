"use client";

import { useRef, useState } from "react";

const MAX_SIDE = 1024;
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Downscale an image in the browser so uploads stay small and fast. */
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.9);
}

interface Props {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export function ImageDropzone({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      setError("Please choose a PNG, JPEG, WebP or GIF image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("That image is over 20 MB.");
      return;
    }
    setError(null);
    try {
      onChange(await toDataUrl(file));
    } catch {
      setError("Could not read that image.");
    }
  }

  if (value) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
        <img src={value} alt="Uploaded source" className="mx-auto max-h-64 object-contain" />
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="absolute right-2 top-2 rounded-lg bg-black/70 px-3 py-1 text-sm text-white hover:bg-black/90 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files[0]);
        }}
        className={`flex h-48 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition ${
          dragging
            ? "border-violet-400 bg-violet-500/10"
            : "border-white/15 hover:border-violet-400/60 hover:bg-white/5"
        } disabled:opacity-50`}
      >
        <span className="text-3xl" aria-hidden>
          🖼️
        </span>
        <span className="font-medium">Drop a photo here, or click to browse</span>
        <span className="text-sm text-zinc-400">PNG, JPEG, WebP or GIF · up to 20 MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
