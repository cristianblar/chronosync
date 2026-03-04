import { beforeEach, describe, expect, it, vi } from "vitest";

describe("push init", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    delete window.OneSignalDeferred;
    delete window.__chronosync_onesignal_loaded__;
    delete process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  });

  it("does nothing when app id is missing", async () => {
    const { initOneSignal } = await import("@/lib/push");
    await initOneSignal();
    expect(window.__chronosync_onesignal_loaded__).toBeUndefined();
    expect(document.querySelector('script[data-onesignal="true"]')).toBeNull();
  });

  it("loads script and registers deferred init when app id exists", async () => {
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = "test-app-id";

    const appendSpy = vi
      .spyOn(document.head, "appendChild")
      .mockImplementation((node: Node) => {
        const script = node as HTMLScriptElement;
        if (typeof script.onload === "function") script.onload(new Event("load"));
        return node;
      });

    const { initOneSignal } = await import("@/lib/push");
    await initOneSignal();

    expect(window.__chronosync_onesignal_loaded__).toBe(true);
    expect(window.OneSignalDeferred?.length).toBe(1);
    expect(appendSpy).toHaveBeenCalledTimes(1);

    appendSpy.mockRestore();
  });
});
