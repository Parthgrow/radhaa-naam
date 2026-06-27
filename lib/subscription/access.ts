import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSubscriptionRecord } from "@/lib/kv/subscriptions";
import type { AccessStatus } from "@/lib/subscription/derive";

export interface AccessState {
  status: AccessStatus; // trialing | active | past_due | expired | none
  hasAccess: boolean; // trialing OR active
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  productId: string | null;
}

const NO_ACCESS: AccessState = {
  status: "none",
  hasAccess: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  productId: null,
};

/**
 * THE single source of truth for a user's access. Reads the KV record and
 * resolves time-based transitions (trial expiry, cancelled-but-in-period) at
 * read time, so no cron job is needed to expire trials.
 */
export async function getAccessState(userId: string): Promise<AccessState> {
  const rec = await getSubscriptionRecord(userId);
  if (!rec) return NO_ACCESS;

  const now = Date.now();
  const base = {
    trialEndsAt: rec.trialEndsAt,
    currentPeriodEnd: rec.currentPeriodEnd,
    productId: rec.productId,
  };

  // Paid, healthy subscription.
  if (rec.status === "active") {
    return { ...base, status: "active", hasAccess: true };
  }

  // Payment failed — keep them out until resolved (dunning).
  if (rec.status === "past_due") {
    return { ...base, status: "past_due", hasAccess: false };
  }

  // Cancelled: keep access until the paid period actually ends.
  if (rec.status === "cancelled") {
    const stillInPeriod =
      rec.currentPeriodEnd && new Date(rec.currentPeriodEnd).getTime() > now;
    return stillInPeriod
      ? { ...base, status: "active", hasAccess: true }
      : { ...base, status: "expired", hasAccess: false };
  }

  // Trial: lazy expiry.
  if (rec.status === "trialing") {
    const trialValid =
      rec.trialEndsAt && new Date(rec.trialEndsAt).getTime() > now;
    return trialValid
      ? { ...base, status: "trialing", hasAccess: true }
      : { ...base, status: "expired", hasAccess: false };
  }

  // expired or anything else.
  return { ...base, status: "expired", hasAccess: false };
}

/**
 * Enforcement for API route handlers. Returns the userId on success, or a
 * ready-to-return Response (401 unauthenticated / 402 needs subscription).
 *
 * Usage:
 *   const gate = await requireActiveAccess();
 *   if (!gate.ok) return gate.response;
 *   // ...premium logic with gate.userId
 */
export async function requireActiveAccess(): Promise<
  | { ok: true; userId: string; state: AccessState }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const state = await getAccessState(session.user.id);
  if (!state.hasAccess) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Subscription required", status: state.status },
        { status: 402 }
      ),
    };
  }

  return { ok: true, userId: session.user.id, state };
}

/**
 * Enforcement for protected server components / pages. Redirects to /payments
 * when the user lacks access. Returns the userId on success.
 */
export async function assertAccessOrRedirect(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const state = await getAccessState(session.user.id);
  if (!state.hasAccess) redirect("/payments");

  return session.user.id;
}
