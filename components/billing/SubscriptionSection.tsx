"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { daysLeft, type AccessInfo } from "@/lib/billing/plan";
import ManageSubscriptionButton from "./ManageSubscriptionButton";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Subscription status + Subscribe / Manage, for the Settings sheet. */
export default function SubscriptionSection({ open }: { open: boolean }) {
  const [access, setAccess] = useState<AccessInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/payments/verify")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setAccess(data as AccessInfo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!access) return <p className="text-sm text-muted">Loading…</p>;

  const sub = access.subscription;
  let line: string;
  if (access.state === "subscribed" && sub) {
    const ending = sub.cancelAtPeriodEnd || sub.status === "cancelled";
    line = sub.nextBillingDate
      ? `${ending ? "Cancelled · access until" : "Active · renews"} ${formatDate(sub.nextBillingDate)}`
      : "Active";
  } else if (access.state === "trial") {
    const days = daysLeft(access.trialEndsAt);
    line = `Free trial · ${days} ${days === 1 ? "day" : "days"} left`;
  } else if (access.state === "free") {
    line = "Free";
  } else {
    line = "No active subscription";
  }

  const showManage = !!sub?.manageable && sub.status !== "expired";

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">{line}</p>
      {access.state !== "subscribed" && (
        <Link
          href="/payments"
          className="block w-full rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-medium text-white"
        >
          {access.state === "free" ? "View plan" : "Subscribe"}
        </Link>
      )}
      {showManage && <ManageSubscriptionButton />}
    </div>
  );
}
