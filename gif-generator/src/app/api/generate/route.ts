import { buildPrompt } from "@/lib/presets";
import { createPrediction, isReplicateConfigured } from "@/lib/replicate";
import { parseGenerateRequest } from "@/lib/validation";

/**
 * POST /api/generate
 * Starts an AI video generation job and returns immediately with its id.
 * The client then polls GET /api/generate/:id — video models take 30s–3min,
 * longer than a serverless function should block.
 *
 * Without REPLICATE_API_TOKEN the app runs in "demo mode": the GIF route
 * animates the uploaded image (or a procedural animation) locally instead.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseGenerateRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  if (!isReplicateConfigured()) {
    return Response.json({ id: "demo", status: "succeeded", output: null, error: null, demo: true });
  }

  const { mode, prompt, style, image } = parsed.value;
  try {
    const prediction = await createPrediction({
      mode,
      prompt: buildPrompt(prompt || "subtle natural motion", style),
      image,
    });
    return Response.json({ ...prediction, demo: false }, { status: 201 });
  } catch (err) {
    console.error("[generate]", err);
    return Response.json({ error: "Could not start generation. Please try again." }, { status: 502 });
  }
}
