"use client";
import { useEventsStore } from "@/store/eventsStore";

export function useEvents() {
  return useEventsStore();
}

