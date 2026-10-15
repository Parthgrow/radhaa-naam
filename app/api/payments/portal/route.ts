import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getDodo } from "@/lib/billing/dodo";
import { getSubscription } from "@/lib/kv/subscriptions";

/** A link to Dodo's customer portal: cancel, update card, see invoices. */
export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getSubscription(userId);
  if (!sub?.customerId) {
    return Response.json({ error: "No subscription to manage" }, { status: 404 });
  }

  try {
    const portal = await getDodo().customers.customerPortal.create(sub.customerId);
    return Response.json({ url: portal.link });
  } catch (error) {
    console.error("Error creating customer portal link:", error);
    return Response.json({ error: "Could not open subscription settings" }, { status: 500 });
  }
}
