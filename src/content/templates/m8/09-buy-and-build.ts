/**
 * M8 · 09 — Buy-and-Build: add-on acquisition, sinergie e Multiple Arbitrage.
 *
 * La strategia Buy-and-Build è uno dei motori di rendimento più potenti del Private Equity:
 *
 *   1. La "Platform Company" viene acquistata a un multiplo elevato (es. 10.0x EV/EBITDA).
 *   2. Vengono acquisite aziende minori ("Add-on Targets") a multipli più bassi (es. 6.0x).
 *   3. Vengono estratte sinergie di costo e ricavo.
 *   4. MULTIPLE ARBITRAGE: All'uscita, l'intero gruppo combinato (incluso l'EBITDA dell'add-on)
 *      viene venduto al multiplo di prima fascia della platform (10.0x).
 *      Guadagno Arbitraggio Multiplo = Add-on EBITDA × (Exit Multiple - Add-on Entry Multiple).
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
const B_EBITDA_PLAT = 'B4'; // EBITDA Platform (dato)
const B_EBITDA_ADD = 'B5'; // EBITDA Add-on (dato)
const B_SYNERGIES = 'B6'; // Sinergie di Costo (dato)
const B_MULT_ADD = 'B7'; // Multiplo Acquisto Add-on (6.0x) (dato)
const B_MULT_EXIT = 'B8'; // Multiplo Uscita Gruppo (10.0x) (dato)

const B_COMB_EBITDA = 'B11'; // T1: Combined EBITDA = B4+B5+B6
const B_COMB_EV = 'B12'; // T2: Combined Exit EV = B11 * B8
const B_MULT_ARB = 'B13'; // T3: Multiple Arbitrage Gain = B5 * (B8 - B7)
const B_VALORE_ADD = 'B14'; // T4: valore creato dall'add-on = (B5+B6)*B8 - B5*B7

export default defineTemplate({
  id: 'M8-09-BUYANDBUILD',
  module: 'M8',
  get title() {
    return tx('M8-09-BUYANDBUILD.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.buy-and-build'],
  prerequisites: ['M8-07-VALUEBRIDGE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitdaPlat = roundTo(triangular(r, 12_000_000, 15_000_000, 18_000_000), 500_000);
    const ebitdaAdd = roundTo(triangular(r, 3_000_000, 4_500_000, 6_000_000), 250_000);
    const synergies = roundTo(ebitdaAdd * triangular(r, 0.1, 0.18, 0.25), 100_000);

    const multAdd = roundTo(triangular(r, 5, 6, 7), 0.5);
    const multExit = roundTo(triangular(r, 8.5, 10, 11.5), 0.5);

    const combEbitda = ebitdaPlat + ebitdaAdd + synergies;
    const combEv = combEbitda * multExit;
    const multArb = ebitdaAdd * (multExit - multAdd);
    const valoreAdd = (ebitdaAdd + synergies) * multExit - ebitdaAdd * multAdd;

    const brief = [tx('M8-09-BUYANDBUILD.2', { p0: eur(ebitdaPlat), p1: eur(ebitdaAdd), p2: eur(synergies), p3: multiplo(multAdd), p4: multiplo(multExit) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M8-09-BUYANDBUILD.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M8-09-BUYANDBUILD.4'), tx('M8-09-BUYANDBUILD.20')], { style: STILE_TITOLO }),
      colonna('A4', [
        tx('M8-09-BUYANDBUILD.5'),
        tx('M8-09-BUYANDBUILD.6'),
        tx('M8-09-BUYANDBUILD.7'),
        tx('M8-09-BUYANDBUILD.8'),
        tx('M8-09-BUYANDBUILD.9'),
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [ebitdaPlat, ebitdaAdd, synergies], { style: STILE_INPUT }),
      colonna(B_MULT_ADD, [multAdd, multExit], { style: STILE_INPUT_MULTIPLO }),

      riga('A10', [tx('M8-09-BUYANDBUILD.10'), tx('M8-09-BUYANDBUILD.21')], { style: STILE_TITOLO }),
      colonna('A11', [
        tx('M8-09-BUYANDBUILD.11'),
        tx('M8-09-BUYANDBUILD.12'),
        tx('M8-09-BUYANDBUILD.13'),
        tx('M8-09-BUYANDBUILD.14'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_COMB_EBITDA, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_COMB_EV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_MULT_ARB, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_VALORE_ADD, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M8-09-BUYANDBUILD.15', { B_COMB_EBITDA }),
        target: `Model!${B_COMB_EBITDA}`,
        atteso: combEbitda,
        referenzia: [B_EBITDA_PLAT, B_EBITDA_ADD, B_SYNERGIES],
        senzaLiteral: [],
        skills: ['lbo.buy-and-build'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M8-09-BUYANDBUILD.16', { B_COMB_EV }),
        target: `Model!${B_COMB_EV}`,
        atteso: combEv,
        referenzia: [B_COMB_EBITDA, B_MULT_EXIT],
        senzaLiteral: [],
        skills: ['lbo.buy-and-build'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M8-09-BUYANDBUILD.17', { B_MULT_ARB }),
        target: `Model!${B_MULT_ARB}`,
        atteso: multArb,
        referenzia: [B_EBITDA_ADD, B_MULT_EXIT, B_MULT_ADD],
        senzaLiteral: [],
        skills: ['lbo.buy-and-build'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T4',
        prompt:
          tx('M8-09-BUYANDBUILD.18', { B_VALORE_ADD }),
        target: `Model!${B_VALORE_ADD}`,
        atteso: valoreAdd,
        referenzia: [B_EBITDA_ADD, B_SYNERGIES, B_MULT_EXIT, B_MULT_ADD],
        senzaLiteral: [],
        skills: ['lbo.buy-and-build'],
        minKeystrokes: 18,
      }),
    ];

    return {
      templateId: 'M8-09-BUYANDBUILD',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!${B_COMB_EBITDA}`,
      hints: [
        hint('H1', '=SUM(B4:B6)', 10, 'T1'),
        hint('H2', '=B11*B8', 10, 'T2'),
        hint('H3', '=B5*(B8-B7)', 10, 'T3'),
        hint('H4', tx('M8-09-BUYANDBUILD.19'), 15, 'T4'),
      ],
    };
  },
});
