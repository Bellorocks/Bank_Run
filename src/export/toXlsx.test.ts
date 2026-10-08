import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildWorkbook, exportToXlsx, sanitizeSheetName, type ExportWorkbook } from './toXlsx';

const MODELLO: ExportWorkbook = {
  title: 'Test EBITDA',
  sheets: [
    {
      name: 'Model',
      cells: [
        { ref: 'A1', value: 'Ricavi' },
        { ref: 'B1', value: 12500000, style: { numFmt: '#,##0,' } },
        { ref: 'A2', value: 'Costi operativi' },
        { ref: 'B2', value: -9800000, style: { numFmt: '#,##0,;(#,##0,)' } },
        { ref: 'A3', value: 'EBITDA' },
        { ref: 'B3', formula: 'B1+B2', value: 2700000 },
        { ref: 'A4', value: 'Margine EBITDA' },
        { ref: 'B4', formula: 'B3/B1', value: 0.216, style: { numFmt: '0.0%' } },
      ],
      colWidths: new Map([
        [0, 140],
        [1, 98],
      ]),
      frozenRows: 1,
      frozenCols: 1,
    },
    {
      name: 'Assunzioni',
      cells: [
        { ref: 'A1', value: 'Multiplo EV/EBITDA' },
        { ref: 'B1', value: 8.5, style: { numFmt: '0.0x' } },
        { ref: 'B2', formula: "Model!B3*B1", value: 22950000 },
      ],
    },
  ],
  namedRanges: { Multiplo: 'Assunzioni!$B$1' },
};

describe('esportazione xlsx', () => {
  it('scrive le formule senza il segno uguale', () => {
    const wb = buildWorkbook(MODELLO);
    const ws = wb.Sheets['Model'];
    expect(ws['B3'].f).toBe('B1+B2');
    expect(ws['B3'].f?.startsWith('=')).toBe(false);
  });

  it('toglie un eventuale = passato per errore dal chiamante', () => {
    const wb = buildWorkbook({
      sheets: [{ name: 'S', cells: [{ ref: 'A1', formula: '=1+1', value: 2 }] }],
    });
    expect(wb.Sheets['S']['A1'].f).toBe('1+1');
  });

  it('conserva il valore in cache accanto alla formula', () => {
    const ws = buildWorkbook(MODELLO).Sheets['Model'];
    expect(ws['B3'].v).toBe(2700000);
    expect(ws['B3'].t).toBe('n');
  });

  it('scrive i formati numerici', () => {
    const ws = buildWorkbook(MODELLO).Sheets['Model'];
    expect(ws['B1'].z).toBe('#,##0,');
    expect(ws['B4'].z).toBe('0.0%');
  });

  it('mantiene i riferimenti cross-sheet', () => {
    const ws = buildWorkbook(MODELLO).Sheets['Assunzioni'];
    expect(ws['B2'].f).toBe('Model!B3*B1');
  });

  it('registra i named ranges', () => {
    const wb = buildWorkbook(MODELLO);
    expect(wb.Workbook?.Names).toEqual([{ Name: 'Multiplo', Ref: 'Assunzioni!$B$1' }]);
  });

  it('calcola !ref sull\'area effettivamente usata', () => {
    const ws = buildWorkbook(MODELLO).Sheets['Model'];
    expect(ws['!ref']).toBe('A1:B4');
  });

  it('converte le larghezze da pixel a caratteri', () => {
    const ws = buildWorkbook(MODELLO).Sheets['Model'];
    expect(ws['!cols']?.[0]?.wch).toBeCloseTo(20, 0);
    expect(ws['!cols']?.[1]?.wch).toBeCloseTo(14, 0);
  });

  it('scrive gli errori come errori, non come testo', () => {
    const wb = buildWorkbook({
      sheets: [{ name: 'S', cells: [{ ref: 'A1', formula: '1/0', value: '#DIV/0!' }] }],
    });
    expect(wb.Sheets['S']['A1'].t).toBe('e');
    expect(wb.Sheets['S']['A1'].v).toBe(0x07);
  });

  it('salta le celle davvero vuote', () => {
    const wb = buildWorkbook({
      sheets: [{ name: 'S', cells: [{ ref: 'A1', value: '' }, { ref: 'A2', value: 0 }] }],
    });
    expect(wb.Sheets['S']['A1']).toBeUndefined();
    // Lo zero NON e' vuoto: in un bilancio la differenza conta.
    expect(wb.Sheets['S']['A2'].v).toBe(0);
  });

  it('ripulisce i nomi foglio che Excel rifiuterebbe', () => {
    expect(sanitizeSheetName('Deal/Model:2024')).toBe('Deal_Model_2024');
    expect(sanitizeSheetName('x'.repeat(40)).length).toBe(31);
    expect(sanitizeSheetName('   ')).toBe('Foglio1');
  });

  it('produce un file che si rilegge con le formule intatte', () => {
    const buf = exportToXlsx(MODELLO);
    expect(buf.byteLength).toBeGreaterThan(1000);

    const riletto = XLSX.read(buf, { type: 'array', cellFormula: true });
    expect(riletto.SheetNames).toEqual(['Model', 'Assunzioni']);
    expect(riletto.Sheets['Model']['B3'].f).toBe('B1+B2');
    expect(riletto.Sheets['Assunzioni']['B2'].f).toBe('Model!B3*B1');
    expect(riletto.Sheets['Model']['A1'].v).toBe('Ricavi');
  });
});
