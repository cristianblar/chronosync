"use client";
import { useOnboardingStore } from "@/store/onboardingStore";

export function useChronotype() {
  const result = useOnboardingStore((state) => state.result);
  return { result };
}

