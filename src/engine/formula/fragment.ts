/**
 * F9 su porzione di formula (BUILD SPEC §3.1, "killer feature per il debug").
 *
 * In Excel si seleziona un pezzo di formula in edit mode, si preme F9 e quel
 * pezzo diventa il suo valore. La selezione dell'utente e' quasi sempre
 * sintatticamente sbilenca (`SUM(A1:A5)/B` selezionato a mano), quindi il primo
 * lavoro e' ESPANDERLA alla sotto-espressione completa piu' piccola che la contiene.
 *
 * Qui non si valuta nulla: la valutazione e' di HyperFormula, via
 * `hf.calculateFormula('=' + expression, sheetId)`. Questo modulo produce solo
 * il frammento e il punto in cui reinserire il risultato.
 */

import { flattenAst, nodeSpan, type FormulaNode } from './ast';
import { parseFormula } from './parser';
import { ERROR_LITERALS } from './tokenizer';

export interface FragmentSelection {
  /** Offset iniziale nel testo originale, incluso. */
  readonly start: number;
  /** Offset finale, escluso. */
  readonly end: number;
  /** Sotto-espressione pronta per `hf.calculateFormula('=' + expression, sheetId)`. */
  readonly expression: string;
}

const WS_RE = /[ \t\r\n]/;

/** Toglie gli spazi ai bordi dello span: il frammento deve essere l'espressione, non il contorno. */
function trimSpan(text: string, start: number, end: number): { start: number; end: number } {
  let s = start;
  let e = end;
  while (s < e && WS_RE.test(text.charAt(s))) s += 1;
  while (e > s && WS_RE.test(text.charAt(e - 1))) e -= 1;
  return { start: s, end: e };
}

/** Nodi che hanno senso come frammento valutabile: i segnaposto no. */
function isEvaluable(n: FormulaNode): boolean {
  return n.kind !== 'Missing' && n.end > n.start;
}

/**
 * Espande la selezione alla sotto-espressione sintatticamente completa piu'
 * piccola che la contiene.
 *
 * Con selezione vuota si usa il nodo sotto il cursore; se il cursore e' fuori da
 * ogni nodo (per esempio prima del `=`), si ricade sull'intera formula, che e'
 * cio' che Excel valuta premendo F9 senza selezione.
 *
 * @returns `undefined` se non c'e' nulla da valutare (testo vuoto o non parsificabile).
 */
export function selectFragment(
  text: string,
  selStart: number,
  selEnd: number,
): FragmentSelection | undefined {
  const lo = Math.max(0, Math.min(selStart, selEnd));
  const hi = Math.min(text.length, Math.max(selStart, selEnd));

  const { ast } = parseFormula(text);
  if (!ast) return undefined;

  const nodes = flattenAst(ast).filter(isEvaluable);
  if (nodes.length === 0) return undefined;

  // La selezione dell'utente puo' includere spazi ai bordi: si restringe prima
  // di cercare, altrimenti `  A1 ` non risulterebbe contenuta in `A1`.
  const want = trimSpan(text, lo, hi);
  const target = want.end > want.start ? want : { start: lo, end: lo };

  let best: FormulaNode | undefined;
  for (const n of nodes) {
    if (n.start > target.start || n.end < target.end) continue;
    if (!best || nodeSpan(n) < nodeSpan(best)) best = n;
  }

  // Cursore fuori da ogni nodo: si valuta tutta la formula, come Excel.
  const chosen = best ?? ast;
  const span = trimSpan(text, chosen.start, chosen.end);
  if (span.end <= span.start) return undefined;

  return { start: span.start, end: span.end, expression: text.slice(span.start, span.end) };
}

/**
 * Sostituisce il frammento con il suo valore, come F9 in edit mode.
 * `valueText` deve gia' essere in sintassi formula: usa `formatFragmentValue`.
 */
export function replaceFragment(
  text: string,
  start: number,
  end: number,
  valueText: string,
): string {
  return text.slice(0, start) + valueText + text.slice(end);
}

export interface FragmentReplacement {
  readonly text: string;
  readonly selStart: number;
  readonly selEnd: number;
}

/**
 * Come `replaceFragment`, ma restituisce anche la selezione: dopo F9 Excel lascia
 * evidenziato il valore appena inserito, cosi' una seconda F9 (o Ctrl+Z) sa su cosa agire.
 */
export function replaceFragmentWithSelection(
  text: string,
  start: number,
  end: number,
  valueText: string,
): FragmentReplacement {
  return {
    text: replaceFragment(text, start, end, valueText),
    selStart: start,
    selEnd: start + valueText.length,
  };
}

/**
 * Converte un valore calcolato nella sua forma LETTERALE dentro una formula,
 * come fa Excel scrivendo il risultato di F9:
 *  - il testo va fra doppi apici, con `"` raddoppiato;
 *  - i booleani in maiuscolo;
 *  - gli errori restano tali e quali;
 *  - `null` (cella vuota) diventa `0`, che e' il valore che Excel sostituisce.
 */
export function formatFragmentValue(value: unknown): string {
  if (value === null || value === undefined) return '0';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '#NUM!';
  if (typeof value === 'string') {
    // Gli errori non vanno quotati, altrimenti F9 trasformerebbe un #DIV/0! nel
    // TESTO "#DIV/0!". Il confronto e' con l'elenco chiuso dei literal di errore
    // e non con una forma generica `#...`: il testo di una cella puo' benissimo
    // essere `#hashtag` o `#1`, e lasciarlo senza apici produrrebbe un frammento
    // che non e' nemmeno una formula valida.
    if (ERROR_LITERALS.includes(value.toUpperCase())) return value;
    return `"${value.replace(/"/g, '""')}"`;
  }
  if (Array.isArray(value)) {
    // Array constant: righe separate da `;`, celle da `,`.
    const rows = (value as unknown[]).map((row) =>
      Array.isArray(row)
        ? (row as unknown[]).map(formatFragmentValue).join(',')
        : formatFragmentValue(row),
    );
    return `{${rows.join(';')}}`;
  }
  return String(value);
}
