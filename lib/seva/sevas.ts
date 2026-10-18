import type { DarshanPhase } from "./schedule";

/**
 * Each seva a devotee can offer. `field` is what's counted in Redis.
 *  - once:   at most once per day (aarti, shayan)
 *  - earned: as many as the day's completed malas allow (petals, diyas)
 */
export type SevaId = "aarti_mangala" | "aarti_sandhya" | "phool" | "shayan" | "deep_daan";

export type SevaDef = {
  id: SevaId;
  name: string;
  field: string;
  kind: "once" | "earned";
  /** Darshan phases when it can be offered; null = any time (event sevas) */
  phases: DarshanPhase[] | null;
  /** Only during an event (e.g. Kartik deep daan) */
  eventOnly?: boolean;
  /** For earned sevas: most per day, whatever the malas */
  dailyCap?: number;
};

export const SEVAS: Record<SevaId, SevaDef> = {
  aarti_mangala: { id: "aarti_mangala", name: "Mangala aarti", field: "aarti_mangala", kind: "once", phases: ["mangala"] },
  aarti_sandhya: { id: "aarti_sandhya", name: "Sandhya aarti", field: "aarti_sandhya", kind: "once", phases: ["sandhya"] },
  phool: { id: "phool", name: "Phool seva", field: "petals", kind: "earned", phases: ["mangala", "day", "sandhya"], dailyCap: 108 },
  shayan: { id: "shayan", name: "Shayan seva", field: "shayan", kind: "once", phases: ["shayan"] },
  deep_daan: { id: "deep_daan", name: "Deep daan", field: "diyas", kind: "earned", phases: null, eventOnly: true, dailyCap: 11 },
};

export function isSevaId(value: unknown): value is SevaId {
  return typeof value === "string" && value in SEVAS;
}

/**
 * How many of an earned seva the devotee has today: one per completed mala
 * (so the first mala lights the first diya), up to the daily cap.
 */
export function earnedToday(seva: SevaDef, malasToday: number): number {
  if (seva.kind === "once") return 1;
  return Math.min(Math.max(0, Math.floor(malasToday)), seva.dailyCap ?? Infinity);
}
