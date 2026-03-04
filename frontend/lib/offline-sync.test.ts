import { beforeEach, describe, expect, it, vi } from "vitest";

type QueueItem = { id: string; [key: string]: unknown };
const queue = new Map<string, QueueItem>();
const apiFetchMock = vi.fn();

vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock("idb", () => ({
  openDB: vi.fn(async () => ({
    put: async (_store: string, value: { id: string }) => {
      queue.set(value.id, value);
    },
    getAll: async () => Array.from(queue.values()),
    delete: async (_store: string, id: string) => {
      queue.delete(id);
    },
    objectStoreNames: { contains: () => true },
  })),
}));

describe("offline-sync", () => {
  beforeEach(() => {
    queue.clear();
    apiFetchMock.mockReset();
  });

  it("enqueues and replays queued items, removing successful ones", async () => {
    const { enqueueOffline, getOfflineQueue, replayOfflineQueue } = await import(
      "@/lib/offline-sync"
    );

    apiFetchMock.mockResolvedValue({});
    await enqueueOffline({
      action: "CREATE",
      endpoint: "/tracking",
      data: { sleep_quality: 8 },
    });
    expect((await getOfflineQueue()).length).toBe(1);

    const remaining = await replayOfflineQueue();
    expect(apiFetchMock).toHaveBeenCalledWith("/tracking", {
      method: "POST",
      body: JSON.stringify({ sleep_quality: 8 }),
    });
    expect(remaining).toHaveLength(0);
  });

  it("keeps failed replay items in queue", async () => {
    const { enqueueOffline, replayOfflineQueue } = await import("@/lib/offline-sync");
    apiFetchMock.mockRejectedValue(new Error("network"));

    await enqueueOffline({
      action: "UPDATE",
      endpoint: "/tracking",
      data: { sleep_quality: 6 },
    });

    const remaining = await replayOfflineQueue();
    expect(remaining).toHaveLength(1);
  });
});
