import { apiFetch } from "@/services/api";
import type { DailySchedule, SleepPlan } from "@/types/domain";

interface PlanResponse {
  plan: SleepPlan | null;
  schedules: DailySchedule[];
}

export const planService = {
  current() {
    return apiFetch<PlanResponse>("/plans/current");
  },
  generate(payload?: { start_date?: string }) {
    return apiFetch("/plans/generate", {
      method: "POST",
      body: JSON.stringify({ start_date: payload?.start_date }),
    });
  },
  today() {
    return apiFetch<{
      schedule: DailySchedule | null;
      items: DailySchedule["items"];
      next_activity: DailySchedule["items"][number] | null;
      countdown_minutes: number | null;
    }>("/plans/today");
  },
  byId(id: string) {
    return apiFetch<PlanResponse>(`/plans/${id}`);
  },
};

