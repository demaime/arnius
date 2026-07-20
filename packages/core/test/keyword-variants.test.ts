import { describe, expect, it } from "vitest";
import { keywordVariants } from "../src";

describe("keywordVariants", () => {
  it("pluraliza singulares según la terminación", () => {
    expect(keywordVariants("pelea")).toContain("peleas"); // vocal → +s
    expect(keywordVariants("dólar")).toContain("dólares"); // consonante → +es
    expect(keywordVariants("vez")).toContain("veces"); // z → ces
    expect(keywordVariants("show")).toContain("shows"); // préstamo → +s
  });

  it("singulares terminados en s también generan su plural", () => {
    expect(keywordVariants("mes")).toContain("meses");
    expect(keywordVariants("país")).toContain("países");
  });

  it("singulariza keywords que ya vienen en plural", () => {
    expect(keywordVariants("elecciones")).toContain("eleccion");
    expect(keywordVariants("veces")).toContain("vez");
    expect(keywordVariants("casas")).toContain("casa");
    expect(keywordVariants("bases")).toContain("base");
  });

  it('"pele" NO genera "peleas": flexiona número, no deriva raíces', () => {
    expect(keywordVariants("pele")).toEqual(["pele", "peles"]);
  });

  it("no genera singulares demasiado cortos (ruido)", () => {
    expect(keywordVariants("veces")).not.toContain("ve");
  });

  it("palabras de menos de 3 letras quedan exactas", () => {
    expect(keywordVariants("de")).toEqual(["de"]);
  });

  it("frases: combina variantes por palabra, la exacta primero", () => {
    const variants = keywordVariants("reforma laboral");
    expect(variants[0]).toBe("reforma laboral");
    expect(variants).toContain("reformas laborales");
  });

  it("normaliza mayúsculas y espacios, sin duplicados", () => {
    const variants = keywordVariants("  Dólar  ");
    expect(variants[0]).toBe("dólar");
    expect(new Set(variants).size).toBe(variants.length);
  });

  it("keyword vacía devuelve lista vacía", () => {
    expect(keywordVariants("   ")).toEqual([]);
  });
});
