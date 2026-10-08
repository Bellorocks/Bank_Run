import { describe, it, expect } from 'vitest';
import { Workbook } from '../engine/workbook';
import { GridSession } from './session';
import { parseSignature } from '../keymap/keySignature';

/**
 * Copia e incolla guidati dalla tastiera, esattamente come li batte l'utente.
 *
 * Questi casi nascono da una sessione di prova nel browser in cui `Ctrl+C`
 * seguito da `Ctrl+V` su una selezione piu' grande della sorgente non riempiva
 * niente: il percorso tasto -> comando -> appunti -> foglio non era mai stato
 * percorso per intero in un test.
 */

function premi(s: GridSession, ...specs: string[]): void {
  for (const spec of specs) {
    const { mods, token } = parseSignature(spec);
    const code =
      /^[A-Za-z]$/.test(token) ? `Key${token.toUpperCase()}`
      : /^[0-9]$/.test(token) ? `Digit${token}`
      : token;
    s.handleKey({
      key: token.length === 1 ? token.toLowerCase() : token,
      code,
      ctrlKey: mods.includes('Ctrl'),
      shiftKey: mods.includes('Shift'),
      altKey: mods.includes('Alt'),
      metaKey: false,
      repeat: false,
    });
  }
}

function scrivi(s: GridSession, testo: string): void {
  for (const ch of testo) {
    s.handleKey({
      key: ch,
      code: /^[A-Za-z]$/.test(ch) ? `Key${ch.toUpperCase()}` : 'Unidentified',
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
    });
  }
}

function apri() {
  const wb = Workbook.create([
    {
      name: 'Model',
      data: [
        [2, 10, null, null, null],
        [3, 20, null, null, null],
        [4, 30, null, null, null],
      ],
    },
  ]);
  const s = new GridSession(wb, { sheet: 0, row: 0, col: 2 });
  return { wb, s };
}

describe('copia e incolla da tastiera', () => {
  it('Ctrl+C su una cella e Ctrl+V su un range piu\' grande riempie tutto il range', () => {
    // E' il gesto con cui si riempie una tabella in Excel: copi la formula
    // dell'angolo e la incolli sull'area. Una sorgente 1x1 e' multipla di
    // qualunque bersaglio, quindi si ripete a mosaico.
    const { wb, s } = apri();
    scrivi(s, '=A1*B1');
    premi(s, 'Enter', 'ArrowUp');
    expect(wb.getValue(0, { row: 0, col: 2 })).toBe(20);

    premi(s, 'Ctrl+C');
    premi(s, 'Shift+ArrowDown', 'Shift+ArrowDown');
    premi(s, 'Ctrl+V');

    expect(s.snapshot().status).not.toContain('vuoti');
    expect(wb.getFormula(0, { row: 1, col: 2 })).toBe('=A2*B2');
    expect(wb.getFormula(0, { row: 2, col: 2 })).toBe('=A3*B3');
    expect(wb.getValue(0, { row: 1, col: 2 })).toBe(60);
    expect(wb.getValue(0, { row: 2, col: 2 })).toBe(120);
  });

  it('l\'incolla si estende anche in larghezza', () => {
    const { wb, s } = apri();
    scrivi(s, '=A1*2');
    premi(s, 'Enter', 'ArrowUp', 'Ctrl+C');
    premi(s, 'Shift+ArrowRight', 'Shift+ArrowDown');
    premi(s, 'Ctrl+V');
    expect(wb.getFormula(0, { row: 0, col: 3 })).toBe('=B1*2');
    expect(wb.getFormula(0, { row: 1, col: 2 })).toBe('=A2*2');
    expect(wb.getFormula(0, { row: 1, col: 3 })).toBe('=B2*2');
  });

  it('Ctrl+V senza appunti lo dice invece di non fare niente in silenzio', () => {
    const { s } = apri();
    premi(s, 'Ctrl+V');
    expect(s.snapshot().status).toContain('vuoti');
  });

  it('gli ancoraggi assoluti non si spostano, i relativi si', () => {
    const { wb, s } = apri();
    scrivi(s, '=$A$1*B1');
    premi(s, 'Enter', 'ArrowUp', 'Ctrl+C');
    premi(s, 'Shift+ArrowDown');
    premi(s, 'Ctrl+V');
    expect(wb.getFormula(0, { row: 1, col: 2 })).toBe('=$A$1*B2');
  });
});
