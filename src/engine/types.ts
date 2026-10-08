/**
 * Tipi del modello foglio.
 *
 * Divisione delle responsabilita', da rispettare ovunque:
 *  - HyperFormula e' l'unica fonte di verita' per il CONTENUTO delle celle
 *    (testo digitato, formula, valore calcolato). Non duplicarlo mai.
 *  - Questo modulo definisce cio' che HyperFormula non conosce: stile, larghezze,
 *    righe nascoste, raggruppamenti, riquadri bloccati, selezione.
 */

import type { CellCoord, RangeCoords } from './address';

/** Contenuto grezzo di una cella, nel formato accettato da HyperFormula. */
export type CellRaw = string | number | boolean | null;

// ---------------------------------------------------------------------------
// Stile
// ---------------------------------------------------------------------------

export type BorderLineStyle = 'thin' | 'medium' | 'thick' | 'double' | 'dashed' | 'dotted';

export interface BorderSide {
  readonly style: BorderLineStyle;
  readonly color?: string;
}

export interface CellBorders {
  readonly top?: BorderSide;
  readonly bottom?: BorderSide;
  readonly left?: BorderSide;
  readonly right?: BorderSide;
}

export type HAlign = 'general' | 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

/**
 * Stile di cella. `fontColor` conta ai fini del grader: la disciplina dei colori
 * (input blu / formule nere / link cross-sheet verdi) e' una verifica vera, non decorazione.
 */
export interface CellStyle {
  readonly fontColor?: string;
  readonly fillColor?: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  /** Formato numerico in sintassi Excel, es. `#,##0;(#,##0);-` oppure `0.0x`. */
  readonly numFmt?: string;
  readonly halign?: HAlign;
  readonly valign?: VAlign;
  readonly wrap?: boolean;
  readonly indent?: number;
  readonly borders?: CellBorders;
}

export const EMPTY_STYLE: CellStyle = Object.freeze({});

// ---------------------------------------------------------------------------
// Layout del foglio
// ---------------------------------------------------------------------------

export const DEFAULT_COL_WIDTH = 84;
export const DEFAULT_ROW_HEIGHT = 21;
/** Interlinea del testo a capo nella griglia. */
export const WRAP_LINE_PX = 16;
export const HEADER_ROW_HEIGHT = 21;
export const HEADER_COL_WIDTH = 46;

/** Livello massimo di raggruppamento, come in Excel. */
export const MAX_OUTLINE_LEVEL = 7;

export interface SheetLayout {
  /** Larghezze in pixel, solo per le colonne che deviano dal default. */
  readonly colWidths: Map<number, number>;
  readonly rowHeights: Map<number, number>;
  readonly hiddenRows: Set<number>;
  readonly hiddenCols: Set<number>;
  /** Livello di outline per riga (0 = nessun raggruppamento). */
  readonly rowOutline: Map<number, number>;
  readonly colOutline: Map<number, number>;
  /** Righe/colonne di riepilogo il cui gruppo e' attualmente collassato. */
  readonly collapsedRowGroups: Set<number>;
  readonly collapsedColGroups: Set<number>;
  frozenRows: number;
  frozenCols: number;
}

export function createSheetLayout(): SheetLayout {
  return {
    colWidths: new Map(),
    rowHeights: new Map(),
    hiddenRows: new Set(),
    hiddenCols: new Set(),
    rowOutline: new Map(),
    colOutline: new Map(),
    collapsedRowGroups: new Set(),
    collapsedColGroups: new Set(),
    frozenRows: 0,
    frozenCols: 0,
  };
}

// ---------------------------------------------------------------------------
// Protezione delle celle (i livelli hanno celle bloccate)
// ---------------------------------------------------------------------------

/**
 * In un livello alcune celle sono di sola lettura (i dati di partenza) e altre
 * sono l'area di lavoro. Il tentativo di scrivere su una cella bloccata non e'
 * un errore silenzioso: va segnalato e conteggiato.
 */
export interface CellProtection {
  readonly lockedCells: ReadonlySet<number>;
  readonly lockedByDefault: boolean;
  readonly unlockedCells: ReadonlySet<number>;
}

// ---------------------------------------------------------------------------
// Selezione
// ---------------------------------------------------------------------------

/**
 * Un'area di selezione. `anchor` e' la cella da cui l'area e' nata: e' lei a
 * restare ferma quando si estende con Shift, ed e' diversa dalla cella attiva.
 */
export interface SelectionArea {
  readonly range: RangeCoords;
  readonly anchor: CellCoord;
}

/**
 * Stato di selezione di un foglio.
 *
 * `entryOrigin` riproduce un comportamento Excel che quasi nessun clone
 * implementa: se batti Tab piu' volte e poi premi Invio, il cursore torna alla
 * colonna da cui la sequenza di Tab e' partita, una riga sotto. Va conservato
 * qui e azzerato da qualunque navigazione che non sia Tab/Invio.
 */
export interface Selection {
  readonly sheet: number;
  readonly areas: readonly SelectionArea[];
  /** Indice dell'area che contiene la cella attiva. */
  readonly activeArea: number;
  readonly active: CellCoord;
  readonly entryOrigin: CellCoord | null;
  /** Modalita' "Estendi selezione" attivata da F8. */
  readonly extendMode: boolean;
}

export function singleCellSelection(sheet: number, c: CellCoord): Selection {
  return {
    sheet,
    areas: [{ range: { top: c.row, left: c.col, bottom: c.row, right: c.col }, anchor: c }],
    activeArea: 0,
    active: c,
    entryOrigin: null,
    extendMode: false,
  };
}

/** L'area che contiene la cella attiva. */
export function activeAreaOf(sel: Selection): SelectionArea {
  return sel.areas[sel.activeArea] ?? sel.areas[0];
}

// ---------------------------------------------------------------------------
// Predicati richiesti dalla navigazione
// ---------------------------------------------------------------------------

/**
 * Superficie minima di cui la navigazione ha bisogno. Tenerla stretta e' cio'
 * che rende testabili le 30+ scorciatoie senza montare ne' DOM ne' HyperFormula.
 */
export interface GridProbe {
  /** Vero se la cella ha contenuto (numero, testo, formula). Le stringhe vuote NON contano. */
  isFilled(row: number, col: number): boolean;
  /** Ultima riga e ultima colonna del foglio (di norma `LAST_ROW` / `LAST_COL`). */
  readonly maxRow: number;
  readonly maxCol: number;
  /** Estremi dell'area utilizzata; `null` se il foglio e' vuoto. */
  usedRange(): RangeCoords | null;
  isRowHidden(row: number): boolean;
  isColHidden(col: number): boolean;
  readonly frozenRows: number;
  readonly frozenCols: number;
}

// ---------------------------------------------------------------------------
// Modalita' di editing
// ---------------------------------------------------------------------------

/**
 * Excel ha tre stati distinti, visibili in basso a sinistra: Pronto, Immissione,
 * Modifica. La differenza conta: in Immissione le frecce confermano la cella e
 * si spostano, in Modifica muovono il cursore dentro il testo. Va riprodotta.
 */
export type EditMode = 'ready' | 'enter' | 'edit' | 'point';

export interface EditState {
  readonly mode: EditMode;
  /** Cella in editing; `null` in stato `ready`. */
  readonly cell: CellCoord | null;
  readonly text: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  /** Vero se l'editing e' stato aperto con F2 (cursore in fondo) e non digitando. */
  readonly openedWithF2: boolean;
}

export const READY_EDIT_STATE: EditState = Object.freeze({
  mode: 'ready' as const,
  cell: null,
  text: '',
  selectionStart: 0,
  selectionEnd: 0,
  openedWithF2: false,
});
