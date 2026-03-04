"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useEventsStore } from "@/store/eventsStore";
import { notificationService } from "@/services/notificationService";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const events = useEventsStore((state) => state.events);
  const fetchEvents = useEventsStore((state) => state.fetchEvents);
  const event = useMemo(() => events.find((item) => item.id === params.id), [events, params.id]);
  const [reminderStatus, setReminderStatus] = useState("");

  useEffect(() => {
    if (events.length) return;
    fetchEvents().catch(() => undefined);
  }, [events.length, fetchEvents]);

  const prepDays = event?.preparation_days ?? 5;
  const daysUntilEvent = event
    ? Math.ceil(
        (new Date(`${event.event_date}T00:00:00`).getTime() -
          new Date(new Date().toISOString().slice(0, 10)).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  async function enableEventReminder() {
    if (!event) return;
    const current = await notificationService.getSettings();
    const reminderTime = event.event_time ?? "09:00:00";
    await notificationService.updateSettings({
      ...current.settings,
      activity_reminders_enabled: true,
      tracking_reminder_enabled: true,
      tracking_reminder_time: reminderTime,
      max_per_day: Math.max(current.settings.max_per_day, 3),
    });
    setReminderStatus(`Recordatorio activado para ${event.name} (${reminderTime.slice(0, 5)}).`);
  }

  return (
    <div className="space-y-4">
      <Header subtitle="Detalle y estrategia de preparación." title={event?.name ?? "Evento"} />
      {!event ? (
        <Card>
          <p className="text-sm">Evento no encontrado.</p>
        </Card>
      ) : (
        <>
          <Card>
            <p className="text-sm font-semibold">Fecha: {event.event_date}</p>
            <p className="text-sm">Hora: {event.event_time?.slice(0, 5) ?? "No definida"}</p>
            <p className="text-sm">Importancia: {event.importance}/5</p>
            <p className="text-sm text-muted">
              {daysUntilEvent !== null
                ? daysUntilEvent >= 0
                  ? `Faltan ${daysUntilEvent} días`
                  : `Evento pasado hace ${Math.abs(daysUntilEvent)} días`
                : ""}
            </p>
          </Card>
          {event.importance >= 4 ? (
            <Card className="border-primary/30 bg-indigo-50">
              <p className="text-sm font-semibold">Plan de sleep banking ({prepDays} días)</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                <li>Empieza {prepDays} días antes del evento.</li>
                <li>Ajusta hora de dormir y despertar gradualmente.</li>
                <li>Prioriza luz matutina y rutina constante.</li>
              </ul>
              <Button
                className="mt-3"
                onClick={enableEventReminder}
                type="button"
                variant="outline"
              >
                Activar recordatorio para este evento
              </Button>
              {reminderStatus ? <p className="mt-2 text-xs text-success">{reminderStatus}</p> : null}
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

