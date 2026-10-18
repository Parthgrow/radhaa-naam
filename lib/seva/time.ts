/**
 * Darshan follows Vrindavan time (IST, UTC+5:30, no daylight saving) for
 * every user, wherever they are.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export type IstNow = {
  /** Calendar date in Vrindavan, YYYY-MM-DD */
  date: string;
  /** Minutes since midnight in Vrindavan, 0–1439 */
  minutes: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
};

export function istNow(now: number = Date.now()): IstNow {
  const ist = new Date(now + IST_OFFSET_MS);
  return {
    date: ist.toISOString().slice(0, 10),
    minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes(),
    weekday: ist.getUTCDay(),
  };
}

/** "17:00" style label for minutes since midnight. */
export function formatIstTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
