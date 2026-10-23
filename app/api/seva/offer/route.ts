import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { paywallResponse } from "@/lib/billing/access";
import { recordOffering } from "@/lib/kv/seva";
import { SEVAS, isBhogItem, isSevaId } from "@/lib/seva/sevas";
import { istNow } from "@/lib/seva/time";
import { getSevaToday } from "@/lib/seva/today";

const OP_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Offer a seva: { opId, seva, item? }. `item` is the bhog chosen.
 * The only rule is the state each seva needs (see lib/seva/sevas.ts); the
 * date comes from the server, so a phone's clock can't affect anything.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const blocked = await paywallResponse(userId);
  if (blocked) return blocked;

  let body: { opId?: unknown; seva?: unknown; item?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.opId !== "string" || !OP_ID_RE.test(body.opId) || !isSevaId(body.seva)) {
    return Response.json({ error: "Expected { opId, seva, item? }" }, { status: 400 });
  }
  const seva = SEVAS[body.seva];
  if (seva.id === "bhog" && !isBhogItem(body.item)) {
    return Response.json({ error: "Bhog needs an item" }, { status: 400 });
  }

  try {
    const result = await recordOffering({
      userId,
      opId: body.opId,
      date: istNow().date,
      seva: seva.id,
      requires: seva.requires,
      sets: seva.sets,
      item: seva.id === "bhog" && isBhogItem(body.item) ? body.item : undefined,
    });
    const today = await getSevaToday(userId);
    if (result.status === "wrong_state") {
      return Response.json({ error: "wrong_state", today }, { status: 409 });
    }
    return Response.json({ status: result.status, today });
  } catch (error) {
    console.error("Error in seva offer:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
