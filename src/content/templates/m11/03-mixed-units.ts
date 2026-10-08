/**
 * M11 · 03 — Unità e Valute Miste: normalizzazione in euro assoluti.
 *
 * Nei modelli internazionali capita frequentemente di ricevere dati con unità
 * di misura eterogenee (es. Ricavi in k€, Costi Operativi in M€, Capex in USD $):
 *
 *   1. Ricavi espressi in k€ (migliaia) -> moltiplicare per 1.000 per ottenere €.
 *   2. Costi espressi in M€ (milioni) -> moltiplicare per 1.000.000 per ottenere €.
 *   3. Capex espressi in USD $ con tasso di cambio EUR/USD (es. 1.10) -> dividere per 1.10 per convertire in €.
 *   4. Free Cash Flow Operativo = Ricavi (€) - Costi (€) - Capex (€).
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  num,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_REV_KEUR = 'B4'; // Ricavi in k€ (dato)
const B_COST_MEUR = 'B5'; // Costi in M€ (dato)
const B_CAPEX_USD = 'B6'; // Capex in USD (dato)
const B_FX_RATE = 'B7'; // Tasso di cambio EUR/USD (1.10) (dato)

const B_REV_EUR = 'B10'; // T1: Ricavi in € = B4 * 1000
const B_COST_EUR = 'B11'; // T2: Costi in € = B5 * 1000000
const B_CAPEX_EUR = 'B12'; // T3: Capex in € = B6 / B7
const B_FCF_EUR = 'B13'; // Free Cash Flow = B10 - B11 - B12

export default defineTemplate({
  id: 'M11-03-MIXEDUNITS',
  module: 'M11',
  title: 'Unità e valute miste: normalizzazione k€, M€ e cambio valuta',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['real.units'],
  prerequisites: ['M11-02-DIRTYTABLES'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const revKEur = roundTo(triangular(r, 60_000, 80_000, 100_000), 1_000); // 80.000 k€ = 80M €
    const costMEur = roundTo(triangular(r, 45, 55, 65), 1); // 55 M€ = 55.000.000 €
    const capexUsd = 11_000_000; // $11.0M
    const fxRate = 1.10; // EUR/USD (1 € = 1.10 $)

    const revEur = revKEur * 1_000;
    const costEur = costMEur * 1_000_000;
    const capexEur = capexUsd / fxRate; // 10.0M €

    const brief = [
      `Normalizza i dati di budget espressi in diverse unità e valute in **Euro assoluti (€)**.`,
      ``,
      `Dati grezzi di input:`,
      `- **Ricavi Operativi**: ${num(revKEur)} k€ (migliaia di euro)`,
      `- **Costi Operativi**: ${num(costMEur)} M€ (milioni di euro)`,
      `- **Capex Globale**: $ ${num(capexUsd)} (in Dollari USA)`,
      `- **Tasso di Cambio EUR/USD**: ${num(fxRate, 2)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Converti i **Ricavi in Euro (€)** in \`${B_REV_EUR}\`: \`=${B_REV_KEUR}*1000\`.`,
      `2. Converti i **Costi in Euro (€)** in \`${B_COST_EUR}\`: \`=${B_COST_MEUR}*1000000\`.`,
      `3. Converti i **Capex in Euro (€)** in \`${B_CAPEX_EUR}\`: \`=${B_CAPEX_USD}/${B_FX_RATE}\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['NORMALIZZAZIONE UNITÀ & CAMBI VALUTA'], { style: STILE_TITOLO }),
      riga('A3', ['Dati Grezzi (Unità Eterogenee)', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Ricavi Operativi (k€)',
        'Costi Operativi (M€)',
        'Capex Globale (USD $)',
        'Tasso di Cambio (EUR/USD)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [revKEur, costMEur, capexUsd, fxRate], { style: STILE_INPUT }),

      riga('A9', ['Voci Normalizzate in Euro Assoluti (€)', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A10', [
        'Ricavi Normalizzati (€)',
        'Costi Normalizzati (€)',
        'Capex Normalizzato (€)',
        'Flusso di Cassa Operativo Netto (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_REV_EUR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_COST_EUR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_CAPEX_EUR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_FCF_EUR, ['=B10-B11-B12'], { style: STILE_TOTALE }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Converti i Ricavi in € in ${B_REV_EUR}: =${B_REV_KEUR}*1000.`,
        target: `Model!${B_REV_EUR}`,
        atteso: revEur,
        referenzia: [B_REV_KEUR],
        skills: ['real.units'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Converti i Costi in € in ${B_COST_EUR}: =${B_COST_MEUR}*1000000.`,
        target: `Model!${B_COST_EUR}`,
        atteso: costEur,
        referenzia: [B_COST_MEUR],
        skills: ['real.units'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Converti i Capex in € in ${B_CAPEX_EUR}: =${B_CAPEX_USD}/${B_FX_RATE}.`,
        target: `Model!${B_CAPEX_EUR}`,
        atteso: capexEur,
        referenzia: [B_CAPEX_USD, B_FX_RATE],
        skills: ['real.units'],
      }),
    ];

    return {
      templateId: 'M11-03-MIXEDUNITS',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B10 moltiplica i k€ per 1000: =B4*1000.', 10, 'T1'),
        hint('H2', 'In B11 moltiplica i M€ per 1.000.000: =B5*1000000.', 10, 'T2'),
        hint('H3', 'In B12 dividi i dollari per il tasso di cambio EUR/USD: =B6/B7.', 10, 'T3'),
      ],
    };
  },
});
