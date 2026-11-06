// Small stroke icons, 1.6px on a 20px grid.
type P = { className?: string };
const base = (className = "size-5") => ({
  className,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const UploadIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M10 13V3.5m0 0L6.5 7M10 3.5 13.5 7M3.5 12.5v2A2 2 0 0 0 5.5 16.5h9a2 2 0 0 0 2-2v-2" /></svg>
);
export const DownloadIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M10 3.5V13m0 0-3.5-3.5M10 13l3.5-3.5M3.5 16.5h13" /></svg>
);
export const FilmIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="4" width="14" height="12" rx="2.5" /><path d="M8.5 8v4l3.5-2-3.5-2Z" /></svg>
);
export const CopyIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="7" y="7" width="9.5" height="9.5" rx="2" /><path d="M13 7V5.5a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2V11a2 2 0 0 0 2 2H7" /></svg>
);
export const ShareIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M10 12.5V3.5m0 0L7 6.5m3-3 3 3M6.5 9H5.5a2 2 0 0 0-2 2v3.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-1" /></svg>
);
export const RetryIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3h-3" /></svg>
);
export const SlidersIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 6h7m3 0h2M4 14h2m3 0h7" /><circle cx="12.5" cy="6" r="1.6" /><circle cx="7.5" cy="14" r="1.6" /></svg>
);
export const TrashIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 6h12M8 6V4.5h4V6m-6.5 0 .7 9.2a1.5 1.5 0 0 0 1.5 1.3h4.6a1.5 1.5 0 0 0 1.5-1.3L14.5 6" /></svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="m5 5 10 10M15 5 5 15" /></svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
);
export const ChevronIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="m6 8 4 4 4-4" /></svg>
);
export const SparkIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M10 3v3m0 8v3M3 10h3m8 0h3M5.5 5.5l2 2m5 5 2 2m0-9-2 2m-5 5-2 2" /></svg>
);
export const ArrowIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5" /></svg>
);
