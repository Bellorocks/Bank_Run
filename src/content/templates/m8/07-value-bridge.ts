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

export default defineTemplate({
  id: 'M8-07-VALUEBRIDGE',
  module: 'M8',
  title: 'Value creation bridge: scomposizione di EBITDA, multipli e deleveraging',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.value-bridge'],
  prerequisites: ['M8-06-RETURNSIRRMOIC'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitdaEntry = roundTo(triangular(r, 10_000_000, 14_000_000, 18_000_000), 500_000);
    const ebitdaExit = roundTo(ebitdaEntry * triangular(r, 1.30, 1.45, 1.65), 500_000);

    const multEntry = 8.0;
    const multExit = 9.5;

    const ndEntry = roundTo(ebitdaEntry * 4.0, 500_000);
    const ndExit = roundTo(ebitdaExit * 1.5, 500_000);

    const effGrowth = (ebitdaExit - ebitdaEntry) * multEntry;
    const effMult = ebitdaExit * (multExit - multEntry);
    const effDelev = ndEntry - ndExit;

    const brief = [
      `Costruisci il **Value Creation Bridge** per spiegare agli investitori le origini del rendimento LBO.`,
      ``,
      `Parametri di bilancio Entry vs Exit:`,
      `- **EBITDA**: da ${eur(ebitdaEntry)} (Entry) a ${eur(ebitdaExit)} (Exit)`,
      `- **Multiplo EV/EBITDA**: da ${multiplo(multEntry)} (Entry) a ${multiplo(multExit)} (Exit)`,
      `- **Debito Netto**: ridotto da ${eur(ndEntry)} (Entry) a ${eur(ndExit)} (Exit)`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'effetto **EBITDA Growth** in \`${B_EFF_GROWTH}\`: \`=(${B_EBITDA_EXIT}-${B_EBITDA_ENTRY})*${B_MULT_ENTRY}\`.`,
      `2. Calcola l'effetto **Multiple Expansion** in \`${B_EFF_MULT}\`: \`=${B_EBITDA_EXIT}*(${B_MULT_EXIT}-${B_MULT_ENTRY})\`.`,
      `3. Calcola l'effetto **Deleveraging** in \`${B_EFF_DELEV}\`: \`=${B_ND_ENTRY}-${B_ND_EXIT}\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['VALUE CREATION BRIDGE LBO'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Transazione', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'EBITDA all\'Ingresso (€)',
        'EBITDA all\'Uscita (€)',
        'Multiplo EV/EBITDA Entry (x)',
        'Multiplo EV/EBITDA Exit (x)',
        'Debito Netto all\'Ingresso (€)',
        'Debito Netto all\'Uscita (€)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [ebitdaEntry, ebitdaExit], { style: STILE_INPUT }),
      colonna(B_MULT_ENTRY, [multEntry, multExit], { style: STILE_INPUT_MULTIPLO }),
      colonna(B_ND_ENTRY, [ndEntry, ndExit], { style: STILE_INPUT }),

      riga('A11', ['Componenti Value Creation', 'Impatto (€)'], { style: STILE_TITOLO }),
      colonna('A12', [
        '1. EBITDA Growth Effect',
        '2. Multiple Expansion Effect',
        '3. Deleveraging Effect',
        'TOTALE VALORE CREATO (ΔEquity)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_EFF_GROWTH, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_EFF_MULT, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_EFF_DELEV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_TOT_BRIDGE, ['=SUM(B12:B14)'], { style: STILE_TOTALE }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il contributo dell'EBITDA Growth in ${B_EFF_GROWTH}: =(${B_EBITDA_EXIT}-${B_EBITDA_ENTRY})*${B_MULT_ENTRY}.`,
        target: `Model!${B_EFF_GROWTH}`,
        atteso: effGrowth,
        referenzia: [B_EBITDA_EXIT, B_EBITDA_ENTRY, B_MULT_ENTRY],
        skills: ['lbo.value-bridge'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola il contributo della Multiple Expansion in ${B_EFF_MULT}: =${B_EBITDA_EXIT}*(${B_MULT_EXIT}-${B_MULT_ENTRY}).`,
        target: `Model!${B_EFF_MULT}`,
        atteso: effMult,
        referenzia: [B_EBITDA_EXIT, B_MULT_EXIT, B_MULT_ENTRY],
        skills: ['lbo.value-bridge'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il contributo del Deleveraging in ${B_EFF_DELEV}: =${B_ND_ENTRY}-${B_ND_EXIT}.`,
        target: `Model!${B_EFF_DELEV}`,
        atteso: effDelev,
        referenzia: [B_ND_ENTRY, B_ND_EXIT],
        skills: ['lbo.value-bridge'],
      }),
    ];

    return {
      templateId: 'M8-07-VALUEBRIDGE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B12 calcola: =(B5-B4)*B6.', 10, 'T1'),
        hint('H2', 'In B13 calcola: =B5*(B7-B6).', 10, 'T2'),
        hint('H3', 'In B14 calcola la riduzione del debito: =B8-B9.', 10, 'T3'),
      ],
    };
  },
});
