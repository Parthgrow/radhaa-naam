import type { DarshanPhase } from "./schedule";
import type { SevaId } from "./sevas";

/** What GET /api/seva/today returns (shared by server and client). */
export type SevaToday = {
  date: string;
  phase: DarshanPhase;
  weekday: number;
  malasToday: number;
  sevas: Array<{
    id: SevaId;
    name: string;
    kind: "once" | "earned";
    /** Can be offered right now (right window, event running, not used up) */
    available: boolean;
    /** Offered today */
    used: number;
    /** Most allowed today (1, or earned from malas) */
    limit: number;
  }>;
  /** Today's totals across all devotees */
  register: { devotees: number; aarti: number; petals: number; diyas: number };
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
