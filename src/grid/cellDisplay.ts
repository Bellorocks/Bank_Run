/**
 * Come una cella appare a schermo.
 *
 * Tenuto separato dai componenti React perche' e' logica, non disegno: le
 * regole di allineamento e di visualizzazione degli errori sono comportamento
 * di Excel, e come tale va testato senza montare un DOM.
 */

import { formatNumber, type FormattedCell } from '../engine/numberFormat';
import { MODEL_COLORS } from '../styles/palette';
import type { CellStyle } from '../engine/types';

import { displayLocale } from '../i18n/language';
export interface CellDisplay extends FormattedCell {
  /** Vero se il contenuto e' un errore Excel: va mostrato in rosso, mai troncato. */
  readonly isError: boolean;
  /** Vero se il testo non ci sta nella colonna e va sostituito da `####`. */
  readonly overflow: boolean;
}

/** HyperFormula restituisce gli errori come oggetto, non come stringa. */
function asError(v: unknown): string | undefined {
  if (typeof v === 'object' && v !== null && 'type' in v && 'value' in v) {
    return String((v as { value: unknown }).value);
  }
  return undefined;
}

export interface DisplayInput {
  readonly value: unknown;
  readonly formula: string | undefined;
  readonly style: CellStyle;
  /** Ctrl+~ : mostra le formule al posto dei valori. */
  readonly showFormulas: boolean;
  /** Larghezza utile della colonna in pixel; serve a decidere i `####`. */
  readonly widthPx?: number;
  /** Larghezza media di un carattere del font della griglia. */
  readonly charPx?: number;
}

export const DEFAULT_CHAR_PX = 7.6;

export function displayCell(input: DisplayInput): CellDisplay {
  const { value, formula, style, showFormulas } = input;

  // Con Ctrl+~ Excel mostra il testo della formula, allineato a sinistra e senza
  // formato numerico: e' una vista di ispezione, non di lettura dei numeri.
  if (showFormulas) {
    const testo = formula ?? (value === null || value === undefined ? '' : String(value));
    return { text: testo, align: 'left', isError: false, overflow: false };
  }

  const errore = asError(value);
  if (errore) {
    // Un errore non viene mai sostituito da ####: nasconderlo sarebbe il
    // contrario di quello che serve a chi sta cercando di capire cosa non va.
    return { text: errore, align: 'center', color: MODEL_COLORS.external, isError: true, overflow: false };
  }

  const formato = style.numFmt ?? 'General';
  const base = formatNumber(value as number | string | boolean | null, formato, { locale: displayLocale() });

  const colore = base.color ?? style.fontColor;
  const align = style.halign && style.halign !== 'general' ? style.halign : base.align;

  // I #### valgono solo per i numeri: un testo troppo lungo in Excel deborda
  // sulla cella vicina se e' vuota, non viene mascherato.
  const overflow =
    typeof value === 'number' &&
    input.widthPx !== undefined &&
    base.text.length * (input.charPx ?? DEFAULT_CHAR_PX) > input.widthPx - 6;

  return {
    text: overflow ? '#'.repeat(Math.max(3, Math.floor((input.widthPx ?? 40) / (input.charPx ?? DEFAULT_CHAR_PX)))) : base.text,
    align,
    ...(colore !== undefined ? { color: colore } : {}),
    isError: false,
    overflow,
  };
}
