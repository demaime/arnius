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
