/**
 * Esportazione di un livello in .xlsx (spec §2, §13).
 *
 * Serve a un caso d'uso preciso: finito un livello, l'utente riapre lo stesso
 * modello in Excel vero e ci rovista dentro. Quindi il criterio di riuscita non
 * e' "produce un file", e' "le FORMULE funzionano quando Excel lo apre".
 *
 * Limite noto della build community di SheetJS: scrive i formati numerici (`z`)
 * ma NON i colori di carattere e riempimento. La disciplina dei colori resta
 * quindi verificabile solo dentro il gioco. Documentato, non aggirato: l'unica
 * alternativa sarebbe cambiare libreria, e lo stack e' fisso (§2).
 */

import * as XLSX from 'xlsx';
import { a1ToCoord, colToLetters, coordToA1, type CellCoord } from '../engine/address';
import type { CellStyle } from '../engine/types';

export interface ExportCell {
  /** Notazione A1 relativa al foglio, senza prefisso. */
  readonly ref: string;
  /** Testo della formula SENZA il segno `=`, se la cella e' una formula. */
  readonly formula?: string;
  /** Valore calcolato: Excel lo usa come cache finche' non ricalcola. */
  readonly value?: number | string | boolean | null;
  readonly style?: CellStyle;
}

export interface ExportSheet {
  readonly name: string;
  readonly cells: readonly ExportCell[];
  /** Larghezze in pixel, per indice di colonna. Convertite in "caratteri" per Excel. */
  readonly colWidths?: ReadonlyMap<number, number>;
  readonly frozenRows?: number;
  readonly frozenCols?: number;
}

export interface ExportWorkbook {
  readonly sheets: readonly ExportSheet[];
  /** Named ranges globali, gia' qualificati: `{ nome: "Model!$B$5" }`. */
  readonly namedRanges?: Readonly<Record<string, string>>;
  readonly title?: string;
}

/** Larghezza colonna Excel: circa 7 pixel per "carattere" alla dimensione standard. */
const PX_PER_CHAR = 7;

/**
 * Costruisce il workbook SheetJS. Esposta separatamente da `exportToXlsx` per
 * poterla testare senza produrre byte.
 */
export function buildWorkbook(input: ExportWorkbook): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  for (const sheet of input.sheets) {
    const ws: XLSX.WorkSheet = {};
    let maxRow = 0;
    let maxCol = 0;

    for (const cell of sheet.cells) {
      const coord = a1ToCoord(cell.ref);
      if (!coord) throw new Error(`Riferimento non valido in esportazione: "${cell.ref}"`);
      maxRow = Math.max(maxRow, coord.row);
      maxCol = Math.max(maxCol, coord.col);

      const target = writeCell(cell, coord);
      if (target) ws[coordToA1(coord)] = target;
    }

    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(maxRow, 0), c: Math.max(maxCol, 0) },
    });

    if (sheet.colWidths && sheet.colWidths.size > 0) {
      const cols: XLSX.ColInfo[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const px = sheet.colWidths.get(c);
        cols[c] = px === undefined ? {} : { wch: Math.round((px / PX_PER_CHAR) * 10) / 10 };
      }
      ws['!cols'] = cols;
    }

    // Riquadri bloccati: Excel li legge dal pane con topLeftCell e state "frozen".
    const fr = sheet.frozenRows ?? 0;
    const fc = sheet.frozenCols ?? 0;
    if (fr > 0 || fc > 0) {
      ws['!freeze'] = `${colToLetters(fc)}${fr + 1}`;
      // SheetJS scrive i panes solo tramite '!panes' nella build pro; conserviamo
      // comunque l'informazione cosi' un re-import nel gioco la ritrova.
    }

    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheet.name));
  }

  if (input.namedRanges) {
    wb.Workbook = wb.Workbook ?? {};
    wb.Workbook.Names = Object.entries(input.namedRanges).map(([Name, Ref]) => ({ Name, Ref }));
  }

  if (input.title) {
    wb.Props = { ...wb.Props, Title: input.title, Application: 'DEAL DESK' };
  }

  return wb;
}

function writeCell(cell: ExportCell, _coord: CellCoord): XLSX.CellObject | undefined {
  const hasFormula = typeof cell.formula === 'string' && cell.formula.length > 0;
  const v = cell.value;

  if (!hasFormula && (v === null || v === undefined || v === '')) return undefined;

  const out: XLSX.CellObject = { t: 's', v: '' };

  if (typeof v === 'number') {
    out.t = 'n';
    out.v = v;
  } else if (typeof v === 'boolean') {
    out.t = 'b';
    out.v = v;
  } else if (typeof v === 'string' && v.startsWith('#')) {
    // Un errore va scritto come errore, non come testo, o Excel mostra una stringa.
    out.t = 'e';
    out.v = errorCode(v);
  } else if (typeof v === 'string') {
    out.t = 's';
    out.v = v;
  } else {
    // Formula senza valore in cache: Excel ricalcola all'apertura.
    out.t = 'n';
    delete (out as { v?: unknown }).v;
  }

  if (hasFormula) {
    // SheetJS vuole la formula SENZA '='. Se il chiamante lo include, toglilo:
    // e' l'errore piu' facile da fare e produce un file che Excel rifiuta.
    out.f = cell.formula!.startsWith('=') ? cell.formula!.slice(1) : cell.formula!;
  }

  if (cell.style?.numFmt) out.z = cell.style.numFmt;

  return out;
}

/** Codici errore Excel nella codifica numerica attesa da SheetJS. */
const ERROR_CODES: Record<string, number> = {
  '#NULL!': 0x00,
  '#DIV/0!': 0x07,
  '#VALUE!': 0x0f,
  '#REF!': 0x17,
  '#NAME?': 0x1d,
  '#NUM!': 0x24,
  '#N/A': 0x2a,
};

function errorCode(text: string): number {
  return ERROR_CODES[text.toUpperCase()] ?? ERROR_CODES['#VALUE!'];
}

/**
 * Excel rifiuta i nomi foglio con  : \ / ? * [ ]  e oltre 31 caratteri.
 * Meglio troncare in silenzio che produrre un file che non si apre.
 */
export function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, '_').trim();
  const truncated = cleaned.slice(0, 31);
  return truncated.length > 0 ? truncated : 'Foglio1';
}

/** Serializza in un ArrayBuffer pronto per il salvataggio su disco. */
export function exportToXlsx(input: ExportWorkbook): ArrayBuffer {
  const wb = buildWorkbook(input);
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}
