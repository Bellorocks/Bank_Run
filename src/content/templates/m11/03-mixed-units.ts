/**
 * M11 · 03 — Unità e Valute Miste: normalizzazione in euro assoluti.
 *
 * Nei modelli internazionali capita frequentemente di ricevere dati con unità
 * di misura eterogenee (es. Ricavi in k€, Costi Operativi in M€, Capex in USD $):
 *
 *   1. Ricavi espressi in k€ (migliaia) -> moltiplicare per 1.000 per ottenere €.
 *   2. Costi espressi in M€ (milioni) -> moltiplicare per 1.000.000 per ottenere €.
 *   3. Capex espressi in USD $ con tasso di cambio EUR/USD (es. 1.10) -> dividere per 1.10 per convertire in €.
 *   4. Free Cash Flow Operativo = Ricavi (€) - Costi (€) - Capex (€).
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  num,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// Geometria fissa
const B_REV_KEUR = 'B4'; // Ricavi in k€ (dato)
const B_COST_MEUR = 'B5'; // Costi in M€ (dato)
const B_CAPEX_USD = 'B6'; // Capex in USD (dato)
const B_FX_RATE = 'B7'; // Tasso di cambio EUR/USD (1.10) (dato)

const B_REV_EUR = 'B10'; // T1: Ricavi in € = B4 * 1000
const B_COST_EUR = 'B11'; // T2: Costi in € = B5 * 1000000
const B_CAPEX_EUR = 'B12'; // T3: Capex in € = B6 / B7
const B_FCF_EUR = 'B13'; // Free Cash Flow = B10 - B11 - B12

export default defineTemplate({
  id: 'M11-03-MIXEDUNITS',
  module: 'M11',
  get title() {
    return tx('M11-03-MIXEDUNITS.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['real.units'],
  prerequisites: ['M11-02-DIRTYTABLES'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const revKEur = roundTo(triangular(r, 60_000, 80_000, 100_000), 1_000); // 80.000 k€ = 80M €
    const costMEur = roundTo(triangular(r, 45, 55, 65), 1); // 55 M€ = 55.000.000 €
    const capexUsd = roundTo(triangular(r, 6_000_000, 10_000_000, 15_000_000), 100_000);
    const fxRate = roundTo(triangular(r, 1.02, 1.1, 1.2), 0.005); // EUR/USD: dollari per 1 euro

    const revEur = revKEur * 1_000;
    const costEur = costMEur * 1_000_000;
    const capexEur = capexUsd / fxRate;

    const brief = [tx('M11-03-MIXEDUNITS.2', { p0: num(revKEur), p1: num(costMEur), p2: num(capexUsd), p3: num(fxRate, 3) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M11-03-MIXEDUNITS.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M11-03-MIXEDUNITS.4'), tx('M11-03-MIXEDUNITS.19')], { style: STILE_TITOLO }),
      colonna('A4', [
        tx('M11-03-MIXEDUNITS.5'),
        tx('M11-03-MIXEDUNITS.6'),
        tx('M11-03-MIXEDUNITS.7'),
        tx('M11-03-MIXEDUNITS.8'),
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [revKEur, costMEur, capexUsd], { style: STILE_INPUT }),
      [{ ref: B_FX_RATE, content: fxRate, style: { ...STILE_INPUT, numFmt: '0.000' }, locked: true }],

      riga('A9', [tx('M11-03-MIXEDUNITS.9'), tx('M11-03-MIXEDUNITS.10')], { style: STILE_TITOLO }),
      colonna('A10', [
        tx('M11-03-MIXEDUNITS.11'),
        tx('M11-03-MIXEDUNITS.12'),
        tx('M11-03-MIXEDUNITS.13'),
        tx('M11-03-MIXEDUNITS.14'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_REV_EUR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_COST_EUR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_CAPEX_EUR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_FCF_EUR, ['=B10-B11-B12'], { style: STILE_TOTALE }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M11-03-MIXEDUNITS.15', { B_REV_EUR }),
        target: `Model!${B_REV_EUR}`,
        atteso: revEur,
        referenzia: [B_REV_KEUR],
        senzaLiteral: [1000, 1_000_000],
        skills: ['real.units'],
        minKeystrokes: 9,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M11-03-MIXEDUNITS.16', { B_COST_EUR }),
        target: `Model!${B_COST_EUR}`,
        atteso: costEur,
        referenzia: [B_COST_MEUR],
        senzaLiteral: [1000, 1_000_000],
        skills: ['real.units'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M11-03-MIXEDUNITS.17', { B_CAPEX_EUR }),
        target: `Model!${B_CAPEX_EUR}`,
        atteso: capexEur,
        referenzia: [B_CAPEX_USD, B_FX_RATE],
        senzaLiteral: [],
        skills: ['real.units'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M11-03-MIXEDUNITS',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: `Model!${B_REV_EUR}`,
      hints: [
        hint('H1', '=B4*1000', 10, 'T1'),
        hint('H2', '=B5*1000000', 10, 'T2'),
        hint('H3', tx('M11-03-MIXEDUNITS.18'), 10, 'T3'),
      ],
    };
  },
});
