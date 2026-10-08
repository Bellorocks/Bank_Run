/**
 * Adattatore `Workbook` (motore di gioco) -> `ExportWorkbook` (input di toXlsx.ts).
 *
 * Tenuto separato da `toXlsx.ts`: quel modulo non deve conoscere `Workbook`, o
 * l'esportazione smetterebbe di essere testabile senza costruire una partita.
 */

import { coordToA1 } from '../engine/address';
import type { Workbook } from '../engine/workbook';
import type { ExportCell, ExportSheet, ExportWorkbook } from './toXlsx';

export function workbookToExport(wb: Workbook, title?: string): ExportWorkbook {
  const sheets: ExportSheet[] = wb.sheetIds().map((sheetId) => {
    const nome = wb.sheetName(sheetId);
    const usato = wb.usedRange(sheetId);
    const cells: ExportCell[] = [];

    if (usato) {
      for (let row = usato.top; row <= usato.bottom; row++) {
        for (let col = usato.left; col <= usato.right; col++) {
          const coord = { row, col };
          if (wb.isEmpty(sheetId, coord)) continue;
          const formula = wb.getFormula(sheetId, coord);
          const valore = wb.getValue(sheetId, coord);
          const style = wb.getStyle(sheetId, coord);
          cells.push({
            ref: coordToA1(coord),
            ...(formula !== undefined ? { formula } : {}),
            value: toExportValue(valore),
            ...(style.numFmt ? { style: { numFmt: style.numFmt } } : {}),
          });
        }
      }
    }

    const layout = wb.layout(sheetId);
    return {
      name: nome,
      cells,
      ...(layout.colWidths.size > 0 ? { colWidths: layout.colWidths } : {}),
      ...(layout.frozenRows > 0 ? { frozenRows: layout.frozenRows } : {}),
      ...(layout.frozenCols > 0 ? { frozenCols: layout.frozenCols } : {}),
    };
  });

  return { sheets, ...(title ? { title } : {}) };
}

function toExportValue(v: unknown): number | string | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  // Un DetailedCellError di HyperFormula: l'export lo riconosce dal prefisso '#'.
  if (typeof v === 'object' && 'value' in v) return String((v as { value: unknown }).value);
  return String(v);
}
