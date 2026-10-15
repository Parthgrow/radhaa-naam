import Link from "next/link";
import { daysLeft, type AccessInfo } from "@/lib/billing/plan";

export default function TrialBanner({ access }: { access: AccessInfo }) {
  if (access.state !== "trial") return null;
  const days = daysLeft(access.trialEndsAt);
  return (
    <div className="mx-auto mt-1 w-full max-w-md px-5">
      <Link
        href="/payments"
        className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-2 text-xs text-foreground ring-1 ring-primary/30 transition hover:bg-primary/15"
      >
        <span>
          Free trial · {days} {days === 1 ? "day" : "days"} left
        </span>
        <span className="font-medium text-primary">Subscribe →</span>
      </Link>
    </div>
  );
}
