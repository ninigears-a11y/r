# 🎞️ AI GIF Generator

An open-source web app that turns **text prompts** and **still photos** into lightweight, looping GIFs.

- **Text → GIF**: a prompt + style preset is sent to an AI text-to-video model on [Replicate](https://replicate.com).
- **Image → GIF**: a photo is animated by an image-to-video model.
- **FFmpeg** then turns the video into an optimised GIF (two-pass palette, style-aware dithering, infinite loop, optional boomerang).
- **Demo mode**: with no API token the whole app still works. Photos get a seamless looping zoom and text prompts get a procedural animation, so you can develop and run CI for free.

Stack: Next.js 16 (App Router, Route Handlers) · React 19 · Tailwind CSS 4 · Replicate HTTP API · FFmpeg (`ffmpeg-static`) · Vitest · GitHub Actions → Vercel.

---

## 1. Project structure

```
.
├── .github/workflows/deploy.yml     # CI (lint/typecheck/test/build) + Vercel deploy on main
└── gif-generator/
    ├── .env.example                 # REPLICATE_API_TOKEN + optional model overrides
    ├── next.config.ts               # ships the FFmpeg binary with the /api/gif function
    ├── vercel.json                  # disables Vercel's own git deploys (Actions deploys instead)
    ├── vitest.config.ts
    └── src/
        ├── app/
        │   ├── layout.tsx / page.tsx / globals.css
        │   └── api/
        │       ├── generate/route.ts        # POST: start an AI job (or demo)
        │       ├── generate/[id]/route.ts   # GET: poll job status
        │       └── gif/route.ts             # POST: video/image → optimised looping GIF
        ├── components/
        │   ├── GifStudio.tsx        # main UI: tabs, prompt, settings, generate flow
        │   ├── ImageDropzone.tsx    # drag & drop upload, downsizes images in-browser
        │   └── PreviewModal.tsx     # live preview + Download GIF
        └── lib/
            ├── presets.ts           # style presets, limits, prompt builder (shared)
            ├── validation.ts        # request parsing, data-URL decoding, SSRF guard
            ├── replicate.ts         # minimal Replicate REST client
            ├── gif-args.ts          # pure FFmpeg filter-graph builder (unit tested)
            ├── ffmpeg.ts            # runs FFmpeg, downloads media, size-limit retries
            └── *.test.ts
```

## 2. How a request flows

```
Browser ──POST /api/generate──▶ Replicate (create prediction) ──▶ { id }
   │  poll every 3s: GET /api/generate/:id ──▶ { status, output: video URL }
   └─POST /api/gif { videoUrl, fps, width, duration, style, boomerang }
          └─ download MP4 → FFmpeg: fps + scale → (reverse+concat) → palettegen → paletteuse → .gif
```

Generation is **asynchronous** on purpose: video models take 30 s to 3 min, which is longer than a serverless function should block. Once a video exists, changing FPS, size, duration or boomerang **re-renders the GIF without another paid AI call**.

The GIF is encoded with a 2-pass palette (`palettegen`/`paletteuse`). If the result would exceed Vercel's 4.5 MB response limit, it is re-encoded with fewer colours and frames automatically.

## 3. Run it locally

Requirements: Node.js 22+ and npm.

```bash
cd gif-generator
npm install                 # also downloads a static FFmpeg binary
cp .env.example .env.local  # optional: add REPLICATE_API_TOKEN for real AI output
npm run dev                 # http://localhost:3000
```

| Script              | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Dev server                           |
| `npm run lint`      | ESLint                               |
| `npm run typecheck` | Generate route types + `tsc`         |
| `npm test`          | Vitest unit tests                    |
| `npm run build`     | Production build                     |

### Choosing models

The defaults are `wan-video/wan-2.2-t2v-fast` (text) and `wan-video/wan-2.2-i2v-fast` (image). Any Replicate model that accepts `prompt` (and `image` for image mode) and returns a video URL works. Set `REPLICATE_TEXT_MODEL` / `REPLICATE_IMAGE_MODEL`, and pass model-specific inputs with `REPLICATE_EXTRA_INPUT='{"resolution":"480p"}'`. Check each model's page for its input names and price per run.

## 4. Create the GitHub repo & deploy (step by step)

### 4.1 Push to GitHub

```bash
# from the folder that contains .github/ and gif-generator/
git init -b main
git add .
git commit -m "Initial commit: AI GIF Generator"
# create an empty repo at https://github.com/new (no README), then:
git remote add origin https://github.com/<you>/ai-gif-generator.git
git push -u origin main
```

(With the GitHub CLI: `gh repo create ai-gif-generator --public --source=. --push`.)

### 4.2 Create the Vercel project (one time)

```bash
npm install --global vercel
vercel login
vercel link          # run from the repo root; create a new project when asked
cat .vercel/project.json   # note "orgId" and "projectId"
```

Then in the Vercel dashboard → your project → **Settings**:

1. **Build and Deployment → Root Directory**: `gif-generator`
2. **Environment Variables**: add `REPLICATE_API_TOKEN` (Production + Preview)

### 4.3 Add GitHub secrets

In GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret              | Value                                                     |
| ------------------- | --------------------------------------------------------- |
| `VERCEL_TOKEN`      | create one at https://vercel.com/account/tokens           |
| `VERCEL_ORG_ID`     | `orgId` from `.vercel/project.json`                       |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json`                   |

Or with the GitHub CLI:

```bash
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID --body "$(jq -r .orgId .vercel/project.json)"
gh secret set VERCEL_PROJECT_ID --body "$(jq -r .projectId .vercel/project.json)"
```

### 4.4 Ship it

Every push to `main` now runs lint → typecheck → tests → build, then deploys to production. Pull requests run the checks only. The deploy URL appears in the workflow summary and under **Environments → production**.

> **Why Vercel, not GitHub Pages?** Pages only serves static files, but this app needs server code (API routes + FFmpeg). Vercel's free Hobby plan runs it. Keep the GIF settings modest there: functions have a 60 s limit and 4.5 MB responses.

## 5. Security notes

- `/api/gif` only downloads from `*.replicate.delivery` over HTTPS, so it can't be used to fetch arbitrary URLs (SSRF).
- Inputs are validated and clamped server-side (FPS 4–24, 1–6 s, fixed widths, 4 MB images).
- There is **no rate limiting or auth**. Before sharing a public URL with a real API token, add protection (e.g. Vercel Firewall rate limits, or a login) and set a spend limit on Replicate.

## License

MIT
