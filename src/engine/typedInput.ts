/**
 * Interpretazione di cio' che l'utente digita in una cella, in funzione della lingua.
 *
 * Il motore (HyperFormula) parla una sola convenzione: punto decimale, nessun
 * separatore delle migliaia, virgola come separatore degli argomenti. L'utente
 * invece scrive come scrive nella sua lingua: in italiano `0,15`, `1.250,50`,
 * `15,5%`; in inglese `1,250.50`. Prima di questo modulo `0,15` diventava testo
 * in silenzio e `1.000` valeva 1, e un livello poteva essere perso battendo il
 * numero giusto.
 *
 * Regole:
 *  - VALORI: il separatore decimale della lingua e' sempre accettato. L'altro
 *    simbolo vale come separatore delle migliaia SOLO se forma gruppi validi di
 *    tre cifre dopo un primo gruppo che non comincia per zero (`1.500`,
 *    `12,345,678`); altrimenti e' anch'esso un decimale (`0.15` in italiano e
 *    `0,15` in inglese restano 0,15). Nessuna risposta giusta scritta "nell'altra
 *    convenzione" viene trasformata in un numero diverso in modo sorprendente.
 *  - FORMULE: si conservano nella sintassi internazionale (`=IF(A1>0,1,0)`).
 *    Solo se la formula cosi' com'e' NON e' valida si prova a ripararla: con
 *    `;` come separatore degli argomenti (sintassi di Excel in italiano) le
 *    virgole diventano decimali; senza `;`, una virgola fra due cifre di un
 *    numero letterale (`0,0001`) diventa un punto. Una formula valida non viene
 *    mai riscritta.
 */

export type NumberLocale = 'it' | 'en';

const SEPARATORS: Record<NumberLocale, { decimal: string; group: string }> = {
  it: { decimal: ',', group: '.' },
  en: { decimal: '.', group: ',' },
};

/**
 * Converte un numero scritto dall'utente nella forma che il motore riconosce
 * (`1234.5`, `15.5%`). Restituisce `null` se il testo non e' un numero.
 */
export function normalizeNumberText(text: string, locale: NumberLocale): string | null {
  let s = text.trim();
  if (s === '') return null;

  let negative = false;
  // Notazione contabile: (1.234) e' un negativo, come in Excel.
  const paren = /^\((.*)\)$/.exec(s);
  if (paren) {
    negative = true;
    s = paren[1].trim();
  }
  // Valuta: il simbolo si ignora, il numero resta.
  s = s.replace(/^[€$]\s*/, '').replace(/\s*[€$]$/, '');
  if (s.startsWith('-')) {
    if (negative) return null;
    negative = true;
    s = s.slice(1).trim();
  } else if (s.startsWith('+')) {
    s = s.slice(1).trim();
  }
  let percent = false;
  if (s.endsWith('%')) {
    percent = true;
    s = s.slice(0, -1).trim();
  }
  if (!/^[0-9.,]+$/.test(s) || !/[0-9]/.test(s)) return null;

  const { decimal, group } = SEPARATORS[locale];
  const esc = (c: string) => (c === '.' ? '\\.' : c);
  let digits: string | null = null;

  // 1. Forma "piena" della lingua: migliaia col separatore di gruppo, decimali col separatore decimale.
  const full = new RegExp(`^[1-9][0-9]{0,2}(${esc(group)}[0-9]{3})+(${esc(decimal)}[0-9]+)?$`);
  if (full.test(s)) {
    digits = s.split(group).join('').replace(decimal, '.');
  } else if (new RegExp(`^[0-9]*(${esc(decimal)}[0-9]*)?$`).test(s) && /[0-9]/.test(s)) {
    // 2. Solo il separatore decimale della lingua (o nessuno).
    digits = s.replace(decimal, '.');
  } else if (new RegExp(`^[0-9]*${esc(group)}[0-9]+$`).test(s)) {
    // 3. Un solo "altro" simbolo che non forma migliaia valide: e' un decimale.
    digits = s.replace(group, '.');
  } else {
    // 4. Forma piena dell'ALTRA lingua (es. 1,234.50 digitato in italiano).
    const other = SEPARATORS[locale === 'it' ? 'en' : 'it'];
    const otherFull = new RegExp(
      `^[1-9][0-9]{0,2}(${esc(other.group)}[0-9]{3})+(${esc(other.decimal)}[0-9]+)?$`,
    );
    if (otherFull.test(s)) digits = s.split(other.group).join('').replace(other.decimal, '.');
  }
  if (digits === null) return null;
  if (digits.startsWith('.')) digits = `0${digits}`;
  if (digits.endsWith('.')) digits = digits.slice(0, -1);
  if (!/^[0-9]+(\.[0-9]+)?$/.test(digits)) return null;
  return `${negative ? '-' : ''}${digits}${percent ? '%' : ''}`;
}

/** Applica una trasformazione solo ai tratti di formula fuori dalle stringhe letterali. */
function outsideStrings(formula: string, fn: (chunk: string) => string): string {
  const parts = formula.split('"');
  return parts.map((p, i) => (i % 2 === 0 ? fn(p) : p)).join('"');
}

/** Le virgole fra due cifre di un numero letterale (non di un riferimento come A1) diventano punti. */
function decimalCommasToDots(chunk: string): string {
  return chunk.replace(/(^|[^A-Za-z0-9_$.])([0-9]+),([0-9]+)/g, '$1$2.$3');
}

/**
 * Normalizza il testo digitato in una cella.
 * `isValidFormula` dice se una formula e' sintatticamente accettata dal motore.
 */
export function normalizeTypedInput(
  text: string,
  locale: NumberLocale,
  isValidFormula: (formula: string) => boolean,
): string {
  if (text.startsWith("'")) return text; // testo forzato, come in Excel
  if (!text.startsWith('=')) {
    return normalizeNumberText(text, locale) ?? text;
  }
  if (isValidFormula(text)) return text;

  // Sintassi di Excel in italiano: ; separa gli argomenti, la virgola e' decimale.
  if (text.split('"').some((c, i) => i % 2 === 0 && c.includes(';'))) {
    const converted = outsideStrings(text, (c) => c.replace(/,/g, '.').replace(/;/g, ','));
    if (isValidFormula(converted)) return converted;
  }
  const repaired = outsideStrings(text, decimalCommasToDots);
  if (repaired !== text && isValidFormula(repaired)) return repaired;
  return text;
}

/** Il formato e' una percentuale? (un % fuori dalle parti fra virgolette) */
export function isPercentFormat(numFmt: string | undefined): boolean {
  if (!numFmt) return false;
  return numFmt.split('"').some((part, i) => i % 2 === 0 && part.includes('%'));
}

/**
 * Le due regole di Excel sulle percentuali digitate, applicate al testo gia'
 * normalizzato da `normalizeTypedInput`:
 *
 *  - un numero scritto col simbolo % in una cella che non e' in percentuale le
 *    da' il formato percentuale (con tanti decimali quanti ne sono stati scritti);
 *  - "inserimento automatico delle percentuali" (attivo di default): in una cella
 *    GIA' in percentuale, un numero scritto senza % vale per cento se e' >= 1 in
 *    valore assoluto (15 diventa 15%), resta com'e' se e' minore (0,15 e' 15%).
 *
 * La trappola del 1500% esiste quindi solo quando il formato arriva DOPO il numero.
 */
export function applyPercentEntry(
  normalized: string | null,
  cellNumFmt: string | undefined,
): { raw: string | null; numFmt?: string } {
  if (normalized === null || normalized.startsWith('=') || normalized.startsWith("'")) return { raw: normalized };
  const m = /^(-?)(\d+)(?:\.(\d+))?(%?)$/.exec(normalized);
  if (!m) return { raw: normalized };
  const [, , , decimali = '', percento] = m;
  if (percento) {
    if (isPercentFormat(cellNumFmt)) return { raw: normalized };
    const fmt = decimali.length === 0 ? '0%' : `0.${'0'.repeat(Math.min(decimali.length, 4))}%`;
    return { raw: normalized, numFmt: fmt };
  }
  if (isPercentFormat(cellNumFmt) && Math.abs(Number(normalized)) >= 1) {
    return { raw: `${normalized}%` };
  }
  return { raw: normalized };
}
