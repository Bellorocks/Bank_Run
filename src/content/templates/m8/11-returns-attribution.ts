/**
 * M8 · 11 — Returns Attribution: la waterfall completa dei rendimenti LBO.
 *
 * Livello conclusivo del modulo LBO. Integra l'intera cascata distributiva (Waterfall):
 *
 *   1. Exit Enterprise Value = Exit EBITDA × Exit Multiple.
 *   2. Gross Exit Equity Value = Exit Enterprise Value - Ending Net Debt.
 *   3. Mezzanine Equity Kicker (es. 3.0% del Gross Equity).
 *   4. Management Incentive Pool (MIP) (es. 7.0% del Gross Equity).
 *   5. Net Equity allo Sponsor = Gross Exit Equity - Mezzanine Kicker - Management MIP.
 *   6. Sponsor Net MoIC = Sponsor Net Equity / Sponsor Initial Equity.
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
  multiplo,
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// Geometria fissa
const B_EXIT_MULT = 'B5'; // Multiplo di uscita (dato)
const B_EXIT_EV = 'B6'; // Exit EV = B4*B5 (formula)
const B_END_ND = 'B7'; // Debito Netto finale (dato)

const B_GROSS_EQ = 'B9'; // T1: Gross Exit Equity = B6 - B7

const B_MEZZ_KICKER_PCT = 'B11'; // % Mezzanine Kicker (3.0%) (dato)
const B_MGT_MIP_PCT = 'B12'; // % Management MIP (7.0%) (dato)
const C_MEZZ_VAL = 'C11'; // Valore Kicker = B9 * B11 (formula)
const C_MGT_VAL = 'C12'; // Valore MIP = B9 * B12 (formula)

const B_SPONSOR_ENTRY = 'B15'; // Sponsor Entry Equity (dato)
const B_SPONSOR_NET = 'B16'; // T2: Sponsor Net Equity = B9 - C11 - C12
const B_SPONSOR_MOIC = 'B17'; // T3: Sponsor Net MoIC = B16 / B15

export default defineTemplate({
  id: 'M8-11-RETURNSATTRIBUTION',
  module: 'M8',
  get title() {
    return tx('M8-11-RETURNSATTRIBUTION.title');
  },
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['lbo.attribution'],
  prerequisites: ['M8-05-MIPRATCHET', 'M8-06-RETURNSIRRMOIC', 'M8-07-VALUEBRIDGE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const exitEbitda = roundTo(triangular(r, 18_000_000, 22_000_000, 26_000_000), 500_000);
    const exitMult = roundTo(triangular(r, 8, 9.5, 11), 0.5);
    const exitEv = exitEbitda * exitMult;
    const endNd = roundTo(exitEbitda * triangular(r, 0.8, 1.5, 2.5), 500_000);
    const grossEq = exitEv - endNd;

    const mezzKickerPct = roundTo(triangular(r, 0.02, 0.03, 0.05), 0.005);
    const mgtMipPct = roundTo(triangular(r, 0.05, 0.08, 0.12), 0.01);
    const mezzVal = grossEq * mezzKickerPct;
    const mgtVal = grossEq * mgtMipPct;

    const sponsorEntry = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 1_000_000);
    const sponsorNet = grossEq - mezzVal - mgtVal;
    const sponsorMoic = sponsorNet / sponsorEntry;

    const brief = [tx('M8-11-RETURNSATTRIBUTION.2', { p0: eur(exitEbitda), p1: multiplo(exitMult), p2: eur(exitEv), p3: eur(endNd), p4: pct(mezzKickerPct), p5: pct(mgtMipPct), p6: eur(sponsorEntry) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M8-11-RETURNSATTRIBUTION.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M8-11-RETURNSATTRIBUTION.4'), tx('M8-11-RETURNSATTRIBUTION.5')], { style: STILE_TITOLO }),
      colonna('A4', [
        tx('M8-11-RETURNSATTRIBUTION.6'),
        tx('M8-11-RETURNSATTRIBUTION.7'),
        tx('M8-11-RETURNSATTRIBUTION.8'),
        tx('M8-11-RETURNSATTRIBUTION.9'),
        tx('M8-11-RETURNSATTRIBUTION.10'),
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [exitEbitda], { style: STILE_INPUT }),
      colonna(B_EXIT_MULT, [exitMult], { style: STILE_INPUT_MULTIPLO }),
      colonna(B_EXIT_EV, ['=B4*B5'], { style: STILE_FORMULA }),
      colonna(B_END_ND, [endNd], { style: STILE_INPUT }),
      colonna(B_GROSS_EQ, [null], { style: STILE_TOTALE, locked: false }),

      riga('A10', [tx('M8-11-RETURNSATTRIBUTION.11'), tx('M8-11-RETURNSATTRIBUTION.12'), tx('M8-11-RETURNSATTRIBUTION.13')], { style: STILE_TITOLO }),
      colonna('A11', [tx('M8-11-RETURNSATTRIBUTION.14'), tx('M8-11-RETURNSATTRIBUTION.15')], { style: STILE_ETICHETTA }),
      colonna(B_MEZZ_KICKER_PCT, [mezzKickerPct, mgtMipPct], { style: { ...STILE_INPUT_PCT, numFmt: '0.0%' } }),
      colonna(C_MEZZ_VAL, [null, null], { style: STILE_FORMULA, locked: false }),

      riga('A14', [tx('M8-11-RETURNSATTRIBUTION.16'), tx('M8-11-RETURNSATTRIBUTION.26')], { style: STILE_TITOLO }),
      colonna('A15', [
        tx('M8-11-RETURNSATTRIBUTION.17'),
        tx('M8-11-RETURNSATTRIBUTION.18'),
        tx('M8-11-RETURNSATTRIBUTION.19'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_SPONSOR_ENTRY, [sponsorEntry], { style: STILE_INPUT }),
      colonna(B_SPONSOR_NET, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_SPONSOR_MOIC, [null], { style: { ...STILE_TOTALE, numFmt: '0.00x' }, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M8-11-RETURNSATTRIBUTION.20', { B_GROSS_EQ }),
        target: `Model!${B_GROSS_EQ}`,
        atteso: grossEq,
        referenzia: [B_EXIT_EV, B_END_ND],
        senzaLiteral: [],
        skills: ['lbo.attribution'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M8-11-RETURNSATTRIBUTION.21', { C_MEZZ_VAL }),
        target: `Model!${C_MEZZ_VAL}`,
        atteso: mezzVal,
        referenzia: [B_GROSS_EQ, B_MEZZ_KICKER_PCT],
        senzaLiteral: [],
        skills: ['lbo.attribution'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M8-11-RETURNSATTRIBUTION.22', { C_MGT_VAL }),
        target: `Model!${C_MGT_VAL}`,
        atteso: mgtVal,
        referenzia: [B_GROSS_EQ, B_MGT_MIP_PCT],
        senzaLiteral: [],
        skills: ['lbo.attribution'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T4',
        prompt: tx('M8-11-RETURNSATTRIBUTION.23', { B_SPONSOR_NET }),
        target: `Model!${B_SPONSOR_NET}`,
        atteso: sponsorNet,
        referenzia: [B_GROSS_EQ, C_MEZZ_VAL, C_MGT_VAL],
        senzaLiteral: [],
        skills: ['lbo.attribution'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T5',
        prompt: tx('M8-11-RETURNSATTRIBUTION.24', { B_SPONSOR_MOIC }),
        target: `Model!${B_SPONSOR_MOIC}`,
        atteso: sponsorMoic,
        referenzia: [B_SPONSOR_NET, B_SPONSOR_ENTRY],
        senzaLiteral: [],
        skills: ['lbo.attribution'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M8-11-RETURNSATTRIBUTION',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!${B_GROSS_EQ}`,
      hints: [
        hint('H1', tx('M8-11-RETURNSATTRIBUTION.25'), 10, 'T1'),
        hint('H2', '=B9*B11', 10, 'T2'),
        hint('H3', '=B9*B12', 10, 'T3'),
        hint('H4', '=B9-C11-C12', 10, 'T4'),
        hint('H5', '=B16/B15', 10, 'T5'),
      ],
    };
  },
});
