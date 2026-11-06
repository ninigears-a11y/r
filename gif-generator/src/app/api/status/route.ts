import { connection } from "next/server";
import { isReplicateConfigured } from "@/lib/replicate";
import { isSharingConfigured } from "@/lib/share";

/** GET /api/status — which optional server features are switched on. */
export async function GET() {
  await connection(); // read env at request time, not build time
  return Response.json(
    { ai: isReplicateConfigured(), sharing: isSharingConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
