import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getUserSettings, updateUserSettings } from "@/lib/kv/daily-jaap";
import { parseSettingsPatch } from "@/lib/jaap-validation";
import { paywallResponse } from "@/lib/billing/access";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getUserSettings(session.user.id);
  return Response.json({ success: true, data: settings });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await paywallResponse(session.user.id);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseSettingsPatch(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const saved = await updateUserSettings(session.user.id, parsed.patch);
    return Response.json({ success: true, data: saved });
  } catch (error) {
    console.error("Error in settings PUT:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
