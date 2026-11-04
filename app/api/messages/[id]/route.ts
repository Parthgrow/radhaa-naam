import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { paywallResponse } from "@/lib/billing/access";
import { messages } from "@/lib/messages/default";

/** Remove one of your own messages. Anything else is a 404. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await paywallResponse(userId);
  if (blocked) return blocked;

  const { id } = await params;
  try {
    const removed = await messages.remove(userId, id);
    if (!removed) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting message:", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
