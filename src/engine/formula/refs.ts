/**
 * Estrazione e analisi dei riferimenti: e' la superficie su cui poggia il grader
 * (check `mustReference`, `mustNotContainLiteral`, `anchoring`, `mustUseFunction`,
 * `consistentRow`) e la colorazione della barra della formula.
 */

import {
  LAST_COL,
  LAST_ROW,
  MAX_COLS,
  MAX_ROWS,
  formatCellRef,
  formatRangeRef,
  normalizeRange,
  parseCellRef,
  type ParsedRangeRef,
  type ParsedRef,
  type RangeCoords,
} from '../address';
import {
  flattenAst,
  type CellRefNode,
  type FormulaNode,
  type RangeRefNode,
} from './ast';
import { parseFormula } from './parser';
import { isOperandEnd, isOperandStart, tokenize, type Token } from './tokenizer';

// ---------------------------------------------------------------------------
// Raccolta dei riferimenti
// ---------------------------------------------------------------------------

export interface RefAnchors {
  readonly startRowAbs: boolean;
  readonly startColAbs: boolean;
  readonly endRowAbs: boolean;
  readonly endColAbs: boolean;
}

export interface RefOccurrence {
  readonly kind: 'cell' | 'range';
  /** Testo esatto nella formula, prefisso foglio e `$` compresi. */
  readonly text: string;
  readonly start: number;
  readonly end: number;
  /** Foglio esplicito, se il riferimento e' qualificato. */
  readonly sheet?: string;
  /** Celle coperte, normalizzate (`top<=bottom`, `left<=right`). Per `A:A` copre tutta la colonna. */
  readonly area: RangeCoords;
  readonly anchors: RefAnchors;
  readonly wholeColumn: boolean;
  readonly wholeRow: boolean;
  readonly node: CellRefNode | RangeRefNode;
}

function occurrenceFromCell(node: CellRefNode): RefOccurrence {
  const r = node.ref;
  return {
    kind: 'cell',
    text: node.text,
    start: node.start,
    end: node.end,
    ...(r.sheet !== undefined ? { sheet: r.sheet } : {}),
    area: { top: r.row, left: r.col, bottom: r.row, right: r.col },
    anchors: {
      startRowAbs: r.rowAbs,
      startColAbs: r.colAbs,
      endRowAbs: r.rowAbs,
      endColAbs: r.colAbs,
    },
    wholeColumn: false,
    wholeRow: false,
    node,
  };
}

function occurrenceFromRange(node: RangeRefNode): RefOccurrence {
  const r = node.range;
  return {
    kind: 'range',
    text: node.text,
    start: node.start,
    end: node.end,
    ...(r.sheet !== undefined ? { sheet: r.sheet } : {}),
    area: normalizeRange({
      top: r.start.row,
      left: r.start.col,
      bottom: r.end.row,
      right: r.end.col,
    }),
    anchors: {
      startRowAbs: r.start.rowAbs,
      startColAbs: r.start.colAbs,
      endRowAbs: r.end.rowAbs,
      endColAbs: r.end.colAbs,
    },
    wholeColumn: r.wholeColumn,
    wholeRow: r.wholeRow,
    node,
  };
}

/** Tutti i riferimenti dell'albero, in ordine di apparizione nel testo. */
export function collectRefs(ast: FormulaNode | undefined): RefOccurrence[] {
  const out: RefOccurrence[] = [];
  for (const n of flattenAst(ast)) {
    if (n.kind === 'CellRef') out.push(occurrenceFromCell(n));
    else if (n.kind === 'RangeRef') out.push(occurrenceFromRange(n));
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

/** Comodita': dal testo direttamente ai riferimenti. */
export function collectRefsFromText(text: string): RefOccurrence[] {
  return collectRefs(parseFormula(text).ast);
}

/**
 * Nomi di funzione usati, in MAIUSCOLO, senza duplicati, in ordine di prima
 * apparizione. E' la forma che serve a `mustUseFunction` / `mustNotUseFunction`.
 */
export function collectFunctions(ast: FormulaNode | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of flattenAst(ast)) {
    if (n.kind === 'FunctionCall' && !seen.has(n.nameUpper)) {
      seen.add(n.nameUpper);
      out.push(n.nameUpper);
    }
  }
  return out;
}

export interface NumericLiteral {
  readonly value: number;
  readonly text: string;
  readonly start: number;
  readonly end: number;
  /**
   * Vero se il literal e' preceduto da un `-` unario: `mustNotContainLiteral`
   * deve poter distinguere `-1` da `1`, altrimenti `except: [1]` lascerebbe
   * passare anche il `-1` di uno sconto battuto a mano.
   */
  readonly negated: boolean;
}

/** Tutti i literal numerici, con posizione, in ordine di apparizione. */
export function collectNumericLiterals(ast: FormulaNode | undefined): NumericLiteral[] {
  const out: NumericLiteral[] = [];
  const negatedNodes = new Set<FormulaNode>();
  for (const n of flattenAst(ast)) {
    if (n.kind === 'UnaryOp' && n.op === '-') negatedNodes.add(n.operand);
  }
  for (const n of flattenAst(ast)) {
    if (n.kind === 'NumberLit') {
      out.push({
        value: n.value,
        text: n.text,
        start: n.start,
        end: n.end,
        negated: negatedNodes.has(n),
      });
    }
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

// ---------------------------------------------------------------------------
// referencesCell
// ---------------------------------------------------------------------------

export interface ReferencesCellOptions {
  /** Un range che CONTIENE la cella soddisfa la richiesta. Default: true. */
  readonly allowViaRange?: boolean;
  /**
   * Foglio a cui appartiene la formula. Serve a decidere se un riferimento
   * non qualificato (`D24`) punta al foglio del target (`Model!D24`).
   */
  readonly contextSheet?: string;
}

function sheetsMatch(
  refSheet: string | undefined,
  targetSheet: string | undefined,
  contextSheet: string | undefined,
): boolean {
  const a = (refSheet ?? contextSheet)?.toLowerCase();
  const b = (targetSheet ?? contextSheet)?.toLowerCase();
  // Se uno dei due resta ignoto non si puo' escludere il match: meglio
  // permissivi che rifiutare una risposta corretta per un dettaglio di contesto.
  if (a === undefined || b === undefined) return true;
  return a === b;
}

/**
 * La formula punta a `target`? `target` e' in notazione A1, eventualmente
 * qualificata (`Model!D24`); gli eventuali `$` sono ignorati (l'ancoraggio si
 * verifica con il check dedicato, non qui).
 */
export function referencesCell(
  ast: FormulaNode | undefined,
  target: string,
  opts: ReferencesCellOptions = {},
): boolean {
  const t = parseCellRef(target);
  if (!t) return false;
  const allowViaRange = opts.allowViaRange !== false;

  for (const ref of collectRefs(ast)) {
    if (!sheetsMatch(ref.sheet, t.sheet, opts.contextSheet)) continue;
    const { area } = ref;
    const isSingle = area.top === area.bottom && area.left === area.right;
    if (isSingle) {
      if (area.top === t.row && area.left === t.col) return true;
      continue;
    }
    if (!allowViaRange) continue;
    if (t.row >= area.top && t.row <= area.bottom && t.col >= area.left && t.col <= area.right) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Colori della barra della formula
// ---------------------------------------------------------------------------

export interface ColoredRef extends RefOccurrence {
  /** Indice stabile: due riferimenti alla stessa area ricevono lo stesso colore. */
  readonly colorIndex: number;
}

/**
 * Assegna un indice colore per AREA referenziata, in ordine di prima apparizione.
 * Chiave deliberatamente insensibile agli ancoraggi: nella barra della formula
 * `A1` e `$A$1` sono la stessa cella e devono avere lo stesso colore.
 *
 * @param paletteSize se indicato, gli indici ciclano su una tavolozza finita.
 */
export function assignRefColors(
  refs: readonly RefOccurrence[],
  paletteSize?: number,
): ColoredRef[] {
  const index = new Map<string, number>();
  return refs.map((r) => {
    const key = `${(r.sheet ?? '').toLowerCase()}|${r.area.top},${r.area.left},${r.area.bottom},${r.area.right}`;
    let idx = index.get(key);
    if (idx === undefined) {
      idx = index.size;
      index.set(key, idx);
    }
    return { ...r, colorIndex: paletteSize && paletteSize > 0 ? idx % paletteSize : idx };
  });
}

// ---------------------------------------------------------------------------
// shiftFormula — fill down / fill right / consistentRow
// ---------------------------------------------------------------------------

const REF_ERROR = '#REF!';

function shiftedRef(ref: ParsedRef, dRow: number, dCol: number): ParsedRef | undefined {
  const row = ref.rowAbs ? ref.row : ref.row + dRow;
  const col = ref.colAbs ? ref.col : ref.col + dCol;
  if (row < 0 || row >= MAX_ROWS || col < 0 || col >= MAX_COLS) return undefined;
  return { ...ref, row, col };
}

function shiftRefText(tok: Token, dRow: number, dCol: number): string {
  if (tok.type === 'cell' && tok.cell) {
    const moved = shiftedRef(tok.cell, dRow, dCol);
    return moved ? formatCellRef(moved) : REF_ERROR;
  }
  if (tok.type === 'range' && tok.range) {
    const r = tok.range;
    // Su `A:A` le righe sono implicite e non si toccano; su `3:3` viceversa.
    const dr = r.wholeColumn ? 0 : dRow;
    const dc = r.wholeRow ? 0 : dCol;
    const start = shiftedRef(r.start, dr, dc);
    const end = shiftedRef(r.end, dr, dc);
    // Excel non spezza un range: se un estremo esce, TUTTO il riferimento
    // diventa #REF!, non solo la meta' invalida.
    if (!start || !end) return REF_ERROR;
    const moved: ParsedRangeRef = { ...r, start, end };
    return formatRangeRef(moved);
  }
  return tok.text;
}

/**
 * Trasla i riferimenti RELATIVI di una formula; quelli ancorati con `$` restano
 * fermi. E' esattamente cio' che fa Excel copiando una formula: fill down,
 * fill right e il check `consistentRow` passano tutti di qui.
 *
 * Lavora sui token e non sull'AST, cosi' tutto il resto della stringa (spazi,
 * maiuscole/minuscole delle funzioni, commenti impliciti) resta identico.
 */
export function shiftFormula(formula: string, dRow: number, dCol: number): string {
  if (dRow === 0 && dCol === 0) return formula;
  const tokens = tokenize(formula);
  let out = '';
  for (const t of tokens) {
    out += t.type === 'cell' || t.type === 'range' ? shiftRefText(t, dRow, dCol) : t.text;
  }
  return out;
}

// ---------------------------------------------------------------------------
// normalizeForComparison
// ---------------------------------------------------------------------------

/**
 * Forma canonica di una formula, per confrontarne due strutturalmente:
 *  - il `=` iniziale viene rimosso;
 *  - nomi di funzione, booleani, errori, lettere di colonna e named range in MAIUSCOLO
 *    (in Excel sono tutti case-insensitive);
 *  - i literal numerici passano per `Number`, cosi' `1.50` e `1.5` coincidono;
 *  - gli spazi bianchi spariscono, TRANNE quelli che sono l'operatore di
 *    intersezione, che diventano un singolo spazio;
 *  - il contenuto delle stringhe resta intatto: li' le maiuscole contano.
 */
export function normalizeForComparison(text: string): string {
  const tokens = tokenize(text);
  let out = '';

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'assign') continue;
    if (t.type === 'ws') {
      const prev = prevSignificant(tokens, i);
      const next = nextSignificant(tokens, i);
      // Solo fra due operandi lo spazio significa qualcosa. Dopo un nome di
      // funzione e' cosmetico (`SUM (A1)` == `SUM(A1)`).
      if (prev && next && prev.type !== 'func' && isOperandEnd(prev) && isOperandStart(next)) {
        out += ' ';
      }
      continue;
    }
    out += canonicalTokenText(t);
  }

  return out;
}

function prevSignificant(tokens: readonly Token[], i: number): Token | undefined {
  for (let k = i - 1; k >= 0; k--) if (tokens[k].type !== 'ws') return tokens[k];
  return undefined;
}

function nextSignificant(tokens: readonly Token[], i: number): Token | undefined {
  for (let k = i + 1; k < tokens.length; k++) if (tokens[k].type !== 'ws') return tokens[k];
  return undefined;
}

function canonicalTokenText(t: Token): string {
  switch (t.type) {
    case 'number':
      return String(t.num ?? Number(t.text));
    case 'string':
      return t.text;
    case 'bool':
    case 'error':
    case 'func':
    case 'name':
      return t.text.toUpperCase();
    case 'cell':
      return t.cell ? formatCellRef(t.cell) : t.text.toUpperCase();
    case 'range':
      return t.range ? formatRangeRef(t.range) : t.text.toUpperCase();
    default:
      return t.text;
  }
}

/** Due formule sono strutturalmente identiche? */
export function formulasEquivalent(a: string, b: string): boolean {
  return normalizeForComparison(a) === normalizeForComparison(b);
}

/** Un range a riga/colonna intera copre l'intero foglio in una direzione: utile ai messaggi del grader. */
export function isWholeSheetSpan(area: RangeCoords): boolean {
  return (
    (area.top === 0 && area.bottom === LAST_ROW) || (area.left === 0 && area.right === LAST_COL)
  );
}
