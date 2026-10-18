import type { DarshanPhase } from "./schedule";
import type { BhogTier, SevaId } from "./sevas";

/** What GET /api/seva/today returns (shared by server and client). */
export type SevaToday = {
  date: string;
  /** Minutes since midnight IST when this was computed */
  minutes: number;
  phase: DarshanPhase;
  weekday: number;
  malasToday: number;
  sevas: Array<{
    id: SevaId;
    name: string;
    kind: "once" | "earned";
    /** Can be offered right now (right window, event running, not used up) */
    available: boolean;
    /** Inside its time window right now (even if already offered) */
    inWindow: boolean;
    /** Offered today */
    used: number;
    /** Most allowed today (1, or earned from malas) */
    limit: number;
    /** Bhog only: the level offered today, if any */
    tier?: BhogTier;
  }>;
  bhog: {
    /** Highest level today's malas unlock (0 = none yet) */
    unlocked: 0 | BhogTier;
    /** Malas needed for each level */
    thresholds: Record<BhogTier, number>;
  };
  /** Today's totals across all devotees */
  register: { devotees: number; aarti: number; petals: number; bhog: number; diyas: number };
  event: {
    id: string;
    name: string;
    hindiName: string;
    start: string;
    end: string;
    totalDiyas: number;
    myDiyas: number;
  } | null;
};
