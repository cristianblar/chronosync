"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { obligationService } from "@/services/obligationService";
import type { Obligation } from "@/types/domain";
import { loadGoogleScript } from "@/lib/google";

interface GoogleCalendarImportProps {
  onImportComplete: (obligations: Obligation[]) => void;
  onCancel?: () => void;
  onConnectionChange?: (payload: { connected: boolean; calendarId?: string }) => void;
}
interface GoogleCalendar {
  id: string;
  summary: string;
  timeZone?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  recurrence?: string[];
}

export function GoogleCalendarImport({
  onImportComplete,
  onCancel,
  onConnectionChange,
}: GoogleCalendarImportProps) {
  const [open, setOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [calendarId, setCalendarId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
  );
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [step, setStep] = useState<"connect" | "calendar" | "events" | "confirm">("connect");

  async function connectGoogleCalendar() {
    setLoading(true);
    setError(null);
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error("Falta NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
      await loadGoogleScript();
      const google = window.google;
      if (!google) throw new Error("Google Identity no disponible.");
      const token = await new Promise<string>((resolve, reject) => {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/calendar.readonly",
          callback: (response: { access_token?: string; error?: string }) => {
            if (response.error || !response.access_token) {
              reject(new Error("No se pudo autorizar Google Calendar."));
              return;
            }
            resolve(response.access_token);
          },
        });
        tokenClient.requestAccessToken({ prompt: "consent" });
      });
      setAccessToken(token);
      const calendarResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!calendarResponse.ok) throw new Error("No se pudieron cargar calendarios.");
      const data = (await calendarResponse.json()) as { items?: GoogleCalendar[] };
      const items = data.items ?? [];
      setCalendars(items);
      setCalendarId(items[0]?.id ?? "primary");
      setStep("calendar");
      localStorage.setItem("chronosync_google_calendar_connected", "true");
      localStorage.setItem(
        "chronosync_google_calendar_connection_meta",
        JSON.stringify({
          connected: true,
          calendarId: items[0]?.id ?? "primary",
          calendarName: items[0]?.summary ?? "primary",
          connectedAt: new Date().toISOString(),
        }),
      );
      onConnectionChange?.({ connected: true, calendarId: items[0]?.id ?? "primary" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar Google Calendar.");
    } finally {
      setLoading(false);
    }
  }

  async function previewEvents() {
    if (!accessToken || !calendarId) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      );
      url.searchParams.set("timeMin", new Date(`${startDate}T00:00:00Z`).toISOString());
      url.searchParams.set("timeMax", new Date(`${endDate}T23:59:59Z`).toISOString());
      url.searchParams.set("singleEvents", "false");
      url.searchParams.set("maxResults", "100");
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("No se pudieron cargar eventos.");
      const data = (await response.json()) as { items?: GoogleCalendarEvent[] };
      const items = (data.items ?? []).filter(
        (item) => item.start?.dateTime || item.start?.date,
      );
      setEvents(items);
      setSelectedEvents(items.map((item) => item.id));
      setStep("events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo previsualizar eventos.");
    } finally {
      setLoading(false);
    }
  }

  function toLocalTime(value?: string, timeZone?: string) {
    if (!value) return "09:00:00";
    const date = new Date(value);
    const hhmm = date.toLocaleTimeString("es-ES", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
    return `${hhmm}:00`;
  }

  function toDaysOfWeek(value?: string, timeZone?: string) {
    if (!value) return [0];
    const date = new Date(value);
    const day = date.toLocaleDateString("en-US", { weekday: "short", timeZone });
    const map: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };
    return [map[day] ?? 0];
  }

  async function importEvents() {
    setLoading(true);
    setError(null);
    try {
      const imported = await obligationService.importGoogleCalendar({
        access_token: accessToken,
        calendar_id: calendarId,
        start_date: startDate,
        end_date: endDate,
      });

      const selectedSignatures = new Set(
        events
          .filter((item) => selectedEvents.includes(item.id))
          .map((event) => {
            const start = event.start?.dateTime ?? `${event.start?.date ?? startDate}T09:00:00`;
            const end = event.end?.dateTime ?? `${event.end?.date ?? startDate}T10:00:00`;
            const startTz = event.start?.timeZone;
            const endTz = event.end?.timeZone;
            return [
              (event.summary || "Evento importado").trim().toLowerCase(),
              toLocalTime(start, startTz),
              toLocalTime(end, endTz),
              toDaysOfWeek(start, startTz).join(","),
            ].join("|");
          }),
      );

      const selectedObligations = imported.obligations.filter((item) => {
        const signature = [
          item.name.trim().toLowerCase(),
          item.start_time,
          item.end_time,
          item.days_of_week.join(","),
        ].join("|");
        return selectedSignatures.has(signature);
      });
      const toRemove = imported.obligations.filter(
        (item) => !selectedObligations.some((selected) => selected.id === item.id),
      );
      await Promise.all(toRemove.map((item) => obligationService.remove(item.id)));

      setImportedCount(selectedObligations.length);
      onImportComplete(selectedObligations);
      setStep("confirm");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo importar eventos seleccionados.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} type="button" variant="outline">
        Importar desde Google Calendar
      </Button>
    );
  }

  return (
    <Card className="grid gap-2 border-primary/30">
      <p className="text-xs text-muted">
        Paso:{" "}
        {step === "connect"
          ? "Conectar"
          : step === "calendar"
            ? "Elegir calendario"
            : step === "events"
              ? "Seleccionar eventos"
              : "Confirmado"}
      </p>
      {step === "connect" ? (
        <Button isLoading={loading} onClick={connectGoogleCalendar} type="button">
          Conectar Google Calendar
        </Button>
      ) : null}
      {step !== "connect" ? (
        <label className="grid gap-1 text-sm">
          <span>Calendario</span>
          <select
            className="rounded-xl border bg-white px-3 py-2 text-sm"
            onChange={(event) => setCalendarId(event.target.value)}
            value={calendarId}
          >
            {calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.summary}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Input label="Desde" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
        <Input label="Hasta" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
      </div>
      {step === "calendar" ? (
        <Button isLoading={loading} onClick={previewEvents} type="button" variant="outline">
          Previsualizar eventos
        </Button>
      ) : null}
      {step === "events" ? (
        <div className="grid max-h-56 gap-2 overflow-auto rounded-xl border p-2">
          {events.map((event) => (
            <label className="flex items-start gap-2 text-xs" key={event.id}>
              <input
                checked={selectedEvents.includes(event.id)}
                onChange={(e) =>
                  setSelectedEvents((prev) =>
                    e.target.checked
                      ? [...prev, event.id]
                      : prev.filter((item) => item !== event.id),
                  )
                }
                type="checkbox"
              />
              <span>
                {event.summary || "Sin título"} ·{" "}
                {(event.start?.dateTime || event.start?.date || "").slice(0, 16)}
              </span>
            </label>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button
          disabled={!selectedEvents.length || step !== "events"}
          isLoading={loading}
          onClick={importEvents}
          type="button"
        >
          Importar
        </Button>
        <Button
          onClick={() => {
            setOpen(false);
            onCancel?.();
          }}
          type="button"
          variant="ghost"
        >
          Cancelar
        </Button>
      </div>
      {importedCount > 0 ? (
        <p className="text-xs text-success">{importedCount} obligaciones importadas.</p>
      ) : null}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </Card>
  );
}
