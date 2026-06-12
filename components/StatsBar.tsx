"use client";

import { useJaapCount } from "@/lib/useJaapCount";

function fmt(n: number): string {
  return n.toLocaleString();
}

export default function StatsBar() {
  const { data, settings } = useJaapCount();
  const goalNaam = settings.malaGoal * settings.beadsPerMala;
  const pct = goalNaam > 0 ? Math.min(1, data.todayBeads / goalNaam) : 0;

  return (
    <div className="w-full max-w-md mx-auto px-6 pb-2">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <StatCard label="Today (naam)" value={fmt(data.todayBeads)} sub={`${data.todayMalas} malas`} />
        <StatCard label="Lifetime" value={fmt(data.lifetimeBeads)} sub={`${fmt(data.lifetimeMalas)} malas`} />
      </div>

      <div className="rounded-2xl bg-surface backdrop-blur-sm px-4 py-3 shadow-[var(--shadow)] ring-1 ring-ring/30">
        <div className="flex items-baseline justify-between text-xs text-muted">
          <span>Daily goal</span>
          <span>
            {fmt(data.todayBeads)} / {fmt(goalNaam)} naam · {data.todayMalas} / {settings.malaGoal} malas
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-ring/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <div className="mt-1 text-right text-[11px] text-muted">
          {Math.round(pct * 100)}%
          {pct >= 1 && <span className="ml-2 text-primary font-medium">· goal complete ✿</span>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-surface backdrop-blur-sm px-4 py-3 shadow-[var(--shadow)] ring-1 ring-ring/30">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
}
