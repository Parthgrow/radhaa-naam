"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AccessInfo } from "@/lib/billing/plan";

type Phase = "checking" | "active" | "pending" | "failed";

const POLL_MS = 2000;
const MAX_POLLS = 15;

/**
 * Dodo redirects here after checkout. Don't claim success until the server
 * has actually recorded an active subscription.
 */
export default function PaymentConfirmation({
  subscriptionId,
  status,
}: {
  subscriptionId: string | null;
  status: string | null;
}) {
  const failedAtCheckout = status === "failed" || status === "cancelled";
  const [phase, setPhase] = useState<Phase>(failedAtCheckout ? "failed" : "checking");

  useEffect(() => {
    if (failedAtCheckout) return;
    let polls = 0;
    let timer: number | undefined;
    let stopped = false;

    async function check() {
      polls += 1;
      try {
        const query = subscriptionId ? `?subscription_id=${encodeURIComponent(subscriptionId)}` : "";
        const res = await fetch(`/api/payments/verify${query}`);
        if (res.ok) {
          const access = (await res.json()) as AccessInfo;
          if (access.state === "subscribed") {
            if (!stopped) setPhase("active");
            return;
          }
        }
      } catch {
        // keep polling
      }
      if (stopped) return;
      if (polls >= MAX_POLLS) setPhase("pending");
      else timer = window.setTimeout(check, POLL_MS);
    }

    check();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [subscriptionId, failedAtCheckout]);

  const content: Record<Phase, { title: string; body: string }> = {
    checking: { title: "Confirming your payment…", body: "This usually takes a few seconds." },
    active: {
      title: "Subscription active 🙏",
      body: "Thank you for supporting Radhe Radhe. Happy chanting!",
    },
    pending: {
      title: "Payment received, still confirming",
      body: "It's taking longer than usual. Your access will turn on automatically within a few minutes; you can go back and keep chanting.",
    },
    failed: {
      title: "Payment didn't go through",
      body: "You haven't been charged. You can try again.",
    },
  };
  const { title, body } = content[phase];

  return (
    <div className="rounded-3xl bg-surface p-8 text-center shadow-[var(--shadow)] ring-1 ring-ring/40">
      <div className="font-deva text-3xl text-primary">राधे राधे</div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted">{body}</p>
      {phase === "checking" && (
        <div className="mx-auto mt-6 h-1.5 w-24 overflow-hidden rounded-full bg-ring/40">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      )}
      {phase !== "checking" && (
        <Link
          href={phase === "failed" ? "/payments" : "/"}
          className="mt-6 block w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white"
        >
          {phase === "failed" ? "Try again" : "Start chanting"}
        </Link>
      )}
    </div>
  );
}
