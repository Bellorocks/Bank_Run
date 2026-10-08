/**
 * M9 · 07 — Leverage Pro-Forma: sostenibilità finanziaria post-fusione.
 *
 * Livello conclusivo del modulo M&A. Integra la valutazione industriale
 * con la sostenibilità della nuova struttura di capitale (Capital Structure):
 *
 *   1. Combined Pro-Forma EBITDA = EBITDA Acquirer + EBITDA Target + Sinergie a Regime.
 *   2. Combined Net Debt = Debito Netto Acquirer + Debito Netto Target + Nuovo Debito Acceso + Spese Deal - Cassa Impiegata.
 *   3. Pro-Forma Leverage Ratio = Combined Net Debt / Combined EBITDA.
 *   4. Deleveraging Headroom = Max Leverage Consentito dal Rating (es. 3.50x) - Pro-Forma Leverage Effettivo.
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
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// Geometria fissa
const B_ACQ_EBITDA = 'B4'; // EBITDA Acquirer (dato)
const B_TGT_EBITDA = 'B5'; // EBITDA Target (dato)
const B_SYNERGIES = 'B6'; // Sinergie a Regime (dato)

const B_ACQ_ND = 'B9'; // Debito Netto Acquirer (dato)
const B_TGT_ND = 'B10'; // Debito Netto Target (dato)
const B_NEW_DEBT = 'B11'; // Nuovo Debito per Acquisizione (dato)
const B_MAX_LEV = 'B12'; // Max Leverage Investment Grade (3.50x) (dato)

const B_COMB_EBITDA = 'B15'; // T1: Combined EBITDA = B4+B5+B6
const B_COMB_ND = 'B16'; // T2: Combined Net Debt = B9+B10+B11
const B_PF_LEV = 'B17'; // T3: Pro-Forma Leverage = B16 / B15
const B_CAPACITA = 'B18'; // T4: debito aggiuntivo sostenibile = B12*B15 - B16

export default defineTemplate({
  id: 'M9-07-PROFORMALEVERAGE',
  module: 'M9',
  get title() {
    return tx('M9-07-PROFORMALEVERAGE.title');
  },
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['ma.proforma-leverage'],
  prerequisites: ['M9-01-CONSIDERATION', 'M8-04-COVENANTS'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const acqEbitda = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 1_000_000);
    const tgtEbitda = roundTo(triangular(r, 15_000_000, 20_000_000, 25_000_000), 1_000_000);
    const synergies = roundTo(triangular(r, 5_000_000, 7_000_000, 9_000_000), 500_000);

    const acqNd = roundTo(acqEbitda * triangular(r, 0.8, 1.5, 2.2), 1_000_000);
    const tgtNd = roundTo(tgtEbitda * triangular(r, 1, 2, 3), 1_000_000);
    const newDebt = roundTo(triangular(r, 40_000_000, 55_000_000, 70_000_000), 1_000_000);
    const maxLev = roundTo(triangular(r, 3, 3.5, 4), 0.25);

    const combEbitda = acqEbitda + tgtEbitda + synergies;
    const combNd = acqNd + tgtNd + newDebt;
    const pfLev = combNd / combEbitda;
    const capacita = maxLev * combEbitda - combNd;

    const brief = [tx('M9-07-PROFORMALEVERAGE.2', { p0: eur(acqEbitda), p1: eur(acqNd), p2: eur(tgtEbitda), p3: eur(tgtNd), p4: eur(synergies), p5: eur(newDebt), p6: multiplo(maxLev) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M9-07-PROFORMALEVERAGE.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M9-07-PROFORMALEVERAGE.4'), tx('M9-07-PROFORMALEVERAGE.5')], { style: STILE_TITOLO }),
      colonna('A4', [
        tx('M9-07-PROFORMALEVERAGE.6'),
        tx('M9-07-PROFORMALEVERAGE.7'),
        tx('M9-07-PROFORMALEVERAGE.8'),
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [acqEbitda, tgtEbitda, synergies], { style: STILE_INPUT }),

      riga('A8', [tx('M9-07-PROFORMALEVERAGE.9'), tx('M9-07-PROFORMALEVERAGE.10')], { style: STILE_TITOLO }),
      colonna('A9', [
        tx('M9-07-PROFORMALEVERAGE.11'),
        tx('M9-07-PROFORMALEVERAGE.12'),
        tx('M9-07-PROFORMALEVERAGE.13'),
        tx('M9-07-PROFORMALEVERAGE.14'),
      ], { style: STILE_ETICHETTA }),
      colonna('B9', [acqNd, tgtNd, newDebt], { style: STILE_INPUT }),
      colonna(B_MAX_LEV, [maxLev], { style: STILE_INPUT_MULTIPLO }),

      riga('A14', [tx('M9-07-PROFORMALEVERAGE.15'), tx('M9-07-PROFORMALEVERAGE.25')], { style: STILE_TITOLO }),
      colonna('A15', [
        tx('M9-07-PROFORMALEVERAGE.16'),
        tx('M9-07-PROFORMALEVERAGE.17'),
        tx('M9-07-PROFORMALEVERAGE.18'),
        tx('M9-07-PROFORMALEVERAGE.19'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_COMB_EBITDA, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_COMB_ND, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_PF_LEV, [null], { style: { ...STILE_FORMULA, numFmt: '0.00x' }, locked: false }),
      colonna(B_CAPACITA, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M9-07-PROFORMALEVERAGE.20', { B_COMB_EBITDA }),
        target: `Model!${B_COMB_EBITDA}`,
        atteso: combEbitda,
        referenzia: [B_ACQ_EBITDA, B_TGT_EBITDA, B_SYNERGIES],
        senzaLiteral: [],
        skills: ['ma.proforma-leverage'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M9-07-PROFORMALEVERAGE.21', { B_COMB_ND }),
        target: `Model!${B_COMB_ND}`,
        atteso: combNd,
        referenzia: [B_ACQ_ND, B_TGT_ND, B_NEW_DEBT],
        senzaLiteral: [],
        skills: ['ma.proforma-leverage'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M9-07-PROFORMALEVERAGE.22', { B_PF_LEV }),
        target: `Model!${B_PF_LEV}`,
        atteso: pfLev,
        referenzia: [B_COMB_ND, B_COMB_EBITDA],
        senzaLiteral: [],
        skills: ['ma.proforma-leverage'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T4',
        prompt: tx('M9-07-PROFORMALEVERAGE.23', { B_CAPACITA }),
        target: `Model!${B_CAPACITA}`,
        atteso: capacita,
        referenzia: [B_MAX_LEV, B_COMB_EBITDA, B_COMB_ND],
        senzaLiteral: [],
        skills: ['ma.proforma-leverage'],
        minKeystrokes: 12,
      }),
    ];

    return {
      templateId: 'M9-07-PROFORMALEVERAGE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!${B_COMB_EBITDA}`,
      hints: [
        hint('H1', '=SUM(B4:B6)', 10, 'T1'),
        hint('H2', '=SUM(B9:B11)', 10, 'T2'),
        hint('H3', '=B16/B15', 10, 'T3'),
        hint('H4', tx('M9-07-PROFORMALEVERAGE.24'), 10, 'T4'),
      ],
    };
  },
});
