/**
 * Indirizzamento A1 — fondamenta di tutto il progetto.
 *
 * Convenzioni non negoziabili, valide in TUTTO il codebase:
 *  - righe e colonne sono SEMPRE 0-based internamente (riga 0 = "1", colonna 0 = "A");
 *  - i range sono SEMPRE inclusivi su entrambi gli estremi;
 *  - la conversione da/verso la notazione A1 avviene solo qui.
 *
 * Limiti Excel reali: 1.048.576 righe x 16.384 colonne (XFD). Servono davvero:
 * `Ctrl+Giu` da una colonna vuota in Excel atterra sull'ultima riga del foglio,
 * e la griglia deve riprodurlo.
 */

export const MAX_ROWS = 1_048_576;
export const MAX_COLS = 16_384;

export const LAST_ROW = MAX_ROWS - 1;
export const LAST_COL = MAX_COLS - 1;

/** Coordinata di cella, 0-based. */
export interface CellCoord {
  readonly row: number;
  readonly col: number;
}

/** Rettangolo inclusivo, 0-based. `top <= bottom`, `left <= right` sempre garantiti da `normalizeRange`. */
export interface RangeCoords {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

/** Riferimento a cella come compare in una formula, con gli ancoraggi. */
export interface ParsedRef {
  /** Nome foglio se il riferimento e' qualificato (`Model!D24`), altrimenti `undefined`. */
  readonly sheet?: string;
  readonly row: number;
  readonly col: number;
  readonly rowAbs: boolean;
  readonly colAbs: boolean;
}

/**
 * Riferimento a range in formula. Copre anche i riferimenti a colonna/riga intera
 * (`A:A`, `3:3`), che in Excel sono legittimi e vanno riconosciuti dal grader.
 */
export interface ParsedRangeRef {
  readonly sheet?: string;
  readonly start: ParsedRef;
  readonly end: ParsedRef;
  /** `A:A` — le righe sono implicite (0..LAST_ROW). */
  readonly wholeColumn: boolean;
  /** `3:3` — le colonne sono implicite (0..LAST_COL). */
  readonly wholeRow: boolean;
}

// ---------------------------------------------------------------------------
// Colonne <-> lettere
// ---------------------------------------------------------------------------

/** 0 -> "A", 25 -> "Z", 26 -> "AA", 16383 -> "XFD". */
export function colToLetters(col: number): string {
  if (!Number.isInteger(col) || col < 0) {
    throw new RangeError(`colToLetters: colonna non valida ${col}`);
  }
  let n = col;
  let out = '';
  while (n >= 0) {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  }
  return out;
}

/** "A" -> 0, "aa" -> 26, "XFD" -> 16383. Restituisce -1 se la stringa non e' una colonna valida. */
export function lettersToCol(letters: string): number {
  if (letters.length === 0 || letters.length > 3) return -1;
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    const code = letters.charCodeAt(i);
    const up = code >= 97 && code <= 122 ? code - 32 : code;
    if (up < 65 || up > 90) return -1;
    n = n * 26 + (up - 64);
  }
  return n - 1;
}

// ---------------------------------------------------------------------------
// Nomi foglio
// ---------------------------------------------------------------------------

/**
 * Un nome foglio va fra apici singoli se non e' un identificatore "semplice".
 * Regola Excel: servono gli apici se contiene spazi, punteggiatura, inizia con
 * una cifra, oppure sembra un riferimento di cella (`A1`, `XFD1048576`).
 */
export function sheetNameNeedsQuoting(name: string): boolean {
  if (name.length === 0) return true;
  if (!/^[A-Za-z_À-ɏ][A-Za-z0-9_.À-ɏ]*$/.test(name)) return true;
  // Un nome che coincide con un riferimento di cella va comunque quotato.
  const m = /^([A-Za-z]{1,3})([0-9]{1,7})$/.exec(name);
  if (m) {
    const col = lettersToCol(m[1]);
    const row = Number(m[2]) - 1;
    if (col >= 0 && col < MAX_COLS && row >= 0 && row < MAX_ROWS) return true;
  }
  // Anche R1C1 e i booleani sono riservati.
  if (/^(TRUE|FALSE|VERO|FALSO)$/i.test(name)) return true;
  return false;
}

/** Restituisce il nome foglio pronto per essere inserito in una formula (con apici se serve). */
export function quoteSheetName(name: string): string {
  if (!sheetNameNeedsQuoting(name)) return name;
  return `'${name.replace(/'/g, "''")}'`;
}

/** Inverso di `quoteSheetName`. */
export function unquoteSheetName(token: string): string {
  if (token.length >= 2 && token.startsWith("'") && token.endsWith("'")) {
    return token.slice(1, -1).replace(/''/g, "'");
  }
  return token;
}

// ---------------------------------------------------------------------------
// Parsing / formatting dei riferimenti
// ---------------------------------------------------------------------------

/** Parte "foglio!" opzionale: `Model!`, `'Deal Model'!`. */
const SHEET_PREFIX = String.raw`(?:(?<sheet>'(?:[^']|'')+'|[A-Za-z_À-ɏ][A-Za-z0-9_.À-ɏ]*)!)?`;
const CELL_BODY = String.raw`(?<colAbs>\$?)(?<col>[A-Za-z]{1,3})(?<rowAbs>\$?)(?<row>[0-9]{1,7})`;

const RE_CELL = new RegExp(`^${SHEET_PREFIX}${CELL_BODY}$`);

/**
 * Parsifica un riferimento a cella singola (`D24`, `$B$5`, `Model!D24`, `'Deal Model'!A1`).
 * Restituisce `undefined` se non e' un riferimento valido o esce dai limiti del foglio.
 */
export function parseCellRef(text: string): ParsedRef | undefined {
  const m = RE_CELL.exec(text.trim());
  if (!m || !m.groups) return undefined;
  const g = m.groups;
  const col = lettersToCol(g.col);
  const row = Number(g.row) - 1;
  if (col < 0 || col >= MAX_COLS) return undefined;
  if (row < 0 || row >= MAX_ROWS) return undefined;
  const sheet = g.sheet ? unquoteSheetName(g.sheet) : undefined;
  return {
    ...(sheet !== undefined ? { sheet } : {}),
    row,
    col,
    rowAbs: g.rowAbs === '$',
    colAbs: g.colAbs === '$',
  };
}

const RE_RANGE = new RegExp(`^${SHEET_PREFIX}${CELL_BODY}:${CELL_BODY.replace(/<(\w+)>/g, '<$1B>')}$`);
const RE_WHOLE_COL = new RegExp(
  `^${SHEET_PREFIX}(?<aAbs>\\$?)(?<a>[A-Za-z]{1,3}):(?<bAbs>\\$?)(?<b>[A-Za-z]{1,3})$`,
);
const RE_WHOLE_ROW = new RegExp(
  `^${SHEET_PREFIX}(?<aAbs>\\$?)(?<a>[0-9]{1,7}):(?<bAbs>\\$?)(?<b>[0-9]{1,7})$`,
);

/**
 * Parsifica un riferimento a range: `A1:B10`, `$A$1:$B$10`, `Model!A1:A5`, `A:A`, `3:3`.
 * Gli estremi NON vengono riordinati: `B10:A1` conserva l'ordine scritto dall'utente
 * (serve al grader per riconoscere range scritti al contrario).
 */
export function parseRangeRef(text: string): ParsedRangeRef | undefined {
  const t = text.trim();

  const m = RE_RANGE.exec(t);
  if (m && m.groups) {
    const g = m.groups;
    const startCol = lettersToCol(g.col);
    const endCol = lettersToCol(g.colB);
    const startRow = Number(g.row) - 1;
    const endRow = Number(g.rowB) - 1;
    if (startCol < 0 || endCol < 0 || startCol >= MAX_COLS || endCol >= MAX_COLS) return undefined;
    if (startRow < 0 || endRow < 0 || startRow >= MAX_ROWS || endRow >= MAX_ROWS) return undefined;
    const sheet = g.sheet ? unquoteSheetName(g.sheet) : undefined;
    return {
      ...(sheet !== undefined ? { sheet } : {}),
      start: { row: startRow, col: startCol, rowAbs: g.rowAbs === '$', colAbs: g.colAbs === '$' },
      end: { row: endRow, col: endCol, rowAbs: g.rowAbsB === '$', colAbs: g.colAbsB === '$' },
      wholeColumn: false,
      wholeRow: false,
    };
  }

  const mc = RE_WHOLE_COL.exec(t);
  if (mc && mc.groups) {
    const g = mc.groups;
    const a = lettersToCol(g.a);
    const b = lettersToCol(g.b);
    if (a < 0 || b < 0 || a >= MAX_COLS || b >= MAX_COLS) return undefined;
    const sheet = g.sheet ? unquoteSheetName(g.sheet) : undefined;
    return {
      ...(sheet !== undefined ? { sheet } : {}),
      start: { row: 0, col: a, rowAbs: false, colAbs: g.aAbs === '$' },
      end: { row: LAST_ROW, col: b, rowAbs: false, colAbs: g.bAbs === '$' },
      wholeColumn: true,
      wholeRow: false,
    };
  }

  const mr = RE_WHOLE_ROW.exec(t);
  if (mr && mr.groups) {
    const g = mr.groups;
    const a = Number(g.a) - 1;
    const b = Number(g.b) - 1;
    if (a < 0 || b < 0 || a >= MAX_ROWS || b >= MAX_ROWS) return undefined;
    const sheet = g.sheet ? unquoteSheetName(g.sheet) : undefined;
    return {
      ...(sheet !== undefined ? { sheet } : {}),
      start: { row: a, col: 0, rowAbs: g.aAbs === '$', colAbs: false },
      end: { row: b, col: LAST_COL, rowAbs: g.bAbs === '$', colAbs: false },
      wholeColumn: false,
      wholeRow: true,
    };
  }

  return undefined;
}

/** Serializza un `ParsedRef` in notazione A1, ripristinando `$` e prefisso foglio. */
export function formatCellRef(ref: ParsedRef): string {
  const prefix = ref.sheet !== undefined ? `${quoteSheetName(ref.sheet)}!` : '';
  return `${prefix}${ref.colAbs ? '$' : ''}${colToLetters(ref.col)}${ref.rowAbs ? '$' : ''}${ref.row + 1}`;
}

/** Serializza un `ParsedRangeRef`. Il prefisso foglio compare una volta sola, come in Excel. */
export function formatRangeRef(ref: ParsedRangeRef): string {
  const prefix = ref.sheet !== undefined ? `${quoteSheetName(ref.sheet)}!` : '';
  if (ref.wholeColumn) {
    return `${prefix}${ref.start.colAbs ? '$' : ''}${colToLetters(ref.start.col)}:${ref.end.colAbs ? '$' : ''}${colToLetters(ref.end.col)}`;
  }
  if (ref.wholeRow) {
    return `${prefix}${ref.start.rowAbs ? '$' : ''}${ref.start.row + 1}:${ref.end.rowAbs ? '$' : ''}${ref.end.row + 1}`;
  }
  const a = `${ref.start.colAbs ? '$' : ''}${colToLetters(ref.start.col)}${ref.start.rowAbs ? '$' : ''}${ref.start.row + 1}`;
  const b = `${ref.end.colAbs ? '$' : ''}${colToLetters(ref.end.col)}${ref.end.rowAbs ? '$' : ''}${ref.end.row + 1}`;
  return `${prefix}${a}:${b}`;
}

// ---------------------------------------------------------------------------
// Helper su coordinate (uso interno, senza ancoraggi)
// ---------------------------------------------------------------------------

/** `{row:0,col:3}` -> `"D1"`. */
export function coordToA1(c: CellCoord): string {
  return `${colToLetters(c.col)}${c.row + 1}`;
}

/** `"D1"` -> `{row:0,col:3}`; `undefined` se non parsificabile. Ignora gli eventuali `$`. */
export function a1ToCoord(text: string): CellCoord | undefined {
  const r = parseCellRef(text);
  return r ? { row: r.row, col: r.col } : undefined;
}

/** `{top:0,left:0,bottom:1,right:1}` -> `"A1:B2"`. Una cella sola resta `"A1"`. */
export function rangeToA1(r: RangeCoords): string {
  const a = coordToA1({ row: r.top, col: r.left });
  if (r.top === r.bottom && r.left === r.right) return a;
  return `${a}:${coordToA1({ row: r.bottom, col: r.right })}`;
}

/** Accetta `"A1"` o `"A1:B2"` e restituisce il rettangolo normalizzato. */
export function a1ToRange(text: string): RangeCoords | undefined {
  const rr = parseRangeRef(text);
  if (rr) {
    return normalizeRange({
      top: rr.start.row,
      left: rr.start.col,
      bottom: rr.end.row,
      right: rr.end.col,
    });
  }
  const c = a1ToCoord(text);
  if (!c) return undefined;
  return { top: c.row, left: c.col, bottom: c.row, right: c.col };
}

/** Riordina gli estremi in modo che `top<=bottom` e `left<=right`. */
export function normalizeRange(r: RangeCoords): RangeCoords {
  return {
    top: Math.min(r.top, r.bottom),
    bottom: Math.max(r.top, r.bottom),
    left: Math.min(r.left, r.right),
    right: Math.max(r.left, r.right),
  };
}

export function rangeFromCoords(a: CellCoord, b: CellCoord): RangeCoords {
  return normalizeRange({ top: a.row, left: a.col, bottom: b.row, right: b.col });
}

export function singleCellRange(c: CellCoord): RangeCoords {
  return { top: c.row, left: c.col, bottom: c.row, right: c.col };
}

export function rangeContains(r: RangeCoords, c: CellCoord): boolean {
  return c.row >= r.top && c.row <= r.bottom && c.col >= r.left && c.col <= r.right;
}

export function rangeRowCount(r: RangeCoords): number {
  return r.bottom - r.top + 1;
}

export function rangeColCount(r: RangeCoords): number {
  return r.right - r.left + 1;
}

export function rangeCellCount(r: RangeCoords): number {
  return rangeRowCount(r) * rangeColCount(r);
}

export function isSingleCell(r: RangeCoords): boolean {
  return r.top === r.bottom && r.left === r.right;
}

export function rangesEqual(a: RangeCoords, b: RangeCoords): boolean {
  return a.top === b.top && a.left === b.left && a.bottom === b.bottom && a.right === b.right;
}

export function coordsEqual(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

/** Itera le celle del rettangolo in ordine di lettura (riga per riga). */
export function* iterateRange(r: RangeCoords): Generator<CellCoord> {
  for (let row = r.top; row <= r.bottom; row++) {
    for (let col = r.left; col <= r.right; col++) {
      yield { row, col };
    }
  }
}

/** Chiave stabile per mappe di celle. Piu' economica di una stringa A1. */
export function cellKey(row: number, col: number): number {
  return row * MAX_COLS + col;
}

export function cellKeyToCoord(key: number): CellCoord {
  return { row: Math.floor(key / MAX_COLS), col: key % MAX_COLS };
}

export function clampRow(row: number): number {
  return Math.max(0, Math.min(LAST_ROW, row));
}

export function clampCol(col: number): number {
  return Math.max(0, Math.min(LAST_COL, col));
}

export function clampCoord(c: CellCoord): CellCoord {
  return { row: clampRow(c.row), col: clampCol(c.col) };
}

export function isValidCoord(c: CellCoord): boolean {
  return (
    Number.isInteger(c.row) &&
    Number.isInteger(c.col) &&
    c.row >= 0 &&
    c.row < MAX_ROWS &&
    c.col >= 0 &&
    c.col < MAX_COLS
  );
}
