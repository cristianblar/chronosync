"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useEventsStore } from "@/store/eventsStore";
import type { EventType } from "@/types/domain";

export default function EventsPage() {
  const router = useRouter();
  const events = useEventsStore((state) => state.events);
  const fetchEvents = useEventsStore((state) => state.fetchEvents);
  const createEvent = useEventsStore((state) => state.createEvent);
  const updateEvent = useEventsStore((state) => state.updateEvent);
  const deleteEvent = useEventsStore((state) => state.deleteEvent);
  const includePast = useEventsStore((state) => state.includePast);
  const isLoading = useEventsStore((state) => state.isLoading);
  const [filterType, setFilterType] = useState<"all" | EventType>("all");
  const [filterDate, setFilterDate] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "exam" as EventType,
    event_date: new Date().toISOString().slice(0, 10),
    event_time: "10:00:00",
    importance: 4 as 1 | 2 | 3 | 4 | 5,
    notes: "",
  });

  useEffect(() => {
    fetchEvents(includePast).catch(() => undefined);
  }, [fetchEvents, includePast]);

  async function addEvent(event: React.FormEvent) {
    event.preventDefault();
    if (editingId) {
      await updateEvent(editingId, form);
      setEditingId(null);
    } else {
      await createEvent(form);
    }
    setForm((prev) => ({ ...prev, name: "", notes: "" }));
  }


  const filteredEvents = useMemo(
    () =>
      events.filter((item) => {
        if (filterType !== "all" && item.type !== filterType) return false;
        if (filterDate && item.event_date !== filterDate) return false;
        return true;
      }),
    [events, filterDate, filterType],
  );

  const monthDays = useMemo(() => {
    const base = filterDate ? new Date(`${filterDate}T00:00:00`) : new Date();
    const year = base.getFullYear();
    const month = base.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const days = [];
    for (let day = 1; day <= last.getDate(); day += 1) {
      const iso = new Date(year, month, day).toISOString().slice(0, 10);
      days.push({
        iso,
        day,
        events: filteredEvents.filter((event) => event.event_date === iso),
      });
    }
    return {
      label: first.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
      days,
    };
  }, [filterDate, filteredEvents]);

  function editEvent(id: string) {
    const current = events.find((item) => item.id === id);
    if (!current) return;
    setEditingId(id);
    setForm({
      name: current.name,
      type: current.type,
      event_date: current.event_date,
      event_time: current.event_time ?? "10:00:00",
      importance: current.importance,
      notes: current.notes ?? "",
    });
  }

  function daysUntil(date: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(`${date}T00:00:00`);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="space-y-4">
      <Header subtitle="Crea eventos críticos y prepara sueño de forma gradual." title="Eventos" />
      <form className="grid gap-3" onSubmit={addEvent}>
        <Card className="grid gap-2">
          <Input label="Nombre del evento" onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required value={form.name} />
          <Select
            label="Tipo"
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as EventType }))}
            options={[
              { label: "Examen", value: "exam" },
              { label: "Presentación", value: "presentation" },
              { label: "Entrevista", value: "interview" },
              { label: "Viaje", value: "travel" },
              { label: "Otro", value: "other" },
            ]}
            value={form.type}
          />
          <Input label="Fecha" onChange={(event) => setForm((prev) => ({ ...prev, event_date: event.target.value }))} type="date" value={form.event_date} />
          <Input label="Hora" onChange={(event) => setForm((prev) => ({ ...prev, event_time: `${event.target.value}:00` }))} type="time" value={form.event_time.slice(0, 5)} />
          <label className="grid gap-1 text-sm">
            <span>Importancia ({form.importance}/5)</span>
            <input
              max={5}
              min={1}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  importance: Number(event.target.value) as 1 | 2 | 3 | 4 | 5,
                }))
              }
              type="range"
              value={form.importance}
            />
          </label>
          <Input
            label="Notas"
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            value={form.notes}
          />
          <Button isLoading={isLoading} type="submit">
            {editingId ? "Actualizar evento" : "Guardar evento"}
          </Button>
          {editingId ? (
            <Button
              onClick={() => setEditingId(null)}
              type="button"
              variant="ghost"
            >
              Cancelar edición
            </Button>
          ) : null}
        </Card>
      </form>
      <Card className="grid gap-2">
        <div className="flex gap-2">
          <Button
            onClick={() => setViewMode("list")}
            type="button"
            variant={viewMode === "list" ? "primary" : "outline"}
          >
            Lista
          </Button>
          <Button
            onClick={() => setViewMode("calendar")}
            type="button"
            variant={viewMode === "calendar" ? "primary" : "outline"}
          >
            Calendario
          </Button>
        </div>
        <label className="flex items-center justify-between text-sm">
          <span>Incluir eventos pasados</span>
          <input
            checked={includePast}
            onChange={(event) => fetchEvents(event.target.checked)}
            type="checkbox"
          />
        </label>
        <Select
          label="Filtrar por tipo"
          onChange={(event) => setFilterType(event.target.value as "all" | EventType)}
          options={[
            { label: "Todos", value: "all" },
            { label: "Examen", value: "exam" },
            { label: "Presentación", value: "presentation" },
            { label: "Entrevista", value: "interview" },
            { label: "Viaje", value: "travel" },
            { label: "Otro", value: "other" },
          ]}
          value={filterType}
        />
        <Input
          label="Filtrar por fecha exacta"
          onChange={(event) => setFilterDate(event.target.value)}
          type="date"
          value={filterDate}
        />
      </Card>
      {viewMode === "list" ? (
        <div className="grid gap-2">
          {filteredEvents.map((item) => (
            <Card key={item.id}>
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-muted">
                {item.event_date} {item.event_time?.slice(0, 5)}
              </p>
              <p className="text-xs">Importancia: {"★".repeat(item.importance)}</p>
              <p className="text-xs text-muted">
                {daysUntil(item.event_date) >= 0
                  ? `Faltan ${daysUntil(item.event_date)} días`
                  : `Hace ${Math.abs(daysUntil(item.event_date))} días`}
              </p>
              <div className="mt-2 flex gap-2">
                <Button onClick={() => router.push(`/events/${item.id}`)} variant="outline">
                  Ver plan
                </Button>
                <Button onClick={() => editEvent(item.id)} variant="ghost">
                  Editar
                </Button>
                <Button onClick={() => deleteEvent(item.id)} variant="danger">
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="grid gap-2">
          <p className="text-sm font-semibold capitalize">{monthDays.label}</p>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.days.map((day) => (
              <button
                className={`rounded-lg border p-2 text-left text-xs ${
                  day.events.length ? "border-primary bg-indigo-50" : ""
                }`}
                key={day.iso}
                onClick={() => setFilterDate(day.iso)}
                type="button"
              >
                <p className="font-semibold">{day.day}</p>
                {day.events.slice(0, 2).map((event) => (
                  <p className="truncate text-[10px]" key={event.id}>
                    {event.name}
                  </p>
                ))}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

