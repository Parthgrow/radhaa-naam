import type { DarshanPhase } from "./schedule";

/**
 * Each seva a devotee can offer. `field` is what's counted in Redis.
 *  - once:   at most once per day (aarti, shayan, each bhog)
 *  - earned: as many as the day's completed malas allow (petals, diyas)
 */
export type SevaId =
  | "aarti_mangala"
  | "aarti_sandhya"
  | "phool"
  | "bhog_bal"
  | "bhog_raj"
  | "bhog_sandhya"
  | "shayan"
  | "deep_daan";

export type SevaDef = {
  id: SevaId;
  name: string;
  field: string;
  kind: "once" | "earned";
  /** Darshan phases when it can be offered; null = any time (event sevas) */
  phases: DarshanPhase[] | null;
  /** Exact IST windows [start, end) in minutes; used instead of phases (bhog) */
  windows?: Array<[number, number]>;
  /** Only during an event (e.g. Kartik deep daan) */
  eventOnly?: boolean;
  /** For earned sevas: most per day, whatever the malas */
  dailyCap?: number;
  /** Bhog: the devotee picks a level unlocked by today's malas */
  bhog?: true;
};

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

export const SEVAS: Record<SevaId, SevaDef> = {
  aarti_mangala: { id: "aarti_mangala", name: "Mangala aarti", field: "aarti_mangala", kind: "once", phases: ["mangala"] },
  aarti_sandhya: { id: "aarti_sandhya", name: "Sandhya aarti", field: "aarti_sandhya", kind: "once", phases: ["sandhya"] },
  phool: { id: "phool", name: "Phool seva", field: "petals", kind: "earned", phases: ["mangala", "day", "sandhya"], dailyCap: 108 },
  bhog_bal: { id: "bhog_bal", name: "Bal bhog", field: "bhog_bal", kind: "once", phases: null, windows: [[h(5), h(9)]], bhog: true },
  bhog_raj: { id: "bhog_raj", name: "Raj bhog", field: "bhog_raj", kind: "once", phases: null, windows: [[h(11), h(13)]], bhog: true },
  bhog_sandhya: { id: "bhog_sandhya", name: "Sandhya bhog", field: "bhog_sandhya", kind: "once", phases: null, windows: [[h(17), h(20, 30)]], bhog: true },
  shayan: { id: "shayan", name: "Shayan seva", field: "shayan", kind: "once", phases: ["shayan"] },
  deep_daan: { id: "deep_daan", name: "Deep daan", field: "diyas", kind: "earned", phases: null, eventOnly: true, dailyCap: 11 },
};

export const BHOG_SEVAS: SevaId[] = ["bhog_bal", "bhog_raj", "bhog_sandhya"];

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

/** Bhog levels: 1 makhan-mishri, 2 laddoo & fruits, 3 full thali. */
export type BhogTier = 1 | 2 | 3;

export const BHOG_ITEMS: Record<BhogTier, { name: string; hindi: string }> = {
  1: { name: "Makhan-mishri", hindi: "माखन-मिश्री" },
  2: { name: "Laddoo & fruits", hindi: "लड्डू और फल" },
  3: { name: "Full thali", hindi: "भोग थाली" },
};

/** Malas needed today for each bhog level. The full thali needs the devotee's own daily goal. */
export function bhogThresholds(malaGoal: number): Record<BhogTier, number> {
  return { 1: 1, 2: 3, 3: Math.max(3, Math.floor(malaGoal) || 5) };
}

/** Highest bhog level unlocked by today's malas (0 = none yet). */
export function bhogUnlocked(malasToday: number, malaGoal: number): 0 | BhogTier {
  const t = bhogThresholds(malaGoal);
  if (malasToday >= t[3]) return 3;
  if (malasToday >= t[2]) return 2;
  if (malasToday >= t[1]) return 1;
  return 0;
}
