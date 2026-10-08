/**
 * M8 · 01 — Sources & Uses: impostare la transazione LBO.
 *
 * Primo livello del modulo LBO (Leveraged Buyout). Introduce la tavola delle
 * Fonti e degli Impieghi (Sources & Uses), la base finanziaria di qualsiasi
 * operazione di private equity.
 *
 * IL PRINCIPIO FONDAMENTALE:
 *   Total Sources ≡ Total Uses (la tavola deve SEMPRE quadrare al centesimo).
 *
 * USES (Impieghi di cassa):
 *   - Purchase Equity: valore delle azioni del target acquistate (Equity Value).
 *   - Refinance Existing Debt: estinzione del debito preesistente del target
 *     (se non viene accollato dalla nuova holdco/bidco).
 *   - Advisory & Legal Fees: oneri per consulenti M&A, legali, tax e due diligence.
 *   - Financing Fees: commissioni bancarie di strutturazione debito (arrangement fee).
 *
 * SOURCES (Fonti di finanziamento):
 *   - Senior Debt (Term Loan): debito bancario garantito.
 *   - Subordinated / Mezzanine Debt: debito mezzanino / subordinato.
 *   - Sponsor Equity (Plug): il capitale versato dal fondo di Private Equity,
 *     calcolato come: Total Uses - Debito Totale.
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
const B_ACQ_EQ = 'B4'; // Uses: Purchase Equity (dato)
const B_REF_DEBT = 'B5'; // Uses: Refinance Existing Debt (dato)
const B_ADV_FEES = 'B6'; // Uses: Advisory Fees (dato)
const B_FIN_FEES = 'B7'; // Uses: Financing Fees (dato)
const B_TOT_USES = 'B8'; // T1: Total Uses (formula SUM)

const B_SR_DEBT = 'B11'; // Sources: Senior Debt (dato)
const B_MEZZ_DEBT = 'B12'; // Sources: Mezzanine Debt (dato)
const B_TOT_DEBT = 'B13'; // T2: Total Debt (formula SUM)
const B_SPONSOR_EQ = 'B14'; // T3: Sponsor Equity Plug (formula: Tot Uses - Tot Debt)
const B_TOT_SOURCES = 'B15'; // Total Sources (formula SUM)

export default defineTemplate({
  id: 'M8-01-SOURCESUSES',
  module: 'M8',
  title: 'Sources & Uses: la tavola di apertura dell\'LBO',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.sources-uses'],
  prerequisites: ['M4-05-BRIDGECOMPLETO'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Purchase Equity: 30M - 80M
    const purchaseEquity = roundTo(triangular(r, 30_000_000, 50_000_000, 80_000_000), 100_000);
    // Refinance Debt: 10M - 25M
    const refDebt = roundTo(triangular(r, 10_000_000, 15_000_000, 25_000_000), 100_000);
    // Advisory fees: 1.5M - 3.5M
    const advisoryFees = roundTo(triangular(r, 1_500_000, 2_200_000, 3_500_000), 50_000);
    // Financing fees: 800k - 1.8M
    const financingFees = roundTo(triangular(r, 800_000, 1_200_000, 1_800_000), 50_000);

    const totalUses = purchaseEquity + refDebt + advisoryFees + financingFees;

    // Senior debt: circa 40-50% del total uses
    const seniorDebt = roundTo(totalUses * triangular(r, 0.40, 0.45, 0.50), 100_000);
    // Mezzanine debt: circa 10-15% del total uses
    const mezzDebt = roundTo(totalUses * triangular(r, 0.10, 0.12, 0.15), 100_000);
    const totalDebt = seniorDebt + mezzDebt;

    // Sponsor equity (plug)
    const sponsorEquity = totalUses - totalDebt;

    const brief = [
      `Stai strutturando l'acquisizione in LBO del target industriale **Project Titan**.`,
      ``,
      `I parametri dell'operazione:`,
      `- **Equity Purchase Price**: ${eur(purchaseEquity)}`,
      `- **Rifinanziamento debito esistente**: ${eur(refDebt)}`,
      `- **Commissioni legali & advisory M&A**: ${eur(advisoryFees)}`,
      `- **Financing fees (commissioni bancarie)**: ${eur(financingFees)}`,
      `- **Senior Term Loan**: ${eur(seniorDebt)}`,
      `- **Mezzanine Debt**: ${eur(mezzDebt)}`,
      ``,
      `### I tuoi obiettivi:`,
      `1. Calcola il totale degli **Impieghi (Total Uses)** in \`${B_TOT_USES}\` sommando acquisto equity, rifinanziamento e tutte le fee.`,
      `2. Calcola il totale del **Debito Finanziario (Total Debt)** in \`${B_TOT_DEBT}\` sommando Senior Debt e Mezzanine Debt.`,
      `3. Calcola l'**Equity dello Sponsor (Plug)** in \`${B_SPONSOR_EQ}\` come differenza tra Total Uses e Total Debt per far quadrare esattamente la tavola Sources & Uses.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['LBO SOURCES & USES'], { style: STILE_TITOLO }),
      riga('A3', ['USES (Impieghi)', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Purchase Equity',
        'Refinance Debt',
        'Advisory & Legal Fees',
        'Financing Fees',
        'TOTAL USES',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [purchaseEquity, refDebt, advisoryFees, financingFees], { style: STILE_INPUT }),
      colonna(B_TOT_USES, [null], { style: STILE_TOTALE, locked: false }),

      riga('A10', ['SOURCES (Fonti)', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A11', [
        'Senior Term Loan',
        'Mezzanine Debt',
        'TOTAL DEBT',
        'Sponsor Equity (Plug)',
        'TOTAL SOURCES',
      ], { style: STILE_ETICHETTA }),
      colonna('B11', [seniorDebt, mezzDebt], { style: STILE_INPUT }),
      colonna(B_TOT_DEBT, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_SPONSOR_EQ, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_TOT_SOURCES, ['=B13+B14'], { style: STILE_TOTALE }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il totale degli Impieghi (Total Uses) in ${B_TOT_USES} sommando le celle B4:B7 con =SUM(B4:B7).`,
        target: `Model!${B_TOT_USES}`,
        atteso: totalUses,
        referenzia: [B_ACQ_EQ, B_REF_DEBT, B_ADV_FEES, B_FIN_FEES],
        skills: ['lbo.sources-uses'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola il Debito Totale (Total Debt) in ${B_TOT_DEBT} come somma di Senior Debt e Mezzanine Debt (=B11+B12 o =SUM(B11:B12)).`,
        target: `Model!${B_TOT_DEBT}`,
        atteso: totalDebt,
        referenzia: [B_SR_DEBT, B_MEZZ_DEBT],
        skills: ['lbo.sources-uses'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola l'Equity dello Sponsor in ${B_SPONSOR_EQ} come differenza tra Total Uses e Total Debt (=${B_TOT_USES}-${B_TOT_DEBT}).`,
        target: `Model!${B_SPONSOR_EQ}`,
        atteso: sponsorEquity,
        referenzia: [B_TOT_USES, B_TOT_DEBT],
        skills: ['lbo.sources-uses'],
      }),
    ];

    return {
      templateId: 'M8-01-SOURCESUSES',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B8 usa =SUM(B4:B7) per calcolare la cassa complessiva necessaria all\'operazione.', 10, 'T1'),
        hint('H2', 'In B13 calcola il debito totale con =SUM(B11:B12).', 10, 'T2'),
        hint('H3', 'L\'equity dello sponsor è il "tappo" (plug) che finanzia tutto ciò che il debito non copre: =B8-B13.', 15, 'T3'),
      ],
    };
  },
});
