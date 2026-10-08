/**
 * Transizioni di stato della selezione, fedeli a Excel (BUILD SPEC §3.1).
 *
 * Tutte le funzioni sono PURE: prendono una `Selection` e ne restituiscono una
 * nuova, senza mutare nulla. Il bersaglio degli spostamenti lo calcola
 * `navigation.ts`; qui si decide che cosa succede all'ANCORA, alla CELLA ATTIVA,
 * alle aree multiple e a `entryOrigin`.
 *
 * Tre distinzioni che quasi tutti i cloni sbagliano e che qui sono normative:
 *  1. anchor != cella attiva. `Maiusc+Freccia` muove la cella attiva e tiene
 *     ferma l'ancora; il rettangolo e' sempre anchor -> active.
 *  2. `Ctrl+Maiusc+Freccia` calcola il salto DALLA CELLA ATTIVA (non dal bordo
 *     del rettangolo) e poi estende dall'ancora fino a li'.
 *  3. con piu' di una cella selezionata, Invio e Tab NON escono dalla selezione:
 *     muovono la cella attiva al suo interno, con wrap.
 */

import type { CellCoord, RangeCoords } from './address';
import {
  LAST_COL,
  LAST_ROW,
  isSingleCell,
  normalizeRange,
  rangeCellCount,
  rangeContains,
  rangeFromCoords,
  rangesEqual,
  singleCellRange,
} from './address';
import type { GridProbe, Selection, SelectionArea } from './types';
import { activeAreaOf } from './types';
import type { Direction } from './navigation';
import { clampToProbe, currentRegion, jump, step, wholeSheetRange } from './navigation';

// ---------------------------------------------------------------------------
// Interrogazioni
// ---------------------------------------------------------------------------

/** Numero totale di celle selezionate (le aree sovrapposte contano due volte, come in Excel). */
export function selectionCellCount(sel: Selection): number {
  let n = 0;
  for (const a of sel.areas) n += rangeCellCount(a.range);
  return n;
}

export function isSingleCellSelection(sel: Selection): boolean {
  return selectionCellCount(sel) === 1;
}

function activeAreaIndex(sel: Selection): number {
  return sel.activeArea >= 0 && sel.activeArea < sel.areas.length ? sel.activeArea : 0;
}

function withAreas(
  sel: Selection,
  areas: readonly SelectionArea[],
  activeArea: number,
  active: CellCoord,
): Selection {
  return {
    sheet: sel.sheet,
    areas,
    activeArea,
    active,
    // Qualunque spostamento con frecce o mouse azzera entryOrigin: la catena di
    // Tab si interrompe. Solo tabFrom/enterFrom lo valorizzano.
    entryOrigin: null,
    extendMode: sel.extendMode,
  };
}

// ---------------------------------------------------------------------------
// Spostamento e estensione
// ---------------------------------------------------------------------------

/** Click semplice o freccia: la selezione collassa sulla cella, l'ancora la segue. */
export function moveTo(sel: Selection, target: CellCoord, probe: GridProbe): Selection {
  const c = clampToProbe(probe, target);
  return withAreas(sel, [{ range: singleCellRange(c), anchor: c }], 0, c);
}

/**
 * `Maiusc+click` / estensione a un bersaglio: l'ancora dell'area attiva resta
 * dov'e', la cella attiva si sposta, il rettangolo si ricalcola fra le due.
 * Le altre aree di una selezione multipla non vengono toccate.
 */
export function extendTo(sel: Selection, target: CellCoord): Selection {
  const idx = activeAreaIndex(sel);
  const anchor = activeAreaOf(sel).anchor;
  const range = rangeFromCoords(anchor, target);
  const areas = sel.areas.map((a, i) => (i === idx ? { range, anchor } : a));
  return withAreas(sel, areas, idx, target);
}

export interface MoveExtendOptions {
  /** `true` per `Ctrl+Maiusc+Freccia`, `false`/omesso per `Maiusc+Freccia`. */
  readonly jump?: boolean;
}

/**
 * `Maiusc+Freccia` e `Ctrl+Maiusc+Freccia`.
 *
 * Il punto delicato: il bersaglio si calcola SEMPRE a partire dalla cella
 * attiva, mai dal bordo del rettangolo. Con selezione A1:A5 e cella attiva A5,
 * `Ctrl+Maiusc+Giu` salta dal contenuto sotto A5; se invece la selezione fosse
 * stata costruita all'insu' (ancora A5, attiva A1) lo stesso tasto partirebbe da
 * A1 e potrebbe RIDURRE la selezione. E' il motivo per cui in Excel si puo'
 * "tornare indietro" con Maiusc senza perdere l'ancora.
 */
export function moveAndExtend(
  sel: Selection,
  probe: GridProbe,
  dir: Direction,
  opts: MoveExtendOptions = {},
): Selection {
  const target = opts.jump ? jump(probe, sel.active, dir) : step(probe, sel.active, dir);
  return extendTo(sel, target);
}

// ---------------------------------------------------------------------------
// Riga / colonna intera
// ---------------------------------------------------------------------------

/** Indice singolo oppure intervallo inclusivo di righe/colonne. */
export type IndexSpan = number | { readonly from: number; readonly to: number };

function normalizeSpan(span: IndexSpan, last: number): { from: number; to: number } {
  const raw = typeof span === 'number' ? { from: span, to: span } : span;
  const from = Math.max(0, Math.min(last, Math.min(raw.from, raw.to)));
  const to = Math.max(0, Math.min(last, Math.max(raw.from, raw.to)));
  return { from, to };
}

/**
 * `Maiusc+Spazio`: righe intere. La cella attiva NON si sposta (resta nella sua
 * colonna): e' quello che rende possibile la sequenza Maiusc+Spazio ->
 * Ctrl+"-" senza perdere il punto in cui si stava lavorando.
 */
export function selectRow(sel: Selection, rows: IndexSpan): Selection {
  const span = normalizeSpan(rows, LAST_ROW);
  const row = Math.max(span.from, Math.min(span.to, sel.active.row));
  const range: RangeCoords = { top: span.from, left: 0, bottom: span.to, right: LAST_COL };
  const anchor: CellCoord = { row, col: 0 };
  return withAreas(sel, [{ range, anchor }], 0, { row, col: sel.active.col });
}

/** `Ctrl+Spazio`: colonne intere, stesso principio di `selectRow`. */
export function selectCol(sel: Selection, cols: IndexSpan): Selection {
  const span = normalizeSpan(cols, LAST_COL);
  const col = Math.max(span.from, Math.min(span.to, sel.active.col));
  const range: RangeCoords = { top: 0, left: span.from, bottom: LAST_ROW, right: span.to };
  const anchor: CellCoord = { row: 0, col };
  return withAreas(sel, [{ range, anchor }], 0, { row: sel.active.row, col });
}

// ---------------------------------------------------------------------------
// Ctrl+A
// ---------------------------------------------------------------------------

/**
 * `Ctrl+A`: prima la regione corrente, al secondo colpo tutto il foglio.
 *
 * Con la cella attiva isolata (fuori da qualunque blocco) la regione corrente e'
 * la sola cella: in quel caso Excel salta direttamente all'intero foglio, senza
 * la tappa intermedia.
 */
export function selectAll(sel: Selection, probe: GridProbe): Selection {
  const region = currentRegion(probe, sel.active);
  const current = activeAreaOf(sel).range;
  const whole = wholeSheetRange(probe);
  const soloArea = sel.areas.length === 1;

  // Terzo colpo e successivi: si resta su tutto il foglio, non si torna indietro.
  const target: RangeCoords =
    (soloArea && (rangesEqual(current, region) || rangesEqual(current, whole))) ||
    isSingleCell(region)
      ? whole
      : region;

  const anchor: CellCoord = { row: target.top, col: target.left };
  const active = rangeContains(target, sel.active) ? sel.active : anchor;
  return withAreas(sel, [{ range: target, anchor }], 0, active);
}

// ---------------------------------------------------------------------------
// Selezione multipla
// ---------------------------------------------------------------------------

/**
 * `Ctrl+click` / `Ctrl+trascina`: aggiunge un'area. La nuova area diventa quella
 * attiva e la cella attiva si sposta nel suo angolo (o sull'ancora indicata).
 */
export function addArea(sel: Selection, range: RangeCoords, anchor?: CellCoord): Selection {
  const r = normalizeRange(range);
  const a: CellCoord = anchor ?? { row: r.top, col: r.left };
  const areas = [...sel.areas, { range: r, anchor: a }];
  return withAreas(sel, areas, areas.length - 1, a);
}

// ---------------------------------------------------------------------------
// Movimento DENTRO la selezione (Invio / Tab su selezione multi-cella)
// ---------------------------------------------------------------------------

export type WithinDirection = 'next' | 'prev' | 'down' | 'up';

function indexOfCell(range: RangeCoords, c: CellCoord, colMajor: boolean): number {
  const h = range.bottom - range.top + 1;
  const w = range.right - range.left + 1;
  const dr = c.row - range.top;
  const dc = c.col - range.left;
  return colMajor ? dc * h + dr : dr * w + dc;
}

function cellAtIndex(range: RangeCoords, idx: number, colMajor: boolean): CellCoord {
  const h = range.bottom - range.top + 1;
  const w = range.right - range.left + 1;
  return colMajor
    ? { row: range.top + (idx % h), col: range.left + Math.floor(idx / h) }
    : { row: range.top + Math.floor(idx / w), col: range.left + (idx % w) };
}

/**
 * Invio / Tab quando la selezione contiene piu' di una cella.
 *
 * Comportamento Excel poco noto ma fondamentale per la data entry veloce: la
 * selezione fa da "modulo". Invio scende in colonna e a fine colonna riparte in
 * cima alla colonna SUCCESSIVA; dopo l'ultima cella si torna alla prima. Tab
 * scorre per righe e va a capo. Con piu' aree, il wrap passa all'area seguente.
 * Cosi' si compila un blocco senza mai toccare le frecce.
 */
export function moveWithinSelection(sel: Selection, dir: WithinDirection): Selection {
  const idx = activeAreaIndex(sel);
  const area = sel.areas[idx];
  if (!area) return sel;

  const colMajor = dir === 'down' || dir === 'up';
  const forward = dir === 'down' || dir === 'next';
  const count = rangeCellCount(area.range);

  // Se la cella attiva e' fuori dalla sua area (stato incoerente) si riparte dal
  // primo elemento invece di calcolare un indice negativo.
  const cur = rangeContains(area.range, sel.active)
    ? indexOfCell(area.range, sel.active, colMajor)
    : 0;
  const next = cur + (forward ? 1 : -1);

  if (next >= 0 && next < count) {
    return withAreas(sel, sel.areas, idx, cellAtIndex(area.range, next, colMajor));
  }

  // Wrap: area successiva/precedente (con una sola area si torna su se' stessa).
  const n = sel.areas.length;
  const nextIdx = forward ? (idx + 1) % n : (idx - 1 + n) % n;
  const nextArea = sel.areas[nextIdx];
  const nextCount = rangeCellCount(nextArea.range);
  const landing = forward ? 0 : nextCount - 1;
  return withAreas(sel, sel.areas, nextIdx, cellAtIndex(nextArea.range, landing, colMajor));
}

// ---------------------------------------------------------------------------
// Tab / Invio su selezione di una sola cella
// ---------------------------------------------------------------------------

export interface TabOptions {
  /** `true` per `Maiusc+Tab`. */
  readonly back?: boolean;
}

/**
 * `Tab` (o `Maiusc+Tab`) con una sola cella selezionata.
 *
 * Memorizza in `entryOrigin` la cella da cui la catena di Tab e' partita: e' il
 * dato che permette a Invio di riportare il cursore "a capo" sotto la prima
 * colonna della riga appena compilata. Tab successivi non lo sovrascrivono.
 */
export function tabFrom(sel: Selection, probe: GridProbe, opts: TabOptions = {}): Selection {
  if (!isSingleCellSelection(sel)) {
    return moveWithinSelection(sel, opts.back ? 'prev' : 'next');
  }
  const origin = sel.entryOrigin ?? sel.active;
  const target = step(probe, sel.active, opts.back ? 'left' : 'right');
  return {
    ...moveTo(sel, target, probe),
    entryOrigin: origin,
  };
}

export interface EnterOptions {
  /** `true` per `Maiusc+Invio`. */
  readonly back?: boolean;
  /** Opzione Excel "Sposta selezione dopo Invio"; default `down`. */
  readonly direction?: Direction;
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

/**
 * `Invio` (o `Maiusc+Invio`) con una sola cella selezionata.
 *
 * Se `entryOrigin` e' valorizzato — cioe' l'utente ha appena battuto uno o piu'
 * Tab — Invio non scende dalla cella corrente: torna alla COLONNA di partenza,
 * una riga sotto la riga di partenza, e chiude la catena. E' il "ritorno a capo"
 * che rende possibile compilare una tabella riga per riga senza frecce.
 */
export function enterFrom(sel: Selection, probe: GridProbe, opts: EnterOptions = {}): Selection {
  if (!isSingleCellSelection(sel)) {
    return moveWithinSelection(sel, opts.back ? 'up' : 'down');
  }
  const base = opts.direction ?? 'down';
  const dir: Direction = opts.back ? OPPOSITE[base] : base;

  // Il ritorno a capo vale solo per il movimento verticale: con l'opzione di
  // Excel impostata su destra/sinistra, Invio e' di fatto un secondo Tab.
  const vertical = dir === 'down' || dir === 'up';
  const from = sel.entryOrigin !== null && vertical ? sel.entryOrigin : sel.active;
  return moveTo(sel, step(probe, from, dir), probe);
}
