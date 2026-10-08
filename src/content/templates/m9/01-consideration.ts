/**
 * M9 · 01 — Consideration: cash, stock o mix e calcolo dell'exchange ratio.
 *
 * In una transazione di fusione o acquisizione (M&A), la struttura del corrispettivo
 * (Consideration Structure) determina la suddivisione tra cassa e azioni:
 *
 *   1. Equity Purchase Price = Azioni Target × Prezzo di Offerta per Azione.
 *   2. Quota Cash (es. 60%): cassa necessaria finanziata da liquidità o debito.
 *   3. Quota Stock (es. 40%): pagata emettendo nuove azioni dell'Acquirer.
 *   4. Nuove Azioni Emesse = (Equity Purchase Price × % Stock) / Prezzo Azione Acquirer.
 *   5. Exchange Ratio = Prezzo di Offerta Target / Prezzo Azione Acquirer.
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
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_TGT_SHARES = 'B4'; // Azioni Target (dato)
const B_OFFER_PX = 'B5'; // Prezzo Offerta Target (€) (dato)
const B_ACQ_PX = 'B6'; // Prezzo Azione Acquirer (€) (dato)

const B_PCT_CASH = 'B9'; // % Cash (60%) (dato)
const B_PCT_STOCK = 'B10'; // % Stock (40%) (dato)

const B_TOT_PURCHASE = 'B13'; // T1: Equity Purchase Price = B4 * B5
const B_CASH_REQ = 'B14'; // T2: Cassa Necessaria = B13 * B9
const B_NEW_SHARES = 'B15'; // T3: Nuove Azioni Emesse = (B13 * B10) / B6

export default defineTemplate({
  id: 'M9-01-CONSIDERATION',
  module: 'M9',
  title: 'Consideration: cash, stock o mix e nuove azioni emesse',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['ma.consideration'],
  prerequisites: ['M4-10-PREZZOPERAZIONE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const tgtShares = roundTo(triangular(r, 4_000_000, 5_000_000, 6_000_000), 500_000);
    const offerPx = 25.0; // €25 per azione target
    const acqPx = 50.0; // €50 per azione acquirer

    const pctCash = 0.60;
    const pctStock = 0.40;

    const totPurchase = tgtShares * offerPx;
    const cashReq = totPurchase * pctCash;
    const newShares = (totPurchase * pctStock) / acqPx;

    const brief = [
      `Struttura il corrispettivo di acquisizione (Consideration) per l'OPA amichevole su **Target Spa**.`,
      ``,
      `Dati dell'offerta:`,
      `- **Numero Azioni Target**: ${tgtShares.toLocaleString('it-IT')}`,
      `- **Prezzo di Offerta Target**: ${eur(offerPx, 2)}`,
      `- **Prezzo Corrente Azione Acquirer**: ${eur(acqPx, 2)}`,
      `- **Struttura Corrispettivo**: ${pct(pctCash)} Cash / ${pct(pctStock)} Stock`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola il **Controvalore Totale di Acquisto (Equity Purchase Price)** in \`${B_TOT_PURCHASE}\`: \`=${B_TGT_SHARES}*${B_OFFER_PX}\`.`,
      `2. Calcola la **Cassa Necessaria (Cash Consideration)** in \`${B_CASH_REQ}\`: \`=${B_TOT_PURCHASE}*${B_PCT_CASH}\`.`,
      `3. Calcola il **Numero di Nuove Azioni Acquirer da Emettere** in \`${B_NEW_SHARES}\`: \`=(${B_TOT_PURCHASE}*${B_PCT_STOCK})/${B_ACQ_PX}\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['STRUTTURA DEL CORRISPETTIVO (M&A CONSIDERATION)'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Offerta', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Numero Azioni Target in Circolazione',
        'Prezzo di Offerta per Azione Target (€)',
        'Prezzo per Azione Acquirer (€)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [tgtShares, offerPx, acqPx], { style: STILE_INPUT }),

      riga('A8', ['Mix di Finanziamento', 'Quota %'], { style: STILE_TITOLO }),
      colonna('A9', ['Quota Cash (%)', 'Quota Stock (%)'], { style: STILE_ETICHETTA }),
      colonna('B9', [pctCash, pctStock], { style: STILE_INPUT_PCT }),

      riga('A12', ['Esito della Strutturazione', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A13', [
        'Equity Purchase Price Totale (€)',
        'Cassa Necessaria (Cash Consideration, €)',
        'Nuove Azioni Acquirer da Emettere (Numero)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_TOT_PURCHASE, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_CASH_REQ, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_NEW_SHARES, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il Purchase Price Totale in ${B_TOT_PURCHASE}: =${B_TGT_SHARES}*${B_OFFER_PX}.`,
        target: `Model!${B_TOT_PURCHASE}`,
        atteso: totPurchase,
        referenzia: [B_TGT_SHARES, B_OFFER_PX],
        skills: ['ma.consideration'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola la Cassa Necessaria in ${B_CASH_REQ}: =${B_TOT_PURCHASE}*${B_PCT_CASH}.`,
        target: `Model!${B_CASH_REQ}`,
        atteso: cashReq,
        referenzia: [B_TOT_PURCHASE, B_PCT_CASH],
        skills: ['ma.consideration'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola le Nuove Azioni da Emettere in ${B_NEW_SHARES}: =(${B_TOT_PURCHASE}*${B_PCT_STOCK})/${B_ACQ_PX}.`,
        target: `Model!${B_NEW_SHARES}`,
        atteso: newShares,
        referenzia: [B_TOT_PURCHASE, B_PCT_STOCK, B_ACQ_PX],
        skills: ['ma.consideration'],
      }),
    ];

    return {
      templateId: 'M9-01-CONSIDERATION',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B13 moltiplica le azioni per il prezzo di offerta: =B4*B5.', 10, 'T1'),
        hint('H2', 'In B14 calcola la parte in contanti: =B13*B9.', 10, 'T2'),
        hint('H3', 'In B15 calcola il valore della parte azionaria e dividilo per il prezzo azione dell\'acquirente: =(B13*B10)/B6.', 15, 'T3'),
      ],
    };
  },
});
