import { describe, expect, it } from "vitest";
import { normalizeUrl } from "../src";

const BASE = "https://www.infobae.com/";

describe("normalizeUrl", () => {
  it("absolutiza rutas relativas", () => {
    expect(normalizeUrl("/politica/2026/07/17/nota/", BASE)).toBe(
      "https://www.infobae.com/politica/2026/07/17/nota/",
    );
  });

  it("mantiene URLs absolutas del mismo dominio (con o sin www)", () => {
    expect(normalizeUrl("https://infobae.com/x/", BASE)).toBe("https://infobae.com/x/");
    expect(normalizeUrl("https://www.infobae.com/x/", BASE)).toBe("https://www.infobae.com/x/");
  });

  it("rechaza otros dominios (ads, redes)", () => {
    expect(normalizeUrl("https://twitter.com/infobae", BASE)).toBeNull();
    expect(normalizeUrl("https://ads.example.com/x", BASE)).toBeNull();
  });

  it("rechaza esquemas no http", () => {
    expect(normalizeUrl("mailto:info@infobae.com", BASE)).toBeNull();
    expect(normalizeUrl("javascript:void(0)", BASE)).toBeNull();
  });

  it("limpia hash y parámetros de tracking, preserva los demás", () => {
    expect(normalizeUrl("/nota/?utm_source=tw&utm_medium=web&id=5#comentarios", BASE)).toBe(
      "https://www.infobae.com/nota/?id=5",
    );
  });

  it("rechaza vacío y undefined", () => {
    expect(normalizeUrl("", BASE)).toBeNull();
    expect(normalizeUrl(undefined, BASE)).toBeNull();
  });
});
