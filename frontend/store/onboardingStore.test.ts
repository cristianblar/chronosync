import { describe, expect, it } from "vitest";
import { useOnboardingStore } from "@/store/onboardingStore";
import { MEQ_QUESTIONS } from "@/constants/meq-questions";

const mockObligation = {
  id: "1",
  user_id: "u1",
  name: "Trabajo",
  type: "work" as const,
  start_time: "08:00:00",
  end_time: "17:00:00",
  days_of_week: [0],
  is_recurring: true,
  valid_from: "2026-02-18",
  valid_until: null,
  is_active: true,
  created_at: "2026-02-18T00:00:00Z",
};

describe("onboardingStore", () => {
  it("sets step and responses and computes result", () => {
    useOnboardingStore.getState().reset();
    useOnboardingStore.getState().setStep("meq");

    MEQ_QUESTIONS.forEach((q) => {
      useOnboardingStore.getState().setResponse(q.id, q.options[0].value);
    });

    useOnboardingStore.getState().computeResult();
    const state = useOnboardingStore.getState();
    expect(state.currentStep).toBe("meq");
    expect(state.meqResponses[1]).toBe(MEQ_QUESTIONS[0].options[0].value);
    expect(state.result).not.toBeNull();
  });

  it("adds and removes obligations", () => {
    useOnboardingStore.getState().reset();
    useOnboardingStore.getState().addObligation(mockObligation);
    expect(useOnboardingStore.getState().obligations).toHaveLength(1);
    useOnboardingStore.getState().removeObligation("1");
    expect(useOnboardingStore.getState().obligations).toHaveLength(0);
  });

  it("undoes last response correctly", () => {
    useOnboardingStore.getState().reset();
    useOnboardingStore.getState().setResponse(1, 5);
    useOnboardingStore.getState().setResponse(2, 4);
    expect(Object.keys(useOnboardingStore.getState().meqResponses)).toHaveLength(2);
    useOnboardingStore.getState().undoLastResponse();
    const state = useOnboardingStore.getState();
    expect(Object.keys(state.meqResponses)).toHaveLength(1);
    expect(state.meqResponses[1]).toBe(5);
    expect(state.meqResponses[2]).toBeUndefined();
  });

  it("meqResult is set when computeResult is called", () => {
    useOnboardingStore.getState().reset();

    MEQ_QUESTIONS.forEach((q) => {
      useOnboardingStore.getState().setResponse(q.id, q.options[0].value);
    });

    useOnboardingStore.getState().computeResult();
    const state = useOnboardingStore.getState();
    expect(state.meqResult).not.toBeNull();
    expect(state.meqResult?.score).toBe(state.result?.score);
  });

  it("handles MEQ completeness and assessment submitted state", () => {
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().isMEQComplete()).toBe(false);

    MEQ_QUESTIONS.forEach((question) => {
      useOnboardingStore.getState().setResponse(question.id, question.options[0].value);
    });
    expect(useOnboardingStore.getState().isMEQComplete()).toBe(true);

    useOnboardingStore.getState().markAssessmentSubmitted(true);
    expect(useOnboardingStore.getState().isAssessmentSubmitted).toBe(true);
  });
});

