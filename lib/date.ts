export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function daysBetween(a: string, b: string): number {
  const ms = parseKey(b).getTime() - parseKey(a).getTime();
  return Math.round(ms / 86400000);
}

export function lastNDays(n: number, end: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(todayKey(addDays(end, -i)));
  return out;
}

/** Inclusive streak ending today, counting consecutive days with beads > 0. */
export function currentStreak(
  byDate: Record<string, number>,
  today: string = todayKey()
): number {
  let streak = 0;
  let cursor = parseKey(today);
  // If today has nothing yet, streak can still continue from yesterday.
  if (!byDate[todayKey(cursor)]) cursor = addDays(cursor, -1);
  while (byDate[todayKey(cursor)] > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(byDate: Record<string, number>): number {
  const keys = Object.keys(byDate).filter((k) => byDate[k] > 0).sort();
  if (keys.length === 0) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < keys.length; i++) {
    if (daysBetween(keys[i - 1], keys[i]) === 1) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}
