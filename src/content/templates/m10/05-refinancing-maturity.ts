/**
 * M10 · 05 — Rifinanziamento: Maturity Wall e sensitivity sui tassi.
 *
 * Livello conclusivo del modulo Credito. Affronta la gestione del rischio
 * di rifinanziamento (Refinancing Risk) e del "Maturity Wall":
 *
 *   1. Maturity Wall all'Anno 4 = Scadenza contemporanea di Term Loan B + Senior Notes.
 *   2. Importo Totale da Rifinanziare = Somma delle tranche in scadenza all'Anno 4.
 *   3. Nuovo Tasso di Rifinanziamento di Mercato (es. Benchmark Rate + Nuovo Spread Creditizio).
 *   4. Nuovi Oneri Finanziari Annui Post-Rifinanziamento = Importo Rifinanziato × Nuovo Tasso.
 *   5. Variazione Annua degli Oneri Finanziari (Delta Interessi) = Nuovi Interessi - Vecchi Interessi.
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

import { tx } from '../../../i18n/content';
// Geometria fissa
const B_TLB_DUE = 'B4'; // Term Loan B in scadenza Y4 (dato)
const B_NOTES_DUE = 'B5'; // Senior Notes in scadenza Y4 (dato)
const B_OLD_RATE = 'B6'; // Vecchio tasso medio (5.0%) (dato)

const B_NEW_BENCH = 'B9'; // Tasso Benchmark di mercato (3.5%) (dato)
const B_NEW_SPREAD = 'B10'; // Nuovo Credit Spread (dato)
const B_EBITDA = 'B11'; // EBITDA atteso nell'anno del rifinanziamento (dato)

const B_TOT_WALL = 'B13'; // T1: Maturity Wall = B4 + B5
const B_NEW_INT = 'B14'; // T2: Nuovi Interessi = B13 * (B9 + B10)
const B_DELTA_INT = 'B15'; // T3: Delta Interessi = B14 - (B13 * B6)
const B_ICR_NEW = 'B16'; // T4: ICR dopo il rifinanziamento = B11 / B14

export default defineTemplate({
  id: 'M10-05-REFINANCING',
  module: 'M10',
  get title() {
    return tx('M10-05-REFINANCING.title');
  },
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['cred.refinancing'],
  prerequisites: ['M10-03-AMORTIZATION'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const tlbDue = roundTo(triangular(r, 30_000_000, 40_000_000, 50_000_000), 1_000_000);
    const notesDue = roundTo(triangular(r, 20_000_000, 30_000_000, 40_000_000), 1_000_000);
    const oldRate = roundTo(triangular(r, 0.03, 0.045, 0.06), 0.0025);

    const newBench = roundTo(triangular(r, 0.02, 0.03, 0.045), 0.0025);
    const newSpread = roundTo(triangular(r, 0.025, 0.035, 0.05), 0.0025);
    const newTotalRate = newBench + newSpread;

    const totWall = tlbDue + notesDue;
    const newInt = totWall * newTotalRate;
    const oldInt = totWall * oldRate;
    const deltaInt = newInt - oldInt;
    const ebitda = roundTo((tlbDue + notesDue) / triangular(r, 3, 4, 5), 500_000);
    const icrNew = ebitda / newInt;

    const brief = [tx('M10-05-REFINANCING.2', { p0: eur(tlbDue), p1: eur(notesDue), p2: pct(oldRate), p3: pct(newBench), p4: pct(newSpread), p5: eur(ebitda) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M10-05-REFINANCING.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M10-05-REFINANCING.4'), tx('M10-05-REFINANCING.5')], { style: STILE_TITOLO }),
      colonna('A4', [
        tx('M10-05-REFINANCING.6'),
        tx('M10-05-REFINANCING.7'),
        tx('M10-05-REFINANCING.8'),
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [tlbDue, notesDue], { style: STILE_INPUT }),
      colonna(B_OLD_RATE, [oldRate], { style: { ...STILE_INPUT_PCT, numFmt: '0.00%' } }),

      riga('A8', [tx('M10-05-REFINANCING.9'), tx('M10-05-REFINANCING.10')], { style: STILE_TITOLO }),
      colonna('A9', [
        tx('M10-05-REFINANCING.11'),
        tx('M10-05-REFINANCING.12'),
        tx('M10-05-REFINANCING.13'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_NEW_BENCH, [newBench, newSpread], { style: { ...STILE_INPUT_PCT, numFmt: '0.00%' } }),
      [{ ref: B_EBITDA, content: ebitda, style: STILE_INPUT, locked: true }],

      riga('A12', [tx('M10-05-REFINANCING.14'), tx('M10-05-REFINANCING.15')], { style: STILE_TITOLO }),
      colonna('A13', [
        tx('M10-05-REFINANCING.16'),
        tx('M10-05-REFINANCING.17'),
        tx('M10-05-REFINANCING.18'),
        tx('M10-05-REFINANCING.19'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_TOT_WALL, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_NEW_INT, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_DELTA_INT, [null], { style: STILE_TOTALE, locked: false }),
      colonna(B_ICR_NEW, [null], { style: { ...STILE_FORMULA, numFmt: '0.00x' }, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M10-05-REFINANCING.20', { B_TOT_WALL }),
        target: `Model!${B_TOT_WALL}`,
        atteso: totWall,
        referenzia: [B_TLB_DUE, B_NOTES_DUE],
        senzaLiteral: [],
        skills: ['cred.refinancing'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M10-05-REFINANCING.21', { B_NEW_INT }),
        target: `Model!${B_NEW_INT}`,
        atteso: newInt,
        referenzia: [B_TOT_WALL, B_NEW_BENCH, B_NEW_SPREAD],
        senzaLiteral: [],
        skills: ['cred.refinancing'],
        minKeystrokes: 14,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M10-05-REFINANCING.22', { B_DELTA_INT }),
        target: `Model!${B_DELTA_INT}`,
        atteso: deltaInt,
        referenzia: [B_NEW_INT, B_TOT_WALL, B_OLD_RATE],
        senzaLiteral: [],
        skills: ['cred.refinancing'],
        minKeystrokes: 14,
      }),
      taskFormula({
        id: 'T4',
        prompt: tx('M10-05-REFINANCING.23', { B_ICR_NEW }),
        target: `Model!${B_ICR_NEW}`,
        atteso: icrNew,
        referenzia: [B_EBITDA, B_NEW_INT],
        senzaLiteral: [],
        skills: ['cred.refinancing'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M10-05-REFINANCING',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!${B_TOT_WALL}`,
      hints: [
        hint('H1', '=B4+B5', 10, 'T1'),
        hint('H2', '=B13*(B9+B10)', 10, 'T2'),
        hint('H3', '=B14-B13*B6', 10, 'T3'),
        hint('H4', '=B11/B14', 10, 'T4'),
      ],
    };
  },
});
