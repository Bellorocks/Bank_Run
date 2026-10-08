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
  multiplo,
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_INPUT_PCT,
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

const C_CASH_INT = 'B13'; // T2: Interessi cassa totali Anno 1
const C_PIK_INT = 'B14'; // T3: Interessi PIK Anno 1

const STILE_INPUT_PCT2 = { ...STILE_INPUT_PCT, numFmt: '0.00%' };

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

    const multTla = roundTo(triangular(r, 1.5, 2.25, 3), 0.25);
    const multTlb = roundTo(triangular(r, 1, 1.5, 2.25), 0.25);
    const multMezz = roundTo(triangular(r, 0.5, 1, 1.5), 0.25);

    const amtTla = ebitda * multTla;
    const amtTlb = ebitda * multTlb;
    const amtMezz = ebitda * multMezz;
    const totDebt = amtTla + amtTlb + amtMezz;

    const rateTla = roundTo(triangular(r, 0.05, 0.055, 0.06), 0.0025);
    const rateTlb = roundTo(triangular(r, 0.065, 0.07, 0.075), 0.0025);
    const rateMezzCash = roundTo(triangular(r, 0.07, 0.08, 0.09), 0.0025);
    const rateMezzPik = roundTo(triangular(r, 0.03, 0.04, 0.05), 0.0025);

    const expectedCashInt = amtTla * rateTla + amtTlb * rateTlb + amtMezz * rateMezzCash;
    const expectedPikInt = amtMezz * rateMezzPik;

    const brief = [
      `Stai strutturando il debito per l'acquisizione di una societa' con **EBITDA LTM** di **${eur(ebitda)}**.`,
      '',
      'La struttura concordata con i finanziatori:',
      `- **Term Loan A**: ${multiplo(multTla)} l'EBITDA, interesse cash ${pct(rateTla, 2)}`,
      `- **Term Loan B**: ${multiplo(multTlb)} l'EBITDA, interesse cash ${pct(rateTlb, 2)}`,
      `- **Mezzanine**: ${multiplo(multMezz)} l'EBITDA, interesse cash ${pct(rateMezzCash, 2)} piu' ` +
        `interesse **PIK** ${pct(rateMezzPik, 2)}`,
      '',
      "L'interesse PIK (payment in kind) non esce dalla cassa: si capitalizza e fa crescere il capitale " +
        'che il mezzanine dovra\' ricevere a scadenza. Per questo va tenuto separato dagli interessi pagati ' +
        'in cassa, che invece pesano sul servizio del debito di ogni anno.',
      '',
      'Calcola il debito totale, gli interessi cash del primo anno e gli interessi PIK del primo anno.',
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['STRUTTURA DEL DEBITO LBO'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri generali', 'Valore'], { style: STILE_TITOLO }),
      riga('A4', ['EBITDA LTM (€)'], { style: STILE_ETICHETTA }),
      [{ ref: B_EBITDA, content: ebitda, style: STILE_INPUT, locked: true }],

      riga('A6', ['Tranche', 'Multiplo EBITDA', 'Importo (€)', 'Tasso cash', 'Tasso PIK'], { style: STILE_TITOLO }),
      colonna('A7', ['Term Loan A', 'Term Loan B', 'Mezzanine', 'TOTALE DEBITO'], { style: STILE_ETICHETTA }),
      colonna(B_MULT_TLA, [multTla, multTlb, multMezz], { style: STILE_INPUT_MULTIPLO }),
      colonna(C_AMT_TLA, [`=${B_EBITDA}*${B_MULT_TLA}`, `=${B_EBITDA}*${B_MULT_TLB}`, `=${B_EBITDA}*${B_MULT_MEZZ}`], {
        style: STILE_FORMULA,
      }),
      colonna(D_RATE_TLA, [rateTla, rateTlb, rateMezzCash], { style: STILE_INPUT_PCT2 }),
      [{ ref: E_RATE_MEZZ_PIK, content: rateMezzPik, style: STILE_INPUT_PCT2, locked: true }],
      [{ ref: 'B10', content: '=SUM(B7:B9)', style: { ...STILE_FORMULA, numFmt: '0.00x' }, locked: true }],
      [{ ref: C_TOT_DEBT, content: null, style: STILE_TOTALE, locked: false }],

      riga('A12', ['Servizio del debito, anno 1', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A13', ['Interessi cash totali (€)', 'Interessi PIK capitalizzati (€)'], { style: STILE_ETICHETTA }),
      colonna('B13', [null, null], { style: STILE_FORMULA, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `In ${C_TOT_DEBT} il debito totale raccolto con le tre tranche.`,
        target: `Model!${C_TOT_DEBT}`,
        atteso: totDebt,
        referenzia: [C_AMT_TLA, C_AMT_TLB, C_AMT_MEZZ],
        senzaLiteral: [],
        skills: ['lbo.debt-structure'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt:
          `In ${C_CASH_INT} gli interessi che escono dalla cassa nel primo anno, sommando le tre tranche ` +
          'ciascuna al proprio tasso cash. Il PIK non c\'entra.',
        target: `Model!${C_CASH_INT}`,
        atteso: expectedCashInt,
        referenzia: [C_AMT_TLA, C_AMT_TLB, C_AMT_MEZZ, D_RATE_TLA, D_RATE_TLB, D_RATE_MEZZ_CASH],
        senzaLiteral: [],
        skills: ['lbo.debt-structure'],
        minKeystrokes: 22,
      }),
      taskFormula({
        id: 'T3',
        prompt: `In ${C_PIK_INT} gli interessi PIK maturati nel primo anno, che si aggiungono al capitale del mezzanine.`,
        target: `Model!${C_PIK_INT}`,
        atteso: expectedPikInt,
        referenzia: [C_AMT_MEZZ, E_RATE_MEZZ_PIK],
        senzaLiteral: [],
        skills: ['lbo.debt-structure'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M8-02-DEBTSTRUCTURE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${C_TOT_DEBT}`,
      hints: [
        hint('H1', `=SUM(${C_AMT_TLA}:${C_AMT_MEZZ})`, 10, 'T1'),
        hint(
          'H2',
          `=SUMPRODUCT(${C_AMT_TLA}:${C_AMT_MEZZ},${D_RATE_TLA}:${D_RATE_MEZZ_CASH}), oppure ogni importo per il suo tasso cash, sommati.`,
          10,
          'T2',
        ),
        hint('H3', `=${C_AMT_MEZZ}*${E_RATE_MEZZ_PIK}: il PIK si calcola solo sul mezzanine.`, 10, 'T3'),
      ],
    };
  },
});
