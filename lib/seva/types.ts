import type { LightPhase } from "./schedule";
import type { BhogItem } from "./sevas";

/** What GET /api/seva/today returns (shared by server and client). */
export type SevaToday = {
  /** Vrindavan (IST) calendar date */
  date: string;
  weekday: number;
  /** How the darshan is lit right now; mood only, never a rule */
  light: LightPhase;
  /** Is Radha Rani awake for this devotee? */
  awake: boolean;
  /** The bhog currently before her, if any (cleared when she wakes or sleeps) */
  bhog: BhogItem | null;
  /** Today's totals across all devotees */
  register: { devotees: number; wake: number; aarti: number; bhog: number; sleep: number };
};
