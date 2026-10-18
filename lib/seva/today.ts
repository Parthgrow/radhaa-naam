import "server-only";
import { getDays, getUserSettings } from "@/lib/kv/daily-jaap";
import { getSevaDay } from "@/lib/kv/seva";
import { activeEvent } from "./events";
import { phaseAt } from "./schedule";
import {
  BHOG_SEVAS,
  SEVAS,
  bhogThresholds,
  bhogUnlocked,
  earnedToday,
  type BhogTier,
  type SevaDef,
} from "./sevas";
import { istNow } from "./time";
import type { SevaToday } from "./types";

/** Is this seva's time window open at `minutes` (IST)? */
export function sevaOpenNow(seva: SevaDef, minutes: number, eventRunning: boolean) {
  if (seva.eventOnly && !eventRunning) return false;
  if (seva.windows) return seva.windows.some(([start, end]) => minutes >= start && minutes < end);
  return seva.phases === null || seva.phases.includes(phaseAt(minutes));
}

/** Today's malas and daily goal, which decide earned sevas and bhog levels. */
export async function getJaapToday(userId: string, date: string) {
  const [days, settings] = await Promise.all([getDays(userId, [date]), getUserSettings(userId)]);
  return { malasToday: days[date]?.malas ?? 0, malaGoal: settings?.malaGoal ?? 5 };
}

/** Today's seva state for a devotee, by Vrindavan time. */
export async function getSevaToday(userId: string, now = Date.now()): Promise<SevaToday> {
  const { date, minutes, weekday } = istNow(now);
  const event = activeEvent(date);

  const [{ malasToday, malaGoal }, day] = await Promise.all([
    getJaapToday(userId, date),
    getSevaDay(userId, date, event?.id ?? null),
  ]);

  const sevas = Object.values(SEVAS).map((seva) => {
    const used = day.mine[seva.field] ?? 0;
    const limit = seva.kind === "once" ? 1 : earnedToday(seva, malasToday);
    const inWindow = sevaOpenNow(seva, minutes, !!event);
    const tier = seva.bhog ? (day.mine[`${seva.field}_tier`] as BhogTier | undefined) : undefined;
    return {
      id: seva.id,
      name: seva.name,
      kind: seva.kind,
      // Bhog also needs at least one mala today
      available:
        inWindow && used < limit && (!seva.bhog || bhogUnlocked(malasToday, malaGoal) > 0),
      inWindow,
      used,
      limit,
      ...(tier ? { tier } : {}),
    };
  });

  return {
    date,
    minutes,
    phase: phaseAt(minutes),
    weekday,
    malasToday,
    sevas,
    bhog: { unlocked: bhogUnlocked(malasToday, malaGoal), thresholds: bhogThresholds(malaGoal) },
    register: {
      devotees: day.devotees,
      aarti: (day.global.aarti_mangala ?? 0) + (day.global.aarti_sandhya ?? 0),
      petals: day.global.petals ?? 0,
      bhog: BHOG_SEVAS.reduce((sum, id) => sum + (day.global[SEVAS[id].field] ?? 0), 0),
      diyas: day.global.diyas ?? 0,
    },
    event: event
      ? {
          id: event.id,
          name: event.name,
          hindiName: event.hindiName,
          start: event.start,
          end: event.end,
          totalDiyas: day.event?.total.diyas ?? 0,
          myDiyas: day.event?.mine.diyas ?? 0,
        }
      : null,
  };
}
