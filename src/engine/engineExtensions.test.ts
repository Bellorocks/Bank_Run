import { describe, expect, it } from 'vitest';
import { Workbook } from './workbook';

const at = (row: number, col: number) => ({ row, col });

describe('estensioni del motore', () => {
  it('OFFSET accetta spostamenti presi da una cella, come in Excel', () => {
    const wb = Workbook.create([{ name: 'S', data: [[10], [20], [30], [40], [50], [2]] }]);
    wb.setContents(0, at(0, 2), '=OFFSET(A5,-A6,0)');
    expect(wb.getValue(0, at(0, 2))).toBe(30);
    // Volatile: se cambia il parametro, il risultato segue.
    wb.setContents(0, at(5, 0), 4);
    expect(wb.getValue(0, at(0, 2))).toBe(10);
    wb.destroy();
  });

  it('la formula torna all\'utente scritta con OFFSET, non col nome interno', () => {
    const wb = Workbook.create([{ name: 'S', data: [[1], [2]] }]);
    wb.setContents(0, at(0, 1), '=offset(A2,-1,0)');
    expect(wb.getFormula(0, at(0, 1))?.toUpperCase()).toBe('=OFFSET(A2,-1,0)');
    expect(wb.getValue(0, at(0, 1))).toBe(1);
    wb.destroy();
  });

  it('OFFSET fuori dal foglio restituisce #REF!', () => {
    const wb = Workbook.create([{ name: 'S', data: [[1]] }]);
    wb.setContents(0, at(0, 1), '=OFFSET(A1,-3,0)');
    expect(String((wb.getValue(0, at(0, 1)) as { value: string }).value)).toBe('#REF!');
    wb.destroy();
  });

  it('TRUE e FALSE nudi funzionano come in Excel', () => {
    const wb = Workbook.create([{ name: 'S', data: [[true], [false], [true]] }]);
    wb.setContents(0, at(0, 1), '=IF(1>0,TRUE,FALSE)');
    wb.setContents(0, at(1, 1), '=COUNTIF(A1:A3,TRUE)');
    expect(wb.getValue(0, at(0, 1))).toBe(true);
    expect(wb.getValue(0, at(1, 1))).toBe(2);
    expect(wb.canUndo()).toBe(true);
    wb.destroy();
  });

  it('il setup del motore non lascia nulla nello stack di undo', () => {
    const wb = Workbook.create([{ name: 'S', data: [[1]] }]);
    expect(wb.canUndo()).toBe(false);
    wb.destroy();
  });
});
