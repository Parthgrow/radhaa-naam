/** Shared (client + server) billing constants and types. No secrets here. */

export const PLAN = {
  name: "Radhe Radhe",
  /** Shown if the live price can't be read from Dodo. Keep in sync with the Dodo product. */
  fallbackPriceInr: 100,
  interval: "month",
} as const;

export const TRIAL_DAYS = 14;

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "on_hold"
  | "cancelled"
  | "failed"
  | "expired"
  | "paused";

/**
 * What the signed-in user can do right now.
 * - free:       the paywall hasn't launched yet (PAYWALL_LAUNCH_DATE unset or in the future)
 * - trial:      inside the 14-day free trial
 * - subscribed: paid and current
 * - expired:    trial over and no current subscription → paywall
 */
export type AccessState = "free" | "trial" | "subscribed" | "expired";

export type AccessInfo = {
  hasAccess: boolean;
  state: AccessState;
  trialEndsAt: string | null;
  subscription: {
    status: SubscriptionStatus;
    nextBillingDate: string | null;
    cancelAtPeriodEnd: boolean;
    /** True when we can open Dodo's customer portal for this user */
    manageable: boolean;
  } | null;
};

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function daysLeft(isoDate: string | null, now = Date.now()): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - now) / 86_400_000));
}
