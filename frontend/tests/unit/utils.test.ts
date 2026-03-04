import { describe, it, expect } from "vitest";
import { activityLabel, toTitle, formatCountdown } from "@/lib/utils";

describe("activityLabel", () => {
  it("returns Spanish label for all known activity types", () => {
    expect(activityLabel("wake")).toBe("Despertar");
    expect(activityLabel("sleep")).toBe("Dormir");
    expect(activityLabel("light_exposure")).toBe("Exposición a luz");
    expect(activityLabel("exercise")).toBe("Ejercicio");
    expect(activityLabel("meal")).toBe("Comida");
    expect(activityLabel("caffeine")).toBe("Cafeína");
    expect(activityLabel("caffeine_cutoff")).toBe("Corte de cafeína");
    expect(activityLabel("wind_down")).toBe("Relajación");
    expect(activityLabel("obligation")).toBe("Obligación");
  });

  it("falls back to toTitle for unknown activity types", () => {
    expect(activityLabel("unknown_activity")).toBe("Unknown Activity");
    expect(activityLabel("custom_event")).toBe("Custom Event");
  });

  it("returns empty string for empty input", () => {
    expect(activityLabel("")).toBe("");
  });

  it("returns Spanish for all types used by the backend engine", () => {
    // These are the exact values from ActivityType enum in the backend
    const backendTypes = [
      "wake", "sleep", "light_exposure", "exercise",
      "meal", "caffeine", "caffeine_cutoff", "wind_down", "obligation",
    ];
    for (const type of backendTypes) {
      const label = activityLabel(type);
      // Must not contain underscores (no raw backend value leaked to UI)
      expect(label, `${type} should not contain underscores`).not.toContain("_");
      // Must not be an English capitalised version of the backend key
      expect(label, `${type} should not be raw toTitle fallback`).not.toBe(toTitle(type));
    }
  });
});

describe("toTitle", () => {
  it("capitalises words and removes underscores", () => {
    expect(toTitle("hello_world")).toBe("Hello World");
    expect(toTitle("light_exposure")).toBe("Light Exposure");
    expect(toTitle("wind_down")).toBe("Wind Down");
  });
});

describe("formatCountdown", () => {
  it("formats minutes-only", () => {
    expect(formatCountdown(45)).toBe("45min");
  });

  it("formats hours and minutes", () => {
    expect(formatCountdown(90)).toBe("1h 30min");
    expect(formatCountdown(120)).toBe("2h 0min");
  });

  it("returns placeholder for null/undefined/NaN", () => {
    expect(formatCountdown(null)).toBe("--");
    expect(formatCountdown(undefined)).toBe("--");
    expect(formatCountdown(NaN)).toBe("--");
  });
});
