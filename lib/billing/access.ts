import "server-only";
import { getUser } from "@/lib/kv/users";
import { getOrStartTrial, getSubscription, type SubscriptionRecord } from "@/lib/kv/subscriptions";
import { TRIAL_DAYS, type AccessInfo } from "./plan";

const DAY_MS = 86_400_000;

/**
 * When the paywall starts, from PAYWALL_LAUNCH_DATE (YYYY-MM-DD, IST midnight).
 * Unset → no paywall, everyone has full access. Existing users' 14-day trial
 * starts on this date, new users' on the day they sign up.
 */
function getLaunchTime(): number | null {
  const value = process.env.PAYWALL_LAUNCH_DATE;
  if (!value) return null;
  const time = new Date(`${value}T00:00:00+05:30`).getTime();
  if (Number.isNaN(time)) {
    console.error(`Invalid PAYWALL_LAUNCH_DATE "${value}", expected YYYY-MM-DD; paywall disabled`);
    return null;
  }
  return time;
}

/** Paid and current — including a cancelled plan's already-paid remaining period. */
export function subscriptionGivesAccess(sub: SubscriptionRecord | null, now = Date.now()): boolean {
  if (!sub) return false;
  if (sub.status === "active") return true;
  if (sub.status === "cancelled" && sub.nextBillingDate) {
    return new Date(sub.nextBillingDate).getTime() > now;
  }
  return false;
}

export async function getAccess(userId: string): Promise<AccessInfo> {
  const now = Date.now();
  const sub = await getSubscription(userId);
  const subscription = sub
    ? {
        status: sub.status,
        nextBillingDate: sub.nextBillingDate,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        manageable: Boolean(sub.customerId),
      }
    : null;

  if (subscriptionGivesAccess(sub, now)) {
    return { hasAccess: true, state: "subscribed", trialEndsAt: null, subscription };
  }

  const launch = getLaunchTime();
  if (launch === null || now < launch) {
    return { hasAccess: true, state: "free", trialEndsAt: null, subscription };
  }

  const user = await getUser(userId);
  const signedUpAt = user?.createdAt ?? (await getOrStartTrial(userId, new Date(now).toISOString()));
  const trialStart = Math.max(new Date(signedUpAt).getTime(), launch);
  const trialEnd = trialStart + TRIAL_DAYS * DAY_MS;
  const trialEndsAt = new Date(trialEnd).toISOString();

  if (now < trialEnd) {
    return { hasAccess: true, state: "trial", trialEndsAt, subscription };
  }
  return { hasAccess: false, state: "expired", trialEndsAt, subscription };
}

/** For API routes: a 402 response when the user is past their trial and not subscribed. */
export async function paywallResponse(userId: string): Promise<Response | null> {
  const access = await getAccess(userId);
  if (access.hasAccess) return null;
  return Response.json({ error: "Subscription required", access }, { status: 402 });
}
