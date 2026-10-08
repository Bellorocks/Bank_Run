/**
 * M8 · 10 — Exit Timing: scenari temporali e trade-off tra MoIC e IRR.
 *
 * Nel Private Equity il momento esatto di uscita (Anno 3, 5 o 7) cambia
 * radicalmente la dinamica dei rendimenti:
 *
 *   - Allungare l'holding period fa crescere il MoIC (più cassa cumulata e
 *     più debito rimborsato), ma fa scendere progressivamente l'IRR (legge dei
 *     rendimenti marginali decrescenti dovuta all'attualizzazione temporale).
 *   - IRR = (Exit Equity / Entry Equity) ^ (1 / Anni) - 1 = MoIC ^ (1 / Anni) - 1.
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
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_Y3_MOIC = 'B9';
const C_Y5_MOIC = 'C9';
const D_Y7_MOIC = 'D9';

const B_Y3_IRR = 'B10'; // T1: IRR Anno 3 = B9^(1/B7)-1
const C_Y5_IRR = 'C10'; // T2: IRR Anno 5 = C9^(1/C7)-1
const D_Y7_IRR = 'D10'; // T3: IRR Anno 7 = D9^(1/D7)-1

export default defineTemplate({
  id: 'M8-10-EXITTIMING',
  module: 'M8',
  title: 'Exit timing: holding period a 3, 5 e 7 anni',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.exit'],
  prerequisites: ['M8-06-RETURNSIRRMOIC'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const entryEq = roundTo(triangular(r, 25_000_000, 30_000_000, 40_000_000), 1_000_000);

    const moicY3 = 2.0;
    const moicY5 = 2.8;
    const moicY7 = 3.6;

    const exitY3 = entryEq * moicY3;
    const exitY5 = entryEq * moicY5;
    const exitY7 = entryEq * moicY7;

    const irrY3 = Math.pow(moicY3, 1 / 3) - 1;
    const irrY5 = Math.pow(moicY5, 1 / 5) - 1;
    const irrY7 = Math.pow(moicY7, 1 / 7) - 1;

    const brief = [
      `Analizza la convenienza del timing di disinvestimento per il fondo di Private Equity su 3 scenari temporali.`,
      ``,
      `- **Capitale Iniziale Investito (Anno 0)**: ${eur(entryEq)}`,
      `- **Scenario Quick Exit (3 Anni)**: Exit Equity ${eur(exitY3)} (${multiplo(moicY3)})`,
      `- **Scenario Base (5 Anni)**: Exit Equity ${eur(exitY5)} (${multiplo(moicY5)})`,
      `- **Scenario Long Hold (7 Anni)**: Exit Equity ${eur(exitY7)} (${multiplo(moicY7)})`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'**IRR Annuo Composto per lo Scenario a 3 Anni** in \`${B_Y3_IRR}\`: \`=(${B_Y3_MOIC})^(1/B7)-1\` o \`=(${B_Y3_MOIC})^(1/3)-1\`.`,
      `2. Calcola l'**IRR Annuo Composto per lo Scenario a 5 Anni** in \`${C_Y5_IRR}\`: \`=(${C_Y5_MOIC})^(1/C7)-1\` o \`=(${C_Y5_MOIC})^(1/5)-1\`.`,
      `3. Calcola l'**IRR Annuo Composto per lo Scenario a 7 Anni** in \`${D_Y7_IRR}\`: \`=(${D_Y7_MOIC})^(1/D7)-1\` o \`=(${D_Y7_MOIC})^(1/7)-1\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['SCENARI DI EXIT TIMING (3 vs 5 vs 7 ANNI)'], { style: STILE_TITOLO }),
      riga('A3', ['Investimento Iniziale', 'Valore (€)'], { style: STILE_TITOLO }),
      riga('A4', ['Equity Iniziale Sponsor (Anno 0)', entryEq], { style: STILE_INPUT }),

      riga('A6', ['Metrica / Scenario', '3 Anni', '5 Anni', '7 Anni'], { style: STILE_TITOLO }),
      colonna('A7', [
        'Holding Period (Anni)',
        'Exit Equity Incassata (€)',
        'MoIC Realizzato (x)',
        'IRR Annuo Composto (%)',
      ], { style: STILE_ETICHETTA }),
      riga('B7', [3, 5, 7], { style: STILE_INPUT }),
      riga('B8', [exitY3, exitY5, exitY7], { style: STILE_INPUT }),
      riga('B9', ['=B8/$B$4', '=C8/$B$4', '=D8/$B$4'], { style: STILE_FORMULA }),
      riga('B10', [null, null, null], { style: STILE_FORMULA_PCT, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola l'IRR a 3 anni in ${B_Y3_IRR}: =B9^(1/B7)-1 o =B9^(1/3)-1.`,
        target: `Model!${B_Y3_IRR}`,
        atteso: irrY3,
        referenzia: [B_Y3_MOIC],
        skills: ['lbo.exit'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'IRR a 5 anni in ${C_Y5_IRR}: =C9^(1/C7)-1 o =C9^(1/5)-1.`,
        target: `Model!${C_Y5_IRR}`,
        atteso: irrY5,
        referenzia: [C_Y5_MOIC],
        skills: ['lbo.exit'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola l'IRR a 7 anni in ${D_Y7_IRR}: =D9^(1/D7)-1 o =D9^(1/7)-1.`,
        target: `Model!${D_Y7_IRR}`,
        atteso: irrY7,
        referenzia: [D_Y7_MOIC],
        skills: ['lbo.exit'],
      }),
    ];

    return {
      templateId: 'M8-10-EXITTIMING',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B10 fai =B9^(1/B7)-1 o =B9^(1/3)-1.', 10, 'T1'),
        hint('H2', 'In C10 fai =C9^(1/C7)-1 o =C9^(1/5)-1.', 10, 'T2'),
        hint('H3', 'In D10 fai =D9^(1/D7)-1 o =D9^(1/7)-1.', 10, 'T3'),
      ],
    };
  },
});
