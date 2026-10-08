/**
 * M8 · 03 — Debt Schedule: ammortamento obbligatorio e Cash Sweep.
 *
 * Il Debt Schedule è il motore di rimborso del debito in un LBO:
 *
 *   1. Ammortamento Obbligatorio (Mandatory Amortization): quota fissa
 *      concordata con il sindacato bancario (es. € 4,0m/anno).
 *   2. Flusso di Cassa Disponibile per il Servizio del Debito (CFADS).
 *   3. Excess Cash Flow = CFADS - Ammortamento Obbligatorio.
 *   4. Cash Sweep (Rimborso Volontario/Anticipato): percentuale (es. 50%)
 *      del flusso di cassa in eccesso impiegata per rimborsare anticipatamente
 *      il debito residuo.
 *   5. Saldo Finale di Debito (Ending Balance):
 *      Ending Debt = Beginning Debt - Mandatory Amortization - Cash Sweep.
 *   6. Il debito finale dell'anno t diventa il debito iniziale dell'anno t+1.
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
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_CFADS_Y1 = 'B4';
const B_MAND_Y1 = 'B5';
const C_MAND_Y2 = 'C5';

const B_BEG_Y1 = 'B8';
const C_BEG_Y2 = 'C8';

const B_SWEEP_Y1 = 'B9'; // T1
const C_SWEEP_Y2 = 'C9';

const B_END_Y1 = 'B10'; // T2
const C_END_Y2 = 'C10'; // T3

export default defineTemplate({
  id: 'M8-03-DEBTSCHEDULE',
  module: 'M8',
  title: 'Debt schedule: ammortamento obbligatorio e cash sweep',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.debt-schedule'],
  prerequisites: ['M8-02-DEBTSTRUCTURE', 'M0F-04-ITERATIVO'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const initialDebt = roundTo(triangular(r, 35_000_000, 45_000_000, 55_000_000), 1_000_000);
    const mandatoryAmort = roundTo(initialDebt * 0.10, 500_000); // 10% annuo
    const sweepPct = 0.50; // 50% sweep

    const cfads1 = roundTo(triangular(r, 8_000_000, 10_000_000, 12_000_000), 500_000);
    const cfads2 = roundTo(cfads1 * 1.10, 500_000);
    const cfads3 = roundTo(cfads2 * 1.10, 500_000);

    // Calcolo Y1
    const excessCash1 = cfads1 - mandatoryAmort;
    const sweep1 = excessCash1 * sweepPct;
    const end1 = initialDebt - mandatoryAmort - sweep1;

    // Calcolo Y2
    const excessCash2 = cfads2 - mandatoryAmort;
    const sweep2 = excessCash2 * sweepPct;
    const end2 = end1 - mandatoryAmort - sweep2;

    const brief = [
      `Costruisci il debt schedule triennale dell'acquisizione LBO.`,
      ``,
      `Parametri:`,
      `- **Debito Iniziale Anno 1**: ${eur(initialDebt)}`,
      `- **Ammortamento Obbligatorio**: ${eur(mandatoryAmort)} all'anno`,
      `- **Cash Sweep %**: ${pct(sweepPct)} dell'Excess Cash Flow (CFADS − Ammortamento Obbligatorio)`,
      `- **CFADS Anno 1**: ${eur(cfads1)} | **Anno 2**: ${eur(cfads2)} | **Anno 3**: ${eur(cfads3)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola il **Cash Sweep dell'Anno 1** in \`${B_SWEEP_Y1}\` applicando il 50% all'eccesso di cassa: \`=(B4-B5)*0.5\` (o \`=(B4-B5)*$B$1\`).`,
      `2. Calcola il **Debito Finale dell'Anno 1** in \`${B_END_Y1}\`: \`=B8-B5-B9\`.`,
      `3. Calcola il **Debito Finale dell'Anno 2** in \`${C_END_Y2}\`: \`=C8-C5-C9\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['DEBT SCHEDULE & CASH SWEEP'], { style: STILE_TITOLO }),
      riga('A3', ['Cash Flow (€)', 'Anno 1', 'Anno 2', 'Anno 3'], { style: STILE_TITOLO }),
      colonna('A4', ['CFADS', 'Ammortamento Obbligatorio'], { style: STILE_ETICHETTA }),
      riga('B4', [cfads1, cfads2, cfads3], { style: STILE_INPUT }),
      riga('B5', [mandatoryAmort, mandatoryAmort, mandatoryAmort], { style: STILE_INPUT }),

      riga('A7', ['Evoluzione Debito (€)', 'Anno 1', 'Anno 2', 'Anno 3'], { style: STILE_TITOLO }),
      colonna('A8', [
        'Debito Iniziale',
        'Cash Sweep (50%)',
        'Debito Finale',
      ], { style: STILE_ETICHETTA }),
      riga('B8', [initialDebt, '=B10', '=C10'], { style: STILE_FORMULA }),
      riga('B9', [null, '=(C4-C5)*0.5', '=(D4-D5)*0.5'], { style: STILE_FORMULA, locked: false }),
      riga('B10', [null, null, '=D8-D5-D9'], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il Cash Sweep dell'Anno 1 in ${B_SWEEP_Y1} come 50% di (CFADS - Ammortamento): =(B4-B5)*0.5.`,
        target: `Model!${B_SWEEP_Y1}`,
        atteso: sweep1,
        referenzia: [B_CFADS_Y1, B_MAND_Y1],
        skills: ['lbo.debt-schedule'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola il Debito Finale dell'Anno 1 in ${B_END_Y1} sottraendo ammortamento e cash sweep dal debito iniziale: =B8-B5-B9.`,
        target: `Model!${B_END_Y1}`,
        atteso: end1,
        referenzia: [B_BEG_Y1, B_MAND_Y1, B_SWEEP_Y1],
        skills: ['lbo.debt-schedule'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il Debito Finale dell'Anno 2 in ${C_END_Y2} con la stessa logica: =C8-C5-C9.`,
        target: `Model!${C_END_Y2}`,
        atteso: end2,
        referenzia: [C_BEG_Y2, C_MAND_Y2, C_SWEEP_Y2],
        skills: ['lbo.debt-schedule'],
      }),
    ];

    return {
      templateId: 'M8-03-DEBTSCHEDULE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B9 sottrai l\'ammortamento da B4 e moltiplica per 0.5: =(B4-B5)*0.5.', 10, 'T1'),
        hint('H2', 'In B10 fai =B8-B5-B9.', 10, 'T2'),
        hint('H3', 'In C10 fai =C8-C5-C9.', 10, 'T3'),
      ],
    };
  },
});
