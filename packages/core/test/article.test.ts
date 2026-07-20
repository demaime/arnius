import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PORTALS, decodeHtml, extractArticleData } from "../src";

const FIXTURES = join(__dirname, "fixtures", "article");

// Las notas fixture se descargaron el 17/07/2026; usamos ese "ahora" para
// que los formatos relativos ("hace 2 horas") sean deterministas.
const NOW = new Date("2026-07-17T15:00:00.000Z");

// Qué fixtures traen firma utilizable (personal o "Redacción"). Las que no,
// validan los filtros de basura (Organization, créditos de foto, dominios).
// Si se recapturan fixtures, actualizar este mapa.
const FIXTURE_HAS_AUTHOR: Record<string, boolean> = {
  infobae: false,
  clarin: true,
  lanacion: false,
  perfil: true,
  pagina12: false,
  ambito: true,
  cronista: true,
  lpo: true,
  letrap: true,
  cenital: true,
  derechadiario: true,
};

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

      if (FIXTURE_HAS_AUTHOR[portal.slug]) {
        it("extrae la firma de la nota", () => {
          expect(data.author).not.toBeNull();
          expect((data.author as string).length).toBeLessThanOrEqual(120);
          expect(data.author).not.toContain("�");
          expect(data.author).not.toMatch(/Ã[©³±­]/);
          expect(data.author).not.toMatch(/^por\s/i);
          expect(data.author).not.toMatch(/https?:|@/);
        });
      } else {
        it("descarta firmas basura (sin autor)", () => {
          expect(data.author).toBeNull();
        });
      }
    });
  }
});
