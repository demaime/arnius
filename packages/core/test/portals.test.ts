import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PORTALS, decodeHtml, extractFrontPageItems } from "../src";

const FIXTURES = join(__dirname, "fixtures", "front");

function loadFixture(slug: string, encoding: "utf-8" | "latin1"): string {
  const buffer = readFileSync(join(FIXTURES, `${slug}.html`));
  return decodeHtml(buffer, encoding);
}

describe("extracción de portadas (fixtures reales)", () => {
  it("hay 11 portales configurados", () => {
    expect(PORTALS).toHaveLength(11);
  });

  for (const portal of PORTALS) {
    describe(portal.slug, () => {
      const html = loadFixture(portal.slug, portal.encoding);
      const items = extractFrontPageItems(html, portal);

      it("extrae una cantidad razonable de notas", () => {
        expect(items.length).toBeGreaterThanOrEqual(10);
      });

      it("todas las notas tienen URL absoluta del propio portal", () => {
        const baseHost = new URL(portal.baseUrl).hostname.replace(/^www\./, "");
        for (const item of items) {
          const url = new URL(item.url);
          expect(url.protocol).toMatch(/^https?:$/);
          expect(url.hostname.replace(/^www\./, "")).toBe(baseHost);
        }
      });

      it("todas las notas tienen título no trivial", () => {
        for (const item of items) {
          expect(item.title.length).toBeGreaterThanOrEqual(4);
        }
      });

      it("no hay URLs ni títulos duplicados", () => {
        expect(new Set(items.map((i) => i.url)).size).toBe(items.length);
        expect(new Set(items.map((i) => i.title)).size).toBe(items.length);
      });

      it("no extrae textos con caracteres mal decodificados", () => {
        for (const item of items) {
          expect(item.title).not.toContain("�"); // "�" indica encoding equivocado
          expect(item.title).not.toMatch(/Ã[©³±­]/); // latin1 leído como utf-8
        }
      });
    });
  }
});
