/**
 * Appunti e Incolla speciale (spec 3.1).
 *
 * Modulo PURO: qui vivono solo strutture dati e regole. Nessun HyperFormula,
 * nessun DOM, nessuna lettura del foglio. Chi chiama (la griglia / `Workbook`)
 * fornisce una funzione di lettura per costruire gli appunti e riceve un PIANO
 * di scritture da applicare. Questa separazione e' cio' che rende testabili a
 * tavolino le regole piu' insidiose di Excel (mosaico, taglia, trasposizione)
 * senza montare un motore di calcolo.
 *
 * La traslazione dei riferimenti NON viene reimplementata: arriva da fuori come
 * `ShiftFormula`, e in produzione e' `shiftFormula` di `formula/refs.ts`.
 */

import {
  LAST_COL,
  LAST_ROW,
  normalizeRange,
  rangeColCount,
  rangeRowCount,
  type CellCoord,
  type RangeCoords,
} from './address';
import { EMPTY_STYLE, type CellRaw, type CellStyle } from './types';

import { tr } from '../i18n/ui';
// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

/** Valore calcolato di una cella: e' cio' che l'incolla-valori scrive al posto della formula. */
export type ClipValue = number | string | boolean | null;

/**
 * Una cella negli appunti. `raw` e' il contenuto come lo accetta HyperFormula
 * (quindi puo' gia' essere `"=A1+1"`); `formula` e `value` sono ridondanti ma
 * comodi: senza `value` l'incolla-valori non avrebbe nulla da scrivere, perche'
 * un modulo puro non puo' ricalcolare.
 */
export interface ClipCell {
  readonly raw: CellRaw;
  readonly formula?: string;
  readonly style?: CellStyle;
  readonly value?: ClipValue;
}

export interface ClipboardSource {
  readonly sheet: string;
  readonly range: RangeCoords;
}

export interface Clipboard {
  readonly kind: 'copy' | 'cut';
  readonly source: ClipboardSource;
  /** Matrice riga-per-riga, dimensioni esatte di `source.range`. */
  readonly cells: readonly (readonly ClipCell[])[];
}

/**
 * Le voci del dialogo Incolla speciale che qui si modellano. I nomi seguono le
 * voci VERE di Excel: `valuesAndNumberFormats` e' "Valori e formati numeri" (U),
 * che porta il solo formato numerico — NON tutta la formattazione. Un "valori e
 * formati" completo nel dialogo di Excel non esiste, e inventarlo insegnerebbe
 * una voce che in ufficio non si trova.
 */
export type PasteMode =
  | 'all'
  | 'values'
  | 'formulas'
  | 'formats'
  | 'valuesAndNumberFormats'
  | 'comments'
  | 'columnWidths';

export type PasteOperation = 'none' | 'add' | 'subtract' | 'multiply' | 'divide';

export interface PasteOptions {
  readonly mode: PasteMode;
  readonly operation: PasteOperation;
  readonly transpose: boolean;
  readonly skipBlanks: boolean;
}

export const DEFAULT_PASTE_OPTIONS: PasteOptions = Object.freeze({
  mode: 'all' as const,
  operation: 'none' as const,
  transpose: false,
  skipBlanks: false,
});

/** Firma di `shiftFormula` in `formula/refs.ts`: iniettata per tenere puro questo modulo. */
export type ShiftFormula = (formula: string, dRow: number, dCol: number) => string;

/**
 * Lettura di cio' che c'e' GIA' nel bersaglio. Serve SOLO alle operazioni
 * matematiche (aggiungi/sottrai/moltiplica/dividi), che per definizione
 * combinano il valore incollato con quello esistente.
 *
 * Puo' restituire il solo valore oppure l'intera cella: la differenza conta,
 * perche' se il bersaglio contiene una FORMULA Excel non la sostituisce con un
 * numero — la riscrive applicandole l'operazione (vedi `applyOperation`).
 * Chi passa una funzione che restituisce solo valori ottiene il comportamento
 * ridotto: il bersaglio viene visto come un valore e la formula si perde.
 */
export type ReadTarget = (row: number, col: number) => ClipValue | ClipCell;

/** Firma storica, solo valore: resta assegnabile a `ReadTarget`. */
export type ReadTargetValue = (row: number, col: number) => ClipValue;

export interface PasteWrite {
  readonly row: number;
  readonly col: number;
  /** Assente = non toccare il contenuto (e' il caso di "solo formati"). */
  readonly raw?: CellRaw;
  /** Assente = non toccare lo stile (e' il caso di "solo valori"/"solo formule"). */
  readonly style?: CellStyle;
  /**
   * Vero = lo stile va FUSO con quello del bersaglio, non sostituito. Lo usa
   * "Valori e formati numeri", che cambia il formato numerico e lascia intatti
   * grassetto, colore e bordi di chi riceve.
   */
  readonly mergeStyle?: boolean;
}

/** Copia della larghezza di una colonna: il layout appartiene a `Workbook`, qui c'e' solo la mappatura. */
export interface ColumnWidthCopy {
  readonly from: number;
  readonly to: number;
}

export interface PastePlan {
  readonly writes: PasteWrite[];
  /** Valorizzato solo per `kind: "cut"`: l'area di partenza va svuotata dopo la scrittura. */
  readonly clearSource?: RangeCoords;
  /** Valorizzato solo per `mode: "columnWidths"`. */
  readonly colWidths?: ColumnWidthCopy[];
}

const VALUE_ERROR = '#VALUE!';
const DIV0_ERROR = '#DIV/0!';

// ---------------------------------------------------------------------------
// Costruzione degli appunti
// ---------------------------------------------------------------------------

/**
 * Fotografa l'area sorgente. La fotografia e' volutamente COMPLETA (raw, formula,
 * stile, valore): dopo un Ctrl+C il foglio puo' cambiare, e Excel incolla quello
 * che c'era al momento della copia, non quello che c'e' adesso.
 */
export function buildClipboard(
  kind: 'copy' | 'cut',
  sourceSheet: string,
  range: RangeCoords,
  read: (row: number, col: number) => ClipCell,
): Clipboard {
  const r = normalizeRange(range);
  const cells: ClipCell[][] = [];
  for (let row = r.top; row <= r.bottom; row++) {
    const line: ClipCell[] = [];
    for (let col = r.left; col <= r.right; col++) line.push(read(row, col));
    cells.push(line);
  }
  return { kind, source: { sheet: sourceSheet, range: r }, cells };
}

/** Righe/colonne occupate dall'incolla, gia' tenendo conto della trasposizione. */
export function pasteShape(clip: Clipboard, transpose = false): { rows: number; cols: number } {
  const rows = rangeRowCount(clip.source.range);
  const cols = rangeColCount(clip.source.range);
  return transpose ? { rows: cols, cols: rows } : { rows, cols };
}

// ---------------------------------------------------------------------------
// Risoluzione dell'area di destinazione
// ---------------------------------------------------------------------------

export type ResolveTargetResult =
  | { readonly ok: true; readonly area: RangeCoords }
  | { readonly ok: false; readonly reason: string };

function describeShape(rows: number, cols: number): string {
  const r = tr(rows === 1 ? 'clipboard.riga' : 'clipboard.righe', { n: rows });
  const c = tr(cols === 1 ? 'clipboard.colonna' : 'clipboard.colonne', { n: cols });
  return `${r} x ${c}`;
}

/**
 * Regole di Excel, nell'ordine in cui le applica:
 *  1. bersaglio a cella singola -> l'area incollata prende la forma della sorgente;
 *  2. bersaglio multiplo ESATTO della sorgente -> il contenuto viene ripetuto a mosaico
 *     (1x3 in 1x9 = tre copie affiancate);
 *  3. altrimenti Excel si rifiuta con un messaggio. Approssimare in silenzio sarebbe
 *     il peggior servizio possibile a chi sta imparando: qui si restituisce il motivo.
 *
 * Il TAGLIA non tollera il mosaico: si sposta un blocco, e un blocco non si duplica.
 */
export function resolvePasteTarget(
  clip: Clipboard,
  target: RangeCoords,
  transpose = false,
): ResolveTargetResult {
  const t = normalizeRange(target);
  const { rows: srcRows, cols: srcCols } = pasteShape(clip, transpose);
  const tgtRows = rangeRowCount(t);
  const tgtCols = rangeColCount(t);

  if (tgtRows === 1 && tgtCols === 1) {
    const bottom = t.top + srcRows - 1;
    const right = t.left + srcCols - 1;
    // Excel non incolla oltre l'ultima riga/colonna del foglio: si ferma e lo dice.
    // Senza questo controllo l'area risolta uscirebbe dal foglio e le scritture
    // finirebbero su coordinate inesistenti.
    if (bottom > LAST_ROW || right > LAST_COL) {
      return {
        ok: false,
        reason:
          tr('clipboard.1', { p0: describeShape(srcRows, srcCols) }),
      };
    }
    return { ok: true, area: { top: t.top, left: t.left, bottom, right } };
  }

  const sameShape = tgtRows === srcRows && tgtCols === srcCols;
  if (clip.kind === 'cut' && !sameShape) {
    return {
      ok: false,
      reason:
        tr('clipboard.2', { p0: describeShape(srcRows, srcCols), p1: describeShape(tgtRows, tgtCols) }),
    };
  }

  if (tgtRows % srcRows !== 0 || tgtCols % srcCols !== 0) {
    return {
      ok: false,
      reason:
        tr('clipboard.3', { p0: describeShape(srcRows, srcCols), p1: describeShape(tgtRows, tgtCols) }),
    };
  }

  return { ok: true, area: t };
}

// ---------------------------------------------------------------------------
// Lettura di una ClipCell
// ---------------------------------------------------------------------------

/** La formula della cella, sia che stia in `formula` sia che stia in `raw` come `"=..."`. */
function formulaOf(cell: ClipCell): string | undefined {
  if (cell.formula !== undefined && cell.formula !== '') return cell.formula;
  return typeof cell.raw === 'string' && cell.raw.startsWith('=') ? cell.raw : undefined;
}

/** Il valore da usare per l'incolla-valori: se la cella e' una formula serve `value`. */
function valueOf(cell: ClipCell): ClipValue {
  if (cell.value !== undefined) return cell.value;
  return formulaOf(cell) !== undefined ? null : (cell.raw as ClipValue);
}

function isBlankValue(v: ClipValue | undefined): boolean {
  return v === null || v === undefined || v === '';
}

/** Cella vuota: niente formula, niente contenuto, niente valore. Lo stile non conta. */
function isBlankCell(cell: ClipCell): boolean {
  return formulaOf(cell) === undefined && isBlankValue(cell.raw) && isBlankValue(cell.value);
}

// ---------------------------------------------------------------------------
// Operazioni matematiche
// ---------------------------------------------------------------------------

function isErrorText(v: ClipValue): v is string {
  return typeof v === 'string' && v.startsWith('#');
}

/**
 * Coercizione alla Excel: vuoto vale 0, i booleani valgono 1/0, il testo numerico
 * si converte. Il testo vero non e' convertibile: `undefined` segnala #VALUE!.
 */
function toNumber(v: ClipValue): number | undefined {
  if (v === null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const t = v.trim();
  if (t === '') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

const OPERATION_SYMBOL: Readonly<Record<Exclude<PasteOperation, 'none'>, string>> = {
  add: '+',
  subtract: '-',
  multiply: '*',
  divide: '/',
};

function isClipCell(v: ClipValue | ClipCell): v is ClipCell {
  return typeof v === 'object' && v !== null && 'raw' in v;
}

/**
 * `esistente OP incollato`, nell'ordine di Excel: "Dividi" divide il valore che
 * era gia' nella cella per quello incollato, non il contrario.
 *
 * Se il bersaglio contiene una FORMULA, Excel non la appiattisce: la riscrive
 * applicandole l'operazione. E' il modo in cui si riscala un modello da unita' a
 * migliaia (copia 1000, seleziona la riga, Incolla speciale > Dividi) senza
 * distruggere i collegamenti: `=SUM(B2:B9)` diventa `=(SUM(B2:B9))/1000`.
 * Appiattire in un numero e' la scorciatoia comoda, ed e' esattamente l'errore
 * che in ufficio costa un modello.
 *
 * VERIFICARE: Excel mette le parentesi attorno alla formula preesistente solo
 * quando servono (`=A1+B1` -> `=(A1+B1)/1000`, ma `=SUM(A1:A9)` potrebbe restare
 * senza). Qui si parentesizza SEMPRE: e' sempre corretto nel risultato, puo'
 * differire nel testo della formula.
 */
function applyOperation(
  existing: ClipValue | ClipCell,
  incoming: ClipValue,
  op: PasteOperation,
): CellRaw {
  if (op === 'none') return incoming as CellRaw;

  const existingCell = isClipCell(existing) ? existing : undefined;
  const existingValue: ClipValue = existingCell ? valueOf(existingCell) : (existing as ClipValue);
  const existingFormula = existingCell ? formulaOf(existingCell) : undefined;

  if (isErrorText(incoming)) return incoming;

  if (existingFormula !== undefined) {
    const b = toNumber(incoming);
    if (b === undefined) return VALUE_ERROR;
    // La divisione per zero resta dentro la formula: sara' il motore a produrre
    // #DIV/0!, come fa Excel quando l'operazione atterra su una formula.
    return `=(${existingFormula.replace(/^=/, '')})${OPERATION_SYMBOL[op]}${b}`;
  }

  // Un errore gia' presente nel bersaglio si propaga, non diventa #VALUE!.
  if (isErrorText(existingValue)) return existingValue;
  const a = toNumber(existingValue);
  const b = toNumber(incoming);
  if (a === undefined || b === undefined) return VALUE_ERROR;
  switch (op) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
    case 'divide':
      return b === 0 ? DIV0_ERROR : a / b;
  }
}

// ---------------------------------------------------------------------------
// Pianificazione dell'incolla
// ---------------------------------------------------------------------------

const MODES_WITH_CONTENT: ReadonlySet<PasteMode> = new Set<PasteMode>([
  'all',
  'values',
  'formulas',
  'valuesAndNumberFormats',
]);

const MODES_WITH_STYLE: ReadonlySet<PasteMode> = new Set<PasteMode>([
  'all',
  'formats',
  'valuesAndNumberFormats',
]);

/** Modalita' che portano il SOLO formato numerico, lasciando il resto del bersaglio. */
const MODES_WITH_NUMFMT_ONLY: ReadonlySet<PasteMode> = new Set<PasteMode>([
  'valuesAndNumberFormats',
]);

/** Formato numerico predefinito: incollarlo AZZERA quello del bersaglio, come in Excel. */
const GENERAL_NUMBER_FORMAT = 'General';

/** Le modalita' che conservano la formula; le altre incollano il valore calcolato. */
const MODES_WITH_FORMULA: ReadonlySet<PasteMode> = new Set<PasteMode>(['all', 'formulas']);

/**
 * Costruisce il piano di scritture per UNA copia degli appunti con l'angolo in
 * alto a sinistra su `targetTopLeft`. Il mosaico si ottiene con `planPasteArea`.
 *
 * Traslazione dei riferimenti: ogni cella si sposta di `destinazione - sorgente`.
 *  - incolla normale: lo spostamento e' lo stesso per tutte le celle (il delta
 *    fra i due angoli in alto a sinistra);
 *  - trasposizione: la cella di offset (i, j) finisce in (j, i), quindi nel delta
 *    di riga entra l'offset di COLONNA e viceversa — il delta risulta scambiato;
 *  - taglia: nessuna traslazione. Excel sposta le celle, non le copia, e una
 *    cella spostata continua a riferirsi esattamente a cio' cui si riferiva.
 *
 * DEVIAZIONE NOTA E CONFERMATA, da chiudere prima di usare la trasposizione in un
 * livello: Excel traspone anche l'ORIENTAMENTO dei riferimenti relativi. Una
 * cella che punta "una riga sotto" (`=A2` in `A1`) trasposta punta "una colonna a
 * destra" (`=F5` in `E5`), mentre qui produce `=E6`. Non e' esprimibile con
 * `ShiftFormula`, che applica una traslazione uniforme all'intera formula: servira'
 * una `transposeFormula(formula, srcCell, dstCell)` in `formula/refs.ts`, che al
 * momento non esiste. Fino ad allora la trasposizione e' fedele sui VALORI (ed e'
 * il caso d'uso vero: trasporre un blocco di numeri) e infedele sulle FORMULE.
 */
export function planPaste(
  clip: Clipboard,
  targetTopLeft: CellCoord,
  opts: PasteOptions,
  shiftFormula: ShiftFormula,
  readTarget?: ReadTarget,
): PastePlan {
  const writes: PasteWrite[] = [];
  const plan: { writes: PasteWrite[]; clearSource?: RangeCoords; colWidths?: ColumnWidthCopy[] } = {
    writes,
  };

  if (clip.kind === 'cut') plan.clearSource = clip.source.range;

  if (opts.mode === 'columnWidths') {
    // Le larghezze non sono contenuto di cella: si restituisce solo la mappatura
    // colonna sorgente -> colonna bersaglio, che applichera' `Workbook`.
    if (!opts.transpose) {
      const cols: ColumnWidthCopy[] = [];
      const src = clip.source.range;
      for (let j = 0; j <= src.right - src.left; j++) {
        cols.push({ from: src.left + j, to: targetTopLeft.col + j });
      }
      plan.colWidths = cols;
    }
    return plan;
  }

  // I commenti non esistono nel modello di cella: nessuna scrittura, ma nemmeno
  // un errore — l'utente ha premuto un tasto legittimo del dialogo.
  if (opts.mode === 'comments') return plan;

  const writesContent = MODES_WITH_CONTENT.has(opts.mode);
  const writesStyle = MODES_WITH_STYLE.has(opts.mode);
  // Con un'operazione matematica la formula della SORGENTE non viene incollata:
  // e' il suo valore a entrare nel calcolo. La formula eventualmente presente nel
  // BERSAGLIO invece sopravvive, riscritta da `applyOperation`.
  const keepFormula = MODES_WITH_FORMULA.has(opts.mode) && opts.operation === 'none';

  const src = clip.source.range;

  for (let i = 0; i < clip.cells.length; i++) {
    const line = clip.cells[i];
    for (let j = 0; j < line.length; j++) {
      const cell = line[j];

      // skipBlanks: la cella vuota della sorgente non deve cancellare il bersaglio.
      if (opts.skipBlanks && isBlankCell(cell)) continue;

      const row = opts.transpose ? targetTopLeft.row + j : targetTopLeft.row + i;
      const col = opts.transpose ? targetTopLeft.col + i : targetTopLeft.col + j;

      const write: {
        row: number;
        col: number;
        raw?: CellRaw;
        style?: CellStyle;
        mergeStyle?: boolean;
      } = { row, col };

      if (writesContent) {
        const formula = keepFormula ? formulaOf(cell) : undefined;
        if (formula !== undefined) {
          const dRow = clip.kind === 'cut' ? 0 : row - (src.top + i);
          const dCol = clip.kind === 'cut' ? 0 : col - (src.left + j);
          write.raw = shiftFormula(formula, dRow, dCol);
        } else if (opts.operation !== 'none') {
          // Senza `readTarget` il bersaglio vale 0 (cella vuota), che e' cio' che
          // Excel assume su una cella davvero vuota — ma su una cella piena il
          // risultato sarebbe sbagliato: chi pianifica un'operazione DEVE passarlo.
          const existing = readTarget ? readTarget(row, col) : null;
          write.raw = applyOperation(existing, valueOf(cell), opts.operation);
        } else if (MODES_WITH_FORMULA.has(opts.mode)) {
          // Modalita' che porta le formule ma questa cella non ne ha: passa il raw
          // originale, cosi' testo e numeri restano identici a com'erano.
          write.raw = cell.raw;
        } else {
          write.raw = valueOf(cell) as CellRaw;
        }
      }

      if (writesStyle) {
        if (MODES_WITH_NUMFMT_ONLY.has(opts.mode)) {
          // "Valori e formati numeri": cambia SOLO il formato numerico. Il
          // grassetto, il colore e i bordi del bersaglio restano dove sono.
          write.style = { numFmt: cell.style?.numFmt ?? GENERAL_NUMBER_FORMAT };
          write.mergeStyle = true;
        } else {
          // Senza stile esplicito si scrive comunque uno stile vuoto: incollare una
          // cella non formattata su una formattata AZZERA il formato, come in Excel.
          write.style = cell.style ?? EMPTY_STYLE;
        }
      }

      writes.push(write);
    }
  }

  return plan;
}

/**
 * Incolla sull'intera area risolta da `resolvePasteTarget`, ripetendo gli appunti
 * a mosaico quando l'area e' un multiplo della sorgente.
 */
export function planPasteArea(
  clip: Clipboard,
  area: RangeCoords,
  opts: PasteOptions,
  shiftFormula: ShiftFormula,
  readTarget?: ReadTarget,
): PastePlan {
  const a = normalizeRange(area);
  const { rows, cols } = pasteShape(clip, opts.transpose);
  const writes: PasteWrite[] = [];
  let colWidths: ColumnWidthCopy[] | undefined;

  for (let top = a.top; top <= a.bottom; top += rows) {
    for (let left = a.left; left <= a.right; left += cols) {
      const tile = planPaste(clip, { row: top, col: left }, opts, shiftFormula, readTarget);
      writes.push(...tile.writes);
      if (tile.colWidths) colWidths = [...(colWidths ?? []), ...tile.colWidths];
    }
  }

  const plan: { writes: PasteWrite[]; clearSource?: RangeCoords; colWidths?: ColumnWidthCopy[] } = {
    writes,
  };
  if (clip.kind === 'cut') plan.clearSource = clip.source.range;
  if (colWidths) plan.colWidths = colWidths;
  return plan;
}

// ---------------------------------------------------------------------------
// Sotto-keymap del dialogo Incolla speciale (Ctrl+Alt+V)
// ---------------------------------------------------------------------------

/**
 * Le lettere sono quelle acceleratrici del dialogo di Excel, non tradotte: chi
 * impara qui deve ritrovarle identiche in ufficio (stessa scelta di
 * `PASTE_SPECIAL_OPTIONS` in `keymap/bindings.ts`, con cui questa tabella deve
 * restare allineata).
 *
 *   A Tutto · F Formule · V Valori · T Formati · C Commenti · W Larghezze colonne
 *   U Valori e formati numeri · E Trasponi · B Salta celle vuote
 *   O Nessuna · D Aggiungi · S Sottrai · M Moltiplica · I Dividi
 *
 * `N` NON e' "Tutto": in Excel e' "Convalida", che qui non si modella e quindi
 * resta un tasto ignorato. `R` ("Formule e formati numeri") e le voci tema /
 * bordi / formati condizionali non sono modellate: tasti ignorati anch'essi.
 */
const KEY_TO_OPTIONS: Readonly<Record<string, Partial<PasteOptions>>> = {
  A: { mode: 'all' },
  F: { mode: 'formulas' },
  V: { mode: 'values' },
  T: { mode: 'formats' },
  C: { mode: 'comments' },
  U: { mode: 'valuesAndNumberFormats' },
  W: { mode: 'columnWidths' },
  E: { transpose: true },
  B: { skipBlanks: true },
  O: { operation: 'none' },
  D: { operation: 'add' },
  S: { operation: 'subtract' },
  M: { operation: 'multiply' },
  I: { operation: 'divide' },
};

/**
 * Traduce un tasto del dialogo in una modifica delle opzioni. Restituisce
 * `undefined` sui tasti non associati: il dialogo li ignora invece di chiudersi,
 * che e' cio' che fa Excel.
 *
 * Deviazione nota: "Trasponi" e "Salta celle vuote" sono caselle di spunta, e in
 * Excel premere `E` due volte la ri-toglie. Qui la patch e' sempre `true`, perche'
 * una funzione pura sul solo tasto non conosce lo stato corrente; chi vuole il
 * toggle fedele lo risolve a monte confrontando `opts` prima di applicare.
 */
export function parsePasteSpecialKey(
  key: string,
): Partial<PasteOptions> | 'confirm' | 'cancel' | undefined {
  const k = key.trim();
  if (/^(enter|invio|return)$/i.test(k)) return 'confirm';
  if (/^(escape|esc)$/i.test(k)) return 'cancel';
  if (k.length !== 1) return undefined;
  return KEY_TO_OPTIONS[k.toUpperCase()];
}

/** Applica al set corrente cio' che `parsePasteSpecialKey` ha riconosciuto. */
export function withPasteOption(
  opts: PasteOptions,
  patch: Partial<PasteOptions>,
): PasteOptions {
  return { ...opts, ...patch };
}
