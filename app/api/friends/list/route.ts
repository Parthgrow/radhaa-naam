import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getFriends } from "@/lib/kv/friends";
import { getBulkWeeklySyncs } from "@/lib/kv/weekly-sync";
import { getWeekStart } from "@/lib/kv/week";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const friends = await getFriends(session.user.id);
  const weekStart = getWeekStart();
  const friendIds = friends.map((f) => f.id);
  const syncs = await getBulkWeeklySyncs(friendIds, weekStart);

  const friendsWithBeads = friends.map((friend) => ({
    user: friend,
    weeklyBeads: syncs[friend.id]?.totalBeads ?? null,
  }));

  return Response.json({ friends: friendsWithBeads, weekStart });
}
