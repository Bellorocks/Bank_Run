/**
 * M0-B · 01 — IF: una domanda, due risposte.
 *
 * Il primissimo livello del modulo "Costruire". Fin qui il foglio ha sempre
 * calcolato: ora deve anche DECIDERE. `IF` e' la prima formula che non produce
 * un numero direttamente, ma sceglie fra due numeri a seconda di una condizione.
 *
 * Scenario: un bonus a soglia per il team vendite, con due condizioni separate
 * e deliberatamente diverse:
 *   - T1 usa `>` (maggiore stretto): il bonus scatta solo SOPRA l'obiettivo.
 *   - T2 usa `<=` (minore o uguale): la penale scatta ANCHE sul pareggio esatto.
 * T3 non fa scrivere una formula: chiede di prevedere a parole cosa succede nel
 * caso limite, cioe' se il confine include se stesso o no. E' li' che la
 * differenza fra `>` e `>=` smette di essere un dettaglio sintattico.
 *
 * I numeri sono generati in modo che l'esito di ciascuna condizione dipenda dal
 * seed: a volte il bonus scatta, a volte no. Imparare a memoria "il bonus c'e'
 * sempre" non porta da nessuna parte.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
} from '../../authoring';

import { tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0B-01-IF',
  module: 'M0-B',
  get title() {
    return tx('M0B-01-IF.title');
  },
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 180,
  skills: ['xl.if'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const obiettivo = r.int(120, 380) * 1000;
    // 0,65x .. 1,35x l'obiettivo: quasi meta' delle volte sopra, meta' sotto.
    const fattoreVendite = 0.65 + r.next() * 0.7;
    // Arrotondato a dieci euro, non a mille: e' un consuntivo, non un budget.
    const vendite = Math.round((obiettivo * fattoreVendite) / 10) * 10 + r.int(1, 9);
    const bonusImporto = r.int(2, 10) * 1000;

    // 70%-95% dell'obiettivo: abbastanza vicino alle vendite perche' la penale
    // scatti in una parte non trascurabile dei seed, non in tutti ne' in nessuno.
    const fattoreSogliaMinima = 0.7 + r.next() * 0.25;
    const sogliaMinima = Math.round((obiettivo * fattoreSogliaMinima) / 1000) * 1000;
    const penaleImporto = r.int(1, 5) * 1000;

    const bonusAtteso = vendite > obiettivo ? bonusImporto : 0;
    const penaleAtteso = vendite <= sogliaMinima ? penaleImporto : 0;

    const tasks = [
      {
        id: 'T1',
        prompt:
          tx('M0B-01-IF.2'),
        targetCell: 'Model!B8',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'value' as const, expected: bonusAtteso },
          { kind: 'mustUseFunction' as const, functions: ['IF'] },
          { kind: 'mustReference' as const, cells: ['B2', 'B3', 'B4'] },
          { kind: 'mustNotContainLiteral' as const, except: [0] },
        ],
        skills: ['xl.if'],
        minKeystrokes: 16,
      },
      {
        id: 'T2',
        prompt:
          tx('M0B-01-IF.3'),
        targetCell: 'Model!B9',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'value' as const, expected: penaleAtteso },
          { kind: 'mustUseFunction' as const, functions: ['IF'] },
          { kind: 'mustReference' as const, cells: ['B2', 'B5', 'B6'] },
          { kind: 'mustNotContainLiteral' as const, except: [0] },
        ],
        skills: ['xl.if'],
        minKeystrokes: 16,
      },
      {
        id: 'T3',
        prompt:
          tx('M0B-01-IF.4'),
        targetCell: 'Model!B11',
        check: [{ kind: 'text' as const, expected: tx('common.tok.no'), caseSensitive: false }],
        skills: ['xl.if'],
        minKeystrokes: 3,
      },
    ];

    return {
      templateId: 'M0B-01-IF',
      seed: rng.seed,
      brief: [tx('M0B-01-IF.5', { p0: eur(vendite), p1: eur(obiettivo), p2: eur(bonusImporto), p3: eur(sogliaMinima), p4: eur(penaleImporto) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            blocco('A1', [[tx('M0B-01-IF.6')]], { style: STILE_TITOLO }),
            blocco(
              'A2',
              [
                [tx('M0B-01-IF.7')],
                [tx('M0B-01-IF.8')],
                [tx('M0B-01-IF.9')],
                [tx('M0B-01-IF.10')],
                [tx('M0B-01-IF.11')],
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[vendite], [obiettivo], [bonusImporto], [sogliaMinima], [penaleImporto]], {
              style: STILE_INPUT,
            }),
            blocco('A8', [[tx('M0B-01-IF.12')], [tx('M0B-01-IF.13')]], { style: STILE_ETICHETTA }),
            blocco(
              'A11',
              [[tx('M0B-01-IF.14')]],
              { style: STILE_ETICHETTA },
            ),
            areaLibera(['B8', 'B9', 'B11']),
          ],
          { colWidths: { A: 340, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0B-01-IF.15'),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0B-01-IF.16'),
          10,
          'T2',
        ),
        hint(
          'H3',
          tx('M0B-01-IF.17'),
          8,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: 'Model!B8',
    };
  },
});
