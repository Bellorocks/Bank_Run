/**
 * M8 · 07 — Value Creation Bridge: i motori della creazione di valore in un LBO.
 *
 * Il Value Creation Bridge scompone l'incremento di valore dell'equity
 * (ΔEquity = Equity Exit - Equity Entry) nei tre motori fondamentali del Private Equity:
 *
 *   1. Crescita dell'EBITDA (EBITDA Growth):
 *      Effetto = (EBITDA Exit - EBITDA Entry) × Multiplo Entry
 *      (Valore creato espandendo le dimensioni operative a multiplo costante).
 *
 *   2. Espansione dei Multipli (Multiple Expansion / Arbitrage):
 *      Effetto = EBITDA Exit × (Multiplo Exit - Multiplo Entry)
 *      (Valore creato rivendendo l'azienda a un multiplo di mercato più elevato).
 *
 *   3. Deleveraging (Rimborso del Debito / Cash Generation):
 *      Effetto = Debito Netto Entry - Debito Netto Exit
 *      (Valore trasferito dai creditori all'equity tramite la cassa generata).
 *
 * PROPRIETÀ ALGEBRICA FONDAMENTALE:
 *   EBITDA Growth + Multiple Expansion + Deleveraging ≡ ΔEquity Totale.
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
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// Geometria fissa
const B_EBITDA_ENTRY = 'B4'; // EBITDA all'ingresso (dato)
const B_EBITDA_EXIT = 'B5'; // EBITDA all'uscita (dato)
const B_MULT_ENTRY = 'B6'; // Multiplo EV/EBITDA all'ingresso (dato)
const B_MULT_EXIT = 'B7'; // Multiplo EV/EBITDA all'uscita (dato)
const B_ND_ENTRY = 'B8'; // Debito Netto all'ingresso (dato)
const B_ND_EXIT = 'B9'; // Debito Netto all'uscita (dato)

const B_EFF_GROWTH = 'B12'; // T1: Effetto EBITDA Growth = (B5-B4)*B6
const B_EFF_MULT = 'B13'; // T2: Effetto Multiple Expansion = B5*(B7-B6)
const B_EFF_DELEV = 'B14'; // T3: Effetto Deleveraging = B8-B9
const B_TOT_BRIDGE = 'B15'; // Totale Valore Creato = SUM(B12:B14)
const B_DELTA_EQ = 'B16'; // T4: ΔEquity calcolato direttamente, per riconciliare il bridge

export default defineTemplate({
  id: 'M8-07-VALUEBRIDGE',
  module: 'M8',
  get title() {
    return tx('M8-07-VALUEBRIDGE.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.value-bridge'],
  prerequisites: ['M8-06-RETURNSIRRMOIC'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitdaEntry = roundTo(triangular(r, 10_000_000, 14_000_000, 18_000_000), 500_000);
    const ebitdaExit = roundTo(ebitdaEntry * triangular(r, 1.30, 1.45, 1.65), 500_000);

    // Il multiplo d'uscita puo' anche scendere: la multiple contraction esiste.
    const multEntry = roundTo(triangular(r, 7, 8, 9.5), 0.5);
    const multExit = roundTo(multEntry + triangular(r, -1.5, 0.5, 2), 0.5);

    const ndEntry = roundTo(ebitdaEntry * triangular(r, 3.5, 4.25, 5), 500_000);
    const ndExit = roundTo(ebitdaExit * triangular(r, 1, 1.75, 2.5), 500_000);

    const effGrowth = (ebitdaExit - ebitdaEntry) * multEntry;
    const effMult = ebitdaExit * (multExit - multEntry);
    const effDelev = ndEntry - ndExit;
    const deltaEquity = ebitdaExit * multExit - ndExit - (ebitdaEntry * multEntry - ndEntry);

    const brief = [tx('M8-07-VALUEBRIDGE.2', { p0: eur(ebitdaEntry), p1: eur(ebitdaExit), p2: multiplo(multEntry), p3: multiplo(multExit), p4: eur(ndEntry), p5: eur(ndExit) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M8-07-VALUEBRIDGE.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M8-07-VALUEBRIDGE.4'), tx('M8-07-VALUEBRIDGE.23')], { style: STILE_TITOLO }),
      colonna('A4', [
        tx('M8-07-VALUEBRIDGE.5'),
        tx('M8-07-VALUEBRIDGE.6'),
        tx('M8-07-VALUEBRIDGE.7'),
        tx('M8-07-VALUEBRIDGE.8'),
        tx('M8-07-VALUEBRIDGE.9'),
        tx('M8-07-VALUEBRIDGE.10'),
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [ebitdaEntry, ebitdaExit], { style: STILE_INPUT }),
      colonna(B_MULT_ENTRY, [multEntry, multExit], { style: STILE_INPUT_MULTIPLO }),
      colonna(B_ND_ENTRY, [ndEntry, ndExit], { style: STILE_INPUT }),

      riga('A11', [tx('M8-07-VALUEBRIDGE.11'), tx('M8-07-VALUEBRIDGE.12')], { style: STILE_TITOLO }),
      colonna('A12', [
        tx('M8-07-VALUEBRIDGE.13'),
        tx('M8-07-VALUEBRIDGE.14'),
        tx('M8-07-VALUEBRIDGE.15'),
        tx('M8-07-VALUEBRIDGE.16'),
        tx('M8-07-VALUEBRIDGE.17'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_EFF_GROWTH, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_EFF_MULT, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_EFF_DELEV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_TOT_BRIDGE, ['=SUM(B12:B14)'], { style: STILE_TOTALE }),
      colonna(B_DELTA_EQ, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M8-07-VALUEBRIDGE.18', { B_EFF_GROWTH }),
        target: `Model!${B_EFF_GROWTH}`,
        atteso: effGrowth,
        referenzia: [B_EBITDA_EXIT, B_EBITDA_ENTRY, B_MULT_ENTRY],
        senzaLiteral: [],
        skills: ['lbo.value-bridge'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M8-07-VALUEBRIDGE.19', { B_EFF_MULT }),
        target: `Model!${B_EFF_MULT}`,
        atteso: effMult,
        referenzia: [B_EBITDA_EXIT, B_MULT_EXIT, B_MULT_ENTRY],
        senzaLiteral: [],
        skills: ['lbo.value-bridge'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M8-07-VALUEBRIDGE.20', { B_EFF_DELEV }),
        target: `Model!${B_EFF_DELEV}`,
        atteso: effDelev,
        referenzia: [B_ND_ENTRY, B_ND_EXIT],
        senzaLiteral: [],
        skills: ['lbo.value-bridge'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T4',
        prompt:
          tx('M8-07-VALUEBRIDGE.21', { B_DELTA_EQ }),
        target: `Model!${B_DELTA_EQ}`,
        atteso: deltaEquity,
        referenzia: [B_EBITDA_ENTRY, B_EBITDA_EXIT, B_MULT_ENTRY, B_MULT_EXIT, B_ND_ENTRY, B_ND_EXIT],
        senzaLiteral: [],
        skills: ['lbo.value-bridge'],
        minKeystrokes: 22,
      }),
    ];

    return {
      templateId: 'M8-07-VALUEBRIDGE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_EFF_GROWTH}`,
      hints: [
        hint('H1', '=(B5-B4)*B6', 10, 'T1'),
        hint('H2', '=B5*(B7-B6)', 10, 'T2'),
        hint('H3', tx('M8-07-VALUEBRIDGE.22'), 10, 'T3'),
        hint('H4', '=(B5*B7-B9)-(B4*B6-B8)', 15, 'T4'),
      ],
    };
  },
});
