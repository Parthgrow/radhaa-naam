import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { paywallResponse } from "@/lib/billing/access";
import { getDays } from "@/lib/kv/daily-jaap";
import { recordOffering } from "@/lib/kv/seva";
import { activeEvent } from "@/lib/seva/events";
import { phaseAt } from "@/lib/seva/schedule";
import { SEVAS, earnedToday, isSevaId } from "@/lib/seva/sevas";
import { istNow } from "@/lib/seva/time";
import { getSevaToday, sevaOpenNow } from "@/lib/seva/today";

const OP_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const MAX_COUNT = 11;

/**
 * Offer a seva: { opId, seva, count }. The server decides the date, window
 * and limit (from today's malas), so none of them can be faked by the client.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const blocked = await paywallResponse(userId);
  if (blocked) return blocked;

  let body: { opId?: unknown; seva?: unknown; count?: unknown };
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
  const { date, minutes } = istNow();
  const event = activeEvent(date);
  if (!sevaOpenNow(seva, phaseAt(minutes), !!event)) {
    return Response.json({ error: "not_now", today: await getSevaToday(userId) }, { status: 409 });
  }

  try {
    let limit = 1;
    if (seva.kind === "earned") {
      const days = await getDays(userId, [date]);
      limit = earnedToday(seva, days[date]?.malas ?? 0);
    }
    const result = await recordOffering({
      userId,
      opId: body.opId,
      date,
      field: seva.field,
      count: count as number,
      limit,
      eventId: seva.eventOnly ? event?.id ?? null : null,
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
