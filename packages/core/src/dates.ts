import { TZDate } from "@date-fns/tz";

export const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

/** Parsea un string ISO 8601 (con o sin zona). Sin zona se asume hora argentina. */
export function parseIsoDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return null;

  // Si no trae zona (Z u offset), interpretarlo como hora argentina.
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text);
  if (!hasZone) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
    if (!m) return null;
    return buildArgentinaDate(
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
      Number(m[4] ?? 0),
      Number(m[5] ?? 0),
      Number(m[6] ?? 0),
    );
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Parsea fechas en texto humano de portales argentinos (es-AR) y devuelve un Date UTC.
 * Formatos cubiertos (heredados del sistema anterior):
 *   "17 de julio de 2026 - 14:30", "17 de julio 2026 14:30", "17 jul, 2026 2:30 pm",
 *   "17/07/2026 14:30", "17/07/2026", "17-07-2026 14:30",
 *   "Hoy 14:30", "Ayer 14:30", "hace 3 horas", "hace 20 minutos".
 * Si la fecha no trae año y queda en el futuro, se le resta un año.
 */
export function parseSpanishDate(
  raw: string | undefined | null,
  now: Date = new Date(),
): Date | null {
  if (!raw) return null;
  const text = raw
    .replace(/\s+/g, " ")
    .replace(" EST", "")
    .replace(/^Actualizado:?\s*/i, "")
    .replace(/^Publicado:?\s*/i, "")
    .trim();
  if (!text) return null;

  const iso = parseIsoDate(text);
  if (iso) return iso;

  // "hace N horas" / "hace N minutos"
  const relative = /^hace\s+(\d{1,2})\s+(horas?|minutos?)/i.exec(text);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2]!.toLowerCase();
    const ms = unit.startsWith("hora") ? amount * 3_600_000 : amount * 60_000;
    return new Date(now.getTime() - ms);
  }

  // "Hoy HH:mm" / "Ayer HH:mm"
  const hoyAyer = /^(hoy|ayer)\s+(\d{1,2}):(\d{2})/i.exec(text);
  if (hoyAyer) {
    const nowAr = new TZDate(now, ARGENTINA_TZ);
    const dayOffset = hoyAyer[1]!.toLowerCase() === "ayer" ? 1 : 0;
    const base = new TZDate(
      nowAr.getFullYear(),
      nowAr.getMonth(),
      nowAr.getDate() - dayOffset,
      Number(hoyAyer[2]),
      Number(hoyAyer[3]),
      0,
      ARGENTINA_TZ,
    );
    return new Date(base.getTime());
  }

  // "17/07/2026 14:30", "17/07/2026", "17-07-2026 14:30"
  const numeric = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s*-?\s*(\d{1,2}):(\d{2}))?/.exec(text);
  if (numeric) {
    return buildArgentinaDate(
      Number(numeric[3]),
      Number(numeric[2]),
      Number(numeric[1]),
      Number(numeric[4] ?? 0),
      Number(numeric[5] ?? 0),
    );
  }

  // "17 de julio de 2026 - 14:30" / "17 de jul 2026 14:30" / "17 julio, 2026 2:30 pm"
  // Año y hora opcionales; admite "de" y comas intermedias, y am/pm.
  const worded =
    /^(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)\.?,?(?:\s+(?:de\s+)?(\d{4}))?(?:\s*[-–]?\s*(\d{1,2}):(\d{2})(?:\s*(am|pm|a\.m\.|p\.m\.))?)?/i.exec(
      text,
    );
  if (worded) {
    const month = MONTHS[worded[2]!.toLowerCase()];
    if (month) {
      let hours = Number(worded[4] ?? 0);
      const meridiem = worded[6]?.toLowerCase().replace(/\./g, "");
      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;

      const nowAr = new TZDate(now, ARGENTINA_TZ);
      const hasYear = worded[3] !== undefined;
      const year = hasYear ? Number(worded[3]) : nowAr.getFullYear();

      let date = buildArgentinaDate(year, month, Number(worded[1]), hours, Number(worded[5] ?? 0));
      // Sin año explícito: si queda en el futuro (p. ej. nota de diciembre leída en enero), retroceder un año.
      if (date && !hasYear && date.getTime() > now.getTime() + 86_400_000) {
        date = buildArgentinaDate(
          year - 1,
          month,
          Number(worded[1]),
          hours,
          Number(worded[5] ?? 0),
        );
      }
      return date;
    }
  }

  return null;
}

function buildArgentinaDate(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds = 0,
): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const tz = new TZDate(year, month - 1, day, hours, minutes, seconds, ARGENTINA_TZ);
  const date = new Date(tz.getTime());
  return Number.isNaN(date.getTime()) ? null : date;
}
