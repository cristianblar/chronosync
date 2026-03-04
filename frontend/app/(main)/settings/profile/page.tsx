"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { userService } from "@/services/userService";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { cacheUserSettings, getCachedUserSettings } from "@/lib/offline-sync";

export default function SettingsProfilePage() {
  const [form, setForm] = useState({ name: "", timezone: "Europe/Madrid", language: "es" });
  const setUser = useAuthStore((s) => s.setUser);
  const pushToast = useUIStore((s) => s.pushToast);

  useEffect(() => {
    userService
      .me()
      .then((user) => {
        const profile = { name: user.name, timezone: user.timezone, language: user.language };
        setForm(profile);
        cacheUserSettings("profile", profile).catch(() => undefined);
      })
      .catch(async () => {
        const cached = await getCachedUserSettings<typeof form>("profile");
        if (cached) setForm(cached);
      });
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      const updatedUser = await userService.update(form);
      setUser(updatedUser);
      await cacheUserSettings("profile", form);
      pushToast({ type: "success", message: "Perfil actualizado correctamente." });
    } catch {
      pushToast({ type: "error", message: "No se pudo guardar el perfil." });
    }
  }

  return (
    <div className="space-y-4">
      <Header title="Perfil" />
      <form className="grid gap-3" onSubmit={save}>
        <Card className="grid gap-3">
          <Input label="Nombre" onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} value={form.name} />
          <Input label="Timezone" onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))} value={form.timezone} />
          <Input label="Idioma" onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))} value={form.language} />
          <Button type="submit">Guardar cambios</Button>
        </Card>
      </form>
    </div>
  );
}

