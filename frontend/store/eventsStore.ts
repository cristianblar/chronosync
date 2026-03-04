"use client";

import { create } from "zustand";
import type { Event } from "@/types/domain";
import { eventService } from "@/services/eventService";

type EventPayload = Omit<Event, "id" | "user_id" | "preparation_days" | "created_at">;

interface EventsState {
  events: Event[];
  selectedEvent: Event | null;
  isLoading: boolean;
  includePast: boolean;
  fetchEvents: (includePast?: boolean) => Promise<void>;
  createEvent: (payload: EventPayload) => Promise<void>;
  updateEvent: (id: string, payload: EventPayload) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  setSelectedEvent: (event: Event | null) => void;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  selectedEvent: null,
  isLoading: false,
  includePast: false,
  fetchEvents: async (includePast = get().includePast) => {
    set({ isLoading: true });
    try {
      const response = await eventService.list(includePast);
      set({ events: response.events, includePast });
    } finally {
      set({ isLoading: false });
    }
  },
  createEvent: async (payload) => {
    set({ isLoading: true });
    try {
      await eventService.create(payload);
      await get().fetchEvents(get().includePast);
    } finally {
      set({ isLoading: false });
    }
  },
  updateEvent: async (id, payload) => {
    set({ isLoading: true });
    try {
      await eventService.update(id, payload);
      await get().fetchEvents(get().includePast);
    } finally {
      set({ isLoading: false });
    }
  },
  deleteEvent: async (id) => {
    set({ isLoading: true });
    try {
      await eventService.remove(id);
      set((state) => ({ events: state.events.filter((event) => event.id !== id) }));
    } finally {
      set({ isLoading: false });
    }
  },
  setSelectedEvent: (event) => set({ selectedEvent: event }),
}));

