/**
 * M11 · 04 — Dati Mancanti: stima difendibile tramite benchmark di settore.
 *
 * Durante la due diligence capita frequentemente che il target non fornisca
 * il dettaglio degli ammortamenti (D&A) o del Capex di mantenimento.
 * L'analista deve effettuare una stima difendibile basata su benchmark di settore:
 *
 *   1. Stima D&A: calcolata applicando l'intensità media di ammortamento del settore
 *      (D&A Benchmark % sui Ricavi, es. 6.0%) al fatturato del target.
 *   2. EBITDA Stimato = EBIT Riportato + D&A Stimato.
 *   3. Free Cash Flow Proxy = EBITDA Stimato - Capex di Settore Stimato (es. 5.0% dei Ricavi).
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
const B_REVENUES = 'B4'; // Ricavi Target (dato)
const B_EBIT = 'B5'; // EBIT Riportato (dato)
const B_DA_BENCH = 'B6'; // Benchmark D&A % (6.0%) (dato)
const B_CAPEX_BENCH = 'B7'; // Benchmark Capex % (5.0%) (dato)

const B_EST_DA = 'B10'; // T1: D&A Stimato = B4 * B6
const B_EST_EBITDA = 'B11'; // T2: EBITDA Stimato = B5 + B10
const B_EST_FCF = 'B12'; // T3: FCF Proxy = B11 - (B4 * B7)

export default defineTemplate({
  id: 'M11-04-MISSINGDATA',
  module: 'M11',
  title: 'Dati mancanti: stima difendibile tramite benchmark settoriali',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['real.estimate'],
  prerequisites: ['M11-01-READCEE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const revenues = roundTo(triangular(r, 50_000_000, 70_000_000, 90_000_000), 1_000_000);
    const ebit = roundTo(revenues * 0.12, 500_000); // 12% EBIT margin
    const daBench = 0.06; // 6.0% dei ricavi
    const capexBench = 0.05; // 5.0% dei ricavi

    const estDa = revenues * daBench;
    const estEbitda = ebit + estDa;
    const estCapex = revenues * capexBench;
    const estFcf = estEbitda - estCapex;

    const brief = [
      `Nel teaser ricevuto dal sell-side advisor non è riportato il dettaglio degli ammortamenti (D&A).`,
      `Stima l'**EBITDA** e il **Free Cash Flow Proxy** applicando i benchmark storici di settore.`,
      ``,
      `Dati disponibili:`,
      `- **Ricavi del Target**: ${eur(revenues)}`,
      `- **EBIT Riportato**: ${eur(ebit)}`,
      `- **Benchmark Settoriale D&A (% sui Ricavi)**: ${pct(daBench)}`,
      `- **Benchmark Settoriale Capex (% sui Ricavi)**: ${pct(capexBench)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Stima l'ammontare degli **Ammortamenti (D&A) (€)** in \`${B_EST_DA}\`: \`=${B_REVENUES}*${B_DA_BENCH}\`.`,
      `2. Calcola l'**EBITDA Stimato (€)** in \`${B_EST_EBITDA}\`: \`=${B_EBIT}+${B_EST_DA}\`.`,
      `3. Calcola il **Free Cash Flow Proxy (€)** in \`${B_EST_FCF}\` (EBITDA stimato meno Capex stimato): \`=${B_EST_EBITDA}-(${B_REVENUES}*${B_CAPEX_BENCH})\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['STIMA DATI MANCANTI DA BENCHMARK'], { style: STILE_TITOLO }),
      riga('A3', ['Dati Target & Parametri di Settore', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Ricavi Target (€)',
        'EBIT Riportato (€)',
        'Benchmark Settore: D&A (% Ricavi)',
        'Benchmark Settore: Capex (% Ricavi)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [revenues, ebit], { style: STILE_INPUT }),
      colonna(B_DA_BENCH, [daBench, capexBench], { style: STILE_INPUT_PCT }),

      riga('A9', ['Stime Finanziarie Normalizzate', 'Risultato (€)'], { style: STILE_TITOLO }),
      colonna('A10', [
        'Ammortamenti (D&A) Stimati (€)',
        'EBITDA Normalizzato Stimato (€)',
        'Free Cash Flow Proxy Stimato (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_EST_DA, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_EST_EBITDA, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_EST_FCF, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Stima il D&A in ${B_EST_DA}: =${B_REVENUES}*${B_DA_BENCH}.`,
        target: `Model!${B_EST_DA}`,
        atteso: estDa,
        referenzia: [B_REVENUES, B_DA_BENCH],
        skills: ['real.estimate'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'EBITDA stimato in ${B_EST_EBITDA}: =${B_EBIT}+${B_EST_DA}.`,
        target: `Model!${B_EST_EBITDA}`,
        atteso: estEbitda,
        referenzia: [B_EBIT, B_EST_DA],
        skills: ['real.estimate'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il FCF proxy in ${B_EST_FCF}: =${B_EST_EBITDA}-(${B_REVENUES}*${B_CAPEX_BENCH}).`,
        target: `Model!${B_EST_FCF}`,
        atteso: estFcf,
        referenzia: [B_EST_EBITDA, B_REVENUES, B_CAPEX_BENCH],
        skills: ['real.estimate'],
      }),
    ];

    return {
      templateId: 'M11-04-MISSINGDATA',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B10 moltiplica i ricavi per il benchmark di D&A: =B4*B6.', 10, 'T1'),
        hint('H2', 'In B11 somma l\'EBIT e gli ammortamenti stimati: =B5+B10.', 10, 'T2'),
        hint('H3', 'In B12 sottrai il capex stimato (B4*B7) dall\'EBITDA stimato: =B11-(B4*B7).', 10, 'T3'),
      ],
    };
  },
});
