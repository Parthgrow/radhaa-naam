import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getUserNotifications, getUnreadCount } from "@/lib/kv/notifications";
import { getUser } from "@/lib/kv/users";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await getUserNotifications(session.user.id);
  const unreadCount = await getUnreadCount(session.user.id);

  const enrichedNotifications = await Promise.all(
    notifications.map(async (notif) => {
      const relatedUser = await getUser(notif.relatedUserId);
      return {
        ...notif,
        relatedUserName: relatedUser?.name || relatedUser?.username || relatedUser?.email || "Unknown",
      };
    })
  );

  return Response.json({
    notifications: enrichedNotifications,
    unreadCount,
  });
}
