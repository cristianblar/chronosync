"use client";
import { usePlanStore } from "@/store/planStore";

export function usePlan() {
  return usePlanStore();
}

