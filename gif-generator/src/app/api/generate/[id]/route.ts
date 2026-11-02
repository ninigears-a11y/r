import { getPrediction, isReplicateConfigured } from "@/lib/replicate";

/** GET /api/generate/:id — poll the status of a generation job. */
export async function GET(_request: Request, ctx: RouteContext<"/api/generate/[id]">) {
  const { id } = await ctx.params;
  if (!isReplicateConfigured()) {
    return Response.json({ error: "AI generation is not configured." }, { status: 404 });
  }
  try {
    const prediction = await getPrediction(id);
    return Response.json(prediction, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[generate/:id]", err);
    return Response.json({ error: "Could not fetch job status." }, { status: 502 });
  }
}
