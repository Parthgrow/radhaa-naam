import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { paywallResponse } from "@/lib/billing/access";
import { recordOffering } from "@/lib/kv/seva";
import { activeEvent } from "@/lib/seva/events";
import { SEVAS, bhogUnlocked, earnedToday, isSevaId } from "@/lib/seva/sevas";
import { istNow } from "@/lib/seva/time";
import { getJaapToday, getSevaToday, sevaOpenNow } from "@/lib/seva/today";

const OP_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const MAX_COUNT = 11;

/**
 * Offer a seva: { opId, seva, count, tier? }. The server decides the date,
 * window, limit and unlocked bhog level (from today's malas), so none of them
 * can be faked by the client. `tier` (1-3) is the bhog level chosen.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const blocked = await paywallResponse(userId);
  if (blocked) return blocked;

  let body: { opId?: unknown; seva?: unknown; count?: unknown; tier?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const count = body.count ?? 1;
  if (
    typeof body.opId !== "string" ||
    !OP_ID_RE.test(body.opId) ||
    !isSevaId(body.seva) ||
    !Number.isInteger(count) ||
    (count as number) < 1 ||
    (count as number) > MAX_COUNT
  ) {
    return Response.json({ error: "Expected { opId, seva, count (1-11) }" }, { status: 400 });
  }

  const seva = SEVAS[body.seva];
  if (seva.bhog && ![1, 2, 3].includes(body.tier as number)) {
    return Response.json({ error: "Bhog needs a tier (1-3)" }, { status: 400 });
  }
  const { date, minutes } = istNow();
  const event = activeEvent(date);
  if (!sevaOpenNow(seva, minutes, !!event)) {
    return Response.json({ error: "not_now", today: await getSevaToday(userId) }, { status: 409 });
  }

  try {
    let limit = 1;
    if (seva.kind === "earned" || seva.bhog) {
      const { malasToday, malaGoal } = await getJaapToday(userId, date);
      if (seva.kind === "earned") limit = earnedToday(seva, malasToday);
      if (seva.bhog && (body.tier as number) > bhogUnlocked(malasToday, malaGoal)) {
        return Response.json({ error: "locked", today: await getSevaToday(userId) }, { status: 409 });
      }
    }
    const result = await recordOffering({
      userId,
      opId: body.opId,
      date,
      field: seva.field,
      count: count as number,
      limit,
      eventId: seva.eventOnly ? event?.id ?? null : null,
      detail: seva.bhog ? { field: `${seva.field}_tier`, value: body.tier as number } : undefined,
    });
    const today = await getSevaToday(userId);
    if (result.status === "over_limit") {
      return Response.json({ error: "over_limit", today }, { status: 409 });
    }
    return Response.json({ status: result.status, today });
  } catch (error) {
    console.error("Error in seva offer:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
