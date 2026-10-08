/**
 * M9 · 02 — Sinergie M&A: curva di phasing, costi di integrazione e impatto netto.
 *
 * Le sinergie non arrivano il giorno dopo il closing: si realizzano per gradi
 * (phasing) e costano, soprattutto all'inizio (costi di integrazione one-off).
 * Su tre anni:
 *
 *   Sinergie realizzate  = run-rate × phasing dell'anno
 *   Netto ante imposte   = realizzate − costi di integrazione dell'anno
 *   Netto dopo imposte   = netto ante imposte × (1 − aliquota)
 *
 * Il primo anno e' spesso negativo: e' il punto didattico. Ogni riga e' una
 * formula sola copiata sui tre anni.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
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
const COLONNE = ['B', 'C', 'D'] as const;
const B_RUNRATE = 'B4';
const B_TAX = 'B5';

const ROW_PHASE = 8;
const ROW_INTEG = 9;
const ROW_GROSS = 10;
const ROW_PRE = 11;
const ROW_POST = 12;

export default defineTemplate({
  id: 'M9-02-SYNERGIES',
  module: 'M9',
  get title() {
    return tx('M9-02-SYNERGIES.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 330,
  skills: ['ma.synergies'],
  prerequisites: ['M9-01-CONSIDERATION'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const runRate = roundTo(triangular(r, 8_000_000, 10_000_000, 14_000_000), 500_000);
    const taxRate = 0.24;
    const phase = [
      roundTo(triangular(r, 0.2, 0.3, 0.4), 0.05),
      roundTo(triangular(r, 0.55, 0.7, 0.85), 0.05),
      1,
    ];
    // Costi di integrazione: concentrati all'inizio, in totale fra 0,8x e 1,5x il run-rate.
    const totInteg = runRate * triangular(r, 0.8, 1.1, 1.5);
    const quoteInteg = [0.6, 0.3, 0.1];
    const integ = quoteInteg.map((q) => roundTo(totInteg * q, 100_000));

    const gross = phase.map((p) => runRate * p);
    const pre = gross.map((g, i) => g - integ[i]);
    const post = pre.map((p) => p * (1 - taxRate));

    const tasks: Task[] = [
      rigaTask('T1', ROW_GROSS, tx('M9-02-SYNERGIES.2'), gross, ['B' + ROW_PHASE, B_RUNRATE]),
      rigaTask('T2', ROW_PRE, tx('M9-02-SYNERGIES.3'), pre, [
        'B' + ROW_GROSS,
        'B' + ROW_INTEG,
      ]),
      rigaTask('T3', ROW_POST, tx('M9-02-SYNERGIES.4'), post, ['B' + ROW_PRE, B_TAX], [1]),
    ];

    const brief = [tx('M9-02-SYNERGIES.5', { p0: eur(runRate), p1: phase.map((p) => pct(p, 0)).join(' / '), p2: integ.map((x) => eur(x)).join(' / '), p3: pct(taxRate, 0) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M9-02-SYNERGIES.6')], { style: STILE_TITOLO }),
      riga('A3', [tx('M9-02-SYNERGIES.7'), tx('M9-02-SYNERGIES.21')], { style: STILE_TITOLO }),
      colonna('A4', [tx('M9-02-SYNERGIES.8'), tx('M9-02-SYNERGIES.9')], { style: STILE_ETICHETTA }),
      [{ ref: B_RUNRATE, content: runRate, style: STILE_INPUT, locked: true }],
      [{ ref: B_TAX, content: taxRate, style: STILE_INPUT_PCT, locked: true }],

      riga('A7', [tx('M9-02-SYNERGIES.10'), tx('M9-02-SYNERGIES.11'), tx('M9-02-SYNERGIES.12'), tx('M9-02-SYNERGIES.13')], { style: STILE_TITOLO }),
      colonna(
        `A${ROW_PHASE}`,
        [
          tx('M9-02-SYNERGIES.14'),
          tx('M9-02-SYNERGIES.15'),
          tx('M9-02-SYNERGIES.16'),
          tx('M9-02-SYNERGIES.17'),
          tx('M9-02-SYNERGIES.18'),
        ],
        { style: STILE_ETICHETTA },
      ),
      riga(`B${ROW_PHASE}`, phase, { style: { ...STILE_INPUT_PCT, numFmt: '0%' } }),
      riga(`B${ROW_INTEG}`, integ, { style: STILE_INPUT }),
      ...[ROW_GROSS, ROW_PRE, ROW_POST].map((row) =>
        COLONNE.map((c) => ({
          ref: `${c}${row}`,
          content: null,
          locked: false,
          style: row === ROW_POST ? STILE_TOTALE : STILE_FORMULA,
        })),
      ),
    ]);

    return {
      templateId: 'M9-02-SYNERGIES',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!B${ROW_GROSS}`,
      hints: [
        hint('H1', tx('M9-02-SYNERGIES.19', { ROW_GROSS, ROW_PHASE }), 10, 'T1'),
        hint('H2', `In B${ROW_PRE}: =B${ROW_GROSS}-B${ROW_INTEG}.`, 10, 'T2'),
        hint('H3', `In B${ROW_POST}: =B${ROW_PRE}*(1-$B$5).`, 10, 'T3'),
      ],
    };
  },
});

function rigaTask(
  id: string,
  row: number,
  cosa: string,
  attesi: readonly number[],
  referenzia: readonly string[],
  ammessi: readonly number[] = [],
): Task {
  const rg = `B${row}:D${row}`;
  return {
    id,
    prompt: tx('M9-02-SYNERGIES.20', { row, cosa }),
    targetCell: `Model!${rg}`,
    check: [
      { kind: 'mustBeFormula' },
      { kind: 'value', expected: attesi[0] },
      { kind: 'value', expected: attesi[2], at: `D${row}` },
      { kind: 'mustReference', cells: referenzia },
      { kind: 'mustNotContainLiteral', except: ammessi },
      { kind: 'consistentRow', range: `Model!${rg}` },
      { kind: 'noError' },
    ],
    skills: ['ma.synergies'],
    minKeystrokes: 16,
  };
}
