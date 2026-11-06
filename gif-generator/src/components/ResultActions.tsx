"use client";

import { useState } from "react";
import { CopyIcon, DownloadIcon, FilmIcon, RetryIcon, ShareIcon, SlidersIcon } from "./icons";

export interface ResultGif {
  id: string;
  url: string;
  blob: Blob;
  fileName: string;
  title: string;
}

interface Props {
  gif: ResultGif;
  /** Server has link hosting (Vercel Blob) configured. */
  sharing: boolean;
  onToast: (message: string) => void;
  onTryAgain?: () => void;
  onEdit?: () => void;
  editing?: boolean;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-medium text-ink transition-all hover:border-line-strong hover:bg-subtle active:scale-[0.98] disabled:opacity-50";

/** Download / MP4 / copy / share / retry / edit for a finished GIF. */
export function ResultActions({ gif, sharing, onToast, onTryAgain, onEdit, editing }: Props) {
  const [busy, setBusy] = useState<"mp4" | "share" | "copy" | null>(null);
  const [mp4, setMp4] = useState<{ id: string; blob: Blob } | null>(null);
  const [link, setLink] = useState<{ id: string; url: string } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  async function getLink(): Promise<string> {
    if (link?.id === gif.id) return link.url;
    const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "image/gif" }, body: gif.blob });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error ?? "Could not create a link.");
    setLink({ id: gif.id, url: data.url });
    return data.url;
  }

  async function downloadMp4() {
    setBusy("mp4");
    try {
      let blob = mp4?.id === gif.id ? mp4.blob : null;
      if (!blob) {
        const res = await fetch("/api/mp4", { method: "POST", headers: { "Content-Type": "image/gif" }, body: gif.blob });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Conversion failed.");
        blob = await res.blob();
        setMp4({ id: gif.id, blob });
      }
      saveBlob(blob, gif.fileName.replace(/\.gif$/, ".mp4"));
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not make the MP4.");
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    setBusy("copy");
    try {
      // Animated GIFs on the clipboard are only supported by some browsers.
      if (typeof ClipboardItem !== "undefined" && ClipboardItem.supports?.("image/gif")) {
        await navigator.clipboard.write([new ClipboardItem({ "image/gif": gif.blob })]);
        onToast("GIF copied — paste it anywhere.");
      } else if (sharing) {
        await navigator.clipboard.writeText(await getLink());
        onToast("Link copied — paste it into any chat.");
      } else {
        onToast("This browser can't copy animated GIFs. Use Download or Share instead.");
      }
    } catch {
      onToast("Copying didn't work here. Try Download or Share.");
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    const file = new File([gif.blob], gif.fileName, { type: "image/gif" });
    // Phones: hand the actual GIF to WhatsApp, iMessage, Telegram, Instagram…
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: gif.title });
      } catch (err) {
        if ((err as Error).name !== "AbortError") onToast("Sharing was interrupted.");
      }
      return;
    }
    if (sharing) {
      setBusy("share");
      try {
        await getLink();
        setLinkOpen(true);
      } catch (err) {
        onToast(err instanceof Error ? err.message : "Could not create a link.");
      } finally {
        setBusy(null);
      }
      return;
    }
    onToast("This browser can't share files directly. Download the GIF and send it from your device.");
  }

  const shareUrl = link?.id === gif.id ? link.url : null;
  const text = encodeURIComponent("Made this with Nome Studio ✨");
  const targets = shareUrl
    ? [
        ["WhatsApp", `https://wa.me/?text=${text}%20${encodeURIComponent(shareUrl)}`],
        ["Telegram", `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`],
        ["X", `https://x.com/intent/post?text=${text}&url=${encodeURIComponent(shareUrl)}`],
        ["Reddit", `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${text}`],
        ["Email", `mailto:?subject=${text}&body=${encodeURIComponent(shareUrl)}`],
      ]
    : [];

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
        <a
          href={gif.url}
          download={gif.fileName}
          className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:bg-brand-hover active:scale-[0.98] sm:col-span-1"
        >
          <DownloadIcon className="size-[18px]" />
          Download GIF
        </a>
        <button type="button" onClick={downloadMp4} disabled={busy !== null} className={btn}>
          <FilmIcon className="size-[18px]" />
          {busy === "mp4" ? "Converting…" : "MP4"}
        </button>
        <button type="button" onClick={copy} disabled={busy !== null} className={btn}>
          <CopyIcon className="size-[18px]" />
          {busy === "copy" ? "Copying…" : "Copy"}
        </button>
        <button type="button" onClick={share} disabled={busy !== null} className={`${btn} col-span-2 sm:col-span-1`}>
          <ShareIcon className="size-[18px]" />
          {busy === "share" ? "Uploading…" : "Share"}
        </button>
      </div>

      {linkOpen && shareUrl && (
        <div className="mt-3 animate-fade-up rounded-2xl border border-line bg-subtle p-3">
          <div className="flex items-center gap-2">
            <input readOnly value={shareUrl} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs" />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(shareUrl).then(() => onToast("Link copied."), () => onToast("Couldn't copy the link."))}
              className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white"
            >
              Copy link
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {targets.map(([name, href]) => (
              <a key={name} href={href} target="_blank" rel="noreferrer" className="rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-medium transition-colors hover:border-line-strong">
                {name}
              </a>
            ))}
          </div>
        </div>
      )}

      {(onTryAgain || onEdit) && (
        <div className="mt-2 flex gap-2">
          {onTryAgain && (
            <button type="button" onClick={onTryAgain} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-ink">
              <RetryIcon className="size-4" />
              Try again
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-expanded={editing}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${editing ? "bg-subtle text-ink" : "text-muted hover:bg-subtle hover:text-ink"}`}
            >
              <SlidersIcon className="size-4" />
              Edit animation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
