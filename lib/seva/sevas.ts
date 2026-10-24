/**
 * Seva is a switch you control, not a schedule. Radha Rani is either asleep or
 * awake for you; each seva needs one of those states, and wake / sleep flip it.
 *
 *   ASLEEP ──wake──▶ AWAKE ──sleep──▶ ASLEEP
 *                      │
 *            aarti, bhog (any number of times)
 *
 * No clock, no jaap count: you do each one whenever you like.
 */
export type SevaId = "wake" | "aarti" | "bhog" | "sleep";

export type DarshanState = "asleep" | "awake";

export type SevaDef = {
  id: SevaId;
  name: string;
  hindi: string;
  description: string;
  icon: string;
  /** The state Radha Rani must be in for this seva */
  requires: DarshanState;
  /** The state this seva leaves her in; omitted when it doesn't change it */
  sets?: DarshanState;
  /** Shown (greyed out) when she isn't in the required state */
  reasonUnavailable: string;
};

/** Display order of the seva list. */
export const SEVAS: Record<SevaId, SevaDef> = {
  wake: {
    id: "wake",
    name: "Radha Rani ko jagaiye",
    hindi: "जागरण",
    description: "Pat kholiye, deep jalaiye",
    icon: "🌅",
    requires: "asleep",
    sets: "awake",
    reasonUnavailable: "Radha Rani pehle se jaagi hain",
  },
  aarti: {
    id: "aarti",
    name: "Aarti karein",
    hindi: "आरती",
    description: "Saat baar thali ghumaiye",
    icon: "🪔",
    requires: "awake",
    reasonUnavailable: "Pehle Radha Rani ko jagaiye",
  },
  bhog: {
    id: "bhog",
    name: "Bhog lagaiye",
    hindi: "भोग",
    description: "Makhan-mishri, laddoo, bhog thali",
    icon: "🍯",
    requires: "awake",
    reasonUnavailable: "Pehle Radha Rani ko jagaiye",
  },
  sleep: {
    id: "sleep",
    name: "Shayan karaiye",
    hindi: "शयन",
    description: "Lori sunaiye, pat band kijiye",
    icon: "🌙",
    requires: "awake",
    sets: "asleep",
    reasonUnavailable: "Radha Rani vishram kar rahi hain",
  },
};

export const SEVA_ORDER: SevaId[] = ["wake", "aarti", "bhog", "sleep"];

export function isSevaId(value: unknown): value is SevaId {
  return typeof value === "string" && value in SEVAS;
}

export function isAwake(state: DarshanState): boolean {
  return state === "awake";
}

/** Can this seva be offered right now, given whether she's awake? */
export function availability(seva: SevaDef, awake: boolean): { available: boolean; reason: string | null } {
  const ok = (seva.requires === "awake") === awake;
  return { available: ok, reason: ok ? null : seva.reasonUnavailable };
}

/** The three bhog offerings; every one is free to choose, as often as you like. */
export type BhogItem = "makhan_mishri" | "laddoo_phal" | "thali";

export const BHOG_ITEMS: Record<BhogItem, { name: string; hindi: string }> = {
  makhan_mishri: { name: "Makhan-mishri", hindi: "माखन-मिश्री" },
  laddoo_phal: { name: "Laddoo & fruits", hindi: "लड्डू और फल" },
  thali: { name: "Full thali", hindi: "भोग थाली" },
};

export const BHOG_ORDER: BhogItem[] = ["makhan_mishri", "laddoo_phal", "thali"];

export function isBhogItem(value: unknown): value is BhogItem {
  return typeof value === "string" && value in BHOG_ITEMS;
}
