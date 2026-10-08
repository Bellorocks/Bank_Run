/**
 * M0-A · 03 — SUM e famiglia: aggregare una colonna di numeri.
 *
 * Il punto didattico non e' SUM (quello si intuisce in trenta secondi): e' che
 * COUNT e COUNTA non sono la stessa funzione con un nome diverso. Per farlo
 * vedere serve una tabella con un buco vero — una cella lasciata vuota — e una
 * cella che non e' vuota ma non e' nemmeno un numero, una nota scritta a mano.
 * Solo li' la differenza smette di essere una frase nel brief e diventa un
 * numero diverso in due celle affiancate.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const CATEGORIE = () => ([
  tx('M0A-03-AGGREGAZIONI.1'),
  tx('M0A-03-AGGREGAZIONI.2'),
  tx('M0A-03-AGGREGAZIONI.3'),
  tx('M0A-03-AGGREGAZIONI.4'),
  tx('M0A-03-AGGREGAZIONI.5'),
  tx('M0A-03-AGGREGAZIONI.6'),
  tx('M0A-03-AGGREGAZIONI.7'),
  tx('M0A-03-AGGREGAZIONI.8'),
] as const);

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
] as const;

const NOTE = () => ([
  tx('M0A-03-AGGREGAZIONI.9'),
  tx('M0A-03-AGGREGAZIONI.10'),
  tx('M0A-03-AGGREGAZIONI.11'),
  tx('M0A-03-AGGREGAZIONI.12'),
] as const);

const RANGE = 'B4:B11';

/** Task di aggregazione: stessa forma per tutte e sei le funzioni della famiglia. */
function taskAggregato(args: {
  id: string;
  prompt: string;
  target: string;
  atteso: number;
  funzione: string;
  skills: readonly string[];
  minKeystrokes: number;
}): Task {
  return {
    id: args.id,
    prompt: args.prompt,
    targetCell: args.target,
    check: [
      { kind: 'mustBeFormula' as const },
      { kind: 'value' as const, expected: args.atteso },
      { kind: 'mustReference' as const, cells: ['B4', 'B11'] },
      { kind: 'mustUseFunction' as const, functions: [args.funzione] },
    ],
    skills: args.skills,
    minKeystrokes: args.minKeystrokes,
  };
}

export default defineTemplate({
  id: 'M0A-03-AGGREGAZIONI',
  module: 'M0-A',
  get title() {
    return tx('M0A-03-AGGREGAZIONI.title');
  },
  rank: 1,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.aggregates', 'xl.datatypes'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');
    const mese = r.pick(MESI);

    // Una voce resta senza importo (cella vuota) e una ha solo una nota (testo,
    // non un numero): sono le due eccezioni che rendono COUNT e COUNTA diversi
    // per davvero, non solo sulla carta.
    const posVuota = r.int(0, CATEGORIE().length - 1);
    let posNota = r.int(0, CATEGORIE().length - 1);
    while (posNota === posVuota) posNota = r.int(0, CATEGORIE().length - 1);
    const nota = r.pick(NOTE());

    const numeri: number[] = [];
    const valori: (number | string | null)[] = CATEGORIE().map((_cat, i) => {
      if (i === posVuota) return null;
      if (i === posNota) return nota;
      const importo = roundTo(triangular(r, 250, 1500, 9200), 5);
      numeri.push(importo);
      return importo;
    });

    const somma = numeri.reduce((a, b) => a + b, 0);
    const media = somma / numeri.length;
    const minimo = Math.min(...numeri);
    const massimo = Math.max(...numeri);
    const conteggioNumeri = numeri.length;
    const conteggioCompilate = numeri.length + 1; // + la voce con solo la nota

    const tasks = [
      taskAggregato({
        id: 'T1',
        prompt:
          tx('M0A-03-AGGREGAZIONI.14', { mese }),
        target: 'Model!B13',
        atteso: somma,
        funzione: 'SUM',
        skills: ['xl.aggregates'],
        minKeystrokes: 12,
      }),
      taskAggregato({
        id: 'T2',
        prompt: tx('M0A-03-AGGREGAZIONI.15'),
        target: 'Model!B14',
        atteso: media,
        funzione: 'AVERAGE',
        skills: ['xl.aggregates'],
        minKeystrokes: 15,
      }),
      taskAggregato({
        id: 'T3',
        prompt: tx('M0A-03-AGGREGAZIONI.16'),
        target: 'Model!B15',
        atteso: minimo,
        funzione: 'MIN',
        skills: ['xl.aggregates'],
        minKeystrokes: 11,
      }),
      taskAggregato({
        id: 'T4',
        prompt: tx('M0A-03-AGGREGAZIONI.17'),
        target: 'Model!B16',
        atteso: massimo,
        funzione: 'MAX',
        skills: ['xl.aggregates'],
        minKeystrokes: 11,
      }),
      taskAggregato({
        id: 'T5',
        prompt:
          tx('M0A-03-AGGREGAZIONI.18'),
        target: 'Model!B17',
        atteso: conteggioNumeri,
        funzione: 'COUNT',
        skills: ['xl.aggregates', 'xl.datatypes'],
        minKeystrokes: 13,
      }),
      taskAggregato({
        id: 'T6',
        prompt:
          tx('M0A-03-AGGREGAZIONI.19'),
        target: 'Model!B18',
        atteso: conteggioCompilate,
        funzione: 'COUNTA',
        skills: ['xl.aggregates', 'xl.datatypes'],
        minKeystrokes: 14,
      }),
    ];

    return {
      templateId: 'M0A-03-AGGREGAZIONI',
      seed: rng.seed,
      brief: [tx('M0A-03-AGGREGAZIONI.20', { mese, RANGE })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0A-03-AGGREGAZIONI.21', { mese })], { style: STILE_TITOLO }),
            riga('A3', [tx('M0A-03-AGGREGAZIONI.22'), tx('M0A-03-AGGREGAZIONI.23')], { style: STILE_TITOLO }),
            colonna('A4', CATEGORIE(), { style: STILE_ETICHETTA }),
            blocco(
              'B4',
              valori.map((v) => [v]),
              { style: STILE_INPUT },
            ),
            riga('A12', [tx('M0A-03-AGGREGAZIONI.34')], { style: STILE_TITOLO }),
            colonna(
              'A13',
              [
                tx('M0A-03-AGGREGAZIONI.24'),
                tx('M0A-03-AGGREGAZIONI.25'),
                tx('M0A-03-AGGREGAZIONI.26'),
                tx('M0A-03-AGGREGAZIONI.27'),
                tx('M0A-03-AGGREGAZIONI.28'),
                tx('M0A-03-AGGREGAZIONI.29'),
              ],
              { style: STILE_ETICHETTA },
            ),
            areaLibera(['B13', 'B14', 'B15', 'B16', 'B17', 'B18']),
          ],
          { colWidths: { A: 260, B: 130 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M0A-03-AGGREGAZIONI.30'), 8, 'T1'),
        hint('H2', tx('M0A-03-AGGREGAZIONI.31'), 8, 'T2'),
        hint('H3', 'MIN(B4:B11).', 6, 'T3'),
        hint('H4', 'MAX(B4:B11).', 6, 'T4'),
        hint('H5', tx('M0A-03-AGGREGAZIONI.32'), 10, 'T5'),
        hint('H6', tx('M0A-03-AGGREGAZIONI.33'), 10, 'T6'),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: 'Model!B13',
    };
  },
});
