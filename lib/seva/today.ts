import "server-only";
import { getDays } from "@/lib/kv/daily-jaap";
import { getSevaDay } from "@/lib/kv/seva";
import { activeEvent } from "./events";
import { phaseAt } from "./schedule";
import { SEVAS, earnedToday, type SevaDef } from "./sevas";
import { istNow } from "./time";
import type { SevaToday } from "./types";

export function sevaOpenNow(seva: SevaDef, phase: ReturnType<typeof phaseAt>, eventRunning: boolean) {
  if (seva.eventOnly && !eventRunning) return false;
  return seva.phases === null || seva.phases.includes(phase);
}

/** Today's seva state for a devotee, by Vrindavan time. */
export async function getSevaToday(userId: string, now = Date.now()): Promise<SevaToday> {
  const { date, minutes, weekday } = istNow(now);
  const phase = phaseAt(minutes);
  const event = activeEvent(date);

  const [days, day] = await Promise.all([
    getDays(userId, [date]),
    getSevaDay(userId, date, event?.id ?? null),
  ]);
  const malasToday = days[date]?.malas ?? 0;

  const sevas = Object.values(SEVAS).map((seva) => {
    const used = day.mine[seva.field] ?? 0;
    const limit = seva.kind === "once" ? 1 : earnedToday(seva, malasToday);
    return {
      id: seva.id,
      name: seva.name,
      kind: seva.kind,
      available: sevaOpenNow(seva, phase, !!event) && used < limit,
      used,
      limit,
    };
  });

  return {
    date,
    phase,
    weekday,
    malasToday,
    sevas,
    register: {
      devotees: day.devotees,
      aarti: (day.global.aarti_mangala ?? 0) + (day.global.aarti_sandhya ?? 0),
      petals: day.global.petals ?? 0,
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
