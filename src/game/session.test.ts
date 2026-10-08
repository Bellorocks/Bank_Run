/**
 * Test di integrazione su `GridSession`: navigazione, selezione, editing.
 *
 * Qui non si prova un modulo, si prova la CATENA COMPLETA:
 *   evento tastiera -> keySignature -> resolveBinding -> GridSession -> Workbook.
 *
 * Ogni test e' scritto come la trascrizione di quello che fa un utente, con
 * `premi(s, "Ctrl+Shift+ArrowDown")`: se un giorno la tabella dei binding cambia,
 * qui si rompe la scorciatoia, non un dettaglio interno.
 *
 * Riferimento di comportamento: Excel vero, non "quello che fa il codice".
 */

import { describe, it, expect } from 'vitest';
import { Workbook } from '../engine/workbook';
import { GridSession, type SessionOptions } from './session';
import { parseSignature, type KeyLike } from '../keymap/keySignature';
import { LAST_COL, LAST_ROW, rangeToA1, a1ToCoord } from '../engine/address';
import type { CellRaw } from '../engine/types';

// ---------------------------------------------------------------------------
// Pilotaggio della sessione: dalla firma testuale all'evento
// ---------------------------------------------------------------------------

/**
 * Token la cui `key`/`code` non si deducono dal nome. Le cifre e i simboli
 * passano per `code` (posizione fisica) perche' e' cosi' che `keySignature`
 * li normalizza su tastiera italiana.
 */
const TOKEN_EVENT: Readonly<Record<string, { key: string; code: string }>> = {
  '0': { key: '0', code: 'Digit0' },
  '1': { key: '1', code: 'Digit1' },
  '2': { key: '2', code: 'Digit2' },
  '3': { key: '3', code: 'Digit3' },
  '4': { key: '4', code: 'Digit4' },
  '5': { key: '5', code: 'Digit5' },
  '6': { key: '6', code: 'Digit6' },
  '7': { key: '7', code: 'Digit7' },
  '8': { key: '8', code: 'Digit8' },
  '9': { key: '9', code: 'Digit9' },
  '-': { key: '-', code: 'Minus' },
  '=': { key: '=', code: 'Equal' },
  '+': { key: '+', code: 'NumpadAdd' },
  BracketLeft: { key: 'è', code: 'BracketLeft' },
  BracketRight: { key: '+', code: 'BracketRight' },
  Backquote: { key: '\\', code: 'Backquote' },
  Quote: { key: 'à', code: 'Quote' },
  Space: { key: ' ', code: 'Space' },
  // Su tastiera italiana il punto interrogativo e' Maiusc+Minus.
  '?': { key: '?', code: 'Minus' },
  Alt: { key: 'Alt', code: 'AltLeft' },
  Ctrl: { key: 'Control', code: 'ControlLeft' },
  Shift: { key: 'Shift', code: 'ShiftLeft' },
};

/** Costruisce il `KeyLike` che il browser produrrebbe per questa firma. */
export function evento(signature: string): KeyLike {
  const { mods, token } = parseSignature(signature);
  const base =
    TOKEN_EVENT[token] ??
    (/^[A-Za-z]$/.test(token)
      ? { key: token.toLowerCase(), code: `Key${token.toUpperCase()}` }
      : { key: token, code: token });
  return {
    key: base.key,
    code: base.code,
    ctrlKey: mods.includes('Ctrl') || token === 'Ctrl',
    altKey: mods.includes('Alt') || token === 'Alt',
    shiftKey: mods.includes('Shift') || token === 'Shift',
    metaKey: mods.includes('Meta'),
  };
}

/** Preme una o piu' scorciatoie in sequenza. Restituisce l'esito dell'ultima. */
export function premi(s: GridSession, ...signatures: string[]): boolean {
  let consumed = false;
  for (const sig of signatures) consumed = s.handleKey(evento(sig));
  return consumed;
}

/** Digita del testo carattere per carattere, come farebbe un utente. */
export function scrivi(s: GridSession, text: string): void {
  for (const ch of text) {
    s.handleKey({ key: ch, code: '', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false });
  }
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

/**
 *        A         B      C      D
 *  1   Ricavi     100    110    120
 *  2   Costi      -60    -66    -72
 *  3   (vuoto)
 *  4   Totale      40     44     48
 */
const CONTO: CellRaw[][] = [
  ['Ricavi', 100, 110, 120],
  ['Costi', -60, -66, -72],
  [null, null, null, null],
  ['Totale', 40, 44, 48],
];

function apri(
  data: CellRaw[][] = CONTO,
  start: { row: number; col: number } = { row: 0, col: 0 },
  opts: SessionOptions = {},
): { wb: Workbook; s: GridSession } {
  const wb = Workbook.create([{ name: 'Model', data }]);
  const s = new GridSession(wb, { sheet: 0, ...start }, opts);
  return { wb, s };
}

/** Indirizzo A1 della cella attiva: rende leggibili le asserzioni. */
function attiva(s: GridSession): string {
  const c = s.activeCell;
  return `${String.fromCharCode(65 + c.col)}${c.row + 1}`;
}

/** Area attiva in notazione A1. */
function area(s: GridSession): string {
  return rangeToA1(s.selectionState.areas[s.selectionState.activeArea].range);
}

function vaiA(s: GridSession, a1: string): void {
  const c = a1ToCoord(a1);
  if (!c) throw new Error(`indirizzo non valido: ${a1}`);
  s.goToReference(a1);
  expect(attiva(s)).toBe(a1);
}

// ===========================================================================
// A) Navigazione
// ===========================================================================

describe('Ctrl+Freccia: le tre casistiche di Excel', () => {
  it('da cella piena con la vicina piena atterra in fondo al blocco contiguo', () => {
    const { s } = apri();
    premi(s, 'Ctrl+ArrowDown');
    expect(attiva(s)).toBe('A2');
  });

  it('da cella piena con la vicina vuota salta alla prima cella piena successiva', () => {
    const { s } = apri(CONTO, { row: 1, col: 0 });
    premi(s, 'Ctrl+ArrowDown');
    expect(attiva(s)).toBe('A4');
  });

  it('da cella vuota atterra sulla prima piena, non in fondo al blocco', () => {
    const { s } = apri(CONTO, { row: 2, col: 0 });
    premi(s, 'Ctrl+ArrowDown');
    expect(attiva(s)).toBe('A4');
  });

  it("dall'ultima cella piena va al bordo del foglio", () => {
    const { s } = apri(CONTO, { row: 3, col: 0 });
    premi(s, 'Ctrl+ArrowDown');
    expect(s.activeCell.row).toBe(LAST_ROW);
  });

  it('Ctrl+Destra percorre la riga di intestazione fino al bordo del blocco', () => {
    const { s } = apri();
    premi(s, 'Ctrl+ArrowRight');
    expect(attiva(s)).toBe('D1');
  });

  it('Ctrl+Sinistra dal bordo destro torna in colonna A', () => {
    const { s } = apri(CONTO, { row: 0, col: 3 });
    premi(s, 'Ctrl+ArrowLeft');
    expect(attiva(s)).toBe('A1');
  });

  it('al bordo del foglio Ctrl+Freccia non muove nulla', () => {
    const { s } = apri();
    premi(s, 'Ctrl+ArrowUp');
    expect(attiva(s)).toBe('A1');
  });
});

describe('Ctrl+Maiusc+Freccia: salto dalla cella attiva, rettangolo dall’ancora', () => {
  it('estende dal blocco corrente tenendo ferma l’ancora', () => {
    const { s } = apri();
    premi(s, 'Ctrl+Shift+ArrowDown');
    expect(area(s)).toBe('A1:A2');
    expect(attiva(s)).toBe('A2');
    expect(s.selectionState.areas[0].anchor).toEqual({ row: 0, col: 0 });
  });

  it('il secondo salto riparte dalla CELLA ATTIVA, non dal bordo del rettangolo', () => {
    const { s } = apri();
    premi(s, 'Ctrl+Shift+ArrowDown', 'Ctrl+Shift+ArrowDown');
    expect(area(s)).toBe('A1:A4');
    expect(attiva(s)).toBe('A4');
  });

  it('tornando indietro la selezione si RIDUCE, perche’ l’ancora resta ferma', () => {
    const { s } = apri();
    premi(s, 'Ctrl+Shift+ArrowDown', 'Ctrl+Shift+ArrowDown');
    expect(area(s)).toBe('A1:A4');
    premi(s, 'Ctrl+Shift+ArrowUp');
    expect(area(s)).toBe('A1:A2');
    expect(s.selectionState.areas[0].anchor).toEqual({ row: 0, col: 0 });
  });

  it('Maiusc+Freccia estende di una cella per volta', () => {
    const { s } = apri();
    premi(s, 'Shift+ArrowRight', 'Shift+ArrowRight');
    expect(area(s)).toBe('A1:C1');
    expect(attiva(s)).toBe('C1');
  });

  it('Maiusc+Freccia indietro riduce senza spostare l’ancora', () => {
    const { s } = apri();
    premi(s, 'Shift+ArrowRight', 'Shift+ArrowRight', 'Shift+ArrowLeft');
    expect(area(s)).toBe('A1:B1');
  });
});

describe('Home, Ctrl+Home, Ctrl+Fine, PagSu/PagGiu', () => {
  it('Home riporta in colonna A della riga corrente', () => {
    const { s } = apri(CONTO, { row: 1, col: 2 });
    premi(s, 'Home');
    expect(attiva(s)).toBe('A2');
  });

  it('Ctrl+Home va in A1', () => {
    const { s } = apri(CONTO, { row: 3, col: 3 });
    premi(s, 'Ctrl+Home');
    expect(attiva(s)).toBe('A1');
  });

  it('con i riquadri bloccati Ctrl+Home va sotto e a destra del blocco congelato', () => {
    const { s } = apri(CONTO, { row: 1, col: 1 });
    s.execute('structure.freezePanes');
    premi(s, 'Ctrl+ArrowDown', 'Ctrl+Home');
    expect(attiva(s)).toBe('B2');
  });

  it("Ctrl+Fine va all'angolo dell'area utilizzata", () => {
    const { s } = apri();
    premi(s, 'Ctrl+End');
    expect(attiva(s)).toBe('D4');
  });

  it('PagGiu scende di una schermata e PagSu risale', () => {
    const { s } = apri(CONTO, { row: 0, col: 0 }, { visibleRows: 10 });
    premi(s, 'PageDown');
    expect(s.activeCell.row).toBe(10);
    premi(s, 'PageUp');
    expect(s.activeCell.row).toBe(0);
  });

  it('Alt+PagGiu scorre di una schermata di colonne', () => {
    const { s } = apri(CONTO, { row: 0, col: 0 }, { visibleCols: 5 });
    premi(s, 'Alt+PageDown');
    expect(s.activeCell.col).toBe(5);
  });

  it('Maiusc+Fine (Ctrl+Maiusc+Fine) estende fino all’ultima cella usata', () => {
    const { s } = apri();
    premi(s, 'Ctrl+Shift+End');
    expect(area(s)).toBe('A1:D4');
  });
});

describe('La sequenza che conta: Tab, Tab, Tab, Invio', () => {
  it('Invio riporta alla COLONNA di partenza, una riga sotto', () => {
    const { s } = apri();
    premi(s, 'Tab', 'Tab', 'Tab');
    expect(attiva(s)).toBe('D1');
    premi(s, 'Enter');
    expect(attiva(s)).toBe('A2');
  });

  it('una freccia in mezzo AZZERA il ritorno a capo', () => {
    const { s } = apri();
    premi(s, 'Tab', 'Tab');
    expect(attiva(s)).toBe('C1');
    premi(s, 'ArrowDown');
    expect(s.selectionState.entryOrigin).toBeNull();
    premi(s, 'Enter');
    expect(attiva(s)).toBe('C3');
  });

  it('la catena vale anche digitando: Tab conferma e resta nella catena', () => {
    const { s } = apri([[null, null, null]], { row: 0, col: 0 });
    scrivi(s, '10');
    premi(s, 'Tab');
    scrivi(s, '20');
    premi(s, 'Tab');
    scrivi(s, '30');
    premi(s, 'Enter');
    expect(attiva(s)).toBe('A2');
  });

  it('Maiusc+Tab torna indietro', () => {
    const { s } = apri(CONTO, { row: 0, col: 2 });
    premi(s, 'Shift+Tab');
    expect(attiva(s)).toBe('B1');
  });

  it('dopo Invio la catena e’ chiusa: un secondo Invio scende normalmente', () => {
    const { s } = apri();
    premi(s, 'Tab', 'Tab', 'Enter');
    expect(attiva(s)).toBe('A2');
    premi(s, 'Enter');
    expect(attiva(s)).toBe('A3');
  });
});

describe('Invio e Tab dentro una selezione multi-cella', () => {
  it('Invio scorre in colonna dentro la selezione', () => {
    const { s } = apri();
    premi(s, 'Shift+ArrowRight', 'Shift+ArrowDown');
    expect(area(s)).toBe('A1:B2');
    premi(s, 'Ctrl+Home');
    premi(s, 'Shift+ArrowRight', 'Shift+ArrowDown');
    // Riporta la cella attiva su A1 senza distruggere la selezione: Invio dopo
    // l'ultima cella fa il giro.
    premi(s, 'Enter');
    expect(area(s)).toBe('A1:B2');
    expect(attiva(s)).toBe('A1');
  });

  it('Invio va a capo di colonna e alla fine torna alla prima cella', () => {
    const { s } = apri();
    premi(s, 'Shift+ArrowRight', 'Shift+ArrowDown', 'Enter');
    expect(attiva(s)).toBe('A1');
    premi(s, 'Enter');
    expect(attiva(s)).toBe('A2');
    premi(s, 'Enter');
    expect(attiva(s)).toBe('B1');
    premi(s, 'Enter');
    expect(attiva(s)).toBe('B2');
    premi(s, 'Enter');
    expect(attiva(s)).toBe('A1');
  });

  it('Tab scorre per righe dentro la selezione e non ne esce', () => {
    const { s } = apri();
    premi(s, 'Shift+ArrowRight', 'Shift+ArrowDown', 'Enter');
    expect(attiva(s)).toBe('A1');
    premi(s, 'Tab');
    expect(attiva(s)).toBe('B1');
    premi(s, 'Tab');
    expect(attiva(s)).toBe('A2');
    expect(area(s)).toBe('A1:B2');
  });

  it('Maiusc+Invio risale dentro la selezione', () => {
    const { s } = apri();
    premi(s, 'Shift+ArrowRight', 'Shift+ArrowDown');
    expect(attiva(s)).toBe('B2');
    premi(s, 'Shift+Enter');
    expect(attiva(s)).toBe('B1');
  });
});

describe('Ctrl+Spazio, Maiusc+Spazio, Ctrl+A', () => {
  it('Ctrl+Spazio seleziona la colonna intera e non muove la cella attiva', () => {
    const { s } = apri(CONTO, { row: 1, col: 1 });
    premi(s, 'Ctrl+Space');
    const r = s.selectionState.areas[0].range;
    expect(r).toEqual({ top: 0, left: 1, bottom: LAST_ROW, right: 1 });
    expect(attiva(s)).toBe('B2');
  });

  it('Maiusc+Spazio seleziona la riga intera e non muove la cella attiva', () => {
    const { s } = apri(CONTO, { row: 1, col: 1 });
    premi(s, 'Shift+Space');
    const r = s.selectionState.areas[0].range;
    expect(r).toEqual({ top: 1, left: 0, bottom: 1, right: LAST_COL });
    expect(attiva(s)).toBe('B2');
  });

  it('Ctrl+A prende prima la regione corrente, poi tutto il foglio', () => {
    const { s } = apri();
    premi(s, 'Ctrl+A');
    expect(area(s)).toBe('A1:D2');
    premi(s, 'Ctrl+A');
    const r = s.selectionState.areas[0].range;
    expect(r).toEqual({ top: 0, left: 0, bottom: LAST_ROW, right: LAST_COL });
  });
});

describe('Ctrl+[ e Ctrl+]: precedenti e dipendenti veri', () => {
  function modello() {
    return apri(
      [
        ['Ricavi', 100],
        ['Costi', 60],
        ['Margine', '=B1-B2'],
        ['Margine %', '=B3/B1'],
      ],
      { row: 2, col: 1 },
    );
  }

  it('Ctrl+[ seleziona i precedenti della formula', () => {
    const { s } = modello();
    premi(s, 'Ctrl+BracketLeft');
    const celle = s.selectionState.areas.map((a) => rangeToA1(a.range)).sort();
    expect(celle).toEqual(['B1', 'B2']);
  });

  it('Ctrl+] seleziona i dipendenti della cella', () => {
    const { s } = modello();
    premi(s, 'Ctrl+BracketRight');
    const celle = s.selectionState.areas.map((a) => rangeToA1(a.range));
    expect(celle).toEqual(['B4']);
  });

  it('senza precedenti lo dice invece di non fare niente', () => {
    const { s } = apri(CONTO, { row: 0, col: 1 });
    premi(s, 'Ctrl+BracketLeft');
    expect(s.snapshot().status).toBe('Nessun precedente.');
    expect(attiva(s)).toBe('B1');
  });
});

describe('F8: modalita’ Estendi selezione', () => {
  it('con F8 attivo le frecce estendono invece di spostare', () => {
    const { s } = apri();
    premi(s, 'F8');
    expect(s.selectionState.extendMode).toBe(true);
    premi(s, 'ArrowDown', 'ArrowRight');
    expect(area(s)).toBe('A1:B2');
    premi(s, 'F8');
    expect(s.selectionState.extendMode).toBe(false);
  });
});

// ===========================================================================
// B) Editing
// ===========================================================================

describe('Digitazione da stato Pronto', () => {
  it('digitare SOSTITUISCE il contenuto, non lo aggiunge', () => {
    const { wb, s } = apri();
    scrivi(s, 'Vendite');
    expect(s.editState.mode).toBe('enter');
    expect(s.editState.text).toBe('Vendite');
    premi(s, 'Enter');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBe('Vendite');
  });

  it('dopo Invio la cella attiva scende e lo stato torna Pronto', () => {
    const { s } = apri();
    scrivi(s, '42');
    premi(s, 'Enter');
    expect(s.editState.mode).toBe('ready');
    expect(attiva(s)).toBe('A2');
  });

  it('un numero digitato arriva al motore come numero', () => {
    const { wb, s } = apri([[null]], { row: 0, col: 0 });
    scrivi(s, '42');
    premi(s, 'Enter');
    expect(wb.getValue(0, { row: 0, col: 0 })).toBe(42);
  });

  it('una formula digitata viene calcolata', () => {
    const { wb, s } = apri();
    vaiA(s, 'B5');
    scrivi(s, '=B1+B2');
    premi(s, 'Enter');
    expect(wb.getValue(0, { row: 4, col: 1 })).toBe(40);
  });
});

describe('F2 e la differenza fra Modifica e Immissione', () => {
  it('F2 apre in modifica, conserva il contenuto e mette il cursore in fondo', () => {
    const { s } = apri();
    premi(s, 'F2');
    expect(s.editState.mode).toBe('edit');
    expect(s.editState.text).toBe('Ricavi');
    expect(s.editState.selectionStart).toBe(6);
    expect(s.editState.openedWithF2).toBe(true);
  });

  it('in MODIFICA le frecce muovono il cursore NEL TESTO', () => {
    const { s } = apri();
    premi(s, 'F2', 'ArrowLeft', 'ArrowLeft');
    expect(s.editState.mode).toBe('edit');
    expect(s.editState.selectionStart).toBe(4);
    expect(attiva(s)).toBe('A1');
  });

  it('in IMMISSIONE le stesse frecce confermano e spostano la cella', () => {
    const { wb, s } = apri();
    scrivi(s, 'Netto');
    expect(s.editState.mode).toBe('enter');
    premi(s, 'ArrowRight');
    expect(s.editState.mode).toBe('ready');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBe('Netto');
    expect(attiva(s)).toBe('B1');
  });

  it('in Modifica, dopo aver spostato il cursore, si digita in mezzo al testo', () => {
    const { wb, s } = apri();
    premi(s, 'F2', 'ArrowLeft');
    scrivi(s, 'X');
    premi(s, 'Enter');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBe('RicavXi');
  });

  it('Home e Fine in Modifica muovono il cursore nel testo', () => {
    const { s } = apri();
    premi(s, 'F2', 'Home');
    expect(s.editState.selectionStart).toBe(0);
    premi(s, 'End');
    expect(s.editState.selectionStart).toBe(6);
    expect(s.editState.mode).toBe('edit');
  });

  it('Backspace da Pronto svuota la cella e apre la modifica', () => {
    const { s } = apri();
    premi(s, 'Backspace');
    expect(s.editState.mode).toBe('enter');
    expect(s.editState.text).toBe('');
  });
});

describe('Esc, Canc e celle bloccate', () => {
  it('Esc annulla la modifica e la cella resta come prima', () => {
    const { wb, s } = apri();
    premi(s, 'F2');
    scrivi(s, 'XYZ');
    premi(s, 'Escape');
    expect(s.editState.mode).toBe('ready');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBe('Ricavi');
  });

  it('Canc su una selezione multipla svuota tutte le aree', () => {
    const { wb, s } = apri();
    premi(s, 'Shift+ArrowRight'); // A1:B1
    s.clickCell({ row: 3, col: 0 }, { addArea: true });
    s.clickCell({ row: 3, col: 1 }, { addArea: true });
    expect(s.selectionState.areas.length).toBe(3);
    premi(s, 'Delete');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBeNull();
    expect(wb.getRaw(0, { row: 0, col: 1 })).toBeNull();
    expect(wb.getRaw(0, { row: 3, col: 0 })).toBeNull();
    expect(wb.getRaw(0, { row: 3, col: 1 })).toBeNull();
    // Le celle fuori selezione non vengono toccate.
    expect(wb.getRaw(0, { row: 1, col: 0 })).toBe('Costi');
  });

  it('scrivere su una cella BLOCCATA non modifica nulla e produce un messaggio', () => {
    const { wb, s } = apri();
    wb.setLocked(0, { top: 0, left: 0, bottom: 0, right: 0 }, true);
    scrivi(s, 'X');
    expect(s.editState.mode).toBe('ready');
    expect(s.snapshot().status).toContain('A1');
    expect(s.snapshot().status).toContain('bloccata');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBe('Ricavi');
  });

  it('F2 su una cella bloccata non apre la modifica', () => {
    const { wb, s } = apri();
    wb.setLocked(0, { top: 0, left: 0, bottom: 0, right: 0 }, true);
    premi(s, 'F2');
    expect(s.editState.mode).toBe('ready');
    expect(s.snapshot().status).toContain('bloccata');
  });

  it('Canc non svuota le celle bloccate dentro la selezione', () => {
    const { wb, s } = apri();
    wb.setLocked(0, { top: 0, left: 0, bottom: 0, right: 0 }, true);
    premi(s, 'Shift+ArrowRight');
    premi(s, 'Delete');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBe('Ricavi');
    expect(wb.getRaw(0, { row: 0, col: 1 })).toBeNull();
  });

  it('Esc da Pronto smonta la selezione multipla', () => {
    const { s } = apri();
    s.clickCell({ row: 3, col: 0 }, { addArea: true });
    expect(s.selectionState.areas.length).toBe(2);
    premi(s, 'Escape');
    expect(s.selectionState.areas.length).toBe(1);
  });
});

describe('F4: ancoraggi in modifica, ripetizione fuori', () => {
  it('F4 in modifica cicla gli ancoraggi del riferimento sotto il cursore', () => {
    const { s } = apri();
    vaiA(s, 'B5');
    scrivi(s, '=B1');
    premi(s, 'F4');
    expect(s.editState.text).toBe('=$B$1');
    premi(s, 'F4');
    expect(s.editState.text).toBe('=B$1');
    premi(s, 'F4');
    expect(s.editState.text).toBe('=$B1');
    premi(s, 'F4');
    expect(s.editState.text).toBe('=B1');
  });

  it("l'ancoraggio scelto arriva davvero nella cella", () => {
    const { wb, s } = apri();
    vaiA(s, 'B5');
    scrivi(s, '=B1');
    premi(s, 'F4', 'Enter');
    expect(wb.getFormula(0, { row: 4, col: 1 })).toBe('=$B$1');
  });

  it("F4 da Pronto ripete l'ultima azione", () => {
    const { wb, s } = apri();
    premi(s, 'Ctrl+B');
    expect(wb.getStyle(0, { row: 0, col: 0 }).bold).toBe(true);
    premi(s, 'ArrowRight', 'F4');
    expect(wb.getStyle(0, { row: 0, col: 1 }).bold).toBe(true);
  });

  it('F4 senza nulla da ripetere lo dice', () => {
    const { s } = apri();
    premi(s, 'F4');
    expect(s.snapshot().status).toBe('Niente da ripetere.');
  });
});

describe('Alt+Invio e testo multiriga', () => {
  it('Alt+Invio inserisce un a capo dentro la cella senza confermare', () => {
    const { wb, s } = apri();
    vaiA(s, 'A6');
    scrivi(s, 'Prima');
    premi(s, 'Alt+Enter');
    scrivi(s, 'Seconda');
    expect(s.editState.mode).toBe('enter');
    expect(s.editState.text).toBe('Prima\nSeconda');
    premi(s, 'Enter');
    expect(wb.getRaw(0, { row: 5, col: 0 })).toBe('Prima\nSeconda');
  });
});

describe('Ctrl+Z e Ctrl+Y', () => {
  it('una digitazione si annulla e si ripristina in un colpo', () => {
    const { wb, s } = apri();
    scrivi(s, 'Nuovo');
    premi(s, 'Enter');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBe('Nuovo');
    premi(s, 'Ctrl+Z');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBe('Ricavi');
    premi(s, 'Ctrl+Y');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBe('Nuovo');
  });

  it('Ctrl+D su un range e’ UNA sola azione da annullare', () => {
    const { wb, s } = apri([['=1+1'], [null], [null]], { row: 0, col: 0 });
    premi(s, 'Shift+ArrowDown', 'Shift+ArrowDown', 'Ctrl+D');
    expect(wb.getFormula(0, { row: 1, col: 0 })).toBe('=1+1');
    expect(wb.getFormula(0, { row: 2, col: 0 })).toBe('=1+1');
    premi(s, 'Ctrl+Z');
    expect(wb.getRaw(0, { row: 1, col: 0 })).toBeNull();
    expect(wb.getRaw(0, { row: 2, col: 0 })).toBeNull();
  });

  it('Canc su piu’ aree si annulla in un colpo solo', () => {
    const { wb, s } = apri();
    premi(s, 'Shift+ArrowRight');
    s.clickCell({ row: 3, col: 0 }, { addArea: true });
    premi(s, 'Delete');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBeNull();
    premi(s, 'Ctrl+Z');
    expect(wb.getRaw(0, { row: 0, col: 0 })).toBe('Ricavi');
    expect(wb.getRaw(0, { row: 0, col: 1 })).toBe(100);
    expect(wb.getRaw(0, { row: 3, col: 0 })).toBe('Totale');
  });

  it('contenuto e stile della stessa azione tornano indietro insieme', () => {
    const { wb, s } = apri([['=10*2', null]], { row: 0, col: 0 });
    premi(s, 'Ctrl+B');
    premi(s, 'Ctrl+C');
    premi(s, 'ArrowRight', 'Ctrl+V');
    expect(wb.getFormula(0, { row: 0, col: 1 })).toBe('=10*2');
    expect(wb.getStyle(0, { row: 0, col: 1 }).bold).toBe(true);
    premi(s, 'Ctrl+Z');
    expect(wb.getRaw(0, { row: 0, col: 1 })).toBeNull();
    expect(wb.getStyle(0, { row: 0, col: 1 }).bold).toBeUndefined();
  });
});

describe('Barra della formula e snapshot', () => {
  it('la barra mostra il contenuto grezzo da Pronto e il testo in modifica', () => {
    const { s } = apri();
    vaiA(s, 'B5');
    scrivi(s, '=B1+B2');
    premi(s, 'Enter');
    vaiA(s, 'B5');
    expect(s.formulaBarText()).toBe('=B1+B2');
    premi(s, 'F2');
    scrivi(s, '+1');
    expect(s.formulaBarText()).toBe('=B1+B2+1');
  });

  it('ogni comando fa avanzare la revisione e notifica gli iscritti', () => {
    const { s } = apri();
    const viste: number[] = [];
    const stop = s.subscribe((snap) => viste.push(snap.revision));
    premi(s, 'ArrowDown', 'ArrowDown');
    expect(viste.length).toBe(2);
    expect(viste[1]).toBeGreaterThan(viste[0]);
    stop();
    premi(s, 'ArrowDown');
    expect(viste.length).toBe(2);
  });

  it('un tasto senza binding non viene consumato', () => {
    const { s } = apri();
    expect(s.handleKey(evento('Ctrl+Shift+F7'))).toBe(false);
  });
});

describe('mouse-free e il suo lock (spec §3.3: "nei livelli Speed Run il mouse e\' disabilitato hard")', () => {
  it('senza opzioni il mouse funziona normalmente', () => {
    const { s } = apri();
    expect(s.snapshot().mouseFree).toBe(false);
    expect(s.clickCell({ row: 2, col: 1 })).toBe(true);
    expect(attiva(s)).toBe('B3');
  });

  it('mouseFree attivo ma non lockato: il pulsante puo\' riaccenderlo', () => {
    const { s } = apri(CONTO, { row: 0, col: 0 }, { mouseFree: true });
    expect(s.snapshot().mouseFree).toBe(true);
    expect(s.snapshot().mouseFreeLocked).toBe(false);

    const primaAttiva = attiva(s);
    expect(s.clickCell({ row: 2, col: 1 })).toBe(false); // bloccato: non muove il cursore
    expect(attiva(s)).toBe(primaAttiva);
    expect(s.snapshot().mouseBlocked).toBe(1);

    s.setMouseFree(false);
    expect(s.snapshot().mouseFree).toBe(false);
    expect(s.clickCell({ row: 2, col: 1 })).toBe(true);
    expect(attiva(s)).toBe('B3');
  });

  it('lockato: setMouseFree(false) non ha alcun effetto', () => {
    const { s } = apri(CONTO, { row: 0, col: 0 }, { mouseFree: true, mouseFreeLocked: true });
    s.setMouseFree(false);
    expect(s.snapshot().mouseFree).toBe(true);
    // Il click resta bloccato e contato: e' questo che produce il salto di velocita'.
    expect(s.clickCell({ row: 2, col: 1 })).toBe(false);
    expect(s.snapshot().mouseBlocked).toBe(1);
  });

  it('lockato: il comando da tastiera ui.toggleMouseFree non lo sblocca', () => {
    const { s } = apri(CONTO, { row: 0, col: 0 }, { mouseFree: true, mouseFreeLocked: true });
    // '?' apre il cheat sheet: qui serve invocare il comando direttamente,
    // il binding di produzione per il toggle non ha una scorciatoia dedicata
    // nello spec, quindi si esercita l'API che il pulsante HUD chiama.
    s.execute('ui.toggleMouseFree');
    expect(s.snapshot().mouseFree).toBe(true);
    expect(s.snapshot().status).toContain('Speed Run');
  });

  it('lockato senza mouseFree iniziale: parte comunque disabilitato ("hard" non ha eccezioni)', () => {
    const { s } = apri(CONTO, { row: 0, col: 0 }, { mouseFreeLocked: true });
    expect(s.snapshot().mouseFree).toBe(true);
  });

  it('senza lock, riattivarlo funziona normalmente (nessuna regressione)', () => {
    const { s } = apri(CONTO, { row: 0, col: 0 }, { mouseFree: true });
    s.execute('ui.toggleMouseFree');
    expect(s.snapshot().mouseFree).toBe(false);
    expect(s.clickCell({ row: 2, col: 1 })).toBe(true);
  });
});
