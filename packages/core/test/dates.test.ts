import { describe, expect, it } from "vitest";
import { parseIsoDate, parseSpanishDate } from "../src";

// "Ahora" fijo para tests deterministas: 17 de julio de 2026, 12:00 ART (15:00 UTC).
const NOW = new Date("2026-07-17T15:00:00.000Z");

describe("parseIsoDate", () => {
  it("parsea ISO con zona", () => {
    expect(parseIsoDate("2026-07-15T10:30:00.000Z")?.toISOString()).toBe(
      "2026-07-15T10:30:00.000Z",
    );
    expect(parseIsoDate("2026-07-15T10:30:00-03:00")?.toISOString()).toBe(
      "2026-07-15T13:30:00.000Z",
    );
  });

  it("ISO sin zona se interpreta como hora argentina (UTC-3)", () => {
    expect(parseIsoDate("2026-07-15T10:30:00")?.toISOString()).toBe("2026-07-15T13:30:00.000Z");
    expect(parseIsoDate("2026-07-15")?.toISOString()).toBe("2026-07-15T03:00:00.000Z");
  });

  it("rechaza basura", () => {
    expect(parseIsoDate("no es fecha")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate(undefined)).toBeNull();
  });
});

describe("parseSpanishDate", () => {
  it("'17 de julio de 2026 - 14:30' (hora argentina)", () => {
    expect(parseSpanishDate("17 de julio de 2026 - 14:30", NOW)?.toISOString()).toBe(
      "2026-07-17T17:30:00.000Z",
    );
  });

  it("variantes con y sin 'de', abreviaturas y coma", () => {
    expect(parseSpanishDate("17 julio 2026 14:30", NOW)?.toISOString()).toBe(
      "2026-07-17T17:30:00.000Z",
    );
    expect(parseSpanishDate("17 jul, 2026 2:30 pm", NOW)?.toISOString()).toBe(
      "2026-07-17T17:30:00.000Z",
    );
    expect(parseSpanishDate("5 de sept de 2026 09:05", NOW)?.toISOString()).toBe(
      "2026-09-05T12:05:00.000Z",
    );
  });

  it("fecha sin hora asume medianoche argentina", () => {
    expect(parseSpanishDate("17 de julio de 2026", NOW)?.toISOString()).toBe(
      "2026-07-17T03:00:00.000Z",
    );
  });

  it("'17/07/2026 14:30' y '17/07/2026' y '17-07-2026 08:00'", () => {
    expect(parseSpanishDate("17/07/2026 14:30", NOW)?.toISOString()).toBe(
      "2026-07-17T17:30:00.000Z",
    );
    expect(parseSpanishDate("17/07/2026", NOW)?.toISOString()).toBe("2026-07-17T03:00:00.000Z");
    expect(parseSpanishDate("17-07-2026 08:00", NOW)?.toISOString()).toBe(
      "2026-07-17T11:00:00.000Z",
    );
  });

  it("'Hoy 10:15' y 'Ayer 22:00' relativos a hora argentina", () => {
    expect(parseSpanishDate("Hoy 10:15", NOW)?.toISOString()).toBe("2026-07-17T13:15:00.000Z");
    expect(parseSpanishDate("Ayer 22:00", NOW)?.toISOString()).toBe("2026-07-17T01:00:00.000Z");
  });

  it("'hace 3 horas' y 'hace 20 minutos'", () => {
    expect(parseSpanishDate("hace 3 horas", NOW)?.toISOString()).toBe("2026-07-17T12:00:00.000Z");
    expect(parseSpanishDate("hace 20 minutos", NOW)?.toISOString()).toBe(
      "2026-07-17T14:40:00.000Z",
    );
  });

  it("sin año y en el futuro ⇒ retrocede un año (nota de diciembre leída en enero)", () => {
    const january = new Date("2026-01-02T12:00:00.000Z");
    const parsed = parseSpanishDate("28 de diciembre 23:50", january);
    expect(parsed?.toISOString()).toBe("2025-12-29T02:50:00.000Z");
  });

  it("limpia prefijos tipo 'Actualizado:' y sufijo 'EST'", () => {
    expect(parseSpanishDate("Actualizado: 17/07/2026 14:30", NOW)?.toISOString()).toBe(
      "2026-07-17T17:30:00.000Z",
    );
  });

  it("rechaza basura", () => {
    expect(parseSpanishDate("", NOW)).toBeNull();
    expect(parseSpanishDate("cualquier cosa", NOW)).toBeNull();
    expect(parseSpanishDate(undefined, NOW)).toBeNull();
  });
});
