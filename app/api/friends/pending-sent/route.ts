import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getPendingSentRequests } from "@/lib/kv/friends";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pendingSent = await getPendingSentRequests(session.user.id);

  return Response.json({ pendingSent });
}
