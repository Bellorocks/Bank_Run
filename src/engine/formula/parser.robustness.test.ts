/**
 * Robustezza del parser di formule.
 *
 * Invariante non negoziabile: `parseFormula` NON lancia mai, qualunque
 * spazzatura riceva. La barra della formula lo chiama a ogni battuta, mentre
 * l'utente sta ancora scrivendo — quindi la meta' delle stringhe che vede sono
 * sintatticamente incomplete per costruzione. Un'eccezione qui significa la
 * griglia che si pianta mentre si digita.
 */

import { describe, it, expect } from 'vitest';
import { HyperFormula } from 'hyperformula';
import { parseFormula } from './parser';
import { formatFragmentValue } from './fragment';

describe('il parser non lancia mai', () => {
  it('sopravvive a input malformati noti', () => {
    const casi = [
      '', '=', '==', '=(', '=)', '=()', '=SUM(', '=SUM()', '=SUM(,)', '=SUM(A1,,A3)',
      '="', '="non chiusa', '=A', '=A1:', '=:A1', '=$', '=$$A$$1', '=1..5', '=.',
      '=#', '=#REF', '=A1 A2', '=A1,A2', '=--1', '=+++1', '=1%%%', '=^2', '=&',
      "='foglio senza chiusura!A1", '=[]', '=@', '=1e', '=1e+', '=0x10',
    ];
    for (const src of casi) {
      expect(() => parseFormula(src), `input: ${JSON.stringify(src)}`).not.toThrow();
      const res = parseFormula(src);
      expect(res, `input: ${JSON.stringify(src)}`).toHaveProperty('errors');
    }
  });

  it('sopravvive a 3.000 stringhe generate a caso', () => {
    // PRNG locale e deterministico: un fuzz che cambia a ogni esecuzione produce
    // fallimenti irriproducibili, che e' il peggior tipo di test rosso.
    let seed = 0x1234567;
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const pool = [
      'A1', '$B$2', 'A1:B2', 'A:A', '3:3', "'My Sheet'!X9", 'SUM', 'IF(', 'TRUE',
      '1', '.5', '"t"', '"', '#REF!', '+', '-', '*', '/', '^', '&', '=', '<>', '<=',
      '%', '(', ')', ',', ':', ' ', '@', '~', ';', '!', '\\',
    ];

    const fallimenti: string[] = [];
    for (let iter = 0; iter < 3000; iter++) {
      const len = 1 + Math.floor(rnd() * 10);
      let src = rnd() < 0.5 ? '=' : '';
      for (let k = 0; k < len; k++) src += pool[Math.floor(rnd() * pool.length)];
      try {
        parseFormula(src);
      } catch (err) {
        fallimenti.push(`${JSON.stringify(src)} -> ${(err as Error).message}`);
        if (fallimenti.length >= 5) break;
      }
    }
    expect(fallimenti).toEqual([]);
  });
});

describe('formatFragmentValue', () => {
  it('distingue un errore Excel da una stringa che comincia per #', () => {
    // F9 sostituisce il frammento col suo valore: un errore va scritto nudo,
    // una stringa va messa fra virgolette, o la formula risultante non si
    // ricompila piu'. Il discrimine e' l'insieme CHIUSO dei codici di errore,
    // non il fatto che il testo cominci per '#'.
    expect(formatFragmentValue('#DIV/0!')).toBe('#DIV/0!');
    expect(formatFragmentValue('#N/A')).toBe('#N/A');
    expect(formatFragmentValue('#REF!')).toBe('#REF!');

    expect(formatFragmentValue('#hashtag')).toBe('"#hashtag"');
    expect(formatFragmentValue('#1')).toBe('"#1"');
    expect(formatFragmentValue('#')).toBe('"#"');
    expect(formatFragmentValue('a#b')).toBe('"a#b"');
    expect(formatFragmentValue('#REF!x')).toBe('"#REF!x"');
    expect(formatFragmentValue('MARGINE#')).toBe('"MARGINE#"');
  });
});

describe('allineamento col motore vero', () => {
  const hf = HyperFormula.buildFromArray(
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
    { licenseKey: 'gpl-v3' },
  );
  const id = hf.getSheetId('Sheet1')!;
  const valuta = (f: string): unknown => hf.calculateFormula(f, id);

  it('le precedenze del nostro parser coincidono con quelle di HyperFormula', () => {
    // Il caso che sorprende tutti: in Excel l'unario lega piu' forte di ^,
    // quindi -2^2 fa 4, non -4.
    expect(valuta('=-2^2')).toBe(4);
    expect(valuta('=2+3*4')).toBe(14);
    expect(valuta('=(2+3)*4')).toBe(20);
    expect(valuta('=2^3^2')).toBe(64); // associativa a sinistra, non a destra
    expect(valuta('=50%*2')).toBe(1);
    expect(valuta('="a"&"b"')).toBe('ab');
    expect(valuta('=1<2')).toBe(true);

    for (const f of ['=-2^2', '=2+3*4', '=(2+3)*4', '=2^3^2', '=50%*2', '="a"&"b"', '=1<2']) {
      expect(parseFormula(f).errors, `${f} non deve avere errori di parsing`).toEqual([]);
    }
  });

  it('documenta i limiti noti di HyperFormula sugli operatori di riferimento', () => {
    // Intersezione (spazio) e unione (virgola fuori da una funzione) NON sono
    // supportate dal motore. Il nostro tokenizer le riconosce comunque, perche'
    // il grader deve poter dire all'utente che ha usato un costrutto che qui non
    // gira, invece di mostrargli un errore di parsing incomprensibile.
    const inCella = (f: string): { type?: string } => {
      hf.setCellContents({ sheet: id, row: 5, col: 0 }, [[f]]);
      return hf.getCellValue({ sheet: id, row: 5, col: 0 }) as { type?: string };
    };
    expect(inCella('=SUM(A1:A3 A2:C2)')?.type).toBe('ERROR');
    expect(inCella('=SUM((A1:A3,C1:C3))')?.type).toBe('ERROR');
    expect(inCella('=A1:A3 A2:C2')?.type).toBe('ERROR');
  });

  it('calculateFormula LANCIA sull\'input non parsificabile, invece di restituire un errore', () => {
    // Differenza di comportamento fra le due API che va conosciuta: scrivere in
    // una cella produce #ERROR!, valutare al volo solleva un'eccezione. E' il
    // motivo per cui `Workbook.evaluateFragment` chiama prima `validateFormula`:
    // senza quel guard, un F9 su un frammento incompleto farebbe cadere la griglia.
    expect(() => valuta('=SUM(')).toThrow();
    expect(hf.validateFormula('=SUM(')).toBe(false);
    expect(hf.validateFormula('=SUM(A1:A3)')).toBe(true);
  });
});
