"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GoogleCalendarImport } from "@/components/integrations/GoogleCalendarImport";
import type { Obligation } from "@/types/domain";

const GOOGLE_CALENDAR_KEY = "chronosync_google_calendar_connected";
const GOOGLE_CALENDAR_META_KEY = "chronosync_google_calendar_connection_meta";

export default function SettingsIntegrationsPage() {
  const [connectionMeta, setConnectionMeta] = useState<{
    calendarId?: string;
    calendarName?: string;
    connectedAt?: string;
  } | null>(
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(GOOGLE_CALENDAR_META_KEY) ?? "null")
      : null,
  );
  const [isGoogleConnected, setIsGoogleConnected] = useState(
    typeof window !== "undefined"
      ? localStorage.getItem(GOOGLE_CALENDAR_KEY) === "true"
      : false,
  );
  const [lastImported, setLastImported] = useState(0);

  function handleImport(obligations: Obligation[]) {
    setLastImported(obligations.length);
    setIsGoogleConnected(true);
  }

  function disconnectGoogleCalendar() {
    localStorage.removeItem(GOOGLE_CALENDAR_KEY);
    localStorage.removeItem(GOOGLE_CALENDAR_META_KEY);
    setIsGoogleConnected(false);
    setConnectionMeta(null);
    setLastImported(0);
  }

  return (
    <div className="space-y-4">
      <Header
        subtitle="Conecta proveedores externos para importar datos."
        title="Integraciones"
      />
      <Card className="grid gap-3">
        <div>
          <p className="text-sm font-semibold">Google Calendar</p>
          <p className="text-xs text-muted">
            Importa eventos recurrentes como obligaciones.
          </p>
        </div>
        <p className="text-xs">
          Estado:{" "}
          <span className={isGoogleConnected ? "text-success" : "text-muted"}>
            {isGoogleConnected ? "Conectado" : "No conectado"}
          </span>
        </p>
        {connectionMeta?.calendarName ? (
          <p className="text-xs text-muted">
            Calendario: {connectionMeta.calendarName} ({connectionMeta.calendarId})
          </p>
        ) : null}
        {connectionMeta?.connectedAt ? (
          <p className="text-xs text-muted">
            Conectado: {new Date(connectionMeta.connectedAt).toLocaleString()}
          </p>
        ) : null}
        <GoogleCalendarImport
          onConnectionChange={(payload) => {
            setIsGoogleConnected(payload.connected);
            const meta = JSON.parse(localStorage.getItem(GOOGLE_CALENDAR_META_KEY) ?? "null");
            setConnectionMeta(meta);
          }}
          onImportComplete={handleImport}
        />
        {lastImported > 0 ? (
          <p className="text-xs text-success">
            Última importación: {lastImported} obligaciones.
          </p>
        ) : null}
        {isGoogleConnected ? (
          <Button onClick={disconnectGoogleCalendar} type="button" variant="outline">
            Desconectar calendario
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
