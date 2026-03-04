export function cn(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(" ");
}

export function formatCountdown(minutes: number | null | undefined) {
  if (minutes == null || Number.isNaN(minutes)) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}min`;
  return `${h}h ${m}min`;
}

export function toTitle(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

const ACTIVITY_LABELS: Record<string, string> = {
  wake: "Despertar",
  sleep: "Dormir",
  light_exposure: "Exposición a luz",
  exercise: "Ejercicio",
  meal: "Comida",
  caffeine: "Cafeína",
  caffeine_cutoff: "Corte de cafeína",
  wind_down: "Relajación",
  obligation: "Obligación",
};

export function activityLabel(type: string): string {
  return ACTIVITY_LABELS[type] ?? toTitle(type);
}
