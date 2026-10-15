import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getAccess } from "@/lib/billing/access";
import { getDodo, toSubscriptionRecord } from "@/lib/billing/dodo";
import { getSubscription, saveSubscription } from "@/lib/kv/subscriptions";

const SUBSCRIPTION_ID_RE = /^[A-Za-z0-9_]{4,64}$/;

/**
 * The signed-in user's access (trial / subscribed / expired).
 *
 * After checkout, Dodo sends the user back with ?subscription_id=…; the success
 * page passes it here so access is granted straight away, even if the webhook
 * hasn't arrived yet. The subscription is only accepted if it belongs to this user.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptionId = new URL(request.url).searchParams.get("subscription_id");
  if (subscriptionId && SUBSCRIPTION_ID_RE.test(subscriptionId)) {
    try {
      const stored = await getSubscription(userId);
      if (stored?.subscriptionId !== subscriptionId || stored.status !== "active") {
        const sub = await getDodo().subscriptions.retrieve(subscriptionId);
        const email = session.user?.email?.toLowerCase();
        const belongsToUser =
          sub.metadata?.userId === userId ||
          (!!email && sub.customer.email.toLowerCase() === email);
        if (belongsToUser) {
          await saveSubscription(userId, toSubscriptionRecord(sub, new Date().toISOString()));
        } else {
          console.warn(`Subscription ${subscriptionId} does not belong to user ${userId}`);
        }
      }
    } catch (error) {
      // Not fatal: the webhook will still deliver the subscription
      console.warn("Could not confirm subscription from return URL:", error);
    }
  }

  try {
    return Response.json(await getAccess(userId));
  } catch (error) {
    console.error("Error reading access:", error);
    return Response.json({ error: "Could not read subscription" }, { status: 500 });
  }
}
