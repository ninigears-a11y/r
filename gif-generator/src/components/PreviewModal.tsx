"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  gifUrl: string;
  sizeBytes: number;
  fileName: string;
  prompt: string;
  onClose: () => void;
  onTryAgain?: () => void;
}

/** True if the first frame has any transparent pixel. Blob URLs are same-origin, so this is allowed. */
function hasTransparency(img: HTMLImageElement): boolean {
  try {
    const w = Math.min(img.naturalWidth, 128);
    const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  } catch {
    /* ignore — treat as opaque */
  }
  return false;
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function PreviewModal({ gifUrl, sizeBytes, fileName, prompt, onClose, onTryAgain }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [meta, setMeta] = useState<{ w: number; h: number; transparent: boolean } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose(); // click on backdrop
      }}
      aria-labelledby="preview-title"
      className="modal m-auto max-h-[calc(100dvh-24px)] w-[min(calc(100vw-24px),620px)] overflow-hidden rounded-2xl border border-line bg-canvas p-0 text-ink shadow-float"
    >
      <div className="flex max-h-[calc(100dvh-24px)] flex-col">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="m2.5 6.2 2.2 2.3 4.8-5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Ready
              </span>
            </div>
            <h2 id="preview-title" className="mt-2 text-lg font-semibold tracking-tight">
              Your GIF is ready
            </h2>
            {prompt && <p className="mt-0.5 truncate text-sm text-muted">{prompt}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="-mt-1 -mr-2 rounded-lg p-2 text-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="m4 4 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={`mx-5 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-line p-3 sm:mx-6 sm:p-4 ${meta?.transparent ? "checkerboard" : "bg-subtle"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image can't optimise it */}
          <img
            src={gifUrl}
            alt={prompt ? `Generated GIF: ${prompt}` : "Generated GIF"}
            onLoad={(e) => {
              const img = e.currentTarget;
              setMeta({ w: img.naturalWidth, h: img.naturalHeight, transparent: hasTransparency(img) });
            }}
            className="max-h-[min(52dvh,440px)] max-w-full rounded-lg object-contain"
          />
        </div>

        <dl className="mx-5 mt-4 grid grid-cols-3 divide-x divide-line rounded-xl border border-line text-center sm:mx-6">
          {[
            ["Dimensions", meta ? `${meta.w} × ${meta.h}` : "…"],
            ["File size", formatBytes(sizeBytes)],
            ["Loop", "Infinite"],
          ].map(([label, value]) => (
            <div key={label} className="px-2 py-2.5">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col-reverse gap-2 px-5 pt-4 pb-5 sm:flex-row sm:justify-end sm:px-6">
          {onTryAgain && (
            <button
              type="button"
              onClick={onTryAgain}
              className="rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-subtle"
            >
              Try again
            </button>
          )}
          <a
            href={gifUrl}
            download={fileName}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-brand transition-all hover:bg-brand-hover active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2.5v8m0 0L4.75 7.25M8 10.5l3.25-3.25M3 13.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download GIF
          </a>
        </div>
      </div>
    </dialog>
  );
}
