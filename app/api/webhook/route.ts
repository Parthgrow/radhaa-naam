import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { kv } from '@vercel/kv';

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

    console.log('[Webhook] Verifying with Svix...');

    let event: any;
    try {
      event = svix.verify(body, headers);
    } catch (err) {
      console.error('[Webhook] Svix verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('[Webhook] Event verified:', event.type);

    if (event.type === 'checkout.session.completed') {
      const { id, metadata, customer, status } = event.data as any;

      if (status === 'success' && metadata?.userId) {
        await kv.hset(
          `user:${metadata.userId}:subscription`,
          {
            sessionId: id,
            productId: metadata.productId,
            email: customer.email,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        );

        console.log(
          `✓ Payment successful for user ${metadata.userId}, product ${metadata.productId}`
        );
      }
    }

    if (event.type === 'payment.completed' || event.type === 'payment.successful') {
      const { id, metadata, customer } = event.data as any;

      if (metadata?.userId) {
        await kv.hset(
          `user:${metadata.userId}:subscription`,
          {
            sessionId: id,
            productId: metadata.productId,
            email: customer.email,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        );

        console.log(
          `✓ Payment completed for user ${metadata.userId}`
        );
      }
    }

    if (event.type === 'subscription.updated' || event.type === 'subscription.created') {
      const { subscription_id, metadata, status } = event.data as any;
      if (metadata?.userId && status === 'active') {
        console.log(`✓ Subscription active for user ${metadata.userId}`);
      }
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
