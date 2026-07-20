const TIMEZONE = "America/Argentina/Buenos_Aires";

/*
 * Espejo del cron de .github/workflows/scrape.yml, expresado en hora argentina.
 * Si cambia el schedule allá, hay que actualizar esta lista.
 *
 * Diurno: cada 30 min a los :10 y :40, de 07:10 a 23:40 ART.
 * Madrugada: 01:10, 03:10 y 05:10 ART.
 */
const SLOTS_MIN: number[] = (() => {
  const slots = [1 * 60 + 10, 3 * 60 + 10, 5 * 60 + 10];
  for (let h = 7; h <= 23; h++) slots.push(h * 60 + 10, h * 60 + 40);
  return slots.sort((a, b) => a - b);
})();

const artClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Minutos que faltan (redondeados hacia arriba) para la próxima corrida del scraper. */
export function minutesToNextScrape(now: Date = new Date()): number {
  const [h, m] = artClock.format(now).split(":").map(Number);
  const current = h * 60 + m;
  const next = SLOTS_MIN.find((slot) => slot > current) ?? SLOTS_MIN[0] + 24 * 60;
  return next - current;
}

/** "~5 min", "~1 h" o "~1 h 20 min". Aproximado: GitHub puede demorar el arranque. */
export function formatNextScrape(now: Date = new Date()): string {
  const min = minutesToNextScrape(now);
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `~${h} h` : `~${h} h ${rest} min`;
}
