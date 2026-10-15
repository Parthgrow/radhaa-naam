import { PLAN, formatInr } from "@/lib/billing/plan";
import SubscribeButton from "./SubscribeButton";

const BENEFITS = [
  "Unlimited naam jaap counting with mala tracking",
  "Daily goal, streaks and full history",
  "Your count saved and synced on all your devices",
  "Saangh: chant together with friends and family",
];

export default function PlanCard({
  priceInr,
  buttonLabel,
}: {
  priceInr: number;
  buttonLabel?: string;
}) {
  return (
    <div className="rounded-3xl bg-surface p-6 shadow-[var(--shadow)] ring-1 ring-ring/40 backdrop-blur-sm">
      <div className="text-xs uppercase tracking-[0.25em] text-muted">{PLAN.name}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-semibold text-foreground">{formatInr(priceInr)}</span>
        <span className="text-sm text-muted">/ {PLAN.interval}</span>
      </div>
      <ul className="mt-5 space-y-2 text-sm text-foreground">
        {BENEFITS.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-primary">✿</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <SubscribeButton label={buttonLabel ?? `Subscribe for ${formatInr(priceInr)} / ${PLAN.interval}`} />
      </div>
      <p className="mt-3 text-center text-[11px] text-muted">
        Cancel anytime from Settings. Secure payment by Dodo Payments.
      </p>
    </div>
  );
}
