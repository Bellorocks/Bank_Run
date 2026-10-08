import { describe, it, expect } from 'vitest';
import {
  jump,
  step,
  pageJump,
  pageJumpH,
  homeOfRow,
  ctrlHome,
  ctrlEnd,
  currentRegion,
  wholeSheetRange,
} from './navigation';
import type { CellCoord, RangeCoords } from './address';
import { LAST_COL, LAST_ROW, a1ToCoord, coordToA1, rangeToA1 } from './address';
import type { GridProbe } from './types';

// ---------------------------------------------------------------------------
// GridProbe finto costruito da una matrice di stringhe.
// Una cella e' "piena" se la stringa non e' vuota.
// (Volutamente duplicato in selection.test.ts: importare un file .test da un
//  altro farebbe eseguire due volte le sue suite.)
// ---------------------------------------------------------------------------

interface ProbeOptions {
  readonly maxRow?: number;
  readonly maxCol?: number;
  readonly hiddenRows?: readonly number[];
  readonly hiddenCols?: readonly number[];
  readonly frozenRows?: number;
  readonly frozenCols?: number;
}

function probeFrom(rows: string[][], opts: ProbeOptions = {}): GridProbe {
  const hiddenRows = new Set(opts.hiddenRows ?? []);
  const hiddenCols = new Set(opts.hiddenCols ?? []);

  const isFilled = (row: number, col: number): boolean => {
    if (row < 0 || row >= rows.length) return false;
    const v = rows[row][col] as string | undefined;
    return v !== undefined && v.length > 0;
  };

  let top = Number.POSITIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let bottom = -1;
  let right = -1;
  for (let r = 0; r < rows.length; r++) {
    const line = rows[r];
    for (let c = 0; c < line.length; c++) {
      if (!isFilled(r, c)) continue;
      if (r < top) top = r;
      if (r > bottom) bottom = r;
      if (c < left) left = c;
      if (c > right) right = c;
    }
  }
  const used: RangeCoords | null = bottom < 0 ? null : { top, left, bottom, right };

  return {
    isFilled,
    maxRow: opts.maxRow ?? LAST_ROW,
    maxCol: opts.maxCol ?? LAST_COL,
    usedRange: () => used,
    isRowHidden: (row: number) => hiddenRows.has(row),
    isColHidden: (col: number) => hiddenCols.has(col),
    frozenRows: opts.frozenRows ?? 0,
    frozenCols: opts.frozenCols ?? 0,
  };
}

/** Coordinata da notazione A1, per test leggibili. */
function cc(a1: string): CellCoord {
  const c = a1ToCoord(a1);
  if (!c) throw new Error(`riferimento non valido nel test: ${a1}`);
  return c;
}

/**
 * Griglia di lavoro. Colonna A: blocco A1:A2, buco in A3, blocco A4:A5.
 * D4 e' l'ultima colonna usata, D5 e' vuota (serve per Ctrl+End).
 *
 *      A    B    C    D
 *  1   A1   B1   .    D1
 *  2   A2   B2   .    .
 *  3   .    .    .    .
 *  4   A4   .    C4   D4
 *  5   A5   .    C5   .
 */
const GRID: string[][] = [
  ['A1', 'B1', '', 'D1'],
  ['A2', 'B2', '', ''],
  ['', '', '', ''],
  ['A4', '', 'C4', 'D4'],
  ['A5', '', 'C5', ''],
];

describe('jump — Ctrl+Freccia', () => {
  const p = probeFrom(GRID);

  it('da cella piena con vicina piena atterra sull\'ultima piena del blocco', () => {
    expect(coordToA1(jump(p, cc('A1'), 'down'))).toBe('A2');
  });

  it('da cella piena con vicina vuota salta ai vuoti e prende la prima piena', () => {
    expect(coordToA1(jump(p, cc('A2'), 'down'))).toBe('A4');
  });

  it('da cella VUOTA con vicina piena atterra sulla vicina, non in fondo al blocco', () => {
    // La stranezza piu' importante di Ctrl+Freccia: partendo da A3 (vuota) si
    // arriva su A4, il BORDO del blocco, non su A5.
    expect(coordToA1(jump(p, cc('A3'), 'down'))).toBe('A4');
  });

  it('da cella vuota con vicina vuota salta alla prima piena piu\' avanti', () => {
    // B3 vuota, B4 e B5 vuote: verso l'alto la prima piena e' B2.
    expect(coordToA1(jump(p, cc('B4'), 'up'))).toBe('B2');
  });

  it('senza nessuna cella piena davanti atterra sul bordo del foglio', () => {
    // A5 e' l'ultima piena della colonna: Ctrl+Giu finisce sull'ultima riga.
    expect(coordToA1(jump(p, cc('A5'), 'down'))).toBe(`A${LAST_ROW + 1}`);
  });

  it('da colonna interamente vuota va all\'ultima riga del foglio', () => {
    expect(coordToA1(jump(p, cc('F1'), 'down'))).toBe(`F${LAST_ROW + 1}`);
  });

  it('verso l\'alto da colonna vuota va a riga 1', () => {
    expect(coordToA1(jump(p, cc('F9'), 'up'))).toBe('F1');
  });

  it('verso destra da riga vuota va all\'ultima colonna del foglio', () => {
    expect(coordToA1(jump(p, cc('A3'), 'right'))).toBe('XFD3');
  });

  it('non si muove se il passo successivo esce dal foglio', () => {
    expect(coordToA1(jump(p, cc('A1'), 'up'))).toBe('A1');
    expect(coordToA1(jump(p, cc('A1'), 'left'))).toBe('A1');
    const small = probeFrom(GRID, { maxRow: 4, maxCol: 3 });
    expect(coordToA1(jump(small, cc('D5'), 'down'))).toBe('D5');
    expect(coordToA1(jump(small, cc('D5'), 'right'))).toBe('D5');
  });

  it('si ferma sul bordo quando il blocco tocca il bordo del foglio', () => {
    // Foglio limitato a 5 righe: il blocco A4:A5 finisce esattamente sul bordo.
    const small = probeFrom(GRID, { maxRow: 4, maxCol: 3 });
    expect(coordToA1(jump(small, cc('A4'), 'down'))).toBe('A5');
    expect(coordToA1(jump(small, cc('A3'), 'down'))).toBe('A4');
  });

  it('orizzontale: blocco contiguo, poi salto sui vuoti', () => {
    expect(coordToA1(jump(p, cc('A1'), 'right'))).toBe('B1'); // A1,B1 pieni, C1 vuota
    expect(coordToA1(jump(p, cc('B1'), 'right'))).toBe('D1'); // salta C1 vuota
    expect(coordToA1(jump(p, cc('D1'), 'left'))).toBe('B1'); // da piena con vicina vuota
    expect(coordToA1(jump(p, cc('D1'), 'right'))).toBe('XFD1');
  });

  it('un blocco di una sola cella si comporta come cella isolata', () => {
    // C4:C5 e' un blocco di due; C3 (vuota) sopra: Ctrl+Giu da C1 prende C4.
    expect(coordToA1(jump(p, cc('C1'), 'down'))).toBe('C4');
    expect(coordToA1(jump(p, cc('C4'), 'down'))).toBe('C5');
  });

  it('ATTRAVERSA le righe nascoste e ne considera il contenuto', () => {
    // Differenza voluta rispetto alle frecce semplici: per Ctrl+Freccia una riga
    // nascosta ma piena e' un bersaglio valido e interrompe comunque il blocco.
    const hidden = probeFrom(GRID, { hiddenRows: [3] });
    expect(coordToA1(jump(hidden, cc('A3'), 'down'))).toBe('A4');
    expect(coordToA1(jump(hidden, cc('A2'), 'down'))).toBe('A4');
  });
});

describe('step — freccia semplice', () => {
  it('si sposta di una cella, piena o vuota che sia', () => {
    const p = probeFrom(GRID);
    expect(coordToA1(step(p, cc('A1'), 'down'))).toBe('A2');
    expect(coordToA1(step(p, cc('A2'), 'down'))).toBe('A3'); // vuota: ci si posa lo stesso
    expect(coordToA1(step(p, cc('B2'), 'right'))).toBe('C2');
    expect(coordToA1(step(p, cc('B2'), 'left'))).toBe('A2');
    expect(coordToA1(step(p, cc('B2'), 'up'))).toBe('B1');
  });

  it('resta fermo sul bordo del foglio', () => {
    const p = probeFrom(GRID, { maxRow: 4, maxCol: 3 });
    expect(coordToA1(step(p, cc('A1'), 'up'))).toBe('A1');
    expect(coordToA1(step(p, cc('A1'), 'left'))).toBe('A1');
    expect(coordToA1(step(p, cc('D5'), 'down'))).toBe('D5');
    expect(coordToA1(step(p, cc('D5'), 'right'))).toBe('D5');
  });

  it('SALTA le righe nascoste', () => {
    const p = probeFrom(GRID, { hiddenRows: [1] });
    expect(coordToA1(step(p, cc('A1'), 'down'))).toBe('A3');
    expect(coordToA1(step(p, cc('A3'), 'up'))).toBe('A1');
  });

  it('salta piu\' righe nascoste consecutive', () => {
    const p = probeFrom(GRID, { hiddenRows: [1, 2, 3] });
    expect(coordToA1(step(p, cc('A1'), 'down'))).toBe('A5');
  });

  it('salta le colonne nascoste', () => {
    const p = probeFrom(GRID, { hiddenCols: [1, 2] });
    expect(coordToA1(step(p, cc('A1'), 'right'))).toBe('D1');
    expect(coordToA1(step(p, cc('D1'), 'left'))).toBe('A1');
  });

  it('resta fermo se oltre la cella corrente e\' tutto nascosto', () => {
    const p = probeFrom(GRID, { maxRow: 4, hiddenRows: [3, 4] });
    expect(coordToA1(step(p, cc('A3'), 'down'))).toBe('A3');
  });
});

describe('pageJump — PgSu / PgGiu', () => {
  const p = probeFrom(GRID);

  it('scende di una schermata di righe', () => {
    expect(coordToA1(pageJump(p, cc('B11'), 'down', 30))).toBe('B41');
  });

  it('sale di una schermata di righe', () => {
    expect(coordToA1(pageJump(p, cc('B41'), 'up', 30))).toBe('B11');
  });

  it('si ferma al bordo invece di uscire dal foglio', () => {
    expect(coordToA1(pageJump(p, cc('B6'), 'up', 30))).toBe('B1');
    const small = probeFrom(GRID, { maxRow: 19 });
    expect(coordToA1(pageJump(small, cc('B11'), 'down', 30))).toBe('B20');
  });

  it('conta solo le righe VISIBILI: le nascoste allungano il salto', () => {
    // 5 righe nascoste dentro la schermata: 10 righe viste = 15 indici scorsi.
    const hidden = probeFrom(GRID, { hiddenRows: [5, 6, 7, 8, 9] });
    expect(coordToA1(pageJump(hidden, cc('A1'), 'down', 10))).toBe('A16');
  });

  it('atterra sull\'ultima riga VISIBILE se il bordo e\' nascosto', () => {
    const p2 = probeFrom(GRID, { maxRow: 12, hiddenRows: [11, 12] });
    expect(coordToA1(pageJump(p2, cc('A1'), 'down', 20))).toBe('A11');
  });

  it('non cambia colonna', () => {
    expect(coordToA1(pageJump(p, cc('D11'), 'down', 30))).toBe('D41');
  });
});

describe('pageJumpH — Alt+PgSu / Alt+PgGiu', () => {
  const p = probeFrom(GRID);

  it('si sposta di una schermata di colonne', () => {
    expect(coordToA1(pageJumpH(p, cc('D4'), 'right', 8))).toBe('L4');
    expect(coordToA1(pageJumpH(p, cc('L4'), 'left', 8))).toBe('D4');
  });

  it('si ferma sul bordo del foglio', () => {
    expect(coordToA1(pageJumpH(p, cc('C1'), 'left', 8))).toBe('A1');
    const small = probeFrom(GRID, { maxCol: 5 });
    expect(coordToA1(pageJumpH(small, cc('A1'), 'right', 20))).toBe('F1');
  });

  it('conta solo le colonne visibili', () => {
    const hidden = probeFrom(GRID, { hiddenCols: [1, 2, 3] });
    expect(coordToA1(pageJumpH(hidden, cc('A1'), 'right', 3))).toBe('G1');
  });
});

describe('Home / Ctrl+Home / Ctrl+End', () => {
  it('Home va in colonna A restando sulla riga', () => {
    const p = probeFrom(GRID);
    expect(coordToA1(homeOfRow(p, cc('H12')))).toBe('A12');
  });

  it('Home ignora i riquadri bloccati, a differenza di Ctrl+Home', () => {
    const p = probeFrom(GRID, { frozenRows: 5, frozenCols: 1 });
    expect(coordToA1(homeOfRow(p, cc('H12')))).toBe('A12');
  });

  it('Ctrl+Home va in A1 senza riquadri bloccati', () => {
    expect(coordToA1(ctrlHome(probeFrom(GRID)))).toBe('A1');
  });

  it('Ctrl+Home va sotto e a destra dei riquadri bloccati', () => {
    const p = probeFrom(GRID, { frozenRows: 5, frozenCols: 1 });
    expect(coordToA1(ctrlHome(p))).toBe('B6');
  });

  it('Ctrl+End va all\'angolo in basso a destra dell\'area utilizzata', () => {
    // Nota: D5 e' VUOTA. Ctrl+End e' l'incrocio fra ultima riga e ultima colonna
    // usate, non l'ultima cella scritta: in Excel finisce spesso su una cella vuota.
    expect(coordToA1(ctrlEnd(probeFrom(GRID)))).toBe('D5');
  });

  it('Ctrl+End su foglio vuoto resta in A1', () => {
    expect(coordToA1(ctrlEnd(probeFrom([['', ''], ['', '']])))).toBe('A1');
  });

  it('wholeSheetRange copre tutto il foglio', () => {
    expect(rangeToA1(wholeSheetRange(probeFrom(GRID)))).toBe(`A1:XFD${LAST_ROW + 1}`);
  });
});

describe('currentRegion — Ctrl+Maiusc+8', () => {
  /**
   *      A     B     C     D
   *  1   Rev   FY23  FY24  .
   *  2   EBIT  10    12    .
   *  3   Capex 3     4     .
   *  4   .     .     .     .
   *  5   Note  .     .     .
   */
  const TABLE: string[][] = [
    ['Rev', 'FY23', 'FY24', ''],
    ['EBIT', '10', '12', ''],
    ['Capex', '3', '4', ''],
    ['', '', '', ''],
    ['Note', '', '', ''],
  ];

  it('prende il blocco contiguo attorno alla cella', () => {
    const p = probeFrom(TABLE);
    expect(rangeToA1(currentRegion(p, cc('B2')))).toBe('A1:C3');
  });

  it('si ferma sulla riga interamente vuota', () => {
    const p = probeFrom(TABLE);
    expect(rangeToA1(currentRegion(p, cc('A5')))).toBe('A5');
  });

  it('include la cella vuota di partenza se e\' adiacente al blocco', () => {
    const p = probeFrom(TABLE);
    expect(rangeToA1(currentRegion(p, cc('D2')))).toBe('A1:D3');
  });

  it('una cella isolata e\' regione di se\' stessa', () => {
    const p = probeFrom(TABLE);
    expect(rangeToA1(currentRegion(p, cc('H9')))).toBe('H9');
  });

  it('la regione e\' connessa anche in DIAGONALE', () => {
    // Excel delimita con righe/colonne interamente vuote: una scaletta di
    // etichette sfalsate viene presa tutta, anche se nessuna cella e' adiacente
    // ortogonalmente alla precedente.
    const stair = probeFrom([
      ['x', '', ''],
      ['', 'y', ''],
      ['', '', 'z'],
    ]);
    expect(rangeToA1(currentRegion(stair, cc('A1')))).toBe('A1:C3');
  });

  it('non salta la colonna interamente vuota che separa due blocchi', () => {
    const two = probeFrom([
      ['a', 'b', '', 'p', 'q'],
      ['c', 'd', '', 'r', 's'],
    ]);
    expect(rangeToA1(currentRegion(two, cc('A1')))).toBe('A1:B2');
    expect(rangeToA1(currentRegion(two, cc('E2')))).toBe('D1:E2');
  });

  it('un buco dentro il blocco non lo spezza', () => {
    const holed = probeFrom([
      ['a', 'b', 'c'],
      ['d', '', 'f'],
      ['g', 'h', 'i'],
    ]);
    expect(rangeToA1(currentRegion(holed, cc('B2')))).toBe('A1:C3');
  });

  it('funziona su foglio completamente vuoto', () => {
    const empty = probeFrom([]);
    expect(rangeToA1(currentRegion(empty, cc('C3')))).toBe('C3');
  });
});
