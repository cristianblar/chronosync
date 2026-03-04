"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const [form, setForm] = useState({ email: "", password: "" });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await login(form.email, form.password);
      const complete = useAuthStore.getState().onboardingComplete;
      router.push(complete ? "/dashboard" : "/onboarding/welcome");
    } catch {
      // error already set in store
    }
  }

  async function onGoogleCredential(idToken: string) {
    try {
      await loginWithGoogle(idToken);
      const complete = useAuthStore.getState().onboardingComplete;
      router.push(complete ? "/dashboard" : "/onboarding/welcome");
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
          <h1 className="text-2xl font-bold text-foreground">ChronoSync</h1>
          <p className="mt-1 text-sm text-muted">Optimiza tu ritmo circadiano</p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={onSubmit}>
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
            autoComplete="current-password"
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
          <div className="flex justify-end">
            <Link className="text-sm text-primary hover:underline" href="/reset-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-error">{error}</p> : null}
          <Button className="w-full" isLoading={isLoading} type="submit">
            Iniciar Sesión →
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <hr className="flex-1 border-border" />
          <span className="text-xs text-muted">o continúa con</span>
          <hr className="flex-1 border-border" />
        </div>

        <div className="rounded-xl border border-border p-3">
          <GoogleAuthButton onCredential={onGoogleCredential} text="signin_with" />
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-muted">
          ¿No tienes cuenta?{" "}
          <Link className="font-medium text-primary hover:underline" href="/register">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
