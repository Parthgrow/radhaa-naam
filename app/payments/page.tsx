import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth-config";
import { getAccess } from "@/lib/billing/access";
import { getPlanPriceInr } from "@/lib/billing/dodo";
import { daysLeft, formatInr, PLAN } from "@/lib/billing/plan";
import PlanCard from "@/components/billing/PlanCard";
import ManageSubscriptionButton from "@/components/billing/ManageSubscriptionButton";

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [access, priceInr] = await Promise.all([getAccess(session.user.id), getPlanPriceInr()]);
  const sub = access.subscription;

  return (
    <main className="flex min-h-svh flex-col items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Back
        </Link>
        <div className="mb-6 mt-4 text-center">
          <div className="font-deva text-4xl text-primary">राधे राधे</div>
          <p className="mt-2 text-sm text-muted">
            {access.state === "trial" &&
              `Free trial · ${daysLeft(access.trialEndsAt)} days left. Subscribe any time to keep chanting after it ends.`}
            {access.state === "free" && `Support Radhe Radhe for ${formatInr(priceInr)} a ${PLAN.interval}.`}
            {access.state === "expired" && "Subscribe to keep counting your naam jaap."}
            {access.state === "subscribed" && "Thank you for supporting Radhe Radhe 🙏"}
          </p>
        </div>

        {access.state === "subscribed" && sub ? (
          <div className="rounded-3xl bg-surface p-6 shadow-[var(--shadow)] ring-1 ring-ring/40">
            <div className="text-xs uppercase tracking-[0.25em] text-muted">Your plan</div>
            <div className="mt-2 text-lg font-semibold text-foreground">
              {PLAN.name} · {formatInr(priceInr)} / {PLAN.interval}
            </div>
            {sub.nextBillingDate && (
              <p className="mt-1 text-sm text-muted">
                {sub.cancelAtPeriodEnd || sub.status === "cancelled" ? "Access until " : "Renews on "}
                {new Date(sub.nextBillingDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            {sub.manageable && (
              <div className="mt-5">
                <ManageSubscriptionButton />
              </div>
            )}
          </div>
        ) : (
          <PlanCard priceInr={priceInr} />
        )}
      </div>
    </main>
  );
}
