'use server';

import DodoPayments from 'dodopayments';
import { PAYMENT_PRODUCTS, CheckoutSessionParams } from '@/lib/dodo-payments';

const client = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode',
});

export async function createCheckoutSession({
  productId,
  email,
  name,
  userId,
  returnUrl,
}: CheckoutSessionParams) {
  const product = Object.values(PAYMENT_PRODUCTS).find(
    (p) => p.id === productId
  );

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const metadata = {
    userId,
    productId,
  };

  const session = await client.checkoutSessions.create({
    product_cart: [
      {
        product_id: productId,
        quantity: 1,
      },
    ],
    subscription_data: product.trial_days
      ? { trial_period_days: product.trial_days }
      : undefined,
    customer: {
      email,
      name,
    },
    return_url: returnUrl,
    metadata,
  });

  return session;
}

export async function getPaymentStatus(sessionId: string) {
  const session = await client.checkoutSessions.retrieve(sessionId);
  return session;
}
