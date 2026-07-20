import { describe, expect, it } from "vitest";
import { highlightTitle } from "../src";

function rebuild(segments: ReturnType<typeof highlightTitle>): string {
  return segments.map((s) => s.text).join("");
}

function matches(segments: ReturnType<typeof highlightTitle>): string[] {
  return segments.filter((s) => s.match).map((s) => s.text);
}

describe("highlightTitle", () => {
  it("no pierde ni altera texto", () => {
    const title = "El dólar subió tras el anuncio de Milei";
    expect(rebuild(highlightTitle(title, ["dólar", "milei"]))).toBe(title);
  });

  it("matchea sin importar tildes ni mayúsculas, en ambas direcciones", () => {
    expect(matches(highlightTitle("Sube el Dólar", ["dolar"]))).toEqual(["Dólar"]);
    expect(matches(highlightTitle("Sube el dolar", ["dólar"]))).toEqual(["dolar"]);
    expect(matches(highlightTitle("MILEI habló", ["milei"]))).toEqual(["MILEI"]);
  });

  it("matchea solo palabras completas", () => {
    expect(matches(highlightTitle("La autogestión avanza", ["gestión"]))).toEqual([]);
    expect(matches(highlightTitle("La gestión avanza", ["gestión"]))).toEqual(["gestión"]);
  });

  it("matchea frases de varias palabras", () => {
    expect(matches(highlightTitle("Debaten la reforma laboral hoy", ["reforma laboral"]))).toEqual([
      "reforma laboral",
    ]);
  });

  it("varias keywords y solapamientos no duplican segmentos", () => {
    const segments = highlightTitle("Milei y el dólar", ["milei", "dólar", "el dólar"]);
    expect(rebuild(segments)).toBe("Milei y el dólar");
    expect(matches(segments)).toEqual(["Milei", "el dólar"]);
  });

  it("sin keywords devuelve un solo segmento sin match", () => {
    const segments = highlightTitle("Un título cualquiera", []);
    expect(segments).toEqual([{ text: "Un título cualquiera", match: false }]);
  });

  it("resalta plurales/singulares de la keyword (mismo criterio que el feed)", () => {
    expect(matches(highlightTitle("Los dólares suben", ["dólar"]))).toEqual(["dólares"]);
    expect(matches(highlightTitle("Ganó la elección", ["elecciones"]))).toEqual(["elección"]);
  });

  it('"pele" resalta "Pelé" pero no "peleas" ni "pelearon"', () => {
    expect(matches(highlightTitle("La camiseta de Pelé", ["pele"]))).toEqual(["Pelé"]);
    expect(matches(highlightTitle("Hubo peleas en el estadio", ["pele"]))).toEqual([]);
    expect(matches(highlightTitle("Se pelearon en la cancha", ["pele"]))).toEqual([]);
  });

  it("la ñ no matchea con n", () => {
    expect(matches(highlightTitle("El niño juega", ["nino"]))).toEqual(["niño"]);
  });
});
