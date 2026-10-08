/**
 * M8 · 02 — Struttura del Debito: tranche, multipli di leverage e interessi PIK.
 *
 * In un'operazione LBO il debito non è monolitico: è stratificato in tranche
 * con diverso grado di subordinazione, tasso e profilo di rimborso:
 *
 *   1. Term Loan A (Senior Amortizing): tasso più basso (es. Euribor + 2.5%),
 *      ammortamento graduale annuo.
 *   2. Term Loan B (Senior Bullet): tasso intermedio (es. Euribor + 4.0%),
 *      rimborso in un'unica soluzione alla scadenza (bullet).
 *   3. Mezzanine Debt: subordinato al debito senior, rendimento misto:
 *      - Cash interest (es. 8.0% pagato in cassa ogni anno)
 *      - PIK interest (Payment-In-Kind, es. 4.0%): NON viene pagato in cassa,
 *        ma viene capitalizzato aumentando il capitale residuo dovuto a scadenza.
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
const B_EBITDA = 'B4'; // Target EBITDA LTM (dato)

const B_MULT_TLA = 'B7'; // Multiplo TLA (dato)
const B_MULT_TLB = 'B8'; // Multiplo TLB (dato)
const B_MULT_MEZZ = 'B9'; // Multiplo Mezzanine (dato)

const C_AMT_TLA = 'C7'; // Importo TLA = EBITDA * Mult (formula)
const C_AMT_TLB = 'C8'; // Importo TLB = EBITDA * Mult (formula)
const C_AMT_MEZZ = 'C9'; // Importo Mezzanine = EBITDA * Mult (formula)
const C_TOT_DEBT = 'C10'; // T1: Totale Debito = SUM(C7:C9)

const D_RATE_TLA = 'D7'; // Tasso cash TLA (dato)
const D_RATE_TLB = 'D8'; // Tasso cash TLB (dato)
const D_RATE_MEZZ_CASH = 'D9'; // Tasso cash Mezzanine (dato)
const E_RATE_MEZZ_PIK = 'E9'; // Tasso PIK Mezzanine (dato)

const C_CASH_INT = 'C13'; // T2: Interessi cassa totali Anno 1
const C_PIK_INT = 'C14'; // T3: Interessi PIK Anno 1

export default defineTemplate({
  id: 'M8-02-DEBTSTRUCTURE',
  module: 'M8',
  title: 'Struttura del debito: Senior, Mezzanine e interessi PIK',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.debt-structure'],
  prerequisites: ['M8-01-SOURCESUSES'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitda = roundTo(triangular(r, 8_000_000, 12_000_000, 18_000_000), 500_000);

    const multTla = 2.5;
    const multTlb = 1.5;
    const multMezz = 1.0;

    const amtTla = ebitda * multTla;
    const amtTlb = ebitda * multTlb;
    const amtMezz = ebitda * multMezz;
    const totDebt = amtTla + amtTlb + amtMezz;

    const rateTla = roundTo(triangular(r, 0.05, 0.055, 0.06), 0.005);
    const rateTlb = roundTo(triangular(r, 0.065, 0.07, 0.075), 0.005);
    const rateMezzCash = 0.08;
    const rateMezzPik = 0.04;

    const expectedCashInt = (amtTla * rateTla) + (amtTlb * rateTlb) + (amtMezz * rateMezzCash);
    const expectedPikInt = amtMezz * rateMezzPik;

    const brief = [
      `Stai strutturando le tranche di debito per l'acquisizione di una società con **EBITDA LTM** di **${eur(ebitda)}**.`,
      ``,
      `La struttura finanziaria concordata prevede:`,
      `- **Term Loan A (TLA)**: ${multTla}x EBITDA con tasso cash di ${pct(rateTla)}`,
      `- **Term Loan B (TLB)**: ${multTlb}x EBITDA con tasso cash di ${pct(rateTlb)}`,
      `- **Mezzanine Debt**: ${multMezz}x EBITDA con tasso cash di ${pct(rateMezzCash)} e tasso PIK del ${pct(rateMezzPik)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola il **Debito Totale** in \`${C_TOT_DEBT}\` sommando gli importi delle tre tranche (C7:C9).`,
      `2. Calcola gli **Interessi Cassa Totali** dell'Anno 1 in \`${C_CASH_INT}\` sommando gli interessi cassa di TLA, TLB e Mezzanine (es. \`=C7*D7+C8*D8+C9*D9\` o \`=SUMPRODUCT(C7:C9, D7:D9)\`).`,
      `3. Calcola gli **Interessi PIK** dell'Anno 1 in \`${C_PIK_INT}\` applicando il tasso PIK al capitale Mezzanine (\`=C9*E9\`).`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['STRUTTURA DEL DEBITO LBO'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Generali', 'Valore'], { style: STILE_TITOLO }),
      riga('A4', ['EBITDA LTM (€)', ebitda], { style: STILE_INPUT }),

      riga('A6', ['Tranche Debito', 'Multiplo EBITDA', 'Importo (€)', 'Tasso Cash', 'Tasso PIK'], { style: STILE_TITOLO }),
      riga('A7', ['Term Loan A', multTla, `=${B_EBITDA}*${B_MULT_TLA}`, rateTla, null]),
      riga('A8', ['Term Loan B', multTlb, `=${B_EBITDA}*${B_MULT_TLB}`, rateTlb, null]),
      riga('A9', ['Mezzanine Debt', multMezz, `=${B_EBITDA}*${B_MULT_MEZZ}`, rateMezzCash, rateMezzPik]),
      riga('A10', ['TOTALE DEBITO', '5.0x', null, null, null], { style: STILE_TOTALE }),

      riga('A12', ['Servizio del Debito Anno 1', 'Formula / Importo'], { style: STILE_TITOLO }),
      colonna('A13', [
        'Interessi Cassa Totali (€)',
        'Interessi PIK (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(C_CASH_INT, [null], { style: STILE_FORMULA, locked: false }),
      colonna(C_PIK_INT, [null], { style: STILE_FORMULA, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il Debito Totale in ${C_TOT_DEBT} come =SUM(C7:C9).`,
        target: `Model!${C_TOT_DEBT}`,
        atteso: totDebt,
        referenzia: [C_AMT_TLA, C_AMT_TLB, C_AMT_MEZZ],
        skills: ['lbo.debt-structure'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola gli Interessi Cassa Totali dell'Anno 1 in ${C_CASH_INT} moltiplicando ciascun debito per il proprio tasso cash: =C7*D7+C8*D8+C9*D9.`,
        target: `Model!${C_CASH_INT}`,
        atteso: expectedCashInt,
        referenzia: [C_AMT_TLA, C_AMT_TLB, C_AMT_MEZZ, D_RATE_TLA, D_RATE_TLB, D_RATE_MEZZ_CASH],
        skills: ['lbo.debt-structure'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola gli Interessi PIK dell'Anno 1 in ${C_PIK_INT} moltiplicando il debito Mezzanine per il tasso PIK: =C9*E9.`,
        target: `Model!${C_PIK_INT}`,
        atteso: expectedPikInt,
        referenzia: [C_AMT_MEZZ, E_RATE_MEZZ_PIK],
        skills: ['lbo.debt-structure'],
      }),
    ];

    return {
      templateId: 'M8-02-DEBTSTRUCTURE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In C10 somma le tre tranche con =SUM(C7:C9).', 10, 'T1'),
        hint('H2', 'In C13 calcola =C7*D7+C8*D8+C9*D9 per sommare solo la quota pagata in contanti.', 10, 'T2'),
        hint('H3', 'Gli interessi PIK non escono dalla cassa ma si calcolano su C9: =C9*E9.', 10, 'T3'),
      ],
    };
  },
});
