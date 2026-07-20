import { keywordVariants } from "./keyword-variants";

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/** Baja a minúsculas y elimina tildes/diacríticos carácter a carácter (mantiene el largo). */
function foldChar(ch: string): string {
  const decomposed = ch.normalize("NFD");
  const base = decomposed[0] ?? ch;
  return base.toLowerCase();
}

function isLetterOrDigit(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[\p{L}\p{N}]/u.test(ch);
}

/**
 * Divide un título en segmentos marcando dónde matchean las keywords del usuario,
 * de forma case- y acento-insensible y por palabra completa ("dolar" matchea "Dólar",
 * pero "gestión" NO matchea dentro de "autogestión"). Cada keyword se expande a
 * sus variantes de plural/singular (keywordVariants), el mismo criterio con el
 * que filtra my_feed: "dólar" también resalta "dólares". Pensado para resaltar
 * en la UI sin usar dangerouslySetInnerHTML.
 */
export function highlightTitle(title: string, keywords: string[]): HighlightSegment[] {
  const chars = [...title];
  const folded = chars.map(foldChar);
  const foldedTitle = folded.join("");
  const matched = new Array<boolean>(chars.length).fill(false);

  for (const keyword of keywords.flatMap(keywordVariants)) {
    const foldedKeyword = [...keyword.trim()].map(foldChar).join("");
    if (!foldedKeyword) continue;

    let from = 0;
    while (true) {
      const idx = foldedTitle.indexOf(foldedKeyword, from);
      if (idx === -1) break;
      const end = idx + foldedKeyword.length;

      const beforeOk = !isLetterOrDigit(folded[idx - 1]);
      const afterOk = !isLetterOrDigit(folded[end]);
      if (beforeOk && afterOk) {
        for (let i = idx; i < end; i++) matched[i] = true;
      }
      from = idx + 1;
    }
  }

  const segments: HighlightSegment[] = [];
  for (let i = 0; i < chars.length; i++) {
    const match = matched[i] ?? false;
    const last = segments[segments.length - 1];
    if (last && last.match === match) {
      last.text += chars[i];
    } else {
      segments.push({ text: chars[i]!, match });
    }
  }
  return segments;
}
