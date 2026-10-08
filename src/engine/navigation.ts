/**
 * Navigazione fedele a Excel (BUILD SPEC §3.1).
 *
 * Questo modulo calcola SOLO il bersaglio di uno spostamento: non conosce il DOM,
 * non conosce HyperFormula, non tocca lo stato. Tutto passa da `GridProbe`, che e'
 * la superficie minima (isFilled / limiti / used range / righe e colonne nascoste).
 * E' cio' che rende testabile al 100% la parte del progetto che, se sbagliata,
 * allena muscle memory sbagliata.
 *
 * Regola generale sulle righe/colonne nascoste, e' una differenza vera di Excel:
 *  - le FRECCE SEMPLICI le saltano (non puoi posare il cursore su una riga nascosta
 *    navigando con le frecce);
 *  - `Ctrl+Freccia` invece le ATTRAVERSA e ne considera il contenuto: una riga
 *    nascosta ma piena interrompe comunque il blocco e puo' diventare il bersaglio.
 * Chi implementa la griglia deve rispettare questa asimmetria, non "uniformarla".
 */

import type { CellCoord, RangeCoords } from './address';
import { LAST_COL, LAST_ROW } from './address';
import type { GridProbe } from './types';

export type Direction = 'up' | 'down' | 'left' | 'right';
export type VerticalDirection = 'up' | 'down';
export type HorizontalDirection = 'left' | 'right';

interface Delta {
  readonly dr: number;
  readonly dc: number;
}

const DELTAS: Record<Direction, Delta> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

// ---------------------------------------------------------------------------
// Utilita' interne
// ---------------------------------------------------------------------------

function maxRowOf(probe: GridProbe): number {
  return Math.min(probe.maxRow, LAST_ROW);
}

function maxColOf(probe: GridProbe): number {
  return Math.min(probe.maxCol, LAST_COL);
}

function inBounds(probe: GridProbe, row: number, col: number): boolean {
  return row >= 0 && row <= maxRowOf(probe) && col >= 0 && col <= maxColOf(probe);
}

/** Cella riportata dentro i limiti del foglio. */
export function clampToProbe(probe: GridProbe, c: CellCoord): CellCoord {
  return {
    row: Math.max(0, Math.min(maxRowOf(probe), c.row)),
    col: Math.max(0, Math.min(maxColOf(probe), c.col)),
  };
}

/**
 * Prima cella piena a partire da `start` (inclusa) andando in direzione `d`.
 *
 * La scansione e' limitata all'used range: fuori da li' il foglio e' vuoto per
 * definizione, e senza questo taglio un `Ctrl+Giu` su colonna vuota costerebbe
 * 1.048.576 chiamate a `isFilled`.
 */
function firstFilledFrom(probe: GridProbe, start: CellCoord, d: Delta): CellCoord | null {
  const used = probe.usedRange();
  if (!used) return null;

  if (d.dr !== 0) {
    if (start.col < used.left || start.col > used.right) return null;
    if (d.dr > 0) {
      const last = Math.min(maxRowOf(probe), used.bottom);
      for (let r = Math.max(start.row, used.top); r <= last; r++) {
        if (probe.isFilled(r, start.col)) return { row: r, col: start.col };
      }
    } else {
      const first = Math.max(0, used.top);
      for (let r = Math.min(start.row, used.bottom); r >= first; r--) {
        if (probe.isFilled(r, start.col)) return { row: r, col: start.col };
      }
    }
    return null;
  }

  if (start.row < used.top || start.row > used.bottom) return null;
  if (d.dc > 0) {
    const last = Math.min(maxColOf(probe), used.right);
    for (let c = Math.max(start.col, used.left); c <= last; c++) {
      if (probe.isFilled(start.row, c)) return { row: start.row, col: c };
    }
  } else {
    const first = Math.max(0, used.left);
    for (let c = Math.min(start.col, used.right); c >= first; c--) {
      if (probe.isFilled(start.row, c)) return { row: start.row, col: c };
    }
  }
  return null;
}

/** Bordo del foglio nella direzione `d`, mantenendo l'altra coordinata. */
function edgeIn(probe: GridProbe, from: CellCoord, d: Delta): CellCoord {
  if (d.dr > 0) return { row: maxRowOf(probe), col: from.col };
  if (d.dr < 0) return { row: 0, col: from.col };
  if (d.dc > 0) return { row: from.row, col: maxColOf(probe) };
  return { row: from.row, col: 0 };
}

// ---------------------------------------------------------------------------
// Ctrl+Freccia
// ---------------------------------------------------------------------------

/**
 * `Ctrl+Freccia`: salto al bordo del blocco dati.
 *
 * Algoritmo di Excel, nella sua forma esatta (e controintuitiva):
 *  1. se il passo successivo esce dal foglio -> non ci si muove;
 *  2. se la cella di partenza E la successiva sono entrambe piene -> si scorre
 *     finche' la cella SUCCESSIVA e' piena e si atterra sull'ULTIMA piena del
 *     blocco contiguo;
 *  3. altrimenti -> si scorre da `next` in avanti fino alla PRIMA cella piena;
 *     se non ce n'e' nessuna si finisce sul bordo del foglio.
 *
 * Il caso 3 spiega la stranezza piu' utile da allenare: da cella VUOTA con la
 * vicina PIENA si atterra su quella vicina, NON in fondo al blocco. Con dati e
 * intestazioni, e' la differenza fra un salto e tre.
 *
 * Le righe/colonne nascoste NON vengono saltate: Excel le attraversa e ne guarda
 * il contenuto (vedi nota in testa al file).
 */
export function jump(probe: GridProbe, from: CellCoord, dir: Direction): CellCoord {
  const d = DELTAS[dir];
  const next: CellCoord = { row: from.row + d.dr, col: from.col + d.dc };
  if (!inBounds(probe, next.row, next.col)) return from;

  if (probe.isFilled(from.row, from.col) && probe.isFilled(next.row, next.col)) {
    let cur = next;
    for (;;) {
      const n: CellCoord = { row: cur.row + d.dr, col: cur.col + d.dc };
      if (!inBounds(probe, n.row, n.col) || !probe.isFilled(n.row, n.col)) return cur;
      cur = n;
    }
  }

  return firstFilledFrom(probe, next, d) ?? edgeIn(probe, from, d);
}

// ---------------------------------------------------------------------------
// Freccia semplice
// ---------------------------------------------------------------------------

/**
 * Freccia semplice: un passo, saltando righe/colonne nascoste.
 * Se oltre la cella corrente ci sono solo celle nascoste (o il bordo), si resta fermi.
 */
export function step(probe: GridProbe, from: CellCoord, dir: Direction): CellCoord {
  const d = DELTAS[dir];
  let row = from.row + d.dr;
  let col = from.col + d.dc;
  while (inBounds(probe, row, col)) {
    const hidden = d.dr !== 0 ? probe.isRowHidden(row) : probe.isColHidden(col);
    if (!hidden) return { row, col };
    row += d.dr;
    col += d.dc;
  }
  return from;
}

// ---------------------------------------------------------------------------
// PgSu / PgGiu / Alt+PgSu / Alt+PgGiu
// ---------------------------------------------------------------------------

/**
 * Avanza di `count` indici VISIBILI a partire da `start`, fermandosi al bordo.
 * Conta solo cio' che si vede: una pagina di 30 righe con 10 righe nascoste in
 * mezzo scorre di 40 indici, esattamente come in Excel.
 */
function pageIndex(
  start: number,
  delta: number,
  count: number,
  last: number,
  isHidden: (i: number) => boolean,
): number {
  let landed = start;
  let cursor = start;
  let moved = 0;
  while (moved < count) {
    const nxt = cursor + delta;
    if (nxt < 0 || nxt > last) break;
    cursor = nxt;
    if (!isHidden(cursor)) {
      moved++;
      landed = cursor;
    }
  }
  return landed;
}

/** `PgSu` / `PgGiu`: uno schermo di righe, stessa colonna. */
export function pageJump(
  probe: GridProbe,
  from: CellCoord,
  dir: VerticalDirection,
  visibleRows: number,
): CellCoord {
  const count = Math.max(1, Math.floor(visibleRows));
  const row = pageIndex(from.row, dir === 'down' ? 1 : -1, count, maxRowOf(probe), (i) =>
    probe.isRowHidden(i),
  );
  return { row, col: from.col };
}

/** `Alt+PgSu` / `Alt+PgGiu`: uno schermo di colonne, stessa riga. */
export function pageJumpH(
  probe: GridProbe,
  from: CellCoord,
  dir: HorizontalDirection,
  visibleCols: number,
): CellCoord {
  const count = Math.max(1, Math.floor(visibleCols));
  const col = pageIndex(from.col, dir === 'right' ? 1 : -1, count, maxColOf(probe), (i) =>
    probe.isColHidden(i),
  );
  return { row: from.row, col };
}

// ---------------------------------------------------------------------------
// Home / Ctrl+Home / Ctrl+End
// ---------------------------------------------------------------------------

/**
 * `Home`: colonna A della riga corrente.
 * Nota: a differenza di `Ctrl+Home` NON tiene conto dei riquadri bloccati, va
 * sempre in colonna 0.
 */
export function homeOfRow(_probe: GridProbe, from: CellCoord): CellCoord {
  return { row: from.row, col: 0 };
}

/**
 * `Ctrl+Home`: A1 — ma con i riquadri bloccati va sulla prima cella SOTTO e a
 * DESTRA del blocco congelato, perche' le celle congelate non sono raggiungibili
 * scorrendo. E' la ragione per cui in un modello con header bloccato Ctrl+Home
 * non porta su A1 ma, tipicamente, su B6.
 */
export function ctrlHome(probe: GridProbe): CellCoord {
  return clampToProbe(probe, { row: probe.frozenRows, col: probe.frozenCols });
}

/**
 * `Ctrl+End`: angolo in basso a destra dell'area utilizzata; A1 su foglio vuoto.
 *
 * Attenzione alla stranezza: la cella di arrivo puo' essere VUOTA, perche' e'
 * l'incrocio fra ultima riga usata e ultima colonna usata, non l'ultima cella
 * scritta. Ed e' "appiccicosa": in Excel l'used range non si restringe finche'
 * non si salva. Qui la stickiness e' responsabilita' del `GridProbe`.
 */
export function ctrlEnd(probe: GridProbe): CellCoord {
  const used = probe.usedRange();
  if (!used) return { row: 0, col: 0 };
  return clampToProbe(probe, { row: used.bottom, col: used.right });
}

// ---------------------------------------------------------------------------
// Ctrl+Maiusc+8 — regione corrente
// ---------------------------------------------------------------------------

/** Vero se almeno una cella della riga `row` fra `left` e `right` e' piena. */
function anyFilledInRow(probe: GridProbe, row: number, left: number, right: number): boolean {
  for (let c = left; c <= right; c++) {
    if (probe.isFilled(row, c)) return true;
  }
  return false;
}

function anyFilledInCol(probe: GridProbe, col: number, top: number, bottom: number): boolean {
  for (let r = top; r <= bottom; r++) {
    if (probe.isFilled(r, col)) return true;
  }
  return false;
}

/**
 * `Ctrl+Maiusc+8` (e primo `Ctrl+A`): blocco contiguo attorno alla cella,
 * delimitato da righe e colonne interamente vuote.
 *
 * L'espansione guarda la riga/colonna adiacente allargata di una posizione per
 * lato: e' cio' che rende la regione DIAGONALMENTE connessa, come in Excel.
 * Con dati in B2 e C3 la regione e' B2:C3, non la sola B2 — sorprende, ma e' il
 * comportamento vero, e conta perche' un blocco "a scaletta" (etichette sfalsate)
 * viene preso tutto.
 */
export function currentRegion(probe: GridProbe, from: CellCoord): RangeCoords {
  const lastRow = maxRowOf(probe);
  const lastCol = maxColOf(probe);
  const start = clampToProbe(probe, from);

  let top = start.row;
  let bottom = start.row;
  let left = start.col;
  let right = start.col;

  for (;;) {
    let grown = false;

    const probeLeft = Math.max(0, left - 1);
    const probeRight = Math.min(lastCol, right + 1);
    if (top > 0 && anyFilledInRow(probe, top - 1, probeLeft, probeRight)) {
      top--;
      grown = true;
    }
    if (bottom < lastRow && anyFilledInRow(probe, bottom + 1, probeLeft, probeRight)) {
      bottom++;
      grown = true;
    }

    const probeTop = Math.max(0, top - 1);
    const probeBottom = Math.min(lastRow, bottom + 1);
    if (left > 0 && anyFilledInCol(probe, left - 1, probeTop, probeBottom)) {
      left--;
      grown = true;
    }
    if (right < lastCol && anyFilledInCol(probe, right + 1, probeTop, probeBottom)) {
      right++;
      grown = true;
    }

    if (!grown) return { top, left, bottom, right };
  }
}

/** Intero foglio, come lo intende `Ctrl+A` al secondo colpo. */
export function wholeSheetRange(probe: GridProbe): RangeCoords {
  return { top: 0, left: 0, bottom: maxRowOf(probe), right: maxColOf(probe) };
}
