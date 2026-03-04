"use client";
import { useTrackingStore } from "@/store/trackingStore";

export function useTracking() {
  return useTrackingStore();
}

