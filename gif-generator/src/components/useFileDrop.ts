"use client";

import { useRef, useState } from "react";

/** Shared drag-and-drop + file-picker wiring for upload areas. */
export function useFileDrop(onFile: (file: File) => void, { accept, disabled }: { accept: string; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return {
    dragging,
    open: () => !disabled && inputRef.current?.click(),
    inputProps: {
      ref: inputRef,
      type: "file" as const,
      accept,
      className: "sr-only",
      tabIndex: -1,
      "aria-hidden": true,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onFile(file);
      },
    },
    dropProps: {
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
        const file = e.dataTransfer.files[0];
        if (!disabled && file) onFile(file);
      },
    },
  };
}
