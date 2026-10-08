/**
 * M10 · 05 — Rifinanziamento: Maturity Wall e sensitivity sui tassi. [COMBO]
 *
 * Livello conclusivo del modulo Credito. Affronta la gestione del rischio
 * di rifinanziamento (Refinancing Risk) e del "Maturity Wall":
 *
 *   1. Maturity Wall all'Anno 4 = Scadenza contemporanea di Term Loan B + Senior Notes.
 *   2. Importo Totale da Rifinanziare = Somma delle tranche in scadenza all'Anno 4.
 *   3. Nuovo Tasso di Rifinanziamento di Mercato (es. Benchmark Rate + Nuovo Spread Creditizio).
 *   4. Nuovi Oneri Finanziari Annui Post-Rifinanziamento = Importo Rifinanziato × Nuovo Tasso.
 *   5. Variazione Annua degli Oneri Finanziari (Delta Interessi) = Nuovi Interessi - Vecchi Interessi.
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
const B_TLB_DUE = 'B4'; // Term Loan B in scadenza Y4 (dato)
const B_NOTES_DUE = 'B5'; // Senior Notes in scadenza Y4 (dato)
const B_OLD_RATE = 'B6'; // Vecchio tasso medio (5.0%) (dato)

const B_NEW_BENCH = 'B9'; // Tasso Benchmark di mercato (3.5%) (dato)
const B_NEW_SPREAD = 'B10'; // Nuovo Credit Spread (3.5%) (dato)

const B_TOT_WALL = 'B13'; // T1: Maturity Wall = B4 + B5
const B_NEW_INT = 'B14'; // T2: Nuovi Interessi = B13 * (B9 + B10)
const B_DELTA_INT = 'B15'; // T3: Delta Interessi = B14 - (B13 * B6)

export default defineTemplate({
  id: 'M10-05-REFINANCING',
  module: 'M10',
  title: 'Rifinanziamento: maturity wall e sensitivity ai tassi [COMBO]',
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['cred.refinancing'],
  prerequisites: ['M10-03-AMORTIZATION'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const tlbDue = roundTo(triangular(r, 30_000_000, 40_000_000, 50_000_000), 1_000_000);
    const notesDue = roundTo(triangular(r, 20_000_000, 30_000_000, 40_000_000), 1_000_000);
    const oldRate = 0.05; // 5.0%

    const newBench = 0.035; // 3.5%
    const newSpread = 0.035; // 3.5% (totale nuovo tasso 7.0%)
    const newTotalRate = newBench + newSpread;

    const totWall = tlbDue + notesDue;
    const newInt = totWall * newTotalRate;
    const oldInt = totWall * oldRate;
    const deltaInt = newInt - oldInt;

    const brief = [
      `La società si trova ad affrontare un **Maturity Wall** all'Anno 4 e deve pianificare il rifinanziamento integrale sul mercato dei capitali.`,
      ``,
      `Tranche di debito in scadenza:`,
      `- **Term Loan B**: ${eur(tlbDue)}`,
      `- **Senior Notes Obbligazionarie**: ${eur(notesDue)}`,
      `- **Costo Medio del Debito Storico**: ${pct(oldRate)}`,
      ``,
      `Condizioni correnti di mercato per la nuova emissione:`,
      `- **Tasso Benchmark (Euribor / Swap)**: ${pct(newBench)}`,
      `- **Credit Spread Richiesto dagli Investitori**: ${pct(newSpread)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'**Importo Totale del Maturity Wall da Rifinanziare (€)** in \`${B_TOT_WALL}\`: \`=${B_TLB_DUE}+${B_NOTES_DUE}\`.`,
      `2. Calcola i **Nuovi Oneri Finanziari Annui Post-Rifinanziamento (€)** in \`${B_NEW_INT}\`: \`=${B_TOT_WALL}*(${B_NEW_BENCH}+${B_NEW_SPREAD})\`.`,
      `3. Calcola il **Differenziale Annuo di Costi Finanziari (Delta Interessi, €)** in \`${B_DELTA_INT}\`: \`=${B_NEW_INT}-(${B_TOT_WALL}*${B_OLD_RATE})\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['PIANIFICAZIONE RIFINANZIAMENTO (MATURITY WALL) [COMBO]'], { style: STILE_TITOLO }),
      riga('A3', ['Debito in Scadenza all\'Anno 4', 'Importo (€) / Tasso'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Term Loan B in Scadenza (€)',
        'Senior Notes in Scadenza (€)',
        'Costo Medio Storico del Debito (%)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [tlbDue, notesDue], { style: STILE_INPUT }),
      colonna(B_OLD_RATE, [oldRate], { style: STILE_INPUT_PCT }),

      riga('A8', ['Nuove Condizioni di Mercato', 'Tasso (%)'], { style: STILE_TITOLO }),
      colonna('A9', [
        'Tasso Benchmark di Mercato (%)',
        'Credit Spread Emittente (%)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_NEW_BENCH, [newBench, newSpread], { style: STILE_INPUT_PCT }),

      riga('A12', ['Impatto Finanziario del Rifinanziamento', 'Risultato (€)'], { style: STILE_TITOLO }),
      colonna('A13', [
        'Totale Debito da Rifinanziare (Maturity Wall, €)',
        'Nuovi Oneri Finanziari Annui (€)',
        'Delta Annuo Oneri Finanziari (Extra Costo, €)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_TOT_WALL, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_NEW_INT, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_DELTA_INT, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il Maturity Wall in ${B_TOT_WALL}: =${B_TLB_DUE}+${B_NOTES_DUE}.`,
        target: `Model!${B_TOT_WALL}`,
        atteso: totWall,
        referenzia: [B_TLB_DUE, B_NOTES_DUE],
        skills: ['cred.refinancing'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola i Nuovi Oneri Finanziari in ${B_NEW_INT}: =${B_TOT_WALL}*(${B_NEW_BENCH}+${B_NEW_SPREAD}).`,
        target: `Model!${B_NEW_INT}`,
        atteso: newInt,
        referenzia: [B_TOT_WALL, B_NEW_BENCH, B_NEW_SPREAD],
        skills: ['cred.refinancing'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il Delta Interessi in ${B_DELTA_INT}: =${B_NEW_INT}-(${B_TOT_WALL}*${B_OLD_RATE}).`,
        target: `Model!${B_DELTA_INT}`,
        atteso: deltaInt,
        referenzia: [B_NEW_INT, B_TOT_WALL, B_OLD_RATE],
        skills: ['cred.refinancing'],
      }),
    ];

    return {
      templateId: 'M10-05-REFINANCING',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 25 }),
      hints: [
        hint('H1', 'In B13 somma le due tranche in scadenza: =B4+B5.', 10, 'T1'),
        hint('H2', 'In B14 moltiplica il totale da rifinanziare per la somma dei nuovi tassi: =B13*(B9+B10).', 10, 'T2'),
        hint('H3', 'In B15 sottrai i vecchi interessi da quelli nuovi: =B14-(B13*B6).', 10, 'T3'),
      ],
    };
  },
});
