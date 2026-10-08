/**
 * M11 · 06 — Restatement Contabile: correzione retroattiva di bilanci storici.
 *
 * La due diligence scopre che negli ultimi due esercizi sono stati anticipati
 * ricavi e capitalizzati costi che andavano spesati. Le rettifiche sono ante
 * imposte: sull'utile netto pesano solo per la parte netta.
 *
 *   T1  Utile restated (riga, due anni) = utile riportato − rettifica × (1 − aliquota)
 *   T2  Patrimonio netto restated a fine anno 2
 *         = PN iniziale + utili restated − dividendi distribuiti nel biennio
 *   T3  Di quanto il PN riportato era sovrastimato
 *
 * Il PN riportato e' dato: la differenza col PN restated e' esattamente la
 * somma delle rettifiche nette, e il terzo task lo fa verificare.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const B_TAX = 'B4';
const B_PN_INIT = 'B5';
const B_PN_REPORTED = 'B6';

const ROW_NI = 9;
const ROW_ADJ = 10;
const ROW_DIV = 11;
const ROW_REST = 14;
const B_PN_REST = 'B15';
const B_SOVRASTIMA = 'B16';

export default defineTemplate({
  id: 'M11-06-RESTATEMENT',
  module: 'M11',
  get title() {
    return tx('M11-06-RESTATEMENT.title');
  },
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['real.restatement'],
  prerequisites: ['M11-01-READCEE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const taxRate = 0.24;
    const pnInit = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 100_000);
    const ni = [
      roundTo(triangular(r, 12_000_000, 15_000_000, 18_000_000), 10_000),
      roundTo(triangular(r, 14_000_000, 17_000_000, 20_000_000), 10_000),
    ];
    const adj = [
      roundTo(triangular(r, 2_000_000, 3_000_000, 4_000_000), 10_000),
      roundTo(triangular(r, 1_500_000, 2_500_000, 3_500_000), 10_000),
    ];
    const div = ni.map((x) => roundTo(x * triangular(r, 0.2, 0.4, 0.6), 10_000));

    const rest = ni.map((x, i) => x - adj[i] * (1 - taxRate));
    const pnReported = pnInit + ni[0] + ni[1] - div[0] - div[1];
    const pnRest = pnInit + rest[0] + rest[1] - div[0] - div[1];
    const sovrastima = pnReported - pnRest;

    const rg = `B${ROW_REST}:C${ROW_REST}`;
    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M11-06-RESTATEMENT.2', { ROW_REST }),
      targetCell: `Model!${rg}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: rest[0] },
        { kind: 'value', expected: rest[1], at: `C${ROW_REST}` },
        { kind: 'mustReference', cells: [`B${ROW_NI}`, `B${ROW_ADJ}`, B_TAX] },
        { kind: 'mustNotContainLiteral', except: [1] },
        { kind: 'consistentRow', range: `Model!${rg}` },
        { kind: 'noError' },
      ],
      skills: ['real.restatement'],
      minKeystrokes: 22,
    };

    const tasks = [
      t1,
      taskFormula({
        id: 'T2',
        prompt: tx('M11-06-RESTATEMENT.3', { B_PN_REST }),
        target: `Model!${B_PN_REST}`,
        atteso: pnRest,
        referenzia: [B_PN_INIT, `B${ROW_REST}`, `C${ROW_REST}`, `B${ROW_DIV}`, `C${ROW_DIV}`],
        senzaLiteral: [],
        skills: ['real.restatement'],
        minKeystrokes: 22,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M11-06-RESTATEMENT.4', { B_SOVRASTIMA }),
        target: `Model!${B_SOVRASTIMA}`,
        atteso: sovrastima,
        referenzia: [B_PN_REPORTED, B_PN_REST],
        senzaLiteral: [],
        skills: ['real.restatement'],
        minKeystrokes: 8,
      }),
    ];

    const brief = [tx('M11-06-RESTATEMENT.5', { p0: eur(pnInit), p1: pct(taxRate, 0) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M11-06-RESTATEMENT.6')], { style: STILE_TITOLO }),
      riga('A3', [tx('M11-06-RESTATEMENT.7'), tx('M11-06-RESTATEMENT.24')], { style: STILE_TITOLO }),
      colonna('A4', [tx('M11-06-RESTATEMENT.8'), tx('M11-06-RESTATEMENT.9'), tx('M11-06-RESTATEMENT.10')], {
        style: STILE_ETICHETTA,
      }),
      [{ ref: B_TAX, content: taxRate, style: STILE_INPUT_PCT, locked: true }],
      colonna(B_PN_INIT, [pnInit, pnReported], { style: STILE_INPUT }),

      riga('A8', [tx('M11-06-RESTATEMENT.11'), tx('M11-06-RESTATEMENT.12'), tx('M11-06-RESTATEMENT.13')], { style: STILE_TITOLO }),
      colonna(`A${ROW_NI}`, [tx('M11-06-RESTATEMENT.14'), tx('M11-06-RESTATEMENT.15'), tx('M11-06-RESTATEMENT.16')], {
        style: STILE_ETICHETTA,
      }),
      riga(`B${ROW_NI}`, ni, { style: STILE_INPUT }),
      riga(`B${ROW_ADJ}`, adj, { style: STILE_INPUT }),
      riga(`B${ROW_DIV}`, div, { style: STILE_INPUT }),

      riga('A13', [tx('M11-06-RESTATEMENT.17'), tx('M11-06-RESTATEMENT.18'), tx('M11-06-RESTATEMENT.19')], { style: STILE_TITOLO }),
      colonna(`A${ROW_REST}`, [tx('M11-06-RESTATEMENT.20'), tx('M11-06-RESTATEMENT.21'), tx('M11-06-RESTATEMENT.22')], {
        style: STILE_ETICHETTA,
      }),
      riga(`B${ROW_REST}`, [null, null], { style: STILE_FORMULA, locked: false }),
      colonna(B_PN_REST, [null, null], { style: STILE_TOTALE, locked: false }),
    ]);

    return {
      templateId: 'M11-06-RESTATEMENT',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!B${ROW_REST}`,
      hints: [
        hint('H1', tx('M11-06-RESTATEMENT.23', { ROW_REST, ROW_NI, ROW_ADJ }), 10, 'T1'),
        hint('H2', `=B5+SUM(B${ROW_REST}:C${ROW_REST})-SUM(B${ROW_DIV}:C${ROW_DIV})`, 10, 'T2'),
        hint('H3', `=B6-B15`, 10, 'T3'),
      ],
    };
  },
});
