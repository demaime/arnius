import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PORTALS, decodeHtml, extractArticleData } from "../src";

const FIXTURES = join(__dirname, "fixtures", "article");

// Las notas fixture se descargaron el 17/07/2026; usamos ese "ahora" para
// que los formatos relativos ("hace 2 horas") sean deterministas.
const NOW = new Date("2026-07-17T15:00:00.000Z");

describe("extracción de nota individual (fixtures reales)", () => {
  for (const portal of PORTALS) {
    describe(portal.slug, () => {
      const buffer = readFileSync(join(FIXTURES, `${portal.slug}.html`));
      const html = decodeHtml(buffer, portal.encoding);
      const data = extractArticleData(html, portal, NOW);

      it("extrae la fecha de publicación", () => {
        expect(data.publishedAt).not.toBeNull();
        const date = new Date(data.publishedAt as string);
        // Cordura: la nota es de julio de 2026 (± unos días).
        expect(date.getTime()).toBeGreaterThan(new Date("2026-06-01").getTime());
        expect(date.getTime()).toBeLessThan(new Date("2026-07-19").getTime());
      });

      it("extrae un resumen legible (vista previa)", () => {
        expect(data.summary).not.toBeNull();
        expect((data.summary as string).length).toBeGreaterThanOrEqual(60);
        expect(data.summary).not.toContain("�");
        expect(data.summary).not.toMatch(/Ã[©³±­]/);
      });
    });
  }
});
