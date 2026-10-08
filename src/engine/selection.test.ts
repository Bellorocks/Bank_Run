import { describe, it, expect } from 'vitest';
import {
  moveTo,
  extendTo,
  moveAndExtend,
  selectRow,
  selectCol,
  selectAll,
  addArea,
  moveWithinSelection,
  tabFrom,
  enterFrom,
  selectionCellCount,
  isSingleCellSelection,
} from './selection';
import type { CellCoord, RangeCoords } from './address';
import { LAST_COL, LAST_ROW, a1ToCoord, a1ToRange, coordToA1, rangeToA1 } from './address';
import type { GridProbe, Selection } from './types';
import { singleCellSelection } from './types';

// ---------------------------------------------------------------------------
// GridProbe finto (stesso helper di navigation.test.ts: duplicato di proposito,
// importare un file .test da un altro ne farebbe eseguire due volte le suite).
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
    for (let c = 0; c < rows[r].length; c++) {
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

function cc(a1: string): CellCoord {
  const c = a1ToCoord(a1);
  if (!c) throw new Error(`riferimento non valido nel test: ${a1}`);
  return c;
}

function rr(a1: string): RangeCoords {
  const r = a1ToRange(a1);
  if (!r) throw new Error(`range non valido nel test: ${a1}`);
  return r;
}

/** Selezione di partenza: una cella sola sul foglio 0. */
function at(a1: string): Selection {
  return singleCellSelection(0, cc(a1));
}

/**
 * Selezione rettangolare con la cella attiva dove serve al test.
 *
 * Non si puo' usare `extendTo` per questo: da contratto lascia l'attiva
 * sull'estremo MOBILE, mentre dopo una selezione col mouse Excel mostra l'attiva
 * sull'ancora ed e' da li' che parte la data entry con Invio/Tab.
 */
function blockSel(rangeA1: string, activeA1: string): Selection {
  const r = rr(rangeA1);
  return {
    sheet: 0,
    areas: [{ range: r, anchor: { row: r.top, col: r.left } }],
    activeArea: 0,
    active: cc(activeA1),
    entryOrigin: null,
    extendMode: false,
  };
}

const active = (s: Selection): string => coordToA1(s.active);
const areas = (s: Selection): string[] => s.areas.map((a) => rangeToA1(a.range));
const anchors = (s: Selection): string[] => s.areas.map((a) => coordToA1(a.anchor));

/** Stessa griglia dei test di navigazione: A1:A2, buco, A4:A5, B1:B2, D1, C4:C5, D4. */
const GRID: string[][] = [
  ['A1', 'B1', '', 'D1'],
  ['A2', 'B2', '', ''],
  ['', '', '', ''],
  ['A4', '', 'C4', 'D4'],
  ['A5', '', 'C5', ''],
];

const P = probeFrom(GRID);

describe('moveTo — click o freccia semplice', () => {
  it('collassa la selezione su una cella sola, ancora inclusa', () => {
    const wide = extendTo(at('B2'), cc('E7'));
    const s = moveTo(wide, cc('C3'), P);
    expect(areas(s)).toEqual(['C3']);
    expect(anchors(s)).toEqual(['C3']);
    expect(active(s)).toBe('C3');
    expect(isSingleCellSelection(s)).toBe(true);
  });

  it('azzera entryOrigin: la catena di Tab si interrompe', () => {
    const tabbed = tabFrom(at('B3'), P);
    expect(tabbed.entryOrigin).not.toBeNull();
    expect(moveTo(tabbed, cc('F9'), P).entryOrigin).toBeNull();
  });

  it('riporta il bersaglio dentro i limiti del foglio', () => {
    const small = probeFrom(GRID, { maxRow: 4, maxCol: 3 });
    expect(active(moveTo(at('A1'), { row: 99, col: 99 }, small))).toBe('D5');
    expect(active(moveTo(at('A1'), { row: -3, col: -1 }, small))).toBe('A1');
  });
});

describe('extendTo — Maiusc+click', () => {
  it('tiene ferma l\'ancora e muove la cella attiva', () => {
    const s = extendTo(at('B2'), cc('D5'));
    expect(areas(s)).toEqual(['B2:D5']);
    expect(anchors(s)).toEqual(['B2']);
    expect(active(s)).toBe('D5');
    expect(selectionCellCount(s)).toBe(12);
  });

  it('estende anche all\'indietro rispetto all\'ancora', () => {
    const s = extendTo(at('C3'), cc('A1'));
    expect(areas(s)).toEqual(['A1:C3']);
    expect(anchors(s)).toEqual(['C3']); // l'ancora NON diventa l'angolo in alto a sinistra
    expect(active(s)).toBe('A1');
  });

  it('una seconda estensione riparte sempre dall\'ancora, non dal bordo', () => {
    const s = extendTo(extendTo(at('C3'), cc('A1')), cc('E5'));
    expect(areas(s)).toEqual(['C3:E5']);
    expect(anchors(s)).toEqual(['C3']);
  });

  it('modifica solo l\'area attiva di una selezione multipla', () => {
    const multi = addArea(extendTo(at('A1'), cc('A3')), rr('C1:C3'));
    const s = extendTo(multi, cc('D4'));
    expect(areas(s)).toEqual(['A1:A3', 'C1:D4']);
    expect(s.activeArea).toBe(1);
  });

  it('azzera entryOrigin', () => {
    const tabbed = tabFrom(at('B3'), P);
    expect(extendTo(tabbed, cc('F9')).entryOrigin).toBeNull();
  });
});

describe('moveAndExtend — Maiusc+Freccia e Ctrl+Maiusc+Freccia', () => {
  it('Maiusc+Giu allunga di una riga per volta', () => {
    const one = moveAndExtend(at('B2'), P, 'down');
    expect(areas(one)).toEqual(['B2:B3']);
    const two = moveAndExtend(one, P, 'down');
    expect(areas(two)).toEqual(['B2:B4']);
    expect(anchors(two)).toEqual(['B2']);
    expect(active(two)).toBe('B4');
  });

  it('Maiusc+Su dall\'ancora inverte il rettangolo senza spostare l\'ancora', () => {
    const s = moveAndExtend(moveAndExtend(at('B3'), P, 'up'), P, 'up');
    expect(areas(s)).toEqual(['B1:B3']);
    expect(anchors(s)).toEqual(['B3']);
    expect(active(s)).toBe('B1');
  });

  it('Ctrl+Maiusc+Giu estende fino alla fine del blocco', () => {
    const s = moveAndExtend(at('A1'), P, 'down', { jump: true });
    expect(areas(s)).toEqual(['A1:A2']); // A1:A2 e' il blocco, A3 e' vuota
    expect(active(s)).toBe('A2');
  });

  it('un secondo Ctrl+Maiusc+Giu riparte dalla CELLA ATTIVA e scavalca il buco', () => {
    const s = moveAndExtend(moveAndExtend(at('A1'), P, 'down', { jump: true }), P, 'down', {
      jump: true,
    });
    expect(areas(s)).toEqual(['A1:A4']);
    expect(active(s)).toBe('A4');
  });

  it('il salto si calcola dall\'attiva, quindi puo\' RIDURRE la selezione', () => {
    // Selezione costruita all'insu': ancora A5, attiva A1. Ctrl+Maiusc+Giu parte
    // da A1 (non dal bordo inferiore) e atterra su A2: il rettangolo si accorcia.
    const upwards = extendTo(at('A5'), cc('A1'));
    expect(areas(upwards)).toEqual(['A1:A5']);
    const s = moveAndExtend(upwards, P, 'down', { jump: true });
    expect(areas(s)).toEqual(['A2:A5']);
    expect(anchors(s)).toEqual(['A5']);
    expect(active(s)).toBe('A2');
  });

  it('Ctrl+Maiusc+Destra su riga vuota arriva all\'ultima colonna del foglio', () => {
    const s = moveAndExtend(at('A3'), P, 'right', { jump: true });
    expect(areas(s)).toEqual([`A3:XFD3`]);
  });

  it('Maiusc+Freccia salta le colonne nascoste ma le include nel rettangolo', () => {
    const hidden = probeFrom(GRID, { hiddenCols: [1, 2] });
    const s = moveAndExtend(at('A1'), hidden, 'right');
    // La cella attiva finisce su D1, e B1:C1 restano dentro la selezione: un
    // rettangolo non puo' "bucare" le colonne nascoste.
    expect(areas(s)).toEqual(['A1:D1']);
    expect(active(s)).toBe('D1');
  });

  it('al bordo del foglio non cambia nulla', () => {
    const s = moveAndExtend(at('A1'), P, 'up');
    expect(areas(s)).toEqual(['A1']);
  });

  it('azzera entryOrigin', () => {
    const tabbed = tabFrom(at('B3'), P);
    expect(moveAndExtend(tabbed, P, 'down').entryOrigin).toBeNull();
  });
});

describe('selectRow / selectCol — Maiusc+Spazio e Ctrl+Spazio', () => {
  it('Maiusc+Spazio prende la riga intera lasciando ferma la cella attiva', () => {
    const s = selectRow(at('C4'), 3);
    expect(areas(s)).toEqual([`A4:XFD4`]);
    expect(active(s)).toBe('C4');
  });

  it('accetta un intervallo di righe e lo normalizza', () => {
    const s = selectRow(at('C4'), { from: 6, to: 2 });
    expect(areas(s)).toEqual([`A3:XFD7`]);
  });

  it('Ctrl+Spazio prende la colonna intera lasciando ferma la cella attiva', () => {
    const s = selectCol(at('C4'), 2);
    expect(areas(s)).toEqual([`C1:C${LAST_ROW + 1}`]);
    expect(active(s)).toBe('C4');
  });

  it('se la cella attiva e\' fuori dall\'intervallo viene riportata dentro', () => {
    const s = selectRow(at('C4'), { from: 10, to: 12 });
    expect(active(s)).toBe('C11');
  });

  it('collassa una selezione multipla a una sola area', () => {
    const multi = addArea(at('A1'), rr('C1:C3'));
    expect(selectRow(multi, 0).areas).toHaveLength(1);
  });

  it('azzera entryOrigin', () => {
    const tabbed = tabFrom(at('B3'), P);
    expect(selectRow(tabbed, 2).entryOrigin).toBeNull();
    expect(selectCol(tabbed, 2).entryOrigin).toBeNull();
  });
});

describe('selectAll — Ctrl+A', () => {
  it('al primo colpo prende la regione corrente', () => {
    const s = selectAll(at('B1'), P);
    // Il blocco A1:B2 e' separato da D1 dalla colonna C, interamente vuota.
    expect(areas(s)).toEqual(['A1:B2']);
    expect(active(s)).toBe('B1');
  });

  it('al secondo colpo prende tutto il foglio', () => {
    const s = selectAll(selectAll(at('B1'), P), P);
    expect(areas(s)).toEqual([`A1:XFD${LAST_ROW + 1}`]);
    expect(active(s)).toBe('B1');
  });

  it('da cella isolata prende subito tutto il foglio', () => {
    // Senza dati intorno non esiste una regione intermedia da selezionare.
    const s = selectAll(at('H9'), P);
    expect(areas(s)).toEqual([`A1:XFD${LAST_ROW + 1}`]);
  });

  it('un terzo colpo resta su tutto il foglio', () => {
    const s = selectAll(selectAll(selectAll(at('B1'), P), P), P);
    expect(areas(s)).toEqual([`A1:XFD${LAST_ROW + 1}`]);
  });

  it('azzera entryOrigin', () => {
    const tabbed = tabFrom(at('B1'), P);
    expect(selectAll(tabbed, P).entryOrigin).toBeNull();
  });
});

describe('addArea — selezione multipla', () => {
  it('aggiunge un\'area e vi sposta la cella attiva', () => {
    const s = addArea(extendTo(at('A1'), cc('A3')), rr('C2:D4'));
    expect(areas(s)).toEqual(['A1:A3', 'C2:D4']);
    expect(s.activeArea).toBe(1);
    expect(active(s)).toBe('C2');
    expect(selectionCellCount(s)).toBe(3 + 6);
  });

  it('accetta un\'ancora esplicita (Ctrl+trascina dal basso)', () => {
    const s = addArea(at('A1'), rr('C2:D4'), cc('D4'));
    expect(anchors(s)).toEqual(['A1', 'D4']);
    expect(active(s)).toBe('D4');
  });

  it('normalizza un range dato al contrario', () => {
    const s = addArea(at('A1'), { top: 4, left: 3, bottom: 1, right: 2 });
    expect(areas(s)[1]).toBe('C2:D5');
  });
});

describe('moveWithinSelection — Invio e Tab dentro la selezione', () => {
  // Selezione B2:C4 (2 colonne x 3 righe), ancora e attiva su B2.
  const block = blockSel('B2:C4', 'B2');

  it('Invio scende in colonna e a fine colonna passa in cima alla successiva', () => {
    let s = block;
    expect(active(s)).toBe('B2');
    s = moveWithinSelection(s, 'down');
    expect(active(s)).toBe('B3');
    s = moveWithinSelection(s, 'down');
    expect(active(s)).toBe('B4');
    s = moveWithinSelection(s, 'down');
    expect(active(s)).toBe('C2'); // wrap in cima alla colonna successiva
    s = moveWithinSelection(s, 'down');
    expect(active(s)).toBe('C3');
  });

  it('dall\'ultima cella Invio torna alla prima cella della selezione', () => {
    let s = block;
    for (let i = 0; i < 5; i++) s = moveWithinSelection(s, 'down');
    expect(active(s)).toBe('C4');
    expect(active(moveWithinSelection(s, 'down'))).toBe('B2');
  });

  it('Maiusc+Invio dalla prima cella fa il wrap sull\'ultima', () => {
    expect(active(moveWithinSelection(block, 'up'))).toBe('C4');
  });

  it('Maiusc+Invio risale in colonna', () => {
    const s = moveWithinSelection(moveWithinSelection(block, 'down'), 'up');
    expect(active(s)).toBe('B2');
  });

  it('Tab scorre per righe e va a capo sulla riga sotto', () => {
    let s = block;
    s = moveWithinSelection(s, 'next');
    expect(active(s)).toBe('C2');
    s = moveWithinSelection(s, 'next');
    expect(active(s)).toBe('B3'); // a capo, colonna piu' a sinistra dell'area
    s = moveWithinSelection(s, 'next');
    expect(active(s)).toBe('C3');
  });

  it('Maiusc+Tab dalla prima cella fa il wrap sull\'ultima', () => {
    expect(active(moveWithinSelection(block, 'prev'))).toBe('C4');
  });

  it('Tab dall\'ultima cella dell\'area torna alla prima', () => {
    let s = block;
    for (let i = 0; i < 6; i++) s = moveWithinSelection(s, 'next');
    expect(active(s)).toBe('B2');
  });

  it('con piu\' aree, Tab passa all\'area successiva', () => {
    const multi = addArea(extendTo(at('A1'), cc('A2')), rr('D1:D2'));
    expect(active(multi)).toBe('D1');
    const s1 = moveWithinSelection(multi, 'next');
    expect(active(s1)).toBe('D2');
    const s2 = moveWithinSelection(s1, 'next');
    expect(active(s2)).toBe('A1'); // ciclo sull'area successiva
    expect(s2.activeArea).toBe(0);
  });

  it('con piu\' aree, Maiusc+Tab torna all\'ultima cella dell\'area precedente', () => {
    const multi = addArea(extendTo(at('A1'), cc('A2')), rr('D1:D2'));
    const s = moveWithinSelection(multi, 'prev');
    expect(active(s)).toBe('A2');
    expect(s.activeArea).toBe(0);
  });

  it('anche Invio cicla fra le aree', () => {
    const multi = addArea(extendTo(at('A1'), cc('A2')), rr('D1:D2'));
    const s = moveWithinSelection(moveWithinSelection(multi, 'down'), 'down');
    expect(active(s)).toBe('A1');
  });

  it('su una selezione di una cella sola non si muove', () => {
    expect(active(moveWithinSelection(at('B2'), 'down'))).toBe('B2');
    expect(active(moveWithinSelection(at('B2'), 'next'))).toBe('B2');
  });
});

describe('tabFrom — Tab su selezione di una cella', () => {
  it('si sposta a destra e memorizza entryOrigin', () => {
    const s = tabFrom(at('B3'), P);
    expect(active(s)).toBe('C3');
    expect(s.entryOrigin && coordToA1(s.entryOrigin)).toBe('B3');
  });

  it('i Tab successivi NON sovrascrivono entryOrigin', () => {
    const s = tabFrom(tabFrom(tabFrom(at('B3'), P), P), P);
    expect(active(s)).toBe('E3');
    expect(s.entryOrigin && coordToA1(s.entryOrigin)).toBe('B3');
  });

  it('Maiusc+Tab va a sinistra conservando la catena', () => {
    const s = tabFrom(tabFrom(tabFrom(at('B3'), P), P), P, { back: true });
    expect(active(s)).toBe('C3'); // B3 -> C3 -> D3 -> C3
    expect(s.entryOrigin && coordToA1(s.entryOrigin)).toBe('B3');
  });

  it('salta le colonne nascoste', () => {
    const hidden = probeFrom(GRID, { hiddenCols: [2, 3] });
    expect(active(tabFrom(at('B1'), hidden))).toBe('E1');
  });

  it('sul bordo destro resta fermo', () => {
    const small = probeFrom(GRID, { maxCol: 3 });
    expect(active(tabFrom(at('D1'), small))).toBe('D1');
  });

  it('su selezione multi-cella si muove DENTRO la selezione', () => {
    const block = blockSel('B2:C4', 'B2');
    const s = tabFrom(block, P);
    expect(active(s)).toBe('C2');
    expect(areas(s)).toEqual(['B2:C4']); // la selezione non collassa
  });
});

describe('enterFrom — Invio', () => {
  it('senza catena di Tab scende di una riga', () => {
    const s = enterFrom(at('B3'), P);
    expect(active(s)).toBe('B4');
    expect(areas(s)).toEqual(['B4']);
  });

  it('Tab, Tab, Tab, Invio torna a capo sotto la colonna di partenza', () => {
    // E' il "ritorno a capo" dello spec §3.1: si compila una riga con i Tab e
    // Invio riporta il cursore all'inizio della riga successiva.
    let s = at('B3');
    s = tabFrom(s, P);
    s = tabFrom(s, P);
    s = tabFrom(s, P);
    expect(active(s)).toBe('E3');
    s = enterFrom(s, P);
    expect(active(s)).toBe('B4');
    expect(s.entryOrigin).toBeNull();
  });

  it('dopo il ritorno a capo l\'Invio successivo scende e basta', () => {
    let s = tabFrom(tabFrom(at('B3'), P), P);
    s = enterFrom(s, P);
    expect(active(s)).toBe('B4');
    s = enterFrom(s, P);
    expect(active(s)).toBe('B5');
  });

  it('una freccia in mezzo ai Tab interrompe la catena', () => {
    let s = tabFrom(tabFrom(at('B3'), P), P);
    s = moveTo(s, cc('H9'), P); // click o freccia
    s = enterFrom(s, P);
    expect(active(s)).toBe('H10');
  });

  it('Maiusc+Invio risale di una riga', () => {
    expect(active(enterFrom(at('B3'), P, { back: true }))).toBe('B2');
  });

  it('salta le righe nascoste', () => {
    const hidden = probeFrom(GRID, { hiddenRows: [3] });
    expect(active(enterFrom(at('A3'), hidden))).toBe('A5');
  });

  it('sull\'ultima riga resta fermo', () => {
    const small = probeFrom(GRID, { maxRow: 4 });
    expect(active(enterFrom(at('A5'), small))).toBe('A5');
  });

  it('rispetta l\'opzione "sposta selezione dopo Invio" orizzontale', () => {
    const s = enterFrom(at('B3'), P, { direction: 'right' });
    expect(active(s)).toBe('C3');
    expect(active(enterFrom(at('B3'), P, { direction: 'right', back: true }))).toBe('A3');
  });

  it('su selezione multi-cella scende DENTRO la selezione', () => {
    const block = blockSel('B2:C4', 'B2');
    const s = enterFrom(block, P);
    expect(active(s)).toBe('B3');
    expect(areas(s)).toEqual(['B2:C4']);
    expect(active(enterFrom(s, P, { back: true }))).toBe('B2');
  });
});
