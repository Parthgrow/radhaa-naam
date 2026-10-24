/**
 * How the darshan is lit through the day in Vrindavan (IST). This is only
 * lighting and mood: it never decides what a devotee may do.
 */
export type LightPhase = "dawn" | "day" | "evening" | "night";

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

export function lightAt(minutes: number): LightPhase {
  if (minutes >= h(5) && minutes < h(7)) return "dawn";
  if (minutes >= h(7) && minutes < h(17)) return "day";
  if (minutes >= h(17) && minutes < h(20, 30)) return "evening";
  return "night";
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
