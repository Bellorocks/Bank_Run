/**
 * M11 · 05 — Caccia all'Errore: individuare formule errate, hardcode e segni invertiti.
 *
 * Durante l'audit di un modello ricevuto da una controparte, l'analista deve
 * individuare e correggere gli errori più insidiosi:
 *
 *   1. Errore 1 (Hardcode mascherato): la cella B7 dei Costi Operativi Totali
 *      è stata sovrascritta con un numero fisso battuto a mano invece di =SUM(B4:B6).
 *   2. Errore 2 (Segno invertito): il Free Cash Flow in B12 somma il Capex
 *      invece di sottrarlo (=B10+B11 invece di =B10-B11).
 *   3. Errore 3 (Range incompleto / Off-by-one): le Imposte Totali in B17
 *      sommano solo la prima riga (=SUM(B15:B15)) dimenticando l'IRAP in B16.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_COST_TOT = 'B7'; // T1: Errore 1 (Hardcode da sostituire con =SUM(B4:B6))
const B_FCF = 'B12'; // T2: Errore 2 (Segno invertito da correggere con =B10-B11)
const B_TAX_TOT = 'B17'; // T3: Errore 3 (Range incompleto da correggere con =SUM(B15:B16))

export default defineTemplate({
  id: 'M11-05-FINDERRORS',
  module: 'M11',
  title: 'Trovare gli errori piantati: audit, hardcode e formule incoerenti',
  rank: 3,
  mode: 'AUDIT',
  estimatedSeconds: 300,
  skills: ['real.find-errors'],
  prerequisites: ['M0D-01-CINQUEERRORI', 'M0F-10-COMBOAUDIT'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const cost1 = roundTo(triangular(r, 4_000_000, 5_000_000, 6_000_000), 500_000);
    const cost2 = roundTo(triangular(r, 2_000_000, 3_000_000, 4_000_000), 500_000);
    const cost3 = roundTo(triangular(r, 1_000_000, 1_500_000, 2_000_000), 250_000);
    const expectedTotCost = cost1 + cost2 + cost3;

    const ebitda = roundTo(triangular(r, 12_000_000, 15_000_000, 18_000_000), 500_000);
    const capex = roundTo(triangular(r, 2_000_000, 3_000_000, 4_000_000), 500_000);
    const expectedFcf = ebitda - capex;

    const ires = roundTo(triangular(r, 2_000_000, 2_500_000, 3_000_000), 100_000);
    const irap = roundTo(triangular(r, 400_000, 500_000, 600_000), 50_000);
    const expectedTotTax = ires + irap;

    const brief = [
      `Hai aperto un modello finanziario difettoso inviato dal sell-side che contiene **3 gravi errori di calcolo**.`,
      ``,
      `### I tuoi compiti di Audit:`,
      `1. **Errore 1 (Hardcode in \`${B_COST_TOT}\`)**: la cella dei costi totali contiene un numero statico. Sostituiscila con la formula corretta: \`=SUM(B4:B6)\`.`,
      `2. **Errore 2 (Segno in \`${B_FCF}\`)**: il Free Cash Flow sta sommando il Capex! Correggi la formula in: \`=B10-B11\`.`,
      `3. **Errore 3 (Range in \`${B_TAX_TOT}\`)**: il totale delle imposte salta l'IRAP. Correggi il range in: \`=SUM(B15:B16)\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['AUDIT MODELLO DIFETTOSO (TROVA GLI ERRORI)'], { style: STILE_TITOLO }),
      riga('A3', ['Costi Operativi', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Materie Prime',
        'Servizi',
        'Personale',
        'TOTALE COSTI OPERATIVI',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [cost1, cost2, cost3], { style: STILE_INPUT }),
      // Errore 1 piantato: hardcode 999.999
      colonna(B_COST_TOT, [999_999], { style: STILE_TOTALE, locked: false }),

      riga('A9', ['Free Cash Flow', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A10', ['EBITDA', 'Capex', 'FREE CASH FLOW'], { style: STILE_ETICHETTA }),
      colonna('B10', [ebitda, capex], { style: STILE_INPUT }),
      // Errore 2 piantato: somma invece che sottrazione
      colonna(B_FCF, ['=B10+B11'], { style: STILE_TOTALE, locked: false }),

      riga('A14', ['Imposte', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A15', ['IRES (24%)', 'IRAP (3.9%)', 'TOTALE IMPOSTE'], { style: STILE_ETICHETTA }),
      colonna('B15', [ires, irap], { style: STILE_INPUT }),
      // Errore 3 piantato: range tronco
      colonna(B_TAX_TOT, ['=SUM(B15:B15)'], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Correggi l'hardcode in ${B_COST_TOT} inserendo =SUM(B4:B6).`,
        target: `Model!${B_COST_TOT}`,
        atteso: expectedTotCost,
        referenzia: ['B4', 'B5', 'B6'],
        skills: ['real.find-errors'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Correggi la formula del FCF in ${B_FCF} sottraendo il Capex: =B10-B11.`,
        target: `Model!${B_FCF}`,
        atteso: expectedFcf,
        referenzia: ['B10', 'B11'],
        skills: ['real.find-errors'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Correggi il totale imposte in ${B_TAX_TOT} includendo entrambe le righe: =SUM(B15:B16) o =B15+B16.`,
        target: `Model!${B_TAX_TOT}`,
        atteso: expectedTotTax,
        referenzia: ['B15', 'B16'],
        skills: ['real.find-errors'],
      }),
    ];

    return {
      templateId: 'M11-05-FINDERRORS',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B7 scrivi la formula dinamica: =SUM(B4:B6).', 10, 'T1'),
        hint('H2', 'In B12 il Capex è un\'uscita di cassa, va sottratto: =B10-B11.', 10, 'T2'),
        hint('H3', 'In B17 allarga il range per sommare B15 e B16: =SUM(B15:B16).', 10, 'T3'),
      ],
    };
  },
});
