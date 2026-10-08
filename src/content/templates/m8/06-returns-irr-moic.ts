/**
 * M8 · 06 — Rendimenti LBO: MoIC e IRR.
 *
 * Le due metriche fondamentali con cui il Private Equity valuta il successo di un deal:
 *
 *   1. MoIC (Multiple on Invested Capital / Cash-on-Cash):
 *      MoIC = Equity Realizzata all'Uscita / Equity Investita all'Ingresso
 *
 *   2. IRR (Internal Rate of Return / Tasso Interno di Rendimento):
 *      Su un holding period di N anni (senza flussi intermedi):
 *      IRR = (Exit Equity / Entry Equity) ^ (1 / N) - 1 = MoIC ^ (1 / N) - 1
 *
 *   3. Spread vs Hurdle Rate:
 *      Spread = IRR Effettivo - Target Hurdle Rate (es. 20.0%).
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
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_ENTRY_EQ = 'B4'; // Equity investita (Entry) (dato)
const B_EXIT_EQ = 'B5'; // Equity di uscita (Exit) (dato)
const B_YEARS = 'B6'; // Orizzonte temporale N (5 anni) (dato)
const B_HURDLE = 'B7'; // Target Hurdle Rate (20.0%) (dato)

const B_MOIC = 'B10'; // T1: MoIC = Exit / Entry
const B_IRR = 'B11'; // T2: IRR = (Exit/Entry)^(1/N)-1
const B_SPREAD = 'B12'; // T3: Spread = IRR - Hurdle

export default defineTemplate({
  id: 'M8-06-RETURNSIRRMOIC',
  module: 'M8',
  title: 'Rendimenti LBO: calcolo analitico di MoIC e IRR',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.returns'],
  prerequisites: ['M8-03-DEBTSCHEDULE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const entryEq = roundTo(triangular(r, 25_000_000, 35_000_000, 50_000_000), 1_000_000);
    const years = 5;
    const hurdleRate = 0.20; // 20.0% hurdle rate standard nel PE

    // MoIC tra 2.2x e 3.5x
    const expectedMoic = roundTo(triangular(r, 2.3, 2.7, 3.4), 0.05);
    const exitEq = roundTo(entryEq * expectedMoic, 100_000);

    const actualMoic = exitEq / entryEq;
    const actualIrr = Math.pow(exitEq / entryEq, 1 / years) - 1;
    const spread = actualIrr - hurdleRate;

    const brief = [
      `Valuta il ritorno dell'investimento LBO per il comitato investimenti.`,
      ``,
      `Parametri dell'operazione:`,
      `- **Sponsor Equity Entry**: ${eur(entryEq)}`,
      `- **Sponsor Equity Exit**: ${eur(exitEq)}`,
      `- **Holding Period (anni)**: ${years}`,
      `- **Target Hurdle Rate**: ${pct(hurdleRate)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola il **MoIC (Multiple on Invested Capital)** in \`${B_MOIC}\`: \`=${B_EXIT_EQ}/${B_ENTRY_EQ}\`.`,
      `2. Calcola l'**IRR Annuo Composto** in \`${B_IRR}\` con la formula finanziaria: \`=(${B_EXIT_EQ}/${B_ENTRY_EQ})^(1/${B_YEARS})-1\` (oppure \`=${B_MOIC}^(1/${B_YEARS})-1\`).`,
      `3. Calcola lo **Spread vs Hurdle Rate** in \`${B_SPREAD}\`: \`=${B_IRR}-${B_HURDLE}\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['RENDIMENTI LBO (RETURNS)'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Transazione', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Equity Investita all\'Ingresso (Anno 0)',
        'Equity Incassata all\'Uscita (Anno 5)',
        'Orizzonte di Investimento (Anni)',
        'Target Hurdle Rate (Minimo IRR Richiesto)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [entryEq, exitEq, years], { style: STILE_INPUT }),
      colonna(B_HURDLE, [hurdleRate], { style: STILE_INPUT_PCT }),

      riga('A9', ['Metriche di Rendimento', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A10', [
        'MoIC (Multiple on Invested Capital)',
        'IRR Annuo Composto (%)',
        'Spread vs Hurdle Rate (p.p.)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_MOIC, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_IRR, [null], { style: STILE_FORMULA_PCT, locked: false }),
      colonna(B_SPREAD, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il MoIC in ${B_MOIC}: =${B_EXIT_EQ}/${B_ENTRY_EQ}.`,
        target: `Model!${B_MOIC}`,
        atteso: actualMoic,
        referenzia: [B_EXIT_EQ, B_ENTRY_EQ],
        skills: ['lbo.returns'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'IRR in ${B_IRR}: =(${B_EXIT_EQ}/${B_ENTRY_EQ})^(1/${B_YEARS})-1 o =${B_MOIC}^(1/${B_YEARS})-1.`,
        target: `Model!${B_IRR}`,
        atteso: actualIrr,
        referenzia: [B_EXIT_EQ, B_ENTRY_EQ, B_YEARS],
        skills: ['lbo.returns'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola lo Spread rispetto all'Hurdle Rate in ${B_SPREAD}: =${B_IRR}-${B_HURDLE}.`,
        target: `Model!${B_SPREAD}`,
        atteso: spread,
        referenzia: [B_IRR, B_HURDLE],
        skills: ['lbo.returns'],
      }),
    ];

    return {
      templateId: 'M8-06-RETURNSIRRMOIC',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B10 dividi l\'equity di uscita per quella iniziale: =B5/B4.', 10, 'T1'),
        hint('H2', 'In B11 calcola il rendimento composto: =(B5/B4)^(1/B6)-1.', 15, 'T2'),
        hint('H3', 'In B12 calcola la differenza: =B11-B7.', 10, 'T3'),
      ],
    };
  },
});
