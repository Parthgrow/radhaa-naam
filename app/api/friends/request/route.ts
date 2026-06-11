import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { findUserByEmail, findUserByUsername } from "@/lib/kv/users";
import { sendFriendRequest } from "@/lib/kv/friends";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { identifier } = body;

  if (!identifier || typeof identifier !== "string") {
    return Response.json(
      { error: "Identifier (email or username) required" },
      { status: 400 }
    );
  }

  let targetUser = null;

  if (identifier.includes("@")) {
    targetUser = await findUserByEmail(identifier);
  } else {
    targetUser = await findUserByUsername(identifier);
  }

  if (!targetUser) {
    return Response.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const request = await sendFriendRequest(session.user.id, targetUser.id);
  if (!request) {
    return Response.json(
      { error: "Cannot send request (already friends or pending)" },
      { status: 409 }
    );
  }

  return Response.json(request, { status: 201 });
}
