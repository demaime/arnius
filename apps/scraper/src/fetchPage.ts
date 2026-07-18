import { decodeHtml, type PortalEncoding } from "@arnius/core";

// Headers de navegador completos: algunos portales (La Derecha Diario)
// devuelven un shell vacío si falta Accept / Accept-Language.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9",
};

export async function fetchPage(url: string, encoding: PortalEncoding): Promise<string> {
  const response = await fetch(url, {
    headers: HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} en ${url}`);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  return decodeHtml(buffer, encoding);
}
