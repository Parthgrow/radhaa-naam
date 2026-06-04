"use client";

import { lastNDays, parseKey } from "@/lib/date";

type Props = {
  byDate: Record<string, number>;
  goal: number;
  days?: number;
};

export default function HeatmapCalendar({ byDate, goal, days = 91 }: Props) {
  const keys = lastNDays(days);
  // pad to align into weeks (Mon-start grid).
  const first = parseKey(keys[0]);
  const firstWeekday = (first.getDay() + 6) % 7; // 0=Mon..6=Sun
  const padded: Array<{ key: string | null; beads: number }> = [];
  for (let i = 0; i < firstWeekday; i++) padded.push({ key: null, beads: 0 });
  for (const k of keys) padded.push({ key: k, beads: byDate[k] ?? 0 });

  const cols: Array<typeof padded> = [];
  for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));

  return (
    <div className="w-full">
      <div className="flex gap-[3px] overflow-x-auto no-scrollbar pb-2">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell, ri) => (
              <Cell key={ri} beads={cell.beads} goal={goal} dateKey={cell.key} />
            ))}
            {Array.from({ length: 7 - col.length }).map((_, i) => (
              <div key={`pad-${i}`} className="h-3 w-3" />
            ))}
          </div>
        ))}
      </div>
      <Legend />
    </div>
  );
}

function Cell({
  beads,
  goal,
  dateKey,
}: {
  beads: number;
  goal: number;
  dateKey: string | null;
}) {
  if (!dateKey) return <div className="h-3 w-3" />;
  const level = levelFor(beads, goal);
  const label = `${parseKey(dateKey).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} — ${beads.toLocaleString()} naam`;
  return (
    <div
      title={label}
      aria-label={label}
      className={`h-3 w-3 rounded-[3px] ${LEVEL_BG[level]}`}
    />
  );
}

function levelFor(beads: number, goal: number): 0 | 1 | 2 | 3 | 4 {
  if (beads <= 0) return 0;
  if (goal <= 0) return 2;
  const r = beads / goal;
  if (r >= 1) return 4;
  if (r >= 0.66) return 3;
  if (r >= 0.33) return 2;
  return 1;
}

const LEVEL_BG: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-ring/40",
  1: "bg-[var(--primary)]/30",
  2: "bg-[var(--primary)]/55",
  3: "bg-[var(--primary)]/80",
  4: "bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]",
};

function Legend() {
  return (
    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
      <span>Less</span>
      {([0, 1, 2, 3, 4] as const).map((l) => (
        <span key={l} className={`h-3 w-3 rounded-[3px] ${LEVEL_BG[l]}`} />
      ))}
      <span>More</span>
    </div>
  );
}
