import { describe, expect, it } from "vitest";
import { useUIStore } from "@/store/uiStore";

describe("uiStore", () => {
  it("pushes and removes toasts", () => {
    useUIStore.setState({ toasts: [], disclaimerAccepted: false });
    useUIStore.getState().pushToast({ type: "success", message: "ok" });
    const toast = useUIStore.getState().toasts[0];
    expect(toast.message).toBe("ok");
    useUIStore.getState().removeToast(toast.id);
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it("sets disclaimer acceptance", () => {
    useUIStore.getState().setDisclaimerAccepted(true);
    expect(useUIStore.getState().disclaimerAccepted).toBe(true);
  });
});

