import { kv } from "./client";
import type { SubscriptionStatus } from "@/lib/billing/plan";

const PROJECT_PREFIX = "radha";

export type SubscriptionRecord = {
  subscriptionId: string;
  customerId: string;
  productId: string;
  status: SubscriptionStatus;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  /** Timestamp of the Dodo event (or API read) this record came from */
  eventAt: string;
};

function getSubscriptionKey(userId: string): string {
  return `${PROJECT_PREFIX}:subscription:${userId}`;
}

function getTrialStartKey(userId: string): string {
  return `${PROJECT_PREFIX}:trial-start:${userId}`;
}

/**
 * Save only if this update is newer than what's stored. Dodo can deliver
 * webhooks out of order or more than once; an older "active" must never
 * overwrite a newer "cancelled".
 */
const SAVE_IF_NEWER_SCRIPT = `
local stored = redis.call('HGET', KEYS[1], 'eventAt')
if stored and stored > ARGV[1] then
  return 0
end
redis.call('HSET', KEYS[1], unpack(ARGV, 2))
return 1
`;

export async function saveSubscription(
  userId: string,
  record: SubscriptionRecord
): Promise<boolean> {
  const fields: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    fields.push(key, value === null ? "" : String(value));
  }
  const saved = await kv.eval<string[], number>(
    SAVE_IF_NEWER_SCRIPT,
    [getSubscriptionKey(userId)],
    [record.eventAt, ...fields]
  );
  return Number(saved) === 1;
}

export async function getSubscription(userId: string): Promise<SubscriptionRecord | null> {
  const raw = await kv.hgetall<Record<string, unknown>>(getSubscriptionKey(userId));
  if (!raw || !raw.subscriptionId) return null;
  return {
    subscriptionId: String(raw.subscriptionId),
    customerId: String(raw.customerId ?? ""),
    productId: String(raw.productId ?? ""),
    status: String(raw.status) as SubscriptionStatus,
    nextBillingDate: raw.nextBillingDate ? String(raw.nextBillingDate) : null,
    cancelAtPeriodEnd: raw.cancelAtPeriodEnd === true || raw.cancelAtPeriodEnd === "true",
    eventAt: String(raw.eventAt ?? ""),
  };
}

/** Trial start for users without a user record (sign-up failed half way). */
export async function getOrStartTrial(userId: string, nowIso: string): Promise<string> {
  await kv.set(getTrialStartKey(userId), nowIso, { nx: true });
  return (await kv.get<string>(getTrialStartKey(userId))) ?? nowIso;
}
