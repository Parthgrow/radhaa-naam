import { kv } from "./client";
import { SubscriptionRecord } from "./types";

function getSubscriptionKey(userId: string) {
  return `user:${userId}:subscription`;
}

export async function getSubscriptionRecord(
  userId: string
): Promise<SubscriptionRecord | null> {
  try {
    return await kv.get<SubscriptionRecord>(getSubscriptionKey(userId));
  } catch (error) {
    console.error("Error reading subscription record:", error);
    return null;
  }
}

/**
 * Merge-write a subscription record. New users get sensible defaults; existing
 * records are patched and `updatedAt` is bumped.
 */
export async function setSubscriptionRecord(
  userId: string,
  patch: Partial<SubscriptionRecord>
): Promise<SubscriptionRecord> {
  const now = new Date().toISOString();
  const existing = await getSubscriptionRecord(userId);

  const record: SubscriptionRecord = {
    // Safe default if a caller ever omits status; real calls always set it.
    status: "expired",
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    subscriptionId: null,
    productId: null,
    createdAt: now,
    ...(existing ?? {}),
    ...patch,
    updatedAt: now,
  };

  await kv.set(getSubscriptionKey(userId), record);
  return record;
}
