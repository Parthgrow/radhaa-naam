"use client";

import { useJaapCount } from "@/lib/useJaapCount";
import { currentStreak, lastNDays, parseKey } from "@/lib/date";

export default function SevenDayStrip() {
  const { data, settings } = useJaapCount();
  const byDate: Record<string, number> = {};
  Object.entries(data.history).forEach(([date, record]) => {
    byDate[date] = record.beads;
  });
  if (data.todayBeads > 0) {
    byDate[data.todayDate ?? ''] = data.todayBeads;
  }
  const days = lastNDays(7);
  const goal = settings.malaGoal * settings.beadsPerMala || 1;
  const streak = currentStreak(byDate);

  const max = Math.max(goal, ...days.map((d) => byDate[d] ?? 0));

  return (
    <div className="w-full max-w-md mx-auto px-6 pt-2 pb-4">
      <div className="flex items-end justify-between gap-1.5">
        {days.map((d) => {
          const beads = byDate[d] ?? 0;
          const pct = max > 0 ? beads / max : 0;
          const goalMet = beads >= goal;
          const isToday = d === data.todayDate;
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative h-12 w-full rounded-md bg-ring/30 overflow-hidden">
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-md ${
                    goalMet
                      ? "bg-gradient-to-t from-[var(--primary)] to-[var(--accent)]"
                      : "bg-[var(--primary)]/60"
                  }`}
                  style={{ height: `${Math.max(pct * 100, beads > 0 ? 6 : 0)}%` }}
                />
              </div>
              <span className={`text-[10px] ${isToday ? "text-primary font-semibold" : "text-muted"}`}>
                {parseKey(d).toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>Last 7 days</span>
        <span>🔥 {streak}-day streak</span>
      </div>
    </div>
  );
}
