import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { saveDailyRecord, getDailyRecord } from "@/lib/kv/daily-jaap";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { date, beads, malas, clientTimestamp } = body;

    // Validate inputs
    if (!date || typeof beads !== "number" || typeof malas !== "number" || !clientTimestamp) {
      return Response.json(
        { error: "Invalid payload: date, beads, malas, clientTimestamp required" },
        { status: 400 }
      );
    }

    // Date format validation (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json(
        { error: "Invalid date format, expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Save the record
    const saved = await saveDailyRecord(session.user.id, date, beads, malas, clientTimestamp);

    return Response.json({
      success: true,
      data: saved,
    });
  } catch (error) {
    console.error("Error in save-daily:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");

    if (!date) {
      return Response.json(
        { error: "date parameter required" },
        { status: 400 }
      );
    }

    const record = await getDailyRecord(session.user.id, date);

    return Response.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error in GET save-daily:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
