import type { Chronotype } from "@/types/domain";

export const CHRONOTYPE_META: Record<
  Chronotype,
  { label: string; color: string; scoreRange: string; wakeHint: string; sleepHint: string }
> = {
  extreme_morning: {
    label: "Definitivamente Matutino",
    color: "text-amber-500",
    scoreRange: "70-86",
    wakeHint: "05:30 - 06:30",
    sleepHint: "21:00 - 22:00",
  },
  moderate_morning: {
    label: "Moderadamente Matutino",
    color: "text-amber-400",
    scoreRange: "59-69",
    wakeHint: "06:30 - 07:30",
    sleepHint: "22:00 - 23:00",
  },
  intermediate: {
    label: "Intermedio",
    color: "text-emerald-500",
    scoreRange: "42-58",
    wakeHint: "07:30 - 08:30",
    sleepHint: "23:00 - 00:00",
  },
  moderate_evening: {
    label: "Moderadamente Vespertino",
    color: "text-violet-500",
    scoreRange: "31-41",
    wakeHint: "08:00 - 09:30",
    sleepHint: "00:00 - 01:00",
  },
  extreme_evening: {
    label: "Definitivamente Vespertino",
    color: "text-indigo-500",
    scoreRange: "16-30",
    wakeHint: "09:30 - 11:00",
    sleepHint: "01:00 - 02:30",
  },
};
