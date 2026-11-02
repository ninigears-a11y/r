"use client";

import { useEffect, useRef } from "react";

interface Props {
  gifUrl: string;
  sizeBytes: number;
  fileName: string;
  onClose: () => void;
}

export function PreviewModal({ gifUrl, sizeBytes, fileName, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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
      className="m-auto w-[min(92vw,640px)] rounded-2xl border border-white/10 bg-zinc-900 p-0 text-zinc-100 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h2 className="font-semibold">Your GIF is ready</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="bg-[repeating-conic-gradient(#27272a_0_25%,#18181b_0_50%)] bg-[length:20px_20px] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image can't optimise it */}
        <img src={gifUrl} alt="Generated GIF preview" className="mx-auto max-h-[60vh] rounded-lg" />
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="text-sm text-zinc-400">{(sizeBytes / 1024).toFixed(0)} KB · loops forever</span>
        <a
          href={gifUrl}
          download={fileName}
          className="rounded-xl bg-violet-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-400"
        >
          ⬇ Download GIF
        </a>
      </div>
    </dialog>
  );
}
