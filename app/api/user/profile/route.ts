import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getUser, updateUser, setUsername } from "@/lib/kv/users";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUser(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json(user);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { username, allowRecommendations } = body;

  if (username !== undefined && typeof username === "string") {
    const updated = await setUsername(session.user.id, username);
    if (!updated) {
      return Response.json({ error: "Username already taken" }, { status: 409 });
    }
    return Response.json(updated);
  }

  if (allowRecommendations !== undefined) {
    const updated = await updateUser(session.user.id, { allowRecommendations });
    if (!updated) {
      return Response.json({ error: "Failed to update" }, { status: 500 });
    }
    return Response.json(updated);
  }

  return Response.json({ error: "No updates provided" }, { status: 400 });
}
