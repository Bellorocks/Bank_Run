/**
 * M9 · 04 — Accretion / Dilution: utile pro-forma e variazione dell'EPS.
 *
 * L'analisi di Accretion/Dilution misura l'effetto dell'operazione di M&A
 * sull'Utile per Azione (EPS) dell'acquirente:
 *
 *   1. Utile Netto Pro-Forma =
 *      Utile Netto Acquirer
 *      + Utile Netto Target
 *      + Sinergie After-Tax
 *      - Oneri Finanziari After-Tax (interessi su nuovo debito / interessi persi su cassa)
 *      - Ammortamenti PPA After-Tax.
 *
 *   2. Azioni Totali Pro-Forma = Azioni Esistenti Acquirer + Nuove Azioni Emesse per il deal.
 *   3. EPS Pro-Forma = Utile Netto Pro-Forma / Azioni Totali Pro-Forma.
 *   4. Accretion / (Dilution) % = (EPS Pro-Forma / Standalone EPS Acquirer) - 1.
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

import { contentNumberLocale, tx } from '../../../i18n/content';
// Geometria fissa
const B_ACQ_NI = 'B4'; // Utile Netto Acquirer (dato)
const B_ACQ_EPS = 'B6'; // Standalone EPS = B4 / B5 (formula)

const B_TGT_NI = 'B8'; // Utile Netto Target (dato)
const B_SYN_AT = 'B9'; // Sinergie After-Tax (dato)
const B_FIN_AT = 'B10'; // Costo Finanziamento After-Tax (dato)
const B_PPA_AT = 'B11'; // Ammortamento PPA After-Tax (dato)

const B_PF_NI = 'B15'; // T1: Pro-Forma Net Income = B4 + B8 + B9 - B10 - B11
const B_PF_SHARES = 'B16'; // Pro-Forma Shares = B5 + B12 (formula)
const B_PF_EPS = 'B17'; // T2: Pro-Forma EPS = B15 / B16
const B_ACCRETION = 'B18'; // T3: Accretion / (Dilution) % = (B17 / B6) - 1

export default defineTemplate({
  id: 'M9-04-ACCRETIONDILUTION',
  module: 'M9',
  get title() {
    return tx('M9-04-ACCRETIONDILUTION.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['ma.accretion'],
  prerequisites: ['M9-02-SYNERGIES', 'M9-03-PPAGOODWILL'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const acqNi = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 1_000_000);
    const acqShares = roundTo(triangular(r, 8_000_000, 10_000_000, 12_000_000), 100_000);
    const acqEps = acqNi / acqShares;

    const tgtNi = roundTo(triangular(r, 12_000_000, 15_000_000, 18_000_000), 500_000);
    const synAt = roundTo(triangular(r, 3_000_000, 4_500_000, 6_000_000), 250_000);
    const finAt = roundTo(triangular(r, 2_000_000, 3_000_000, 4_000_000), 250_000);
    const ppaAt = roundTo(triangular(r, 1_000_000, 1_500_000, 2_000_000), 250_000);
    // Abbastanza variabile da produrre sia accrescimento sia diluizione.
    const newShares = roundTo(acqShares * triangular(r, 0.1, 0.25, 0.45), 50_000);

    const pfNi = acqNi + tgtNi + synAt - finAt - ppaAt;
    const pfShares = acqShares + newShares;
    const pfEps = pfNi / pfShares;
    const accretionPct = (pfEps / acqEps) - 1;

    const brief = [tx('M9-04-ACCRETIONDILUTION.2', { p0: eur(acqNi), p1: acqShares.toLocaleString(contentNumberLocale()), p2: eur(acqEps, 2), p3: eur(tgtNi), p4: eur(synAt), p5: eur(finAt), p6: eur(ppaAt), p7: newShares.toLocaleString(contentNumberLocale()) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M9-04-ACCRETIONDILUTION.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M9-04-ACCRETIONDILUTION.4'), tx('M9-04-ACCRETIONDILUTION.23')], { style: STILE_TITOLO }),
      colonna('A4', [
        tx('M9-04-ACCRETIONDILUTION.5'),
        tx('M9-04-ACCRETIONDILUTION.6'),
        tx('M9-04-ACCRETIONDILUTION.7'),
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [acqNi, acqShares], { style: STILE_INPUT }),
      colonna(B_ACQ_EPS, ['=B4/B5'], { style: STILE_FORMULA }),

      riga('A7', [tx('M9-04-ACCRETIONDILUTION.8'), tx('M9-04-ACCRETIONDILUTION.9')], { style: STILE_TITOLO }),
      colonna('A8', [
        tx('M9-04-ACCRETIONDILUTION.10'),
        tx('M9-04-ACCRETIONDILUTION.11'),
        tx('M9-04-ACCRETIONDILUTION.12'),
        tx('M9-04-ACCRETIONDILUTION.13'),
        tx('M9-04-ACCRETIONDILUTION.14'),
      ], { style: STILE_ETICHETTA }),
      colonna('B8', [tgtNi, synAt, finAt, ppaAt, newShares], { style: STILE_INPUT }),

      riga('A14', [tx('M9-04-ACCRETIONDILUTION.15'), tx('M9-04-ACCRETIONDILUTION.24')], { style: STILE_TITOLO }),
      colonna('A15', [
        tx('M9-04-ACCRETIONDILUTION.16'),
        tx('M9-04-ACCRETIONDILUTION.17'),
        tx('M9-04-ACCRETIONDILUTION.18'),
        tx('M9-04-ACCRETIONDILUTION.19'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_PF_NI, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_PF_SHARES, ['=B5+B12'], { style: STILE_FORMULA }),
      colonna(B_PF_EPS, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_ACCRETION, [null], { style: { ...STILE_TOTALE, numFmt: '0.0%' }, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M9-04-ACCRETIONDILUTION.20', { B_PF_NI }),
        target: `Model!${B_PF_NI}`,
        atteso: pfNi,
        referenzia: [B_ACQ_NI, B_TGT_NI, B_SYN_AT, B_FIN_AT, B_PPA_AT],
        senzaLiteral: [],
        skills: ['ma.accretion'],
        minKeystrokes: 18,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M9-04-ACCRETIONDILUTION.21', { B_PF_EPS }),
        target: `Model!${B_PF_EPS}`,
        atteso: pfEps,
        referenzia: [B_PF_NI, B_PF_SHARES],
        senzaLiteral: [],
        skills: ['ma.accretion'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M9-04-ACCRETIONDILUTION.22', { B_ACCRETION }),
        target: `Model!${B_ACCRETION}`,
        atteso: accretionPct,
        referenzia: [B_PF_EPS, B_ACQ_EPS],
        senzaLiteral: [1],
        skills: ['ma.accretion'],
        minKeystrokes: 10,
      }),
    ];

    return {
      templateId: 'M9-04-ACCRETIONDILUTION',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_PF_NI}`,
      hints: [
        hint('H1', '=B4+B8+B9-B10-B11', 10, 'T1'),
        hint('H2', '=B15/B16', 10, 'T2'),
        hint('H3', '=B17/B6-1', 10, 'T3'),
      ],
    };
  },
});
