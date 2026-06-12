"use client";

import Sheet from "./Sheet";
import HeatmapCalendar from "./HeatmapCalendar";
import { useJaapCount } from "@/lib/useJaapCount";
import { currentStreak, longestStreak, parseKey } from "@/lib/date";

type Props = { open: boolean; onClose: () => void };

export default function HistorySheet({ open, onClose }: Props) {
  const { data: state, settings } = useJaapCount();
  const byDate: Record<string, number> = {};
  Object.entries(state.history).forEach(([date, record]) => {
    byDate[date] = record.beads;
  });
  if (state.todayBeads > 0 && state.todayDate) {
    byDate[state.todayDate] = state.todayBeads;
  }
  const goal = settings.malaGoal * settings.beadsPerMala;
  const streak = currentStreak(byDate);
  const longest = longestStreak(byDate);
  const totalDays = Object.values(byDate).filter((v) => v > 0).length;

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radha-naam-jaap-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const recent = Object.values(state.history)
    .concat(
      state.todayBeads > 0
        ? [{ date: state.todayDate, beads: state.todayBeads, malas: state.todayMalas }]
        : []
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 14);

  return (
    <Sheet open={open} onClose={onClose} title="History">
      <div className="space-y-6">
        <section className="grid grid-cols-3 gap-2">
          <Stat label="Current streak" value={`🔥 ${streak}`} sub="days" />
          <Stat label="Longest streak" value={`${longest}`} sub="days" />
          <Stat label="Days chanted" value={`${totalDays}`} sub="total" />
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-[0.25em] text-muted mb-2">
            Last 13 weeks
          </h3>
          <HeatmapCalendar byDate={byDate} goal={goal} days={91} />
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-[0.25em] text-muted mb-2">
            Recent days
          </h3>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">No chants yet. Tap the screen to begin.</p>
          ) : (
            <ul className="divide-y divide-ring/30 rounded-2xl bg-surface ring-1 ring-ring/40 overflow-hidden">
              {recent.map((r) => {
                const goalMet = goal > 0 && r.beads >= goal;
                return (
                  <li key={r.date} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-foreground">
                      {parseKey(r.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {r.date === state.todayDate && (
                        <span className="ml-2 text-[10px] text-primary uppercase tracking-wider">today</span>
                      )}
                    </span>
                    <span className="text-sm tabular-nums text-muted">
                      {r.beads.toLocaleString()} naam · {r.malas} malas{" "}
                      {goalMet && <span className="text-primary">✿</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <button
            type="button"
            onClick={exportJson}
            className="rounded-xl bg-surface ring-1 ring-ring/40 px-4 py-2 text-sm hover:bg-ring/20"
          >
            Export as JSON
          </button>
        </section>
      </div>
    </Sheet>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-ring/40 px-3 py-3 text-center">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
  );
}
