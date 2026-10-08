/**
 * M11 · 02 — Tabelle Mal Formattate: pulizia e aggregazione condizionale.
 *
 * Nei deal veri i dati arrivano spesso estratti male da gestionali o PDF:
 * righe con codici prodotto misti a righe di subtotale spurie (es. "SUBTOTALE REGIONE").
 *
 *   1. Usare `SUMIF` / `SUMIFS` per aggregare SOLO le righe di dettaglio operative,
 *      escludendo i subtotali (criterio `<>*SUBTOTALE*` o selezionando solo i codici "PROD-*").
 *   2. Calcolare i Ricavi Netti aggregando solo i prodotti reali.
 *   3. Calcolare i Costi Diretti aggregando solo i prodotti reali.
 *   4. Margine Lordo Reale = Ricavi Netti - Costi Diretti.
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
const B_TOT_REV = 'B14'; // T1: Ricavi con SUMIF = SUMIF(A5:A12, "PROD*", B5:B12)
const B_TOT_COST = 'B15'; // T2: Costi con SUMIF = SUMIF(A5:A12, "PROD*", C5:C12)
const B_GROSS_MARGIN = 'B16'; // T3: Margine Lordo = B14 - B15

export default defineTemplate({
  id: 'M11-02-DIRTYTABLES',
  module: 'M11',
  title: 'Tabelle mal formattate: pulizia ed esclusione di subtotali spuri',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['real.dirty-tables'],
  prerequisites: ['M0D-02-TESTOCOMENUMERO'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const rev1 = roundTo(triangular(r, 10_000_000, 12_000_000, 15_000_000), 500_000);
    const rev2 = roundTo(triangular(r, 8_000_000, 10_000_000, 12_000_000), 500_000);
    const rev3 = roundTo(triangular(r, 14_000_000, 16_000_000, 20_000_000), 500_000);

    const cost1 = roundTo(rev1 * 0.60, 250_000);
    const cost2 = roundTo(rev2 * 0.55, 250_000);
    const cost3 = roundTo(rev3 * 0.65, 250_000);

    const subRev12 = rev1 + rev2; // subtotale spurio inserito nel report
    const subCost12 = cost1 + cost2;

    const totRevClean = rev1 + rev2 + rev3;
    const totCostClean = cost1 + cost2 + cost3;
    const grossMargin = totRevClean - totCostClean;

    const brief = [
      `Hai ricevuto un dump grezzo da un ERP contenente righe di subtotale duplicate ("SUBTOTALE-NORD") che falsano la somma semplice.`,
      ``,
      `Tavola grezza:`,
      `- **PROD-01**: Ricavi ${eur(rev1)} | Costi ${eur(cost1)}`,
      `- **PROD-02**: Ricavi ${eur(rev2)} | Costi ${eur(cost2)}`,
      `- *SUBTOTALE-NORD*: Ricavi ${eur(subRev12)} | Costi ${eur(subCost12)} (Spurio!)`,
      `- **PROD-03**: Ricavi ${eur(rev3)} | Costi ${eur(cost3)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola i **Ricavi Totali Puliti (€)** in \`${B_TOT_REV}\` usando \`=SUMIF(A5:A8, "PROD*", B5:B8)\`.`,
      `2. Calcola i **Costi Totali Puliti (€)** in \`${B_TOT_COST}\` usando \`=SUMIF(A5:A8, "PROD*", C5:C8)\`.`,
      `3. Calcola il **Margine Lordo Effettivo (€)** in \`${B_GROSS_MARGIN}\`: \`=${B_TOT_REV}-${B_TOT_COST}\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['PULIZIA REPORT GREZZO ERP'], { style: STILE_TITOLO }),
      riga('A4', ['Codice Linea', 'Ricavi (€)', 'Costi Diretti (€)'], { style: STILE_TITOLO }),
      riga('A5', ['PROD-01 (Nord-Est)', rev1, cost1], { style: STILE_INPUT }),
      riga('A6', ['PROD-02 (Nord-Ovest)', rev2, cost2], { style: STILE_INPUT }),
      riga('A7', ['SUBTOTALE-NORD', subRev12, subCost12], { style: STILE_INPUT }),
      riga('A8', ['PROD-03 (Centro-Sud)', rev3, cost3], { style: STILE_INPUT }),

      riga('A13', ['Aggregati Depurati', 'Risultato (€)'], { style: STILE_TITOLO }),
      colonna('A14', [
        'Ricavi Totali Puliti (SUMIF PROD*)',
        'Costi Totali Puliti (SUMIF PROD*)',
        'Margine Lordo Effettivo',
      ], { style: STILE_ETICHETTA }),
      colonna(B_TOT_REV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_TOT_COST, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_GROSS_MARGIN, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola i Ricavi puliti in ${B_TOT_REV} con =SUMIF(A5:A8, "PROD*", B5:B8).`,
        target: `Model!${B_TOT_REV}`,
        atteso: totRevClean,
        skills: ['real.dirty-tables'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola i Costi puliti in ${B_TOT_COST} con =SUMIF(A5:A8, "PROD*", C5:C8).`,
        target: `Model!${B_TOT_COST}`,
        atteso: totCostClean,
        skills: ['real.dirty-tables'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il Margine Lordo in ${B_GROSS_MARGIN}: =${B_TOT_REV}-${B_TOT_COST}.`,
        target: `Model!${B_GROSS_MARGIN}`,
        atteso: grossMargin,
        referenzia: [B_TOT_REV, B_TOT_COST],
        skills: ['real.dirty-tables'],
      }),
    ];

    return {
      templateId: 'M11-02-DIRTYTABLES',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B14 filtra le righe che iniziano per PROD: =SUMIF(A5:A8, "PROD*", B5:B8).', 10, 'T1'),
        hint('H2', 'In B15 usa la stessa logica sui costi in colonna C: =SUMIF(A5:A8, "PROD*", C5:C8).', 10, 'T2'),
        hint('H3', 'In B16 sottrai i costi dai ricavi: =B14-B15.', 10, 'T3'),
      ],
    };
  },
});
