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

/** Radha Rani's poshak colour for each weekday (0 = Sunday). */
export const POSHAK_COLORS: Array<{ name: string; hindi: string; main: string; light: string; dark: string }> = [
  { name: "Saffron", hindi: "kesariya", main: "#e8751a", light: "#f6a65a", dark: "#b8550d" },
  { name: "Ivory", hindi: "safed", main: "#efe4cc", light: "#faf4e6", dark: "#cdbb94" },
  { name: "Red", hindi: "laal", main: "#c62d42", light: "#e0576a", dark: "#931c2e" },
  { name: "Green", hindi: "hari", main: "#2e8b57", light: "#53b07c", dark: "#1d6640" },
  { name: "Yellow", hindi: "peeli", main: "#e6b422", light: "#f3d061", dark: "#b88a10" },
  { name: "Pink", hindi: "gulabi", main: "#e75480", light: "#f489a8", dark: "#bb3560" },
  { name: "Indigo", hindi: "neeli", main: "#4b3f9e", light: "#7a6fcb", dark: "#30287a" },
];
