import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { dismissNotification } from "@/lib/kv/notifications";
import type { NextRequest } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await params;
  const success = await dismissNotification(notificationId, session.user.id);

  if (!success) {
    return Response.json({ error: "Notification not found or unauthorized" }, { status: 404 });
  }

  return Response.json({ success: true });
}
