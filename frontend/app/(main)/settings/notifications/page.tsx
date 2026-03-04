"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  notificationService,
  type NotificationHistoryItem,
  type NotificationSettings,
} from "@/services/notificationService";
import { cacheUserSettings, getCachedUserSettings } from "@/lib/offline-sync";

const defaults: NotificationSettings = {
  wind_down_enabled: true,
  wind_down_minutes_before: 60,
  tracking_reminder_enabled: true,
  tracking_reminder_time: "09:00:00",
  activity_reminders_enabled: true,
  max_per_day: 3,
  quiet_hours_start: "23:00:00",
  quiet_hours_end: "07:00:00",
};

export default function SettingsNotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(defaults);
  const [playerId, setPlayerId] = useState("");
  const [deviceType, setDeviceType] = useState("web");
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    Promise.all([
      notificationService.getSettings(),
      notificationService.history(20),
    ])
      .then(([settingsResponse, historyResponse]) => {
        setSettings(settingsResponse.settings);
        setHistory(historyResponse.notifications);
        cacheUserSettings("notifications", settingsResponse.settings).catch(() => undefined);
      })
      .catch(async () => {
        const cached = await getCachedUserSettings<NotificationSettings>("notifications");
        if (cached) setSettings(cached);
      });
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await notificationService.updateSettings(settings);
    await cacheUserSettings("notifications", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function registerDevice(event: React.FormEvent) {
    event.preventDefault();
    if (!playerId) return;
    await notificationService.registerDevice({ player_id: playerId, device_type: deviceType });
    setRegistered(true);
    setTimeout(() => setRegistered(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Header title="Notificaciones" />
      <form className="grid gap-3" onSubmit={save}>
        <Card className="grid gap-3">
          <label className="flex items-center justify-between text-sm">
            <span>Recordatorio wind-down</span>
            <input
              checked={settings.wind_down_enabled}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  wind_down_enabled: event.target.checked,
                }))
              }
              type="checkbox"
            />
          </label>
          <Input
            label="Minutos antes del sueño"
            min={15}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                wind_down_minutes_before: Number(event.target.value),
              }))
            }
            type="number"
            value={settings.wind_down_minutes_before}
          />
          <Input
            label="Máximo de notificaciones por día"
            min={1}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, max_per_day: Number(event.target.value) }))
            }
            type="number"
            value={settings.max_per_day}
          />
          <label className="flex items-center justify-between text-sm">
            <span>Recordatorio tracking diario</span>
            <input
              checked={settings.tracking_reminder_enabled}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  tracking_reminder_enabled: event.target.checked,
                }))
              }
              type="checkbox"
            />
          </label>
          <Input
            label="Hora recordatorio tracking"
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                tracking_reminder_time: `${event.target.value}:00`,
              }))
            }
            type="time"
            value={(settings.tracking_reminder_time ?? "09:00:00").slice(0, 5)}
          />
          <label className="flex items-center justify-between text-sm">
            <span>Recordatorios de actividad</span>
            <input
              checked={settings.activity_reminders_enabled}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  activity_reminders_enabled: event.target.checked,
                }))
              }
              type="checkbox"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Inicio horas silencio"
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  quiet_hours_start: `${event.target.value}:00`,
                }))
              }
              type="time"
              value={(settings.quiet_hours_start ?? "23:00:00").slice(0, 5)}
            />
            <Input
              label="Fin horas silencio"
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  quiet_hours_end: `${event.target.value}:00`,
                }))
              }
              type="time"
              value={(settings.quiet_hours_end ?? "07:00:00").slice(0, 5)}
            />
          </div>
          <Button type="submit">Guardar</Button>
          {saved ? <p className="text-xs text-success">Preferencias guardadas.</p> : null}
        </Card>
      </form>
      <form className="grid gap-3" onSubmit={registerDevice}>
        <Card className="grid gap-2">
          <p className="text-sm font-semibold">Push (registro de dispositivo)</p>
          <Input
            label="Player ID (OneSignal/Web Push)"
            onChange={(event) => setPlayerId(event.target.value)}
            placeholder="onesignal-player-id"
            value={playerId}
          />
          <Input
            label="Tipo de dispositivo"
            onChange={(event) => setDeviceType(event.target.value)}
            value={deviceType}
          />
          <Button disabled={!playerId} type="submit" variant="outline">
            Registrar dispositivo
          </Button>
          {registered ? (
            <p className="text-xs text-success">Dispositivo registrado.</p>
          ) : null}
        </Card>
      </form>
      <Card className="grid gap-2">
        <p className="text-sm font-semibold">Historial de notificaciones</p>
        {!history.length ? <p className="text-xs text-muted">Sin notificaciones aún.</p> : null}
        {history.map((item) => (
          <div className="rounded-xl border p-2" key={item.id}>
            <p className="text-xs font-semibold">{item.title}</p>
            <p className="text-xs text-muted">{item.body}</p>
            <p className="text-[11px] text-muted">
              {new Date(item.scheduled_for).toLocaleString()}
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
}

