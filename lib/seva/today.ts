import "server-only";
import { getDarshan } from "@/lib/kv/seva";
import { lightAt } from "./schedule";
import { isBhogItem } from "./sevas";
import { istNow } from "./time";
import type { SevaToday } from "./types";

/** Radha Rani's state for a devotee, plus today's totals (Vrindavan date). */
export async function getSevaToday(userId: string, now = Date.now()): Promise<SevaToday> {
  const { date, minutes, weekday } = istNow(now);
  const snapshot = await getDarshan(userId, date);

  return {
    date,
    weekday,
    light: lightAt(minutes),
    awake: snapshot.awake,
    bhog: snapshot.awake && isBhogItem(snapshot.bhog) ? snapshot.bhog : null,
    register: {
      devotees: snapshot.devotees,
      wake: snapshot.global.wake ?? 0,
      aarti: snapshot.global.aarti ?? 0,
      bhog: snapshot.global.bhog ?? 0,
      sleep: snapshot.global.sleep ?? 0,
    },
  };
}
