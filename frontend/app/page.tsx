import Link from "next/link";

export default function Home() {
  return (
    <main className="mobile-container flex min-h-screen flex-col justify-center gap-6">
      <section className="card bg-gradient-to-r from-primary to-secondary p-6 text-white">
        <p className="text-sm opacity-90">ChronoSync</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">
          Optimiza tu ritmo circadiano.
        </h1>
        <p className="mt-3 text-sm opacity-90">
          Planes personalizados basados en tu cronotipo y tus obligaciones
          reales.
        </p>
      </section>
      <div className="grid gap-3">
        <Link
          className="rounded-xl bg-primary px-4 py-3 text-center font-medium text-white transition hover:bg-primary-600"
          href="/login"
        >
          Iniciar sesión
        </Link>
        <Link
          className="rounded-xl border bg-white px-4 py-3 text-center font-medium"
          href="/register"
        >
          Crear cuenta
        </Link>
        <Link
          className="text-center text-sm text-muted underline"
          href="/onboarding/welcome"
        >
          Ver onboarding
        </Link>
      </div>
    </main>
  );
}
