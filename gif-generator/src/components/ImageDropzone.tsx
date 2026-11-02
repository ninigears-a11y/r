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

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v2.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

  const openPicker = () => !disabled && inputRef.current?.click();

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT.join(",")}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        void handleFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (!disabled) void handleFile(e.dataTransfer.files[0]);
    },
  };

  if (value) {
    return (
      <div
        {...dropHandlers}
        className={`group relative overflow-hidden rounded-xl border bg-subtle transition-colors ${
          dragging ? "border-brand ring-4 ring-brand/10" : "border-line"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
        <img src={value} alt="Your uploaded image" className="mx-auto h-56 w-full object-contain sm:h-64" />
        <div className="absolute right-2.5 bottom-2.5 flex gap-2">
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled}
            className="rounded-lg border border-line bg-canvas/95 px-3 py-1.5 text-sm font-medium text-ink shadow-card backdrop-blur transition-colors hover:bg-subtle disabled:opacity-50"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="rounded-lg border border-line bg-canvas/95 px-3 py-1.5 text-sm font-medium text-muted shadow-card backdrop-blur transition-colors hover:bg-subtle hover:text-ink disabled:opacity-50"
          >
            Remove
          </button>
        </div>
        {fileInput}
        {error && <p className="px-3 pb-3 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div
        {...dropHandlers}
        onClick={openPicker}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed px-6 py-10 text-center transition-all duration-200 sm:py-12 ${
          dragging
            ? "border-brand bg-brand-soft/70"
            : "border-line-strong bg-subtle hover:border-brand/50 hover:bg-brand-soft/40"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <span
          className={`flex size-12 items-center justify-center rounded-full border bg-canvas shadow-card transition-all duration-200 ${
            dragging
              ? "scale-110 border-brand/30 text-brand"
              : "border-line text-muted group-hover:-translate-y-0.5 group-hover:text-brand"
          }`}
        >
          <UploadIcon />
        </span>
        <p className="mt-4 font-medium text-ink">
          {dragging ? "Drop to upload" : "Drag and drop an image"}
        </p>
        <p className="mt-1 text-sm text-muted">PNG, JPEG, WebP or GIF, up to 20 MB</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          disabled={disabled}
          className="mt-5 rounded-lg border border-line bg-canvas px-4 py-2 text-sm font-medium text-ink shadow-card transition-colors hover:border-line-strong hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Upload image
        </button>
        {fileInput}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
