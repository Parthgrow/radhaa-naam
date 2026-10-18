import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { paywallResponse } from "@/lib/billing/access";
import { getSevaToday } from "@/lib/seva/today";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const blocked = await paywallResponse(session.user.id);
  if (blocked) return blocked;

  try {
    return Response.json(await getSevaToday(session.user.id));
  } catch (error) {
    console.error("Error in seva today:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
