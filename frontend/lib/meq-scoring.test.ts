import { describe, expect, it } from "vitest";
import { calculateChronotype } from "@/lib/meq-scoring";
import meqVectors from "../../backend/test-vectors/meq.json";

type Vector = {
  name: string;
  values: number[];
  expected: {
    score: number;
    chronotype: string;
    ideal_wake_time: string;
    ideal_sleep_time: string;
    midpoint_of_sleep: string;
  };
};

describe("calculateChronotype (parity vectors)", () => {
  it("throws if not exactly 19 responses", () => {
    expect(() => calculateChronotype({ 1: 3, 2: 3 })).toThrow(/19 questions required/);
  });

  (meqVectors.vectors as Vector[]).forEach((v) => {
    it(`matches vector: ${v.name}`, () => {
      const responses = Object.fromEntries(v.values.map((val, idx) => [idx + 1, val])) as Record<
        number,
        number
      >;

      const result = calculateChronotype(responses);
      expect(result.score).toBe(v.expected.score);
      expect(result.chronotype).toBe(v.expected.chronotype);
      expect(result.idealWakeTime).toBe(v.expected.ideal_wake_time);
      expect(result.idealSleepTime).toBe(v.expected.ideal_sleep_time);
      expect(result.midpointOfSleep).toBe(v.expected.midpoint_of_sleep);
    });
  });
});

