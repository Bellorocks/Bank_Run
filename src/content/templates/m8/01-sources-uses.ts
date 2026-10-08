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

import { tx } from '../../../i18n/content';
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
  get title() {
    return tx('M8-01-SOURCESUSES.title');
  },
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

    const brief = [tx('M8-01-SOURCESUSES.2', { p0: eur(purchaseEquity), p1: eur(refDebt), p2: eur(advisoryFees), p3: eur(financingFees), p4: eur(seniorDebt), p5: eur(mezzDebt), B_TOT_USES, B_TOT_DEBT, B_SPONSOR_EQ })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M8-01-SOURCESUSES.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M8-01-SOURCESUSES.4'), tx('M8-01-SOURCESUSES.5')], { style: STILE_TITOLO }),
      colonna('A4', [
        tx('M8-01-SOURCESUSES.6'),
        tx('M8-01-SOURCESUSES.7'),
        tx('M8-01-SOURCESUSES.8'),
        tx('M8-01-SOURCESUSES.9'),
        tx('M8-01-SOURCESUSES.10'),
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [purchaseEquity, refDebt, advisoryFees, financingFees], { style: STILE_INPUT }),
      colonna(B_TOT_USES, [null], { style: STILE_TOTALE, locked: false }),

      riga('A10', [tx('M8-01-SOURCESUSES.11'), tx('M8-01-SOURCESUSES.12')], { style: STILE_TITOLO }),
      colonna('A11', [
        tx('M8-01-SOURCESUSES.13'),
        tx('M8-01-SOURCESUSES.14'),
        tx('M8-01-SOURCESUSES.15'),
        tx('M8-01-SOURCESUSES.16'),
        tx('M8-01-SOURCESUSES.17'),
      ], { style: STILE_ETICHETTA }),
      colonna('B11', [seniorDebt, mezzDebt], { style: STILE_INPUT }),
      colonna(B_TOT_DEBT, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_SPONSOR_EQ, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_TOT_SOURCES, ['=B13+B14'], { style: STILE_TOTALE }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M8-01-SOURCESUSES.18', { B_TOT_USES }),
        target: `Model!${B_TOT_USES}`,
        atteso: totalUses,
        referenzia: [B_ACQ_EQ, B_REF_DEBT, B_ADV_FEES, B_FIN_FEES],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M8-01-SOURCESUSES.19', { B_TOT_DEBT }),
        target: `Model!${B_TOT_DEBT}`,
        atteso: totalDebt,
        referenzia: [B_SR_DEBT, B_MEZZ_DEBT],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M8-01-SOURCESUSES.20', { B_SPONSOR_EQ }),
        target: `Model!${B_SPONSOR_EQ}`,
        atteso: sponsorEquity,
        referenzia: [B_TOT_USES, B_TOT_DEBT],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
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
        hint('H1', tx('M8-01-SOURCESUSES.21'), 10, 'T1'),
        hint('H2', tx('M8-01-SOURCESUSES.22'), 10, 'T2'),
        hint('H3', tx('M8-01-SOURCESUSES.23'), 15, 'T3'),
      ],
    };
  },
});
