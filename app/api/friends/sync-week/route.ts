import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { saveWeeklySync } from "@/lib/kv/weekly-sync";
import { getWeekStart } from "@/lib/kv/week";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { totalBeads, totalMalas } = body;

  if (typeof totalBeads !== "number" || typeof totalMalas !== "number") {
    return Response.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }

  const weekStart = getWeekStart();
  const sync = await saveWeeklySync(session.user.id, weekStart, totalBeads, totalMalas);

  return Response.json(sync);
}
