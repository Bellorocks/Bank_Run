import { describe, it, expect } from 'vitest';
import {
  colToLetters,
  lettersToCol,
  parseCellRef,
  parseRangeRef,
  formatCellRef,
  formatRangeRef,
  quoteSheetName,
  sheetNameNeedsQuoting,
  coordToA1,
  a1ToRange,
  rangeToA1,
  normalizeRange,
  cellKey,
  cellKeyToCoord,
  LAST_ROW,
  LAST_COL,
} from './address';

describe('colonne <-> lettere', () => {
  it('copre i confini di Excel', () => {
    expect(colToLetters(0)).toBe('A');
    expect(colToLetters(25)).toBe('Z');
    expect(colToLetters(26)).toBe('AA');
    expect(colToLetters(51)).toBe('AZ');
    expect(colToLetters(52)).toBe('BA');
    expect(colToLetters(701)).toBe('ZZ');
    expect(colToLetters(702)).toBe('AAA');
    expect(colToLetters(LAST_COL)).toBe('XFD');
  });

  it('e\' invertibile su tutto il dominio', () => {
    for (const c of [0, 1, 25, 26, 27, 700, 701, 702, 5000, LAST_COL]) {
      expect(lettersToCol(colToLetters(c))).toBe(c);
    }
  });

  it('accetta il minuscolo e rifiuta la spazzatura', () => {
    expect(lettersToCol('aa')).toBe(26);
    expect(lettersToCol('')).toBe(-1);
    expect(lettersToCol('A1')).toBe(-1);
    expect(lettersToCol('ABCD')).toBe(-1);
  });
});

describe('parseCellRef', () => {
  it('legge i quattro stati di ancoraggio', () => {
    expect(parseCellRef('A1')).toMatchObject({ row: 0, col: 0, rowAbs: false, colAbs: false });
    expect(parseCellRef('$A$1')).toMatchObject({ row: 0, col: 0, rowAbs: true, colAbs: true });
    expect(parseCellRef('A$1')).toMatchObject({ row: 0, col: 0, rowAbs: true, colAbs: false });
    expect(parseCellRef('$A1')).toMatchObject({ row: 0, col: 0, rowAbs: false, colAbs: true });
  });

  it('legge i riferimenti qualificati, anche con apici', () => {
    expect(parseCellRef('Model!D24')).toMatchObject({ sheet: 'Model', row: 23, col: 3 });
    expect(parseCellRef("'Deal Model'!$B$5")).toMatchObject({
      sheet: 'Deal Model',
      row: 4,
      col: 1,
      rowAbs: true,
      colAbs: true,
    });
  });

  it('rifiuta cio\' che esce dai limiti del foglio', () => {
    expect(parseCellRef('XFD1048576')).toMatchObject({ row: LAST_ROW, col: LAST_COL });
    expect(parseCellRef('XFE1')).toBeUndefined();
    expect(parseCellRef('A1048577')).toBeUndefined();
    expect(parseCellRef('A0')).toBeUndefined();
    expect(parseCellRef('EBITDA')).toBeUndefined();
  });

  it('fa round-trip con formatCellRef', () => {
    for (const s of ['A1', '$A$1', 'A$1', '$A1', 'Model!D24', "'Deal Model'!$B$5", 'XFD1048576']) {
      const p = parseCellRef(s);
      expect(p, s).toBeDefined();
      expect(formatCellRef(p!)).toBe(s);
    }
  });
});

describe('parseRangeRef', () => {
  it('legge un range normale con ancoraggi indipendenti', () => {
    const r = parseRangeRef('$B5:D$10');
    expect(r).toBeDefined();
    expect(r!.start).toMatchObject({ row: 4, col: 1, colAbs: true, rowAbs: false });
    expect(r!.end).toMatchObject({ row: 9, col: 3, colAbs: false, rowAbs: true });
    expect(formatRangeRef(r!)).toBe('$B5:D$10');
  });

  it('legge colonna intera e riga intera', () => {
    const c = parseRangeRef('A:A');
    expect(c!.wholeColumn).toBe(true);
    expect(c!.start.row).toBe(0);
    expect(c!.end.row).toBe(LAST_ROW);
    expect(formatRangeRef(c!)).toBe('A:A');

    const r = parseRangeRef('3:7');
    expect(r!.wholeRow).toBe(true);
    expect(r!.start.col).toBe(0);
    expect(r!.end.col).toBe(LAST_COL);
    expect(formatRangeRef(r!)).toBe('3:7');
  });

  it('conserva l\'ordine scritto, anche se invertito', () => {
    const r = parseRangeRef('B10:A1');
    expect(r!.start).toMatchObject({ row: 9, col: 1 });
    expect(r!.end).toMatchObject({ row: 0, col: 0 });
  });

  it('porta il prefisso foglio', () => {
    const r = parseRangeRef("'Deal Model'!A1:B2");
    expect(r!.sheet).toBe('Deal Model');
    expect(formatRangeRef(r!)).toBe("'Deal Model'!A1:B2");
  });
});

describe('nomi foglio', () => {
  it('quota solo quando serve', () => {
    expect(sheetNameNeedsQuoting('Model')).toBe(false);
    expect(sheetNameNeedsQuoting('Deal Model')).toBe(true);
    expect(sheetNameNeedsQuoting('2024')).toBe(true);
    expect(sheetNameNeedsQuoting('A1')).toBe(true);
    expect(quoteSheetName('Deal Model')).toBe("'Deal Model'");
    expect(quoteSheetName("L'anno")).toBe("'L''anno'");
  });
});

describe('coordinate e range', () => {
  it('converte avanti e indietro', () => {
    expect(coordToA1({ row: 0, col: 3 })).toBe('D1');
    expect(rangeToA1({ top: 0, left: 0, bottom: 1, right: 1 })).toBe('A1:B2');
    expect(rangeToA1({ top: 5, left: 2, bottom: 5, right: 2 })).toBe('C6');
    expect(a1ToRange('A1:B2')).toEqual({ top: 0, left: 0, bottom: 1, right: 1 });
    expect(a1ToRange('C6')).toEqual({ top: 5, left: 2, bottom: 5, right: 2 });
  });

  it('normalizza i rettangoli rovesciati', () => {
    expect(normalizeRange({ top: 9, left: 4, bottom: 2, right: 1 })).toEqual({
      top: 2,
      left: 1,
      bottom: 9,
      right: 4,
    });
    expect(a1ToRange('B10:A1')).toEqual({ top: 0, left: 0, bottom: 9, right: 1 });
  });

  it('la chiave di cella e\' iniettiva sui limiti', () => {
    for (const c of [
      { row: 0, col: 0 },
      { row: LAST_ROW, col: LAST_COL },
      { row: 5, col: 16383 },
      { row: 1048575, col: 0 },
    ]) {
      expect(cellKeyToCoord(cellKey(c.row, c.col))).toEqual(c);
    }
  });
});
