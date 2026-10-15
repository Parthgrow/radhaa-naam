import { Webhook } from "svix";
import type { Subscription } from "dodopayments/resources/subscriptions";
import { toSubscriptionRecord } from "@/lib/billing/dodo";
import { saveSubscription } from "@/lib/kv/subscriptions";
import { findUserByEmail } from "@/lib/kv/users";

type DodoEvent = {
  type: string;
  timestamp: string;
  data: unknown;
};

/**
 * Dodo Payments webhooks (Standard Webhooks signatures, verified with svix).
 *
 * Every subscription.* event carries the full subscription, so we store its
 * current status rather than interpreting each event type: active, renewed,
 * on_hold (renewal failed), cancelled, expired, failed, plan_changed, updated.
 * Out-of-order and repeated deliveries are handled by saveSubscription, which
 * ignores anything older than what's stored.
 */
export async function POST(request: Request) {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Webhook] DODO_PAYMENTS_WEBHOOK_SECRET is not set");
    return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await request.text();
  let event: DodoEvent;
  try {
    event = new Webhook(secret).verify(body, {
      "webhook-id": request.headers.get("webhook-id") ?? "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": request.headers.get("webhook-signature") ?? "",
    }) as DodoEvent;
  } catch (error) {
    console.error("[Webhook] Signature verification failed:", error);
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!event.type.startsWith("subscription.")) {
    // payment.*, refund.*, dispute.*: access follows the subscription status
    return Response.json({ received: true, ignored: event.type });
  }

  const sub = event.data as Subscription;
  try {
    const userId =
      sub.metadata?.userId ?? (await findUserByEmail(sub.customer.email.toLowerCase()))?.id ??
      (await findUserByEmail(sub.customer.email))?.id;
    if (!userId) {
      // Nothing to retry: log it so the payment can be matched up by hand
      console.error(
        `[Webhook] ${event.type} for ${sub.subscription_id} (${sub.customer.email}) matches no user`
      );
      return Response.json({ received: true, unmatched: true });
    }

    const saved = await saveSubscription(userId, toSubscriptionRecord(sub, event.timestamp));
    console.log(
      `[Webhook] ${event.type} user=${userId} sub=${sub.subscription_id} status=${sub.status}` +
        (saved ? "" : " (older than stored, skipped)")
    );
    return Response.json({ received: true });
  } catch (error) {
    // 500 makes Dodo retry the delivery
    console.error("[Webhook] Failed to process", event.type, error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
