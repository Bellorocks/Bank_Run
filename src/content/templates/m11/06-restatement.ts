/**
 * M11 · 06 — Restatement Contabile: correzione retroattiva di bilanci storici. [COMBO]
 *
 * Livello conclusivo del modulo Sporco e Reale. Quando emergono errori contabili
 * su esercizi passati (es. ricavi anticipati o costi R&D impropriamente capitalizzati),
 * l'analista deve effettuare un Restatement retroattivo:
 *
 *   1. Utile Netto Riportato Anno 1 e Anno 2.
 *   2. Rettifica 1: Storno Ricavi non di competenza (impatto post-tax al 24%).
 *   3. Rettifica 2: Spesamento Costi R&D capitalizzati (impatto post-tax al 24%).
 *   4. Utile Netto Rettificato (Restated NI) = Utile Riportato - Rettifiche Post-Tax.
 *   5. Patrimonio Netto Finale Rettificato = Patrimonio Netto Iniziale + Utile Restated Y1 + Utile Restated Y2.
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
const B_TAX = 'B4'; // Aliquota fiscale 24% (dato)
const B_PN_INIT = 'B5'; // Patrimonio Netto Iniziale (dato)

const B_NI_Y1 = 'B8'; // Utile Riportato Y1 (dato)
const C_NI_Y2 = 'C8'; // Utile Riportato Y2 (dato)

const B_ADJ_Y1 = 'B9'; // Rettifiche Pre-Tax Y1 (dato)
const C_ADJ_Y2 = 'C9'; // Rettifiche Pre-Tax Y2 (dato)

const B_REST_NI_Y1 = 'B12'; // T1: Restated NI Y1 = B8 - (B9 * (1 - B4))
const C_REST_NI_Y2 = 'C12'; // T2: Restated NI Y2 = C8 - (C9 * (1 - B4))
const B_REST_PN_END = 'B13'; // T3: Restated PN Finale = B5 + B12 + C12

export default defineTemplate({
  id: 'M11-06-RESTATEMENT',
  module: 'M11',
  title: 'Restatement: correzione retroattiva di serie storiche [COMBO]',
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['real.restatement'],
  prerequisites: ['M11-01-READCEE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const taxRate = 0.24;
    const pnInit = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 1_000_000);

    const niY1 = roundTo(triangular(r, 12_000_000, 15_000_000, 18_000_000), 500_000);
    const niY2 = roundTo(triangular(r, 14_000_000, 17_000_000, 20_000_000), 500_000);

    const adjY1 = roundTo(triangular(r, 2_000_000, 3_000_000, 4_000_000), 250_000);
    const adjY2 = roundTo(triangular(r, 1_500_000, 2_500_000, 3_500_000), 250_000);

    const restNiY1 = niY1 - (adjY1 * (1 - taxRate));
    const restNiY2 = niY2 - (adjY2 * (1 - taxRate));
    const restPnEnd = pnInit + restNiY1 + restNiY2;

    const brief = [
      `La due diligence contabile ha fatto emergere la necessità di effettuare un **Restatement retroattivo** sul biennio storico.`,
      ``,
      `Dati storici e rilievi della revisione:`,
      `- **Patrimonio Netto Iniziale (Apertura Anno 1)**: ${eur(pnInit)}`,
      `- **Aliquota Fiscale (IRES)**: ${pct(taxRate)}`,
      `- **Anno 1**: Utile Riportato ${eur(niY1)} | Rettifiche Pre-Tax Negative ${eur(adjY1)}`,
      `- **Anno 2**: Utile Riportato ${eur(niY2)} | Rettifiche Pre-Tax Negative ${eur(adjY2)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'**Utile Netto Rettificato dell'Anno 1 (Restated NI Y1)** in \`${B_REST_NI_Y1}\`: \`=${B_NI_Y1}-(${B_ADJ_Y1}*(1-${B_TAX}))\`.`,
      `2. Calcola l'**Utile Netto Rettificato dell'Anno 2 (Restated NI Y2)** in \`${C_REST_NI_Y2}\`: \`=${C_NI_Y2}-(${C_ADJ_Y2}*(1-${B_TAX}))\`.`,
      `3. Calcola il **Patrimonio Netto Rettificato a Fine Anno 2** in \`${B_REST_PN_END}\`: \`=${B_PN_INIT}+${B_REST_NI_Y1}+${C_REST_NI_Y2}\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['RESTATEMENT RETROATTIVO BIENNIO STORICO [COMBO]'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Generali', 'Valore'], { style: STILE_TITOLO }),
      riga('A4', ['Aliquota Fiscale (IRES)', taxRate], { style: STILE_INPUT_PCT }),
      riga('A5', ['Patrimonio Netto Iniziale (€)', pnInit], { style: STILE_INPUT }),

      riga('A7', ['Dati Storici & Rettifiche', 'Anno 1', 'Anno 2'], { style: STILE_TITOLO }),
      colonna('A8', [
        'Utile Netto Riportato (€)',
        'Rettifiche Pre-Tax da Spesare (€)',
      ], { style: STILE_ETICHETTA }),
      riga('B8', [niY1, niY2], { style: STILE_INPUT }),
      riga('B9', [adjY1, adjY2], { style: STILE_INPUT }),

      riga('A11', ['Valori Rettificati (Restated)', 'Anno 1', 'Anno 2'], { style: STILE_TITOLO }),
      colonna('A12', [
        'Utile Netto Rettificato (Restated NI, €)',
        'Patrimonio Netto Finale Rettificato (€)',
      ], { style: STILE_ETICHETTA }),
      riga('B12', [null, null], { style: STILE_FORMULA, locked: false }),
      colonna(B_REST_PN_END, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola l'utile rettificato Anno 1 in ${B_REST_NI_Y1}: =${B_NI_Y1}-(${B_ADJ_Y1}*(1-${B_TAX})).`,
        target: `Model!${B_REST_NI_Y1}`,
        atteso: restNiY1,
        referenzia: [B_NI_Y1, B_ADJ_Y1, B_TAX],
        skills: ['real.restatement'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'utile rettificato Anno 2 in ${C_REST_NI_Y2}: =${C_NI_Y2}-(${C_ADJ_Y2}*(1-${B_TAX})).`,
        target: `Model!${C_REST_NI_Y2}`,
        atteso: restNiY2,
        referenzia: [C_NI_Y2, C_ADJ_Y2, B_TAX],
        skills: ['real.restatement'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il Patrimonio Netto Finale Rettificato in ${B_REST_PN_END}: =${B_PN_INIT}+${B_REST_NI_Y1}+${C_REST_NI_Y2}.`,
        target: `Model!${B_REST_PN_END}`,
        atteso: restPnEnd,
        referenzia: [B_PN_INIT, B_REST_NI_Y1, C_REST_NI_Y2],
        skills: ['real.restatement'],
      }),
    ];

    return {
      templateId: 'M11-06-RESTATEMENT',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 25 }),
      hints: [
        hint('H1', 'In B12 sottrai le rettifiche post-tax: =B8-(B9*(1-$B$4)).', 10, 'T1'),
        hint('H2', 'In C12 fai lo stesso per l\'Anno 2: =C8-(C9*(1-$B$4)).', 10, 'T2'),
        hint('H3', 'In B13 somma il patrimonio netto iniziale e i due utili rettificati: =B5+B12+C12.', 10, 'T3'),
      ],
    };
  },
});
