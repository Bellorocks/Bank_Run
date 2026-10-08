/**
 * M8 · 09 — Buy-and-Build: add-on acquisition, sinergie e Multiple Arbitrage.
 *
 * La strategia Buy-and-Build è uno dei motori di rendimento più potenti del Private Equity:
 *
 *   1. La "Platform Company" viene acquistata a un multiplo elevato (es. 10.0x EV/EBITDA).
 *   2. Vengono acquisite aziende minori ("Add-on Targets") a multipli più bassi (es. 6.0x).
 *   3. Vengono estratte sinergie di costo e ricavo.
 *   4. MULTIPLE ARBITRAGE: All'uscita, l'intero gruppo combinato (incluso l'EBITDA dell'add-on)
 *      viene venduto al multiplo di prima fascia della platform (10.0x).
 *      Guadagno Arbitraggio Multiplo = Add-on EBITDA × (Exit Multiple - Add-on Entry Multiple).
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
const B_EBITDA_PLAT = 'B4'; // EBITDA Platform (dato)
const B_EBITDA_ADD = 'B5'; // EBITDA Add-on (dato)
const B_SYNERGIES = 'B6'; // Sinergie di Costo (dato)
const B_MULT_ADD = 'B7'; // Multiplo Acquisto Add-on (6.0x) (dato)
const B_MULT_EXIT = 'B8'; // Multiplo Uscita Gruppo (10.0x) (dato)

const B_COMB_EBITDA = 'B11'; // T1: Combined EBITDA = B4+B5+B6
const B_COMB_EV = 'B12'; // T2: Combined Exit EV = B11 * B8
const B_MULT_ARB = 'B13'; // T3: Multiple Arbitrage Gain = B5 * (B8 - B7)

export default defineTemplate({
  id: 'M8-09-BUYANDBUILD',
  module: 'M8',
  title: 'Buy-and-build: acquisizioni add-on e multiple arbitrage',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.buy-and-build'],
  prerequisites: ['M8-07-VALUEBRIDGE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitdaPlat = roundTo(triangular(r, 12_000_000, 15_000_000, 18_000_000), 500_000);
    const ebitdaAdd = roundTo(triangular(r, 3_000_000, 4_500_000, 6_000_000), 250_000);
    const synergies = roundTo(ebitdaAdd * 0.20, 100_000); // 20% sinergie

    const multAdd = 6.0;
    const multExit = 10.0;

    const combEbitda = ebitdaPlat + ebitdaAdd + synergies;
    const combEv = combEbitda * multExit;
    const multArb = ebitdaAdd * (multExit - multAdd);

    const brief = [
      `La tua platform company in portafoglio acquisisce un concorrente add-on tramite strategia **Buy-and-Build**.`,
      ``,
      `Parametri dell'operazione:`,
      `- **EBITDA Platform**: ${eur(ebitdaPlat)}`,
      `- **EBITDA Add-on Acquisito**: ${eur(ebitdaAdd)}`,
      `- **Sinergie di Costo Estratte**: ${eur(synergies)}`,
      `- **Multiplo di Acquisto Add-on**: ${multiplo(multAdd)}`,
      `- **Multiplo di Uscita Previsto per il Gruppo**: ${multiplo(multExit)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'**EBITDA Combinato Pro-Forma** in \`${B_COMB_EBITDA}\`: \`=${B_EBITDA_PLAT}+${B_EBITDA_ADD}+${B_SYNERGIES}\`.`,
      `2. Calcola l'**Enterprise Value Combinato all'Uscita (€)** in \`${B_COMB_EV}\`: \`=${B_COMB_EBITDA}*${B_MULT_EXIT}\`.`,
      `3. Calcola il **Guadagno da Multiple Arbitrage sull'Add-on (€)** in \`${B_MULT_ARB}\`: \`=${B_EBITDA_ADD}*(${B_MULT_EXIT}-${B_MULT_ADD})\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['STRATEGIA BUY-AND-BUILD (ADD-ON)'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Operativi & Multipli', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'EBITDA Platform (€)',
        'EBITDA Add-on (€)',
        'Sinergie di Costo (€)',
        'Multiplo di Acquisto Add-on (x)',
        'Multiplo di Uscita Gruppo (x)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [ebitdaPlat, ebitdaAdd, synergies], { style: STILE_INPUT }),
      colonna(B_MULT_ADD, [multAdd, multExit], { style: STILE_INPUT_MULTIPLO }),

      riga('A10', ['Valutazione Combinata & Arbitraggio', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A11', [
        'EBITDA Combinato Pro-Forma (€)',
        'Enterprise Value Combinato all\'Uscita (€)',
        'Guadagno da Multiple Arbitrage Add-on (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_COMB_EBITDA, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_COMB_EV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_MULT_ARB, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola l'EBITDA Combinato in ${B_COMB_EBITDA}: =${B_EBITDA_PLAT}+${B_EBITDA_ADD}+${B_SYNERGIES} o =SUM(B4:B6).`,
        target: `Model!${B_COMB_EBITDA}`,
        atteso: combEbitda,
        referenzia: [B_EBITDA_PLAT, B_EBITDA_ADD, B_SYNERGIES],
        skills: ['lbo.buy-and-build'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'Enterprise Value di Uscita in ${B_COMB_EV}: =${B_COMB_EBITDA}*${B_MULT_EXIT}.`,
        target: `Model!${B_COMB_EV}`,
        atteso: combEv,
        referenzia: [B_COMB_EBITDA, B_MULT_EXIT],
        skills: ['lbo.buy-and-build'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il guadagno da Multiple Arbitrage in ${B_MULT_ARB}: =${B_EBITDA_ADD}*(${B_MULT_EXIT}-${B_MULT_ADD}).`,
        target: `Model!${B_MULT_ARB}`,
        atteso: multArb,
        referenzia: [B_EBITDA_ADD, B_MULT_EXIT, B_MULT_ADD],
        skills: ['lbo.buy-and-build'],
      }),
    ];

    return {
      templateId: 'M8-09-BUYANDBUILD',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B11 somma platform, add-on e sinergie: =SUM(B4:B6).', 10, 'T1'),
        hint('H2', 'In B12 moltiplica l\'EBITDA combinato per il multiplo di uscita: =B11*B8.', 10, 'T2'),
        hint('H3', 'In B13 calcola: =B5*(B8-B7).', 10, 'T3'),
      ],
    };
  },
});
