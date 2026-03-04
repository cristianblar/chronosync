import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(date: string | Date, pattern = "EEE d MMM") {
  const value = typeof date === "string" ? parseISO(date) : date;
  return format(value, pattern, { locale: es });
}

export function formatTime(time: string | null | undefined) {
  if (!time) return "--:--";
  return time.slice(0, 5);
}

export function isToday(date: string) {
  const d = parseISO(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
