/**
 * M10 · 01 — Credit Ratios: DSCR, ICR e metriche di rating bancario.
 *
 * Gli istituti di credito e le agenzie di rating valutano il merito creditizio
 * dell'impresa attraverso tre rapporti chiave di copertura e leva:
 *
 *   1. DSCR (Debt Service Coverage Ratio):
 *      DSCR = Free Cash Flow Operativo (CFADS) / Servizio Totale del Debito (Quota Capitale + Interessi).
 *      (Un DSCR < 1.0x indica incapacità di rimborsare il debito con i flussi operativi).
 *
 *   2. ICR (Interest Coverage Ratio / TIE - Times Interest Earned):
 *      ICR = EBITDA / Interessi Passivi.
 *
 *   3. Net Leverage Ratio:
 *      Net Leverage = Posizione Finanziaria Netta (Debito Netto) / EBITDA.
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
const B_EBITDA = 'B4'; // EBITDA (dato)
const B_CFADS = 'B5'; // Free Cash Flow Operativo per il debito (dato)
const B_INT_EXP = 'B6'; // Interessi passivi annui (dato)
const B_MAND_AMORT = 'B7'; // Quota capitale rimborsata (dato)
const B_NET_DEBT = 'B8'; // Debito Netto (dato)

const B_DSCR = 'B11'; // T1: DSCR = B5 / (B6 + B7)
const B_ICR = 'B12'; // T2: ICR = B4 / B6
const B_LEV = 'B13'; // T3: Leverage = B8 / B4

export default defineTemplate({
  id: 'M10-01-CREDITRATIOS',
  module: 'M10',
  title: 'Credit ratios: DSCR, ICR e leverage ratio bancario',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['cred.ratios'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitda = roundTo(triangular(r, 15_000_000, 20_000_000, 25_000_000), 500_000);
    const cfads = roundTo(ebitda * triangular(r, 0.5, 0.62, 0.75), 100_000);
    const netDebt = roundTo(ebitda * triangular(r, 2, 3, 4.5), 500_000);
    const intExp = roundTo(netDebt * triangular(r, 0.045, 0.06, 0.08), 100_000);
    const mandAmort = roundTo(netDebt * triangular(r, 0.06, 0.1, 0.15), 100_000);

    const dscr = cfads / (intExp + mandAmort);
    const icr = ebitda / intExp;
    const lev = netDebt / ebitda;

    const brief = [
      `Analizza il merito creditizio e la sostenibilità del debito per la delibera di fido bancario.`,
      ``,
      `Dati economico-finanziari dell'esercizio:`,
      `- **EBITDA**: ${eur(ebitda)}`,
      `- **Flusso di Cassa Operativo Disponibile (CFADS)**: ${eur(cfads)}`,
      `- **Interessi Passivi Annui**: ${eur(intExp)}`,
      `- **Quota Capitale Annua in Scadenza (Ammortamento)**: ${eur(mandAmort)}`,
      `- **Debito Finanziario Netto**: ${eur(netDebt)}`,
      ``,
      'Tre domande, tre indicatori:',
      '',
      "- **DSCR**: la cassa disponibile basta a pagare tutto il servizio del debito dell'anno, interessi e quota capitale?",
      "- **ICR**: quante volte l'EBITDA copre gli interessi?",
      "- **Net leverage**: quanti anni di EBITDA servirebbero per ripagare il debito netto?",
      '',
      "Un DSCR sotto 1 vuol dire che l'azienda, da sola, non riesce a servire il debito quest'anno.",
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['METRICHE DI CREDITO E RATING BANCARIO'], { style: STILE_TITOLO }),
      riga('A3', ['Flussi & Debito', 'Valore (€)'], { style: STILE_TITOLO }),
      colonna('A4', [
        'EBITDA (€)',
        'CFADS (Cassa Operativa per Debito, €)',
        'Interessi Passivi Annui (€)',
        'Quota Capitale Annua (Ammortamento, €)',
        'Debito Finanziario Netto (€)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [ebitda, cfads, intExp, mandAmort, netDebt], { style: STILE_INPUT }),

      riga('A10', ['Indicatori di Copertura & Rischio', 'Risultato (x)'], { style: STILE_TITOLO }),
      colonna('A11', [
        'DSCR (Debt Service Coverage Ratio)',
        'ICR (Interest Coverage Ratio)',
        'Net Leverage (Net Debt / EBITDA)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_DSCR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_ICR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_LEV, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `In ${B_DSCR} il DSCR: cassa disponibile rapportata all'intero servizio del debito dell'anno.`,
        target: `Model!${B_DSCR}`,
        atteso: dscr,
        referenzia: [B_CFADS, B_INT_EXP, B_MAND_AMORT],
        senzaLiteral: [],
        skills: ['cred.ratios'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt: `In ${B_ICR} l'interest coverage ratio.`,
        target: `Model!${B_ICR}`,
        atteso: icr,
        referenzia: [B_EBITDA, B_INT_EXP],
        senzaLiteral: [],
        skills: ['cred.ratios'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: `In ${B_LEV} il net leverage.`,
        target: `Model!${B_LEV}`,
        atteso: lev,
        referenzia: [B_NET_DEBT, B_EBITDA],
        senzaLiteral: [],
        skills: ['cred.ratios'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M10-01-CREDITRATIOS',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: `Model!${B_DSCR}`,
      hints: [
        hint('H1', '=B5/(B6+B7)', 10, 'T1'),
        hint('H2', '=B4/B6', 10, 'T2'),
        hint('H3', '=B8/B4', 10, 'T3'),
      ],
    };
  },
});
