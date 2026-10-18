/**
 * Seasonal seva events, by Vrindavan (IST) calendar date, inclusive.
 * Dates follow the North Indian (purnimanta) calendar used in Vrindavan;
 * check them against a panchang each year.
 */
export type SevaEvent = {
  id: string;
  name: string;
  hindiName: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
};

export const SEVA_EVENTS: SevaEvent[] = [
  {
    id: "kartik-2026",
    name: "Kartik Deep Daan",
    hindiName: "कार्तिक दीपदान",
    // Kartik 2026: day after Sharad Purnima → Kartik Purnima (24 Nov)
    start: "2026-10-26",
    end: "2026-11-24",
  },
];

export function activeEvent(istDate: string): SevaEvent | null {
  return SEVA_EVENTS.find((e) => istDate >= e.start && istDate <= e.end) ?? null;
}
