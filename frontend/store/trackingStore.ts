"use client";

import { create } from "zustand";
import type { Tracking } from "@/types/domain";
import { trackingService, type TrackingPayload } from "@/services/trackingService";
import {
  cacheTrackingHistory,
  enqueueOffline,
  getCachedTrackingHistory,
} from "@/lib/offline-sync";

interface TrackingState {
  today: Tracking | null;
  history: Tracking[];
  isLoading: boolean;
  submit: (payload: TrackingPayload) => Promise<void>;
  fetchToday: () => Promise<void>;
  fetchHistory: (startDate: string, endDate: string) => Promise<void>;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  today: null,
  history: [],
  isLoading: false,
  submit: async (payload) => {
    set({ isLoading: true });
    try {
      const response = await trackingService.submit(payload);
      set({ today: response.tracking });
    } catch {
      await enqueueOffline({ action: "CREATE", endpoint: "/tracking", data: payload });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchToday: async () => {
    const response = await trackingService.today();
    set({ today: response.tracking });
  },
  fetchHistory: async (startDate, endDate) => {
    set({ isLoading: true });
    try {
      const response = await trackingService.history(startDate, endDate);
      set({ history: response.trackings });
      await cacheTrackingHistory(startDate, endDate, response.trackings);
    } catch {
      const cached = await getCachedTrackingHistory<Tracking[]>(startDate, endDate);
      if (cached) {
        set({ history: cached });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));

