import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import {
  setSubscriptionRecord,
  indexSubscription,
  getUserIdBySubscription,
} from '@/lib/kv/subscriptions';
import type { SubscriptionRecord } from '@/lib/kv/types';

// Map a Dodo subscription event onto our stored status. Returns the patch to
// apply, or null to ignore the event.
function subscriptionPatch(
  eventType: string,
  data: any
): Partial<SubscriptionRecord> | null {
  const common = {
    subscriptionId: data.subscription_id ?? null,
    productId: data.product_id ?? null,
    currentPeriodEnd: data.next_billing_date ?? null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_next_billing_date),
  };

  switch (eventType) {
    case 'subscription.active':
    case 'subscription.renewed':
      return { ...common, status: 'active' };
    case 'subscription.on_hold':
      return { ...common, status: 'past_due' };
    case 'subscription.cancelled':
      // Keep access until currentPeriodEnd; getAccessState resolves it.
      return { ...common, status: 'cancelled', cancelAtPeriodEnd: true };
    case 'subscription.failed':
    case 'subscription.expired':
      return { ...common, status: 'expired' };
    case 'subscription.updated':
      // Trust Dodo's status field for generic updates.
      if (data.status === 'active') return { ...common, status: 'active' };
      if (data.status === 'on_hold') return { ...common, status: 'past_due' };
      if (data.status === 'cancelled')
        return { ...common, status: 'cancelled', cancelAtPeriodEnd: true };
      if (data.status === 'expired' || data.status === 'failed')
        return { ...common, status: 'expired' };
      return null;
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || '';

    if (!secret) {
      console.error('[Webhook] Webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const svix = new Webhook(secret);

    const headers = {
      'webhook-id': request.headers.get('webhook-id') || '',
      'webhook-timestamp': request.headers.get('webhook-timestamp') || '',
      'webhook-signature': request.headers.get('webhook-signature') || '',
    };

    let event: any;
    try {
      event = svix.verify(body, headers);
    } catch (err) {
      console.error('[Webhook] Svix verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log('[Webhook] Event verified:', event.type);

    const data = event.data as any;
    const userId = data?.metadata?.userId as string | undefined;

    // Subscription lifecycle events (payload_type: 'Subscription').
    if (typeof event.type === 'string' && event.type.startsWith('subscription.')) {
      if (!userId) {
        console.warn(`[Webhook] ${event.type} missing metadata.userId, ignoring`);
        return NextResponse.json({ received: true });
      }
      const patch = subscriptionPatch(event.type, data);
      if (patch) {
        // Idempotent: re-applying the same patch is a no-op.
        await setSubscriptionRecord(userId, patch);
        console.log(`✓ ${event.type} → ${patch.status} for user ${userId}`);
      }
      return NextResponse.json({ received: true });
    }

    // A successful one-off/first payment also confirms an active subscription.
    if (event.type === 'payment.succeeded') {
      if (userId) {
        await setSubscriptionRecord(userId, {
          status: 'active',
          subscriptionId: data.subscription_id ?? null,
          productId: data.product_id ?? null,
        });
        console.log(`✓ payment.succeeded → active for user ${userId}`);
      }
      return NextResponse.json({ received: true });
    }

    if (event.type === 'payment.failed') {
      if (userId) {
        await setSubscriptionRecord(userId, { status: 'past_due' });
        console.log(`✓ payment.failed → past_due for user ${userId}`);
      }
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
