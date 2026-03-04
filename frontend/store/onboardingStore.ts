"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculateChronotype, type ChronotypeResult } from "@/lib/meq-scoring";
import { MEQ_QUESTIONS } from "@/constants/meq-questions";
import type { Obligation } from "@/types/domain";

interface OnboardingState {
  currentStep: "welcome" | "meq" | "obligations" | "review";
  meqResponses: Record<number, number>;
  obligations: Obligation[];
  result: ChronotypeResult | null;
  /** Alias for result, used by MEQ page */
  meqResult: ChronotypeResult | null;
  isAssessmentSubmitted: boolean;
  setStep: (step: OnboardingState["currentStep"]) => void;
  setResponse: (questionId: number, value: number) => void;
  undoLastResponse: () => void;
  addObligation: (obligation: Obligation) => void;
  removeObligation: (id: string) => void;
  markAssessmentSubmitted: (value: boolean) => void;
  isMEQComplete: () => boolean;
  computeResult: () => void;
  reset: () => void;
}

const initial = {
  currentStep: "welcome" as const,
  meqResponses: {} as Record<number, number>,
  obligations: [] as Obligation[],
  result: null as ChronotypeResult | null,
  meqResult: null as ChronotypeResult | null,
  isAssessmentSubmitted: false,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initial,
      setStep: (step) => set({ currentStep: step }),
      setResponse: (questionId, value) =>
        set((state) => ({ meqResponses: { ...state.meqResponses, [questionId]: value } })),
      undoLastResponse: () =>
        set((state) => {
          const keys = Object.keys(state.meqResponses).map(Number).sort((a, b) => a - b);
          if (keys.length === 0) return state;
          const lastKey = keys[keys.length - 1];
          const rest = { ...state.meqResponses };
          delete rest[lastKey];
          return { meqResponses: rest };
        }),
      addObligation: (obligation) =>
        set((state) => ({ obligations: [...state.obligations, obligation] })),
      removeObligation: (id) =>
        set((state) => ({ obligations: state.obligations.filter((item) => item.id !== id) })),
      markAssessmentSubmitted: (value) => set({ isAssessmentSubmitted: value }),
      isMEQComplete: () => Object.keys(get().meqResponses).length === MEQ_QUESTIONS.length,
      computeResult: () => {
        const responses = get().meqResponses;
        const r = calculateChronotype(responses);
        set({ result: r, meqResult: r });
      },
      reset: () => set(initial),
    }),
    {
      name: "chronosync-onboarding",
      partialize: (state) => ({
        currentStep: state.currentStep,
        meqResponses: state.meqResponses,
        obligations: state.obligations,
        result: state.result,
        meqResult: state.meqResult,
        isAssessmentSubmitted: state.isAssessmentSubmitted,
      }),
    },
  ),
);

