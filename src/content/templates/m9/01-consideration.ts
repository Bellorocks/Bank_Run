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

import { contentNumberLocale, tx } from '../../../i18n/content';
// Geometria fissa
const B_TGT_SHARES = 'B4'; // Azioni Target (dato)
const B_OFFER_PX = 'B5'; // Prezzo Offerta Target (€) (dato)
const B_ACQ_PX = 'B6'; // Prezzo Azione Acquirer (€) (dato)

const B_PCT_CASH = 'B9'; // % Cash (60%) (dato)
const B_PCT_STOCK = 'B10'; // % Stock (40%) (dato)

const B_TOT_PURCHASE = 'B13'; // T1: Equity Purchase Price = B4 * B5
const B_CASH_REQ = 'B14'; // T2: Cassa Necessaria = B13 * B9
const B_NEW_SHARES = 'B15'; // T3: Nuove Azioni Emesse = (B13 * B10) / B6
const B_EXCH_RATIO = 'B16'; // T4: Exchange ratio = B15 / B4

export default defineTemplate({
  id: 'M9-01-CONSIDERATION',
  module: 'M9',
  get title() {
    return tx('M9-01-CONSIDERATION.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['ma.consideration'],
  prerequisites: ['M4-10-PREZZOPERAZIONE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const tgtShares = roundTo(triangular(r, 4_000_000, 5_000_000, 6_000_000), 500_000);
    const offerPx = roundTo(triangular(r, 15, 25, 40), 0.25);
    const acqPx = roundTo(triangular(r, 30, 50, 80), 0.5);

    const pctCash = roundTo(triangular(r, 0.3, 0.6, 0.8), 0.05);
    const pctStock = 1 - pctCash;

    const totPurchase = tgtShares * offerPx;
    const cashReq = totPurchase * pctCash;
    const newShares = (totPurchase * pctStock) / acqPx;
    const exchRatio = newShares / tgtShares;

    const brief = [tx('M9-01-CONSIDERATION.2', { p0: tgtShares.toLocaleString(contentNumberLocale()), p1: eur(offerPx, 2), p2: eur(acqPx, 2), p3: pct(pctCash, 0), p4: pct(pctStock, 0) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M9-01-CONSIDERATION.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M9-01-CONSIDERATION.4'), tx('M9-01-CONSIDERATION.22')], { style: STILE_TITOLO }),
      colonna('A4', [
        tx('M9-01-CONSIDERATION.5'),
        tx('M9-01-CONSIDERATION.6'),
        tx('M9-01-CONSIDERATION.7'),
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [tgtShares, offerPx, acqPx], { style: STILE_INPUT }),

      riga('A8', [tx('M9-01-CONSIDERATION.8'), tx('M9-01-CONSIDERATION.9')], { style: STILE_TITOLO }),
      colonna('A9', [tx('M9-01-CONSIDERATION.10'), tx('M9-01-CONSIDERATION.11')], { style: STILE_ETICHETTA }),
      colonna('B9', [pctCash], { style: { ...STILE_INPUT_PCT, numFmt: '0%' } }),
      [{ ref: B_PCT_STOCK, content: `=1-${B_PCT_CASH}`, style: { ...STILE_FORMULA, numFmt: '0%' }, locked: true }],

      riga('A12', [tx('M9-01-CONSIDERATION.12'), tx('M9-01-CONSIDERATION.23')], { style: STILE_TITOLO }),
      colonna('A13', [
        tx('M9-01-CONSIDERATION.13'),
        tx('M9-01-CONSIDERATION.14'),
        tx('M9-01-CONSIDERATION.15'),
        tx('M9-01-CONSIDERATION.16'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_TOT_PURCHASE, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_CASH_REQ, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_NEW_SHARES, [null], { style: STILE_TOTALE, locked: false }),
      colonna(B_EXCH_RATIO, [null], { style: { ...STILE_FORMULA, numFmt: '0.0000' }, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M9-01-CONSIDERATION.17', { B_TOT_PURCHASE }),
        target: `Model!${B_TOT_PURCHASE}`,
        atteso: totPurchase,
        referenzia: [B_TGT_SHARES, B_OFFER_PX],
        senzaLiteral: [],
        skills: ['ma.consideration'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M9-01-CONSIDERATION.18', { B_CASH_REQ }),
        target: `Model!${B_CASH_REQ}`,
        atteso: cashReq,
        referenzia: [B_TOT_PURCHASE, B_PCT_CASH],
        senzaLiteral: [],
        skills: ['ma.consideration'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M9-01-CONSIDERATION.19', { B_NEW_SHARES }),
        target: `Model!${B_NEW_SHARES}`,
        atteso: newShares,
        referenzia: [B_TOT_PURCHASE, B_PCT_STOCK, B_ACQ_PX],
        senzaLiteral: [],
        skills: ['ma.consideration'],
        minKeystrokes: 14,
      }),
      taskFormula({
        id: 'T4',
        prompt: tx('M9-01-CONSIDERATION.20', { B_EXCH_RATIO }),
        target: `Model!${B_EXCH_RATIO}`,
        atteso: exchRatio,
        referenzia: [B_TGT_SHARES],
        senzaLiteral: [],
        skills: ['ma.consideration'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M9-01-CONSIDERATION',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!${B_TOT_PURCHASE}`,
      hints: [
        hint('H1', '=B4*B5', 10, 'T1'),
        hint('H2', '=B13*B9', 10, 'T2'),
        hint('H3', tx('M9-01-CONSIDERATION.21'), 15, 'T3'),
        hint('H4', tx('M9-01-CONSIDERATION.h4'), 10, 'T4'),
      ],
    };
  },
});
