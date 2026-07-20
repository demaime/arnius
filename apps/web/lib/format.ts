const TIMEZONE = "America/Argentina/Buenos_Aires";

const relative = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
const timeOfDay = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const fullDate = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "hace 25 min", "hace 3 h", o "14 jul, 09:30" si es más viejo que ayer. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 1) return "recién";
  if (diffMin < 60) return relative.format(-diffMin, "minute");
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return relative.format(-diffHours, "hour");
  return fullDate.format(date);
}

/** "09:30" en hora argentina. */
export function formatTime(iso: string): string {
  return timeOfDay.format(new Date(iso));
}

/** "17 jul, 09:30" en hora argentina. */
export function formatDateTime(iso: string): string {
  return fullDate.format(new Date(iso));
}

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026-07-20": día calendario en hora argentina, para comparar fechas. */
export function dayKeyAR(date: Date | string): string {
  return dayKey.format(typeof date === "string" ? new Date(date) : date);
}
