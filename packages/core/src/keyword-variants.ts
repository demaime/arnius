/**
 * Variantes de plural/singular de una keyword según las reglas regulares del
 * español. Es el punto medio entre el match exacto (que perdía "dólares" con
 * la keyword "dólar") y el stemming (que traía "peleas" con la keyword "pele"):
 * solo se generan flexiones de número, nunca derivaciones.
 *
 * ESTA es la implementación canónica del criterio de matching: la web guarda
 * el resultado en `user_keywords.variants` (lo consume `my_feed`) y el
 * highlight lo usa al resaltar. El backfill de la migración 0011 y los seeds
 * del trigger de signup espejan estas reglas — mantener en sincronía.
 */

const VOWELS = new Set(["a", "e", "i", "o", "u", "á", "é", "í", "ó", "ú"]);

/** Tope de variantes por keyword (las frases combinan variantes por palabra). */
const MAX_VARIANTS = 16;

/** Mínimo de letras para flexionar y para aceptar un singular generado
 *  ("veces" no debe generar "ve"). */
const MIN_WORD = 3;

function wordVariants(word: string): string[] {
  const out = [word];
  if (word.length < MIN_WORD) return out;

  const last = word[word.length - 1]!;
  if (last === "z") {
    // vez → veces
    out.push(word.slice(0, -1) + "ces");
  } else if (last === "s") {
    // Puede ser plural ("casas") o singular en s ("mes", "país"): probar
    // singulares Y el plural en -es. Los sobrantes no molestan.
    if (word.endsWith("ces")) out.push(word.slice(0, -3) + "z"); // veces → vez
    if (word.endsWith("es")) out.push(word.slice(0, -2)); // dólares → dólar
    out.push(word.slice(0, -1)); // casas → casa, bases → base
    out.push(word + "es"); // mes → meses, país → países
  } else if (VOWELS.has(last)) {
    out.push(word + "s"); // pelea → peleas
    if (last === "í" || last === "ú") out.push(word + "es"); // rubí → rubíes
  } else {
    out.push(word + "es"); // dólar → dólares
    out.push(word + "s"); // préstamos: show → shows
  }

  // Los sobrantes agramaticales ("dólars", "eleccione") son inofensivos: no
  // aparecen en títulos reales. Los singulares cortos sí molestan ("ve").
  return [...new Set(out.filter((v) => v === word || v.length >= MIN_WORD))];
}

/**
 * Variantes completas de una keyword (la forma exacta va primera). Para
 * frases, combina las variantes de cada palabra ("reforma laboral" genera
 * "reformas laborales"), con tope MAX_VARIANTS.
 */
export function keywordVariants(keyword: string): string[] {
  const normalized = keyword.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normalized) return [];

  let combos: string[] = [""];
  for (const word of normalized.split(" ")) {
    const variants = wordVariants(word);
    const next: string[] = [];
    for (const combo of combos) {
      for (const variant of variants) {
        next.push(combo ? `${combo} ${variant}` : variant);
      }
    }
    combos = next;
  }

  return [...new Set(combos)].slice(0, MAX_VARIANTS);
}
