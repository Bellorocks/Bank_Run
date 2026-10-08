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
    const cfads = roundTo(ebitda * 0.65, 500_000);
    const intExp = roundTo(ebitda * 0.15, 100_000);
    const mandAmort = roundTo(ebitda * 0.25, 100_000);
    const netDebt = roundTo(ebitda * 3.0, 500_000);

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
      `### I tuoi compiti:`,
      `1. Calcola il **Debt Service Coverage Ratio (DSCR)** in \`${B_DSCR}\`: \`=${B_CFADS}/(${B_INT_EXP}+${B_MAND_AMORT})\`.`,
      `2. Calcola l'**Interest Coverage Ratio (ICR)** in \`${B_ICR}\`: \`=${B_EBITDA}/${B_INT_EXP}\`.`,
      `3. Calcola il **Net Leverage Ratio (x)** in \`${B_LEV}\`: \`=${B_NET_DEBT}/${B_EBITDA}\`.`,
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
        prompt: `Calcola il DSCR in ${B_DSCR}: =${B_CFADS}/(${B_INT_EXP}+${B_MAND_AMORT}).`,
        target: `Model!${B_DSCR}`,
        atteso: dscr,
        referenzia: [B_CFADS, B_INT_EXP, B_MAND_AMORT],
        skills: ['cred.ratios'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'ICR in ${B_ICR}: =${B_EBITDA}/${B_INT_EXP}.`,
        target: `Model!${B_ICR}`,
        atteso: icr,
        referenzia: [B_EBITDA, B_INT_EXP],
        skills: ['cred.ratios'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il Net Leverage in ${B_LEV}: =${B_NET_DEBT}/${B_EBITDA}.`,
        target: `Model!${B_LEV}`,
        atteso: lev,
        referenzia: [B_NET_DEBT, B_EBITDA],
        skills: ['cred.ratios'],
      }),
    ];

    return {
      templateId: 'M10-01-CREDITRATIOS',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B11 dividi la cassa operativa per la somma di interessi e quota capitale: =B5/(B6+B7).', 10, 'T1'),
        hint('H2', 'In B12 dividi l\'EBITDA per gli interessi: =B4/B6.', 10, 'T2'),
        hint('H3', 'In B13 dividi il debito netto per l\'EBITDA: =B8/B4.', 10, 'T3'),
      ],
    };
  },
});
