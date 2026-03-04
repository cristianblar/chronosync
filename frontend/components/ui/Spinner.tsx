export function Spinner() {
  return (
    <span
      aria-label="Cargando"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary"
      role="status"
    />
  );
}

