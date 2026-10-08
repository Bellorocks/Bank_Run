/**
 * M9 · 05 — Breakeven Synergies: calcolo delle sinergie minime per non diluire.
 *
 * Quando un'operazione M&A è diluitiva (a causa di un alto premio di controllo o
 * dell'emissione di molte nuove azioni), il management deve sapere quante sinergie
 * minime prima delle imposte (Pre-Tax Breakeven Synergies) sono necessarie per
 * evitare la diluizione dell'EPS (Accretion = 0%):
 *
 *   1. Utile Netto Pro-Forma Richiesto = Azioni Totali Pro-Forma × Standalone EPS Acquirer.
 *   2. Utile Netto Pro-Forma Base (senza sinergie) = Acquirer NI + Target NI - Financing Cost - PPA Amort.
 *   3. Gap di Utile Netto Post-Tax = Utile Netto Richiesto - Utile Netto Base.
 *   4. Sinergie Pre-Tax di Breakeven = Gap di Utile Netto Post-Tax / (1 - Aliquota Fiscale 24%).
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
const B_ACQ_EPS = 'B4'; // Standalone EPS (€) (dato)
const B_PF_SHARES = 'B5'; // Azioni Pro-Forma Totali (dato)
const B_BASE_PF_NI = 'B6'; // Utile Netto Pro-Forma Base (senza sinergie) (dato)
const B_TAX = 'B7'; // Aliquota fiscale (24%) (dato)

const B_REQ_NI = 'B10'; // T1: Utile Netto Richiesto = B4 * B5
const B_GAP_NI = 'B11'; // T2: Gap Utile Netto Post-Tax = B10 - B6
const B_BE_SYN = 'B12'; // T3: Breakeven Synergies Pre-Tax = B11 / (1 - B7)

export default defineTemplate({
  id: 'M9-05-BREAKEVENSYNERGIES',
  module: 'M9',
  title: 'Breakeven synergies: sinergie minime prima delle imposte',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['ma.breakeven'],
  prerequisites: ['M9-04-ACCRETIONDILUTION'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const acqEps = 4.50;
    const pfShares = 12_000_000;
    const reqNi = acqEps * pfShares; // 54.0M €

    // Utile base senza sinergie: 48M - 51M (quindi c'è un gap diluitivo di 3M-6M)
    const basePfNi = roundTo(triangular(r, 48_000_000, 50_000_000, 51_500_000), 500_000);
    const taxRate = 0.24;

    const gapNi = reqNi - basePfNi;
    const beSyn = gapNi / (1 - taxRate);

    const brief = [
      `L'operazione M&A proposta risulta attualmente diluitiva per gli azionisti dell'Acquirer.`,
      `Determina l'ammontare minimo di **Sinergie Pre-Tax di Breakeven** necessarie per raggiungere un'accretion esattamente pari a 0,0%.`,
      ``,
      `Dati di bilancio pro-forma:`,
      `- **EPS Standalone Acquirer (Target da preservare)**: ${eur(acqEps, 2)}`,
      `- **Numero Azioni Pro-Forma Post-Fusione**: ${pfShares.toLocaleString('it-IT')}`,
      `- **Utile Netto Pro-Forma Base (Senza Sinergie)**: ${eur(basePfNi)}`,
      `- **Aliquota Fiscale (IRES)**: ${pct(taxRate)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'**Utile Netto Pro-Forma Richiesto** in \`${B_REQ_NI}\` per mantenere l'EPS invariato: \`=${B_ACQ_EPS}*${B_PF_SHARES}\`.`,
      `2. Calcola il **Gap di Utile Netto Post-Tax** in \`${B_GAP_NI}\`: \`=${B_REQ_NI}-${B_BASE_PF_NI}\`.`,
      `3. Calcola le **Sinergie Pre-Tax di Breakeven (€)** in \`${B_BE_SYN}\`: \`=${B_GAP_NI}/(1-${B_TAX})\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['BREAKEVEN SYNERGIES ANALYSIS'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Pro-Forma & Fisco', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'EPS Standalone Acquirer Target (€)',
        'Azioni Totali Pro-Forma (Numero)',
        'Utile Netto Pro-Forma Base (Senza Sinergie, €)',
        'Aliquota Fiscale (IRES)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [acqEps, pfShares, basePfNi], { style: STILE_INPUT }),
      colonna(B_TAX, [taxRate], { style: STILE_INPUT_PCT }),

      riga('A9', ['Calcolo di Pareggio (Breakeven)', 'Risultato (€)'], { style: STILE_TITOLO }),
      colonna('A10', [
        'Utile Netto Pro-Forma Richiesto (€)',
        'Gap di Utile Netto Post-Tax (€)',
        'Sinergie Pre-Tax di Breakeven Necessarie (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_REQ_NI, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_GAP_NI, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_BE_SYN, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola l'Utile Netto Richiesto in ${B_REQ_NI}: =${B_ACQ_EPS}*${B_PF_SHARES}.`,
        target: `Model!${B_REQ_NI}`,
        atteso: reqNi,
        referenzia: [B_ACQ_EPS, B_PF_SHARES],
        skills: ['ma.breakeven'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola il Gap di Utile Netto in ${B_GAP_NI}: =${B_REQ_NI}-${B_BASE_PF_NI}.`,
        target: `Model!${B_GAP_NI}`,
        atteso: gapNi,
        referenzia: [B_REQ_NI, B_BASE_PF_NI],
        skills: ['ma.breakeven'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola le Sinergie Pre-Tax di Breakeven in ${B_BE_SYN}: =${B_GAP_NI}/(1-${B_TAX}).`,
        target: `Model!${B_BE_SYN}`,
        atteso: beSyn,
        referenzia: [B_GAP_NI, B_TAX],
        skills: ['ma.breakeven'],
      }),
    ];

    return {
      templateId: 'M9-05-BREAKEVENSYNERGIES',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B10 moltiplica il target EPS per il numero di azioni: =B4*B5.', 10, 'T1'),
        hint('H2', 'In B11 calcola la differenza: =B10-B6.', 10, 'T2'),
        hint('H3', 'In B12 gross-up del gap dividendolo per (1-B7): =B11/(1-B7).', 15, 'T3'),
      ],
    };
  },
});
