import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getHistoryRange } from "@/lib/kv/daily-jaap";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!startDate || !endDate) {
      return Response.json(
        { error: "startDate and endDate parameters required" },
        { status: 400 }
      );
    }

    // Fetch history from KV
    const history = await getHistoryRange(session.user.id, startDate, endDate);

    // Convert to the format expected by client (matching DailyRecord)
    const formattedHistory: Record<string, { date: string; beads: number; malas: number }> = {};
    Object.entries(history).forEach(([date, record]) => {
      formattedHistory[date] = {
        date: record.date,
        beads: record.beads,
        malas: record.malas,
      };
    });

    return Response.json({
      success: true,
      data: formattedHistory,
      userid : session.user.id
    });
  } catch (error) {
    console.error("Error in history GET:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
