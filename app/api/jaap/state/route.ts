import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  dateRange,
  getDays,
  getLifetime,
  getUserSettings,
  shiftDate,
} from "@/lib/kv/daily-jaap";
import { isDateKey } from "@/lib/jaap-validation";

const HISTORY_DAYS = 90;

/**
 * Everything the app needs on load, in one request. `today` comes from the
 * client because "today" depends on the user's timezone.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const today = new URL(req.url).searchParams.get("today");
  if (!isDateKey(today)) {
    return Response.json({ error: "today must be YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const [days, lifetime, settings] = await Promise.all([
      getDays(userId, dateRange(shiftDate(today, -HISTORY_DAYS), today)),
      getLifetime(userId),
      getUserSettings(userId),
    ]);

    const { [today]: todayTotals, ...history } = days;
    return Response.json({
      success: true,
      data: {
        today: todayTotals ?? { beads: 0, malas: 0 },
        history,
        lifetime,
        settings,
      },
    });
  } catch (error) {
    console.error("Error in jaap state GET:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
