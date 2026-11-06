# Nome Studio — AI character animation

An open-source studio for animated GIFs, fronted by our mascot **Nome**. Three workflows:

| Mode | You give it | What happens | Replicate model (default) |
| --- | --- | --- | --- |
| **GIF → Character** (signature) | an animated GIF + a character image | The character in the GIF is replaced, frame by frame, by your character. Motion, timing and scene are kept. | `wan-video/wan-2.2-animate-replace` (keep the GIF's scene) or `wan-video/wan-2.2-animate-animation` (use the character image's scene) |
| **Image → GIF** | a character image + optional motion prompt | The character is animated (dance, wave, jump…). | `wan-video/wan-2.2-i2v-fast` |
| **Text → GIF** | a prompt, optionally a character image | Without a character: text-to-video. With one: a first frame featuring that character is drawn, then animated. | `wan-video/wan-2.2-t2v-fast`, or `google/nano-banana` → `wan-video/wan-2.2-i2v-fast` |

Every result is rebuilt by **FFmpeg** into an optimised, infinitely looping GIF (two-pass palette, style-aware dithering, optional boomerang). Results can be downloaded as **GIF** or **MP4**, copied, shared (Web Share API on phones, optional hosted links), tweaked without re-running the AI ("Edit animation"), or regenerated ("Try again"). "My GIFs" is kept in the browser (IndexedDB).

**Demo mode:** with no `REPLICATE_API_TOKEN`, Image → GIF and Text → GIF produce a clearly labelled *local* preview animation (no AI), so the UI and CI work for free. GIF → Character has no honest offline fallback, so it is disabled and says why.

Stack: Next.js 16 (App Router, Route Handlers) · React 19 · Tailwind CSS 4 · Replicate HTTP API · FFmpeg (`ffmpeg-static`) · Vitest · GitHub Actions → Vercel.

---

## 1. Project structure

```
.
├── .github/workflows/deploy.yml     # CI (lint/typecheck/test/build) + Vercel deploy on main
└── gif-generator/
    ├── .env.example                 # REPLICATE_API_TOKEN + optional model overrides
    ├── next.config.ts               # ships the FFmpeg binary with the functions that use it
    ├── public/nome/                 # Nome artwork (cut-out body, "!!" marks, reference sheet)
    └── src/
        ├── app/
        │   ├── layout.tsx / page.tsx / globals.css
        │   └── api/
        │       ├── generate/route.ts        # POST: start an AI job (swap / image / text / keyframe)
        │       ├── generate/[id]/route.ts   # GET: poll job status
        │       ├── gif/route.ts             # POST: video/image → optimised looping GIF
        │       ├── mp4/route.ts             # POST: GIF → MP4 export
        │       ├── share/route.ts           # POST: host a GIF on Vercel Blob (optional)
        │       └── status/route.ts          # GET: which features this server has enabled
        ├── components/
        │   ├── GifStudio.tsx        # the studio: modes, inputs, pipeline orchestration, results
        │   ├── Stage.tsx            # output screen built as Nome's head; his eyes show progress
        │   ├── Nome.tsx             # mascot (original art + mood eyes on the visor), logo
        │   ├── GifDrop.tsx / CharacterPicker.tsx / FineTune.tsx / StylePicker.tsx
        │   ├── ResultActions.tsx    # download GIF/MP4, copy, share, try again, edit
        │   └── Hero.tsx / Sections.tsx / SiteHeader.tsx / ModePicker.tsx
        └── lib/
            ├── presets.ts           # modes, style presets, limits (shared)
            ├── gif-info.ts          # tiny GIF parser: frames, delays, size (browser + server)
            ├── validation.ts        # request parsing, data-URL decoding, SSRF guard
            ├── replicate.ts         # minimal Replicate REST client, one model per step
            ├── gif-args.ts          # pure FFmpeg argument builders (unit tested)
            ├── ffmpeg.ts            # runs FFmpeg: GIF↔MP4, model input, GIF encoding
            └── client/              # browser helpers: uploads, IndexedDB library
```

## 2. How a request flows

**GIF → Character**

```
Browser: parse GIF (frames, delays, size) ── POST /api/generate {mode:"swap", gif, character, scene}
Server:  FFmpeg GIF → constant-rate 24 fps MP4 (transparency flattened, upscaled to ≥480p, ≤8 s)
         upload MP4 + character → Wan 2.2 Animate (segments + tracks the original character,
         re-animates yours frame by frame, composites it into the scene) ── { id }
Browser: poll GET /api/generate/:id ── output video URL
         POST /api/gif {videoUrl, fps & duration of the ORIGINAL GIF, width} ── looping GIF
```

**Text → GIF with a character**: `/api/generate {mode:"text", character}` starts a keyframe job (`stage:"keyframe"`); when it finishes the browser sends the keyframe URL to `/api/generate {mode:"image", imageUrl}`; the resulting video is encoded like the others.

Generation is **asynchronous** on purpose: video models take 30 s to a few minutes, longer than a serverless function should block. Once a video exists, changing speed, size, length or boomerang **rebuilds the GIF without another paid AI call**.

If a GIF would exceed Vercel's 4.5 MB response limit, it is re-encoded with fewer colours and frames automatically.

### Limits and honest caveats

- Wan 2.2 Animate is trained on human motion (pose skeletons + faces). Swaps work best when the GIF shows **one clear, full-body character** and your character has a roughly humanoid body. Animals, crowds, tiny subjects or heavy motion blur give weaker results.
- Source GIFs: up to 3 MB and the first 8 seconds. Variable GIF frame delays are preserved by resampling to a constant rate, then the output is re-timed to the original average speed and length.
- The model input field names for the swap models (`video`, `character_image`) follow the Wan 2.2 Animate models on Replicate. If a model you switch to uses different names, set them via `REPLICATE_SWAP_EXTRA_INPUT` or override the model.

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

Each pipeline step has its own model, overridable with an env var (see `.env.example`):

| Step | Env var | Default | Inputs sent |
| --- | --- | --- | --- |
| Text → video | `REPLICATE_TEXT_MODEL` | `wan-video/wan-2.2-t2v-fast` | `prompt` |
| Image → video | `REPLICATE_IMAGE_MODEL` | `wan-video/wan-2.2-i2v-fast` | `prompt`, `image` |
| Character keyframe | `REPLICATE_KEYFRAME_MODEL` | `google/nano-banana` | `prompt`, `image_input[]`, `output_format` |
| Swap (keep scene) | `REPLICATE_SWAP_MODEL` | `wan-video/wan-2.2-animate-replace` | `video`, `character_image` |
| Swap (character's scene) | `REPLICATE_MOVE_MODEL` | `wan-video/wan-2.2-animate-animation` | `video`, `character_image` |

Extra model inputs go in JSON env vars: `REPLICATE_EXTRA_INPUT` (video models), `REPLICATE_KEYFRAME_EXTRA_INPUT`, `REPLICATE_SWAP_EXTRA_INPUT`. Check each model's page for its input names and price per run.

### Sharing links (optional)

On phones, **Share** hands the GIF file itself to WhatsApp, iMessage, Telegram and the like (Web Share API). To also get **public links** (for desktop sharing to X, Reddit, email, and "Copy link" where browsers can't copy animated GIFs), connect a [Vercel Blob](https://vercel.com/docs/vercel-blob) store to the project so `BLOB_READ_WRITE_TOKEN` is set. Without it, those buttons explain what's unavailable instead of failing silently.

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
- Inputs are validated and clamped server-side (FPS 4–30, 0.5–8 s, fixed widths, 4 MB images, 3 MB GIFs that must parse as animated GIFs).
- `/api/mp4` and `/api/share` only accept bytes that parse as a GIF, capped at the app's own GIF size limit. `/api/share` is unauthenticated: anyone who can reach the site can upload GIFs to your Blob store, so add rate limiting if you enable it.
- There is **no rate limiting or auth**. Before sharing a public URL with a real API token, add protection (e.g. Vercel Firewall rate limits, or a login) and set a spend limit on Replicate.

## License

MIT
