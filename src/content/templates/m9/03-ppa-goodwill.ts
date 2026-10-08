/**
 * M9 · 03 — Purchase Price Allocation (PPA): Step-up, DTL e Goodwill.
 *
 * Nella Purchase Price Allocation (PPA), il prezzo di acquisto dell'equity viene allocato
 * sulle attività e passività del target al loro Fair Value (valore equo di mercato):
 *
 *   1. Patrimonio Netto Contabile (Target Net Book Value / Tangible Net Worth).
 *   2. Step-up su Intangibili (es. Marchi, Brevetti, Relazioni Clienti a vita utile definita).
 *   3. Deferred Tax Liability (DTL): creata dallo step-up poiché l'incremento di valore
 *      contabile non ha efficacia fiscale immediata (DTL = Step-up × Aliquota Fiscale 24%).
 *   4. Allocabile Netto = Net Book Value + Step-up - DTL.
 *   5. Avviamento Residuo (Goodwill) = Equity Purchase Price - Allocabile Netto.
 *   6. Ammortamento Annuo Addizionale Post-Tax = (Step-up / Vita Utile) × (1 - Aliquota Fiscale).
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
const B_PURCHASE = 'B4'; // Equity Purchase Price (dato)
const B_NBV = 'B5'; // Target Net Book Value (dato)
const B_STEPUP = 'B6'; // Step-up su Intangibili (dato)
const B_USEFUL_LIFE = 'B7'; // Vita utile (10 anni) (dato)
const B_TAX = 'B8'; // Aliquota fiscale 24% (dato)

const B_DTL = 'B11'; // T1: DTL = B6 * B8
const B_GOODWILL = 'B12'; // T2: Goodwill = B4 - (B5 + B6 - B11)
const B_ADD_AMORT_POST = 'B13'; // T3: Ammortamento addizionale post-tax = (B6 / B7) * (1 - B8)

export default defineTemplate({
  id: 'M9-03-PPAGOODWILL',
  module: 'M9',
  get title() {
    return tx('M9-03-PPAGOODWILL.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['ma.ppa'],
  prerequisites: ['M9-01-CONSIDERATION', 'M1-09-IMPOSTE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const purchasePrice = roundTo(triangular(r, 80_000_000, 100_000_000, 120_000_000), 1_000_000);
    const nbv = roundTo(purchasePrice * triangular(r, 0.3, 0.4, 0.55), 1_000_000);
    const stepUp = roundTo(purchasePrice * triangular(r, 0.1, 0.2, 0.3), 1_000_000);
    const usefulLife = r.int(5, 15);
    const taxRate = 0.24;

    const dtl = stepUp * taxRate;
    const goodwill = purchasePrice - (nbv + stepUp - dtl);
    const addAmortPost = (stepUp / usefulLife) * (1 - taxRate);

    const brief = [tx('M9-03-PPAGOODWILL.2', { p0: eur(purchasePrice), p1: eur(nbv), p2: eur(stepUp), usefulLife, p4: pct(taxRate) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M9-03-PPAGOODWILL.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M9-03-PPAGOODWILL.4'), tx('M9-03-PPAGOODWILL.20')], { style: STILE_TITOLO }),
      colonna('A4', [
        tx('M9-03-PPAGOODWILL.5'),
        tx('M9-03-PPAGOODWILL.6'),
        tx('M9-03-PPAGOODWILL.7'),
        tx('M9-03-PPAGOODWILL.8'),
        tx('M9-03-PPAGOODWILL.9'),
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [purchasePrice, nbv, stepUp, usefulLife], { style: STILE_INPUT }),
      colonna(B_TAX, [taxRate], { style: STILE_INPUT_PCT }),

      riga('A10', [tx('M9-03-PPAGOODWILL.10'), tx('M9-03-PPAGOODWILL.11')], { style: STILE_TITOLO }),
      colonna('A11', [
        tx('M9-03-PPAGOODWILL.12'),
        tx('M9-03-PPAGOODWILL.13'),
        tx('M9-03-PPAGOODWILL.14'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_DTL, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_GOODWILL, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_ADD_AMORT_POST, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M9-03-PPAGOODWILL.15', { B_DTL }),
        target: `Model!${B_DTL}`,
        atteso: dtl,
        referenzia: [B_STEPUP, B_TAX],
        senzaLiteral: [],
        skills: ['ma.ppa'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M9-03-PPAGOODWILL.16', { B_GOODWILL }),
        target: `Model!${B_GOODWILL}`,
        atteso: goodwill,
        referenzia: [B_PURCHASE, B_NBV, B_STEPUP, B_DTL],
        senzaLiteral: [],
        skills: ['ma.ppa'],
        minKeystrokes: 18,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M9-03-PPAGOODWILL.17', { B_ADD_AMORT_POST }),
        target: `Model!${B_ADD_AMORT_POST}`,
        atteso: addAmortPost,
        referenzia: [B_STEPUP, B_USEFUL_LIFE, B_TAX],
        senzaLiteral: [1],
        skills: ['ma.ppa'],
        minKeystrokes: 16,
      }),
    ];

    return {
      templateId: 'M9-03-PPAGOODWILL',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_DTL}`,
      hints: [
        hint('H1', '=B6*B8', 10, 'T1'),
        hint('H2', tx('M9-03-PPAGOODWILL.18'), 15, 'T2'),
        hint('H3', tx('M9-03-PPAGOODWILL.19'), 10, 'T3'),
      ],
    };
  },
});
