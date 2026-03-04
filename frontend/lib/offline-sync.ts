import { openDB } from "idb";
import { apiFetch } from "@/services/api";

interface OfflineQueueItem {
  id: string;
  action: "CREATE" | "UPDATE";
  endpoint: string;
  data: unknown;
  timestamp: string;
  retryCount: number;
}

const DB_NAME = "chronosync-offline";
const STORE_NAME = "tracking-queue";
const CURRENT_PLAN_STORE = "current-plan";
const CACHED_ARTICLES_STORE = "cached-articles";
const USER_SETTINGS_STORE = "user-settings";
const TRACKING_HISTORY_STORE = "tracking-history";

async function getDb() {
  return openDB(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CURRENT_PLAN_STORE)) {
        db.createObjectStore(CURRENT_PLAN_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CACHED_ARTICLES_STORE)) {
        db.createObjectStore(CACHED_ARTICLES_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(USER_SETTINGS_STORE)) {
        db.createObjectStore(USER_SETTINGS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(TRACKING_HISTORY_STORE)) {
        db.createObjectStore(TRACKING_HISTORY_STORE, { keyPath: "id" });
      }
    },
  });
}

export async function enqueueOffline(item: Omit<OfflineQueueItem, "id" | "timestamp" | "retryCount">) {
  const db = await getDb();
  const payload: OfflineQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };
  await db.put(STORE_NAME, payload);
}

export async function getOfflineQueue() {
  const db = await getDb();
  return db.getAll(STORE_NAME) as Promise<OfflineQueueItem[]>;
}

export async function removeOfflineItem(id: string) {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function replayOfflineQueue() {
  const queue = await getOfflineQueue();
  for (const item of queue) {
    try {
      await apiFetch(item.endpoint, {
        method: item.action === "CREATE" ? "POST" : "PUT",
        body: JSON.stringify(item.data),
      });
      await removeOfflineItem(item.id);
    } catch {
      // Keep failed item for retry on next sync cycle.
    }
  }
  return getOfflineQueue();
}

export async function cacheCurrentPlan(payload: unknown) {
  const db = await getDb();
  await db.put(CURRENT_PLAN_STORE, {
    id: "current",
    payload,
    updated_at: new Date().toISOString(),
  });
}

export async function getCachedCurrentPlan<T>() {
  const db = await getDb();
  const row = await db.get(CURRENT_PLAN_STORE, "current");
  return (row?.payload ?? null) as T | null;
}

export async function cacheArticle(slug: string, payload: unknown) {
  const db = await getDb();
  await db.put(CACHED_ARTICLES_STORE, {
    id: slug,
    payload,
    updated_at: new Date().toISOString(),
  });
}

export async function getCachedArticle<T>(slug: string) {
  const db = await getDb();
  const row = await db.get(CACHED_ARTICLES_STORE, slug);
  return (row?.payload ?? null) as T | null;
}

export async function cacheUserSettings(key: string, payload: unknown) {
  const db = await getDb();
  await db.put(USER_SETTINGS_STORE, {
    id: key,
    payload,
    updated_at: new Date().toISOString(),
  });
}

export async function getCachedUserSettings<T>(key: string) {
  const db = await getDb();
  const row = await db.get(USER_SETTINGS_STORE, key);
  return (row?.payload ?? null) as T | null;
}

export async function cacheTrackingHistory(
  startDate: string,
  endDate: string,
  payload: unknown,
) {
  const db = await getDb();
  await db.put(TRACKING_HISTORY_STORE, {
    id: `${startDate}_${endDate}`,
    payload,
    updated_at: new Date().toISOString(),
  });
}

export async function getCachedTrackingHistory<T>(startDate: string, endDate: string) {
  const db = await getDb();
  const row = await db.get(TRACKING_HISTORY_STORE, `${startDate}_${endDate}`);
  return (row?.payload ?? null) as T | null;
}
