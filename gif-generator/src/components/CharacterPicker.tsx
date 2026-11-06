"use client";

import Image from "next/image";
import { useState } from "react";
import { characterToDataUrl, IMAGE_TYPES } from "@/lib/client/media";
import { CheckIcon, CloseIcon, UploadIcon } from "./icons";
import { useFileDrop } from "./useFileDrop";

export type Character =
  | { kind: "none" }
  | { kind: "nome" }
  | { kind: "upload"; dataUrl: string; name: string };

interface Props {
  value: Character;
  onChange: (c: Character) => void;
  /** The uploaded image is remembered even while another tile is selected. */
  upload: Extract<Character, { kind: "upload" }> | null;
  onUpload: (c: Extract<Character, { kind: "upload" }> | null) => void;
  allowNone?: boolean;
  disabled?: boolean;
  label: string;
}

function Tile({
  selected,
  onSelect,
  children,
  caption,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  caption: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60 ${
        selected ? "border-ink shadow-[0_0_0_1px_var(--color-ink)]" : "border-line hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card"
      }`}
    >
      <span className="relative block aspect-square w-full">{children}</span>
      <span className="flex items-center justify-between gap-1 border-t border-line bg-canvas px-2.5 py-2 text-xs font-medium sm:text-sm">
        <span className="truncate">{caption}</span>
        <span className={`flex size-4 shrink-0 items-center justify-center rounded-full transition-all ${selected ? "bg-ink text-white" : "ring-1 ring-line-strong"}`}>
          {selected && <CheckIcon className="size-3" />}
        </span>
      </span>
    </button>
  );
}

/** Choose who stars in the animation: Nome, your own upload, or (text mode) nobody. */
export function CharacterPicker({ value, onChange, upload, onUpload, allowNone, disabled, label }: Props) {
  const [error, setError] = useState<string | null>(null);

  const drop = useFileDrop(
    async (file) => {
      if (!IMAGE_TYPES.includes(file.type)) return setError("Please choose a PNG, JPEG, WebP or GIF image.");
      if (file.size > 20 * 1024 * 1024) return setError("That image is over 20 MB.");
      try {
        setError(null);
        const next = { kind: "upload" as const, name: file.name, dataUrl: await characterToDataUrl(file) };
        onUpload(next);
        onChange(next);
      } catch {
        setError("Could not read that image.");
      }
    },
    { accept: IMAGE_TYPES.join(","), disabled },
  );

  return (
    <div {...drop.dropProps}>
      <div role="radiogroup" aria-label={label} className={`grid gap-2.5 ${allowNone ? "grid-cols-3" : "grid-cols-2 sm:max-w-sm"}`}>
        {allowNone && (
          <Tile selected={value.kind === "none"} onSelect={() => onChange({ kind: "none" })} caption="No character" disabled={disabled}>
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-subtle text-muted">
              <span className="text-2xl leading-none">∅</span>
              <span className="px-2 text-center text-[11px] leading-tight">Just the prompt</span>
            </span>
          </Tile>
        )}
        <Tile selected={value.kind === "nome"} onSelect={() => onChange({ kind: "nome" })} caption="Nome" disabled={disabled}>
          <span className="dot-grid absolute inset-0 bg-paper">
            <Image src="/nome/nome-body.png" alt="Nome" fill sizes="160px" className="object-contain p-3 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3" />
          </span>
        </Tile>
        {upload ? (
          <div className="relative grid">
            <Tile selected={value.kind === "upload"} onSelect={() => onChange(upload)} caption="Your character" disabled={disabled}>
              <span className="checkerboard absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                <img src={upload.dataUrl} alt={`Your character (${upload.name})`} className="size-full object-contain p-2" />
              </span>
            </Tile>
            <button
              type="button"
              aria-label="Remove your character"
              disabled={disabled}
              onClick={() => {
                onUpload(null);
                if (value.kind === "upload") onChange(allowNone ? { kind: "none" } : { kind: "nome" });
              }}
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-canvas/95 text-muted shadow-card ring-1 ring-line transition-colors hover:text-ink"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={drop.open}
            disabled={disabled}
            className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-2 text-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60 ${
              drop.dragging ? "border-brand bg-brand-soft" : "border-line-strong bg-subtle hover:border-ink/30 hover:bg-paper"
            }`}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-canvas shadow-card ring-1 ring-line transition-transform duration-200 group-hover:-translate-y-0.5">
              <UploadIcon className="size-[18px]" />
            </span>
            <span className="text-sm font-medium">{drop.dragging ? "Drop it" : "Upload yours"}</span>
            <span className="hidden text-[11px] leading-tight text-muted sm:block">PNG, JPG or WebP</span>
          </button>
        )}
      </div>
      {upload && (
        <button type="button" onClick={drop.open} disabled={disabled} className="mt-2 text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
          Upload a different character
        </button>
      )}
      <input {...drop.inputProps} />
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
