"use client";

import { create } from "zustand";
import { planService } from "@/services/planService";
import type { DailySchedule, SleepPlan } from "@/types/domain";
import { cacheCurrentPlan, getCachedCurrentPlan } from "@/lib/offline-sync";

interface PlanState {
  currentPlan: SleepPlan | null;
  schedules: DailySchedule[];
  todayCountdown: number | null;
  isLoading: boolean;
  fetchCurrentPlan: () => Promise<void>;
  fetchToday: () => Promise<void>;
}

export const usePlanStore = create<PlanState>((set) => ({
  currentPlan: null,
  schedules: [],
  todayCountdown: null,
  isLoading: false,
  fetchCurrentPlan: async () => {
    set({ isLoading: true });
    try {
      const response = await planService.current();
      set({ currentPlan: response.plan, schedules: response.schedules });
      await cacheCurrentPlan(response);
    } catch {
      const cached = await getCachedCurrentPlan<{
        plan: SleepPlan | null;
        schedules: DailySchedule[];
      }>();
      if (cached) {
        set({ currentPlan: cached.plan, schedules: cached.schedules });
      }
    } finally {
      set({ isLoading: false });
    }
  },
  fetchToday: async () => {
    const today = await planService.today();
    set({ todayCountdown: today.countdown_minutes });
  },
}));

