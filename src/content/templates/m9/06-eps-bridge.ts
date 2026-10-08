/**
 * M9 · 06 — EPS Bridge: scomposizione analitica per azione.
 *
 * L'EPS Bridge riconcilia matematicamente l'EPS Standalone dell'Acquirer con l'EPS Pro-Forma,
 * quantificando l'impatto unitario di ogni singola componente:
 *
 *   1. Standalone EPS Acquirer (base di partenza).
 *   2. (+) Contributo Utile Target per Azione Pro-Forma = Target NI / Pro-Forma Shares.
 *   3. (+) Impatto Sinergie per Azione = Sinergie Post-Tax / Pro-Forma Shares.
 *   4. (-) Impatto Oneri Finanziari per Azione = - (Costi Finanziari Post-Tax / Pro-Forma Shares).
 *   5. (-) Impatto Ammortamenti PPA per Azione = - (Ammortamenti PPA Post-Tax / Pro-Forma Shares).
 *   6. (-) Effetto Diluizione Nuove Azioni (Base NI Dilution) = Standalone EPS × (Acquirer Shares / Pro-Forma Shares - 1).
 *   Somma algebrica = Pro-Forma EPS Finale.
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
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_SYN_AT = 'B4'; // Sinergie Post-Tax (€) (dato)
const B_FIN_AT = 'B5'; // Costi Finanziari Post-Tax (€) (dato)
const B_PPA_AT = 'B6'; // Ammortamenti PPA Post-Tax (€) (dato)
const B_PF_SHARES = 'B7'; // Azioni Pro-Forma Totali (dato)

const B_IMP_SYN = 'B11'; // T1: Impatto Sinergie per Azione = B4 / B7
const B_IMP_FIN = 'B12'; // T2: Impatto Costi Finanziari per Azione = -B5 / B7
const B_IMP_PPA = 'B13'; // T3: Impatto PPA per Azione = -B6 / B7

export default defineTemplate({
  id: 'M9-06-EPSBRIDGE',
  module: 'M9',
  title: 'EPS bridge: quantificazione dell\'impatto per azione',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['ma.eps-bridge'],
  prerequisites: ['M9-04-ACCRETIONDILUTION'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const synAt = roundTo(triangular(r, 6_000_000, 8_000_000, 10_000_000), 500_000);
    const finAt = roundTo(triangular(r, 3_000_000, 4_000_000, 5_000_000), 500_000);
    const ppaAt = roundTo(triangular(r, 1_500_000, 2_000_000, 2_500_000), 250_000);
    const pfShares = 20_000_000;

    const impSyn = synAt / pfShares;
    const impFin = -finAt / pfShares;
    const impPpa = -ppaAt / pfShares;

    const brief = [
      `Costruisci le voci analitiche dell'**EPS Bridge** per quantificare l'impatto unitario per azione di sinergie, oneri finanziari e PPA.`,
      ``,
      `Dati dell'operazione:`,
      `- **Numero Azioni Totali Pro-Forma**: ${pfShares.toLocaleString('it-IT')}`,
      `- **Sinergie Nette Post-Tax**: ${eur(synAt)}`,
      `- **Oneri Finanziari Post-Tax (Nuovo Debito)**: ${eur(finAt)}`,
      `- **Ammortamenti PPA Post-Tax**: ${eur(ppaAt)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'**Impatto Positivo delle Sinergie per Azione (€/share)** in \`${B_IMP_SYN}\`: \`=${B_SYN_AT}/${B_PF_SHARES}\`.`,
      `2. Calcola l'**Impatto Negativo dei Costi di Finanziamento per Azione (€/share)** in \`${B_IMP_FIN}\` (con segno negativo): \`=-${B_FIN_AT}/${B_PF_SHARES}\`.`,
      `3. Calcola l'**Impatto Negativo della PPA per Azione (€/share)** in \`${B_IMP_PPA}\` (con segno negativo): \`=-${B_PPA_AT}/${B_PF_SHARES}\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['EPS BRIDGE M&A (IMPATTI UNITARI)'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Aggregati Transazione', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Sinergie Nette Post-Tax (€)',
        'Oneri Finanziari Post-Tax (€)',
        'Ammortamenti PPA Post-Tax (€)',
        'Azioni Totali Pro-Forma (Numero)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [synAt, finAt, ppaAt, pfShares], { style: STILE_INPUT }),

      riga('A9', ['Voci EPS Bridge (€ / Azione)', 'Impatto per Azione (€)'], { style: STILE_TITOLO }),
      colonna('A10', [
        '(+) Impatto Sinergie per Azione',
        '(-) Impatto Costi Finanziamento per Azione',
        '(-) Impatto Ammortamenti PPA per Azione',
      ], { style: STILE_ETICHETTA }),
      colonna(B_IMP_SYN, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_IMP_FIN, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_IMP_PPA, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola l'impatto delle sinergie per azione in ${B_IMP_SYN}: =${B_SYN_AT}/${B_PF_SHARES}.`,
        target: `Model!${B_IMP_SYN}`,
        atteso: impSyn,
        referenzia: [B_SYN_AT, B_PF_SHARES],
        skills: ['ma.eps-bridge'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'impatto dei costi di finanziamento per azione in ${B_IMP_FIN}: =-${B_FIN_AT}/${B_PF_SHARES}.`,
        target: `Model!${B_IMP_FIN}`,
        atteso: impFin,
        referenzia: [B_FIN_AT, B_PF_SHARES],
        skills: ['ma.eps-bridge'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola l'impatto della PPA per azione in ${B_IMP_PPA}: =-${B_PPA_AT}/${B_PF_SHARES}.`,
        target: `Model!${B_IMP_PPA}`,
        atteso: impPpa,
        referenzia: [B_PPA_AT, B_PF_SHARES],
        skills: ['ma.eps-bridge'],
      }),
    ];

    return {
      templateId: 'M9-06-EPSBRIDGE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B11 dividi le sinergie per il numero di azioni pro-forma: =B4/B7.', 10, 'T1'),
        hint('H2', 'In B12 dividi gli oneri finanziari col segno meno: =-B5/B7.', 10, 'T2'),
        hint('H3', 'In B13 dividi la PPA col segno meno: =-B6/B7.', 10, 'T3'),
      ],
    };
  },
});
