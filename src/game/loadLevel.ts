/**
 * Da `LevelInstance` a `Workbook` giocabile.
 *
 * Il contenuto iniziale viene passato a `Workbook.create` come matrici, non
 * scritto cella per cella: cosi' la costruzione del livello NON finisce nello
 * stack di undo. Se ci finisse, il primo Ctrl+Z dell'utente smonterebbe il
 * livello invece di annullare la sua ultima mossa.
 */

import { a1ToCoord, colToLetters } from '../engine/address';
import { Workbook, type SheetInit } from '../engine/workbook';
import type { CellRaw } from '../engine/types';
import type { LevelInstance, SheetSpec } from '../content/types';

export interface LoadedLevel {
  readonly workbook: Workbook;
  readonly instance: LevelInstance;
  /** Foglio e cella su cui posizionare il cursore all'avvio. */
  readonly start: { sheet: number; row: number; col: number };
}

export function loadInstance(instance: LevelInstance): LoadedLevel {
  const inits: SheetInit[] = instance.sheets.map(toSheetInit);
  const workbook = Workbook.create(inits);

  for (const spec of instance.sheets) {
    const sheetId = workbook.sheetId(spec.name);
    const layout = workbook.layout(sheetId);

    for (const cell of spec.cells) {
      const coord = a1ToCoord(cell.ref);
      if (!coord) throw new Error(`Livello ${instance.templateId}: riferimento "${cell.ref}" non valido`);
      if (cell.style) workbook.setStyle(sheetId, coord, cell.style, 'setup');
      const locked = cell.locked ?? spec.unlockedByDefault === false;
      if (locked) {
        workbook.setLocked(sheetId, { top: coord.row, left: coord.col, bottom: coord.row, right: coord.col }, true);
      }
    }

    if (spec.colWidths) {
      for (const [lettera, px] of Object.entries(spec.colWidths)) {
        const coord = a1ToCoord(`${lettera}1`);
        if (coord) layout.colWidths.set(coord.col, px);
      }
    }
    layout.frozenRows = spec.frozenRows ?? 0;
    layout.frozenCols = spec.frozenCols ?? 0;
  }

  // Gli stili del setup non devono essere annullabili piu' del contenuto.
  workbook.clearHistory();

  if (instance.iterativeCalculation) {
    workbook.setIterative({ enabled: true });
    workbook.recalcIterative();
  }

  return { workbook, instance, start: resolveStart(workbook, instance) };
}

function toSheetInit(spec: SheetSpec): SheetInit {
  let maxRow = -1;
  let maxCol = -1;
  const puntati: { row: number; col: number; content: CellRaw }[] = [];

  for (const cell of spec.cells) {
    const coord = a1ToCoord(cell.ref);
    if (!coord) throw new Error(`Foglio "${spec.name}": riferimento "${cell.ref}" non valido`);
    if (cell.content === null || cell.content === undefined) continue;
    puntati.push({ ...coord, content: cell.content });
    if (coord.row > maxRow) maxRow = coord.row;
    if (coord.col > maxCol) maxCol = coord.col;
  }

  if (maxRow < 0) return { name: spec.name };

  const data: CellRaw[][] = Array.from({ length: maxRow + 1 }, () =>
    Array.from({ length: maxCol + 1 }, () => null),
  );
  for (const c of puntati) data[c.row][c.col] = c.content;

  return { name: spec.name, data: data as SheetInit['data'] };
}

function resolveStart(wb: Workbook, instance: LevelInstance): LoadedLevel['start'] {
  const spec = instance.startAt;
  if (spec) {
    const bang = spec.lastIndexOf('!');
    if (bang > 0) {
      const nome = unquote(spec.slice(0, bang));
      const coord = a1ToCoord(spec.slice(bang + 1));
      if (coord && wb.sheetNames().includes(nome)) {
        return { sheet: wb.sheetId(nome), row: coord.row, col: coord.col };
      }
    }
  }
  // Senza indicazione: la prima cella libera del primo task, che e' dove
  // l'utente deve comunque andare.
  const primo = instance.tasks[0];
  if (primo) {
    const bang = primo.targetCell.lastIndexOf('!');
    const nome = unquote(primo.targetCell.slice(0, bang));
    const coord = a1ToCoord(primo.targetCell.slice(bang + 1).split(':')[0]);
    if (coord && wb.sheetNames().includes(nome)) {
      return { sheet: wb.sheetId(nome), row: coord.row, col: coord.col };
    }
  }
  return { sheet: wb.sheetIds()[0] ?? 0, row: 0, col: 0 };
}

function unquote(s: string): string {
  return s.startsWith("'") && s.endsWith("'") ? s.slice(1, -1).replace(/''/g, "'") : s;
}

/** Comodo nei test e nei tutorial: scrive una soluzione data in notazione A1 qualificata. */
export function applySolution(wb: Workbook, soluzione: Readonly<Record<string, CellRaw>>): void {
  for (const [ref, valore] of Object.entries(soluzione)) {
    const bang = ref.lastIndexOf('!');
    if (bang < 0) throw new Error(`applySolution: "${ref}" deve essere qualificato col foglio`);
    const sheetId = wb.sheetId(unquote(ref.slice(0, bang)));
    const coord = a1ToCoord(ref.slice(bang + 1));
    if (!coord) throw new Error(`applySolution: "${ref}" non e' un riferimento valido`);
    wb.setContents(sheetId, coord, valore, 'soluzione');
  }
}

/** Riempie un rettangolo copiando la formula dell'angolo in alto a sinistra. Simula Ctrl+D / Ctrl+R. */
export function fillFrom(
  wb: Workbook,
  sheetName: string,
  origine: string,
  bersaglio: { rows: number; cols: number },
  shift: (formula: string, dRow: number, dCol: number) => string,
): void {
  const sheetId = wb.sheetId(sheetName);
  const start = a1ToCoord(origine);
  if (!start) throw new Error(`fillFrom: "${origine}" non valido`);
  const base = wb.getFormula(sheetId, start);
  if (base === undefined) throw new Error(`fillFrom: ${origine} non contiene una formula`);

  for (let r = 0; r < bersaglio.rows; r++) {
    for (let c = 0; c < bersaglio.cols; c++) {
      if (r === 0 && c === 0) continue;
      wb.setContents(
        sheetId,
        { row: start.row + r, col: start.col + c },
        shift(base, r, c),
        'riempimento',
      );
    }
  }
}

/** Etichetta leggibile di una cella, per i messaggi di test. */
export function refOf(row: number, col: number): string {
  return `${colToLetters(col)}${row + 1}`;
}
