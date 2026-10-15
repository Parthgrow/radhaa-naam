import "server-only";
import DodoPayments from "dodopayments";
import type { Subscription } from "dodopayments/resources/subscriptions";
import { PLAN } from "./plan";
import type { SubscriptionRecord } from "@/lib/kv/subscriptions";

let client: DodoPayments | null = null;

/** Created on first use, so builds and pages that never touch billing don't need the key. */
export function getDodo(): DodoPayments {
  if (client) return client;
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) throw new Error("DODO_PAYMENTS_API_KEY is not set");
  if (process.env.DODO_PAYMENTS_BASE_URL) {
    // Testing against a mock server; the SDK reads the URL from the env itself
    client = new DodoPayments({ bearerToken: apiKey });
    return client;
  }
  const environment = process.env.DODO_PAYMENTS_ENVIRONMENT;
  if (environment !== "test_mode" && environment !== "live_mode") {
    // Refuse to guess: the SDK would silently default to live mode
    throw new Error('DODO_PAYMENTS_ENVIRONMENT must be "test_mode" or "live_mode"');
  }
  client = new DodoPayments({ bearerToken: apiKey, environment });
  return client;
}

export function getProductId(): string {
  const productId = process.env.DODO_PRODUCT_ID;
  if (!productId) throw new Error("DODO_PRODUCT_ID is not set");
  return productId;
}

export function getAppUrl(requestUrl: string): string {
  return (process.env.APP_URL ?? new URL(requestUrl).origin).replace(/\/$/, "");
}

export function toSubscriptionRecord(sub: Subscription, eventAt: string): SubscriptionRecord {
  return {
    subscriptionId: sub.subscription_id,
    customerId: sub.customer.customer_id,
    productId: sub.product_id,
    status: sub.status,
    nextBillingDate: sub.next_billing_date ?? null,
    cancelAtPeriodEnd: sub.cancel_at_next_billing_date,
    // One format everywhere, so stored timestamps compare correctly as strings
    eventAt: new Date(eventAt).toISOString(),
  };
}

let cachedPrice: { amountInr: number; fetchedAt: number } | null = null;
const PRICE_CACHE_MS = 60 * 60 * 1000;

/** Monthly price in rupees as configured on the Dodo product, cached for an hour. */
export async function getPlanPriceInr(): Promise<number> {
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < PRICE_CACHE_MS) {
    return cachedPrice.amountInr;
  }
  try {
    const product = await getDodo().products.retrieve(getProductId());
    if (product.price.type === "recurring_price" && product.price.currency === "INR") {
      const amountInr = product.price.price / 100; // Dodo amounts are in paise
      cachedPrice = { amountInr, fetchedAt: Date.now() };
      return amountInr;
    }
    console.warn("Dodo product is not a recurring INR price; showing fallback price");
  } catch (error) {
    console.warn("Could not read plan price from Dodo:", error);
  }
  return PLAN.fallbackPriceInr;
}
