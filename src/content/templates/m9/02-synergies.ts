/**
 * M9 · 02 — Sinergie: phasing curve, costi di integrazione e impatto after-tax.
 *
 * Le sinergie in un deal M&A non arrivano istantaneamente:
 *
 *   1. Sinergie a Regime (Run-Rate Synergies): es. € 10,0m/anno (costi e ricavi).
 *   2. Curva di Rilascio (Phasing Curve): es. Anno 1 (30%), Anno 2 (70%), Anno 3 (100%).
 *   3. Sinergie Lorde Realizzate = Run-Rate Synergies × Phasing %.
 *   4. Costi di Integrazione One-Off: spese una tantum di ristrutturazione/IT sostenute all'inizio.
 *   5. Sinergie Nette Pre-Tax = Sinergie Lorde - Costi di Integrazione.
 *   6. Sinergie Nette After-Tax = Sinergie Nette Pre-Tax × (1 - Aliquota Fiscale 24%).
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
const B_RUNRATE = 'B4'; // Sinergie Run-Rate (dato)
const B_TAX = 'B5'; // Aliquota fiscale 24% (dato)

const B_PHASE_Y1 = 'B8'; // Phasing Y1 (30%) (dato)
const B_INTEG_Y1 = 'B9'; // Costi integrazione Y1 (dato)

const B_GROSS_Y1 = 'B12'; // T1: Sinergie Lorde Y1 = B4 * B8
const B_NET_PRE_Y1 = 'B13'; // T2: Sinergie Nette Pre-Tax Y1 = B12 - B9
const B_NET_POST_Y1 = 'B14'; // T3: Sinergie Nette Post-Tax Y1 = B13 * (1 - B5)

export default defineTemplate({
  id: 'M9-02-SYNERGIES',
  module: 'M9',
  title: 'Sinergie M&A: curva di phasing, costi di integrazione e impatto netto',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['ma.synergies'],
  prerequisites: ['M9-01-CONSIDERATION'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const runRate = roundTo(triangular(r, 8_000_000, 10_000_000, 14_000_000), 1_000_000);
    const taxRate = 0.24;

    const phaseY1 = 0.30;
    const integY1 = roundTo(triangular(r, 3_000_000, 4_000_000, 5_000_000), 500_000);

    const grossY1 = runRate * phaseY1;
    const netPreY1 = grossY1 - integY1;
    const netPostY1 = netPreY1 * (1 - taxRate);

    const brief = [
      `Modella l'impatto economico delle sinergie e dei costi di integrazione per l'**Anno 1** post-closing.`,
      ``,
      `Parametri delle sinergie:`,
      `- **Sinergie a Regime (Run-Rate)**: ${eur(runRate)}/anno`,
      `- **Aliquota Fiscale (IRES)**: ${pct(taxRate)}`,
      `- **Rilascio Anno 1 (Phasing)**: ${pct(phaseY1)} del run-rate`,
      `- **Costi di Integrazione One-Off Anno 1**: ${eur(integY1)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola le **Sinergie Lorde Realizzate nell'Anno 1** in \`${B_GROSS_Y1}\`: \`=${B_RUNRATE}*${B_PHASE_Y1}\`.`,
      `2. Calcola le **Sinergie Nette Pre-Tax nell'Anno 1** in \`${B_NET_PRE_Y1}\` deducendo i costi di integrazione: \`=${B_GROSS_Y1}-${B_INTEG_Y1}\`.`,
      `3. Calcola l'**Impatto Netto Post-Tax sull'Utile (Anno 1)** in \`${B_NET_POST_Y1}\`: \`=${B_NET_PRE_Y1}*(1-${B_TAX})\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['MODELLIZZAZIONE SINERGIE M&A'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Generali', 'Valore'], { style: STILE_TITOLO }),
      riga('A4', ['Sinergie Run-Rate Annue a Regime (€)', runRate], { style: STILE_INPUT }),
      riga('A5', ['Aliquota Fiscale (IRES)', taxRate], { style: STILE_INPUT_PCT }),

      riga('A7', ['Dati Operativi Anno 1', 'Valore'], { style: STILE_TITOLO }),
      riga('A8', ['Phasing Realizzazione (%)', phaseY1], { style: STILE_INPUT_PCT }),
      riga('A9', ['Costi One-off di Integrazione (€)', integY1], { style: STILE_INPUT }),

      riga('A11', ['Risultati Economici Anno 1', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A12', [
        'Sinergie Lorde Realizzate (€)',
        'Sinergie Nette Pre-Tax (€)',
        'Impatto Netto Post-Tax sull\'Utile (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_GROSS_Y1, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_NET_PRE_Y1, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_NET_POST_Y1, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola le Sinergie Lorde in ${B_GROSS_Y1}: =${B_RUNRATE}*${B_PHASE_Y1}.`,
        target: `Model!${B_GROSS_Y1}`,
        atteso: grossY1,
        referenzia: [B_RUNRATE, B_PHASE_Y1],
        skills: ['ma.synergies'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola le Sinergie Nette Pre-Tax in ${B_NET_PRE_Y1}: =${B_GROSS_Y1}-${B_INTEG_Y1}.`,
        target: `Model!${B_NET_PRE_Y1}`,
        atteso: netPreY1,
        referenzia: [B_GROSS_Y1, B_INTEG_Y1],
        skills: ['ma.synergies'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola l'Impatto Netto Post-Tax in ${B_NET_POST_Y1}: =${B_NET_PRE_Y1}*(1-${B_TAX}).`,
        target: `Model!${B_NET_POST_Y1}`,
        atteso: netPostY1,
        referenzia: [B_NET_PRE_Y1, B_TAX],
        skills: ['ma.synergies'],
      }),
    ];

    return {
      templateId: 'M9-02-SYNERGIES',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B12 moltiplica le sinergie a regime per la percentuale di phasing: =B4*B8.', 10, 'T1'),
        hint('H2', 'In B13 sottrai i costi di integrazione: =B12-B9.', 10, 'T2'),
        hint('H3', 'In B14 applica l\'aliquota fiscale post-tax: =B13*(1-B5).', 10, 'T3'),
      ],
    };
  },
});
