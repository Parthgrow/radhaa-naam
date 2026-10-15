import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getDodo, getAppUrl, getProductId } from "@/lib/billing/dodo";
import { subscriptionGivesAccess } from "@/lib/billing/access";
import { getSubscription } from "@/lib/kv/subscriptions";

/** Start a Dodo checkout for the monthly plan and return its URL. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await getSubscription(userId);
    if (subscriptionGivesAccess(existing)) {
      return Response.json({ error: "Already subscribed" }, { status: 409 });
    }

    const checkout = await getDodo().checkoutSessions.create({
      product_cart: [{ product_id: getProductId(), quantity: 1 }],
      // Reuse the Dodo customer from an earlier (lapsed) subscription if we have one
      customer: existing?.customerId
        ? { customer_id: existing.customerId }
        : { email, name: session.user?.name || email },
      // The free trial happens in the app before the paywall, so billing starts now
      subscription_data: { trial_period_days: 0 },
      // Lets the webhook tie the subscription back to this user
      metadata: { userId },
      return_url: `${getAppUrl(request.url)}/payments/success`,
    });

    if (!checkout.checkout_url) throw new Error("Dodo returned no checkout_url");
    return Response.json({ checkoutUrl: checkout.checkout_url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return Response.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
