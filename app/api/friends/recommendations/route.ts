import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getRandomRecommendations } from "@/lib/kv/friends";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recommendations = await getRandomRecommendations(session.user.id, 4);

  return Response.json({ recommendations });
}
