import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { dateRange, getDays } from "@/lib/kv/daily-jaap";
import { isDateKey } from "@/lib/jaap-validation";

const MAX_RANGE_DAYS = 366;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (!isDateKey(startDate) || !isDateKey(endDate)) {
    return Response.json(
      { error: "startDate and endDate parameters required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const dates = dateRange(startDate, endDate);
  if (dates.length > MAX_RANGE_DAYS) {
    return Response.json(
      { error: `Range can be at most ${MAX_RANGE_DAYS} days` },
      { status: 400 }
    );
  }

  try {
    const days = await getDays(session.user.id, dates);
    const history: Record<string, { date: string; beads: number; malas: number }> = {};
    for (const [date, totals] of Object.entries(days)) {
      history[date] = { date, ...totals };
    }

    return Response.json({ success: true, data: history });
  } catch (error) {
    console.error("Error in history GET:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
