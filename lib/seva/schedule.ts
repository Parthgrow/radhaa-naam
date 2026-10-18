import { istNow } from "./time";

/** The darshan's state through the day, like a Vrindavan temple (IST). */
export type DarshanPhase = "mangala" | "day" | "sandhya" | "shayan" | "closed";

type Window = { phase: DarshanPhase; start: number; end: number };

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

/** Back-to-back windows covering the whole day; "closed" wraps past midnight. */
export const DARSHAN_WINDOWS: Window[] = [
  { phase: "closed", start: h(0), end: h(5) },
  { phase: "mangala", start: h(5), end: h(7) },
  { phase: "day", start: h(7), end: h(17) },
  { phase: "sandhya", start: h(17), end: h(20, 30) },
  { phase: "shayan", start: h(20, 30), end: h(23) },
  { phase: "closed", start: h(23), end: h(24) },
];

export function phaseAt(minutes: number): DarshanPhase {
  const window = DARSHAN_WINDOWS.find((w) => minutes >= w.start && minutes < w.end);
  return window?.phase ?? "closed";
}

/** Minutes since midnight when darshan next opens (mangala), for the closed screen. */
export const DARSHAN_OPENS_AT = h(5);

export function currentPhase(now: number = Date.now()): DarshanPhase {
  return phaseAt(istNow(now).minutes);
}
