import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { paywallResponse } from "@/lib/billing/access";
import { messages } from "@/lib/messages/default";

// A devotee's private words: never cached, never logged
const NO_STORE = { "Cache-Control": "no-store" };

/** Save a message to Radha Rani: { id, body }. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await paywallResponse(userId);
  if (blocked) return blocked;

  let input: { id?: unknown; body?: unknown };
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await messages.send(userId, { id: input?.id, body: input?.body });
    switch (result.status) {
      case "invalid":
        return Response.json({ error: result.error }, { status: 400, headers: NO_STORE });
      case "rate_limited":
        return Response.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
      case "repeat":
        return Response.json({ status: "repeat", message: result.message }, { headers: NO_STORE });
      default:
        return Response.json({ status: "created", message: result.message }, { status: 201, headers: NO_STORE });
    }
  } catch (error) {
    console.error("Error saving message:", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Your messages, newest first: ?before=<cursor>&limit=20 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await paywallResponse(userId);
  if (blocked) return blocked;

  const params = new URL(request.url).searchParams;
  try {
    const page = await messages.list(userId, { before: params.get("before"), limit: params.get("limit") });
    return Response.json(page, { headers: NO_STORE });
  } catch (error) {
    console.error("Error listing messages:", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
