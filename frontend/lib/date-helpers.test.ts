import { describe, expect, it, vi } from "vitest";
import { formatDate, formatTime, isToday } from "@/lib/date-helpers";

describe("date helpers", () => {
  it("formats date and time", () => {
    expect(formatDate("2026-02-18")).toContain("18");
    expect(formatTime("09:30:00")).toBe("09:30");
    expect(formatTime(null)).toBe("--:--");
  });

  it("checks today", () => {
    vi.setSystemTime(new Date("2026-02-18T12:00:00Z"));
    expect(isToday("2026-02-18")).toBe(true);
    expect(isToday("2026-02-17")).toBe(false);
    vi.useRealTimers();
  });
});

