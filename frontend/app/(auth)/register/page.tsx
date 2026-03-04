"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useAuthStore } from "@/store/authStore";

const COMMON_TIMEZONES = [
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Bogota",
  "America/Buenos_Aires",
  "America/Santiago",
  "America/Mexico_City",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [form, setForm] = useState(() => {
    let detected = "Europe/Madrid";
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone || detected;
    } catch {
      // ignore
    }
    return {
      name: "",
      email: "",
      password: "",
      timezone: detected,
    };
  });

  const passwordValid =
    form.password.length >= 8 &&
    /[A-Z]/.test(form.password) &&
    /\d/.test(form.password);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!gdprConsent) return;
    try {
      await register(form);
      router.push("/onboarding/welcome");
    } catch {
      // error already set in store
    }
  }

  async function onGoogleCredential(idToken: string) {
    try {
      await loginWithGoogle(idToken);
      router.push("/onboarding/welcome");
    } catch {
      // error already set in store
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo & tagline */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Crear Cuenta</h1>
          <p className="mt-1 text-sm text-muted">Comienza tu optimización circadiana</p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            autoComplete="name"
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            label="Nombre completo"
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Tu nombre"
            required
            value={form.name}
          />
          <Input
            autoComplete="email"
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            label="Correo electrónico"
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="tu@email.com"
            required
            type="email"
            value={form.email}
          />
          <Input
            autoComplete="new-password"
            error={form.password.length > 0 && !passwordValid ? "Mínimo 8 caracteres, 1 mayúscula y 1 número" : undefined}
            helper="Mínimo 8 caracteres"
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            label="Contraseña"
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="••••••••"
            required
            type="password"
            value={form.password}
          />
          {/* Timezone dropdown */}
          <div className="grid gap-1 text-sm">
            <label className="font-medium text-foreground" htmlFor="timezone">Zona horaria</label>
            <select
              className="min-h-11 rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="timezone"
              onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
              value={form.timezone}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          {/* GDPR consent */}
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              checked={gdprConsent}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary"
              onChange={(e) => setGdprConsent(e.target.checked)}
              required
              type="checkbox"
            />
            <span className="text-muted">
              Acepto los{" "}
              <Link className="text-primary hover:underline" href="/terms" target="_blank">Términos de Uso</Link>
              {" "}y la{" "}
              <Link className="text-primary hover:underline" href="/privacy" target="_blank">Política de Privacidad</Link>
            </span>
          </label>
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-error">{error}</p> : null}
          <Button className="w-full" disabled={!passwordValid || !gdprConsent} isLoading={isLoading} type="submit">
            Crear Cuenta
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <hr className="flex-1 border-border" />
          <span className="text-xs text-muted">o regístrate con</span>
          <hr className="flex-1 border-border" />
        </div>

        <div className="rounded-xl border border-border p-3">
          <GoogleAuthButton onCredential={onGoogleCredential} text="signup_with" />
        </div>

        <p className="text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link className="font-medium text-primary hover:underline" href="/login">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
