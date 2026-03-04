import { describe, expect, it } from "vitest";
import { cn, formatCountdown, toTitle } from "@/lib/utils";

describe("utils", () => {
  it("joins class names", () => {
    expect(cn("a", undefined, false, "b", null, "c")).toBe("a b c");
  });

  it("formats countdown", () => {
    expect(formatCountdown(null)).toBe("--");
    expect(formatCountdown(NaN)).toBe("--");
    expect(formatCountdown(30)).toBe("30min");
    expect(formatCountdown(125)).toBe("2h 5min");
  });

  it("converts to title", () => {
    expect(toTitle("light_exposure")).toBe("Light Exposure");
    expect(toTitle("sleep")).toBe("Sleep");
  });
});

