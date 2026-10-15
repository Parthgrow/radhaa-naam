import type { AccessInfo } from "@/lib/billing/plan";
import { getPlanPriceInr } from "@/lib/billing/dodo";
import PlanCard from "./PlanCard";
import ManageSubscriptionButton from "./ManageSubscriptionButton";
import LogoutButton from "@/components/LogoutButton";

/** Shown instead of the app once the free trial is over and there's no current subscription. */
export default async function Paywall({ access }: { access: AccessInfo }) {
  const priceInr = await getPlanPriceInr();
  const status = access.subscription?.status;
  const paymentProblem = status === "on_hold" || status === "failed";

  const title = paymentProblem
    ? "Your renewal payment didn't go through"
    : status === "cancelled" || status === "expired"
      ? "Your subscription has ended"
      : "Your 14-day free trial has ended";

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="font-deva text-4xl text-primary">राधे राधे</div>
          <h1 className="mt-4 text-xl font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted">
            {paymentProblem
              ? "Update your payment method to keep chanting. Your jaap history is safe."
              : "Subscribe to keep counting your naam jaap. Your history, streaks and settings are all saved and waiting for you."}
          </p>
        </div>

        {paymentProblem && access.subscription?.manageable ? (
          <ManageSubscriptionButton
            label="Update payment method"
            className="w-full rounded-xl bg-primary px-4 py-3 text-base font-medium text-white shadow-[var(--shadow)] transition hover:opacity-90 disabled:opacity-60"
          />
        ) : (
          <PlanCard priceInr={priceInr} />
        )}

        <div className="mt-6 flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
