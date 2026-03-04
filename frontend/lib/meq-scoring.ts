import type { Chronotype } from "@/types/domain";

export interface ChronotypeResult {
  score: number;
  chronotype: Chronotype;
  idealWakeTime: string;
  idealSleepTime: string;
  midpointOfSleep: string;
}

function minutesToStr(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

/**
 * Frontend MEQ scoring (parity with backend `app/utils/meq_scoring.py`).
 *
 * Nota: este scoring usa la implementación actual del proyecto (suma de valores).
 */
export function calculateChronotype(responses: Record<number, number>): ChronotypeResult {
  if (Object.keys(responses).length !== 19) {
    throw new Error("19 questions required");
  }

  const score = Object.values(responses).reduce((acc, value) => acc + value, 0);

  let chronotype: Chronotype;
  if (score >= 70) chronotype = "extreme_morning";
  else if (score >= 59) chronotype = "moderate_morning";
  else if (score >= 42) chronotype = "intermediate";
  else if (score >= 31) chronotype = "moderate_evening";
  else chronotype = "extreme_evening";

  const midpointHours = 4.0 + (86 - score) * 0.11;
  const midpointMinutes = Math.round(midpointHours * 60);
  const sleepMinutes = midpointMinutes - 240;
  const wakeMinutes = midpointMinutes + 240;

  return {
    score,
    chronotype,
    idealWakeTime: minutesToStr(wakeMinutes),
    idealSleepTime: minutesToStr(sleepMinutes),
    midpointOfSleep: minutesToStr(midpointMinutes),
  };
}
