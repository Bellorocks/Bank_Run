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
  title: 'Purchase price allocation: step-up intangibili, DTL e goodwill residuo',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['ma.ppa'],
  prerequisites: ['M9-01-CONSIDERATION', 'M1-09-IMPOSTE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const purchasePrice = roundTo(triangular(r, 80_000_000, 100_000_000, 120_000_000), 1_000_000);
    const nbv = roundTo(purchasePrice * 0.40, 1_000_000); // 40% patrimonio netto contabile
    const stepUp = roundTo(purchasePrice * 0.20, 1_000_000); // 20% write-up intangibili
    const usefulLife = 10;
    const taxRate = 0.24;

    const dtl = stepUp * taxRate;
    const goodwill = purchasePrice - (nbv + stepUp - dtl);
    const addAmortPost = (stepUp / usefulLife) * (1 - taxRate);

    const brief = [
      `Effettua la **Purchase Price Allocation (PPA)** per l'acquisizione del target.`,
      ``,
      `Parametri contabili:`,
      `- **Equity Purchase Price**: ${eur(purchasePrice)}`,
      `- **Patrimonio Netto Contabile (Target NBV)**: ${eur(nbv)}`,
      `- **Step-up su Intangibili Ammortizzabili**: ${eur(stepUp)}`,
      `- **Vita Utile Intangibili**: ${usefulLife} anni`,
      `- **Aliquota Fiscale (IRES)**: ${pct(taxRate)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola la **Passività per Imposte Differite (DTL)** generata dallo step-up in \`${B_DTL}\`: \`=${B_STEPUP}*${B_TAX}\`.`,
      `2. Calcola l'**Avviamento Residuo (Goodwill)** in \`${B_GOODWILL}\`: \`=${B_PURCHASE}-(${B_NBV}+${B_STEPUP}-${B_DTL})\`.`,
      `3. Calcola l'**Ammortamento Annuo Addizionale Post-Tax** in \`${B_ADD_AMORT_POST}\` (l'onere che ridurrà l'utile pro-forma): \`=(${B_STEPUP}/${B_USEFUL_LIFE})*(1-${B_TAX})\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['PURCHASE PRICE ALLOCATION (PPA)'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Acquisizione & Fisco', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Equity Purchase Price (€)',
        'Target Net Book Value (€)',
        'Step-up Intangibili Ammortizzabili (€)',
        'Vita Utile Intangibili (Anni)',
        'Aliquota Fiscale (IRES)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [purchasePrice, nbv, stepUp, usefulLife], { style: STILE_INPUT }),
      colonna(B_TAX, [taxRate], { style: STILE_INPUT_PCT }),

      riga('A10', ['Allocazione & Impatto Contabile', 'Risultato (€)'], { style: STILE_TITOLO }),
      colonna('A11', [
        'Deferred Tax Liability (DTL) (€)',
        'Avviamento Residuo (Goodwill, €)',
        'Ammortamento Annuo Addizionale Post-Tax (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_DTL, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_GOODWILL, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_ADD_AMORT_POST, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola la DTL in ${B_DTL}: =${B_STEPUP}*${B_TAX}.`,
        target: `Model!${B_DTL}`,
        atteso: dtl,
        referenzia: [B_STEPUP, B_TAX],
        skills: ['ma.ppa'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola il Goodwill in ${B_GOODWILL}: =${B_PURCHASE}-(${B_NBV}+${B_STEPUP}-${B_DTL}).`,
        target: `Model!${B_GOODWILL}`,
        atteso: goodwill,
        referenzia: [B_PURCHASE, B_NBV, B_STEPUP, B_DTL],
        skills: ['ma.ppa'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola l'Ammortamento Addizionale Post-Tax in ${B_ADD_AMORT_POST}: =(${B_STEPUP}/${B_USEFUL_LIFE})*(1-${B_TAX}).`,
        target: `Model!${B_ADD_AMORT_POST}`,
        atteso: addAmortPost,
        referenzia: [B_STEPUP, B_USEFUL_LIFE, B_TAX],
        skills: ['ma.ppa'],
      }),
    ];

    return {
      templateId: 'M9-03-PPAGOODWILL',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B11 moltiplica lo step-up per l\'aliquota fiscale: =B6*B8.', 10, 'T1'),
        hint('H2', 'In B12 sottrai il valore contabile netto rettificato dal prezzo di acquisto: =B4-(B5+B6-B11).', 15, 'T2'),
        hint('H3', 'In B13 dividi lo step-up per la vita utile e moltiplica per (1-B8): =(B6/B7)*(1-B8).', 10, 'T3'),
      ],
    };
  },
});
