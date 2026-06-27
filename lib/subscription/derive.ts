// Pure, framework-free derivation of subscription state for the presentation
// layer. No React here so it stays trivially unit-testable.
//
// NOTE: this is presentation only. Nothing derived here is a security
// boundary — the browser can lie about all of it. Real enforcement lives in
// the server layer (Part 2).

export type AccessStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'expired'
  | 'none';

/** Raw shape returned by /api/payments/verify (target contract, Part 2). */
export interface SubscriptionPayload {
  status?: AccessStatus;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  productId?: string | null;
  // Legacy field from the current endpoint — used by the shim below.
  hasActiveSubscription?: boolean;
}

/** Everything the UI needs, in a ready-to-render form. */
export interface SubscriptionView {
  status: AccessStatus;
  /** True when the user should see premium content (active OR trialing). */
  isActive: boolean;
  isTrialing: boolean;
  /** Whole calendar days left in the trial; 0 when not trialing. */
  daysLeftInTrial: number;
  /** Hours left in the trial, for the final-day countdown; 0 when not trialing. */
  hoursLeftInTrial: number;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  productId: string | null;
}

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

/**
 * Maps the legacy `{ hasActiveSubscription }` payload onto the new `status`
 * contract so the whole presentation layer can be built and shipped before the
 * server endpoint is upgraded in Part 2.
 */
export function normalizePayload(
  raw: SubscriptionPayload | null | undefined
): SubscriptionPayload {
  if (!raw) return { status: 'none' };
  if (raw.status) return raw;
  // Shim: old endpoint only told us active vs not.
  return { ...raw, status: raw.hasActiveSubscription ? 'active' : 'none' };
}

export function deriveView(
  raw: SubscriptionPayload | null | undefined,
  now: Date
): SubscriptionView {
  const payload = normalizePayload(raw);
  const status = payload.status ?? 'none';

  const trialEndsAt = payload.trialEndsAt ? new Date(payload.trialEndsAt) : null;
  const currentPeriodEnd = payload.currentPeriodEnd
    ? new Date(payload.currentPeriodEnd)
    : null;

  const isTrialing = status === 'trialing';
  const isActive = status === 'active' || status === 'trialing';

  let daysLeftInTrial = 0;
  let hoursLeftInTrial = 0;
  if (isTrialing && trialEndsAt) {
    const remainingMs = trialEndsAt.getTime() - now.getTime();
    daysLeftInTrial = Math.max(0, Math.ceil(remainingMs / MS_PER_DAY));
    hoursLeftInTrial = Math.max(0, Math.ceil(remainingMs / MS_PER_HOUR));
  }

  return {
    status,
    isActive,
    isTrialing,
    daysLeftInTrial,
    hoursLeftInTrial,
    trialEndsAt,
    currentPeriodEnd,
    productId: payload.productId ?? null,
  };
}

/** Human-friendly trial remaining string, e.g. "4 days left" / "6 hours left". */
export function formatTrialRemaining(view: SubscriptionView): string {
  if (!view.isTrialing) return '';
  if (view.daysLeftInTrial > 1) return `${view.daysLeftInTrial} days left`;
  // Final day → show hours for urgency.
  if (view.hoursLeftInTrial > 1) return `${view.hoursLeftInTrial} hours left`;
  if (view.hoursLeftInTrial === 1) return '1 hour left';
  return 'Trial ending soon';
}
