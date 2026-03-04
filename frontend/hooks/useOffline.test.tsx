import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useOffline } from "@/hooks/useOffline";

describe("useOffline", () => {
  it("updates state on offline/online events", () => {
    const { result } = renderHook(() => useOffline());
    expect(result.current.isOnline).toBeTypeOf("boolean");

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
  });
});
