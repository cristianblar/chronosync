"use client";

import { useEffect, useState } from "react";
import { notificationService, type NotificationSettings } from "@/services/notificationService";

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    notificationService
      .getSettings()
      .then((response) => setSettings(response.settings))
      .catch(() => setSettings(null));
  }, []);

  return { settings };
}
