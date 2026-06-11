import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { acceptFriendRequest, declineFriendRequest } from "@/lib/kv/friends";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { requestId, action } = body;

  if (!requestId || typeof requestId !== "string") {
    return Response.json(
      { error: "Request ID required" },
      { status: 400 }
    );
  }

  if (action !== "accept" && action !== "decline") {
    return Response.json(
      { error: "Action must be 'accept' or 'decline'" },
      { status: 400 }
    );
  }

  const success =
    action === "accept"
      ? await acceptFriendRequest(requestId, session.user.id)
      : await declineFriendRequest(requestId, session.user.id);

  if (!success) {
    return Response.json(
      { error: "Failed to process request" },
      { status: 400 }
    );
  }

  return Response.json({ success: true });
}
