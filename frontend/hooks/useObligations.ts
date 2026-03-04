"use client";
import { useOnboardingStore } from "@/store/onboardingStore";

export function useObligations() {
  const obligations = useOnboardingStore((state) => state.obligations);
  return { obligations };
}

