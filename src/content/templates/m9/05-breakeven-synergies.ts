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

    const acqEps = roundTo(triangular(r, 2.5, 4.5, 6.5), 0.05);
    const pfShares = roundTo(triangular(r, 9_000_000, 12_000_000, 15_000_000), 100_000);
    const reqNi = acqEps * pfShares;

    // Utile base senza sinergie: fra il 85% e il 96% di quello richiesto (operazione diluitiva).
    const basePfNi = roundTo(reqNi * triangular(r, 0.85, 0.91, 0.96), 100_000);
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
      "Ragiona a ritroso: quale utile netto servirebbe, con le azioni pro-forma, per avere lo stesso EPS " +
        "di oggi? La differenza con l'utile base e' un numero **dopo le imposte**; le sinergie che il " +
        "management promette sono invece **prima delle imposte**, e ogni euro di sinergia porta a casa " +
        'solo la sua parte netta.',
      '',
      'Calcola utile richiesto, gap da colmare e sinergie ante imposte di breakeven.',
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
        prompt: `In ${B_REQ_NI} l'utile netto pro-forma che lascerebbe l'EPS esattamente invariato.`,
        target: `Model!${B_REQ_NI}`,
        atteso: reqNi,
        referenzia: [B_ACQ_EPS, B_PF_SHARES],
        senzaLiteral: [],
        skills: ['ma.breakeven'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: `In ${B_GAP_NI} quanto utile netto manca.`,
        target: `Model!${B_GAP_NI}`,
        atteso: gapNi,
        referenzia: [B_REQ_NI, B_BASE_PF_NI],
        senzaLiteral: [],
        skills: ['ma.breakeven'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: `In ${B_BE_SYN} le sinergie ante imposte necessarie per colmarlo.`,
        target: `Model!${B_BE_SYN}`,
        atteso: beSyn,
        referenzia: [B_GAP_NI, B_TAX],
        senzaLiteral: [1],
        skills: ['ma.breakeven'],
        minKeystrokes: 12,
      }),
    ];

    return {
      templateId: 'M9-05-BREAKEVENSYNERGIES',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!${B_REQ_NI}`,
      hints: [
        hint('H1', '=B4*B5', 10, 'T1'),
        hint('H2', '=B10-B6', 10, 'T2'),
        hint('H3', "=B11/(1-B7): si 'lorda' il gap delle imposte.", 15, 'T3'),
      ],
    };
  },
});
