/**
 * M11 · 02 — Tabelle Mal Formattate: pulizia e aggregazione condizionale.
 *
 * I dati veri arrivano estratti male da gestionali e PDF: righe di dettaglio
 * mescolate a subtotali di regione e a un totale generale. Una SUM sulla
 * colonna li conta due o tre volte.
 *
 * Il dump ha 2-3 regioni con 2-4 prodotti ciascuna, un subtotale dopo ogni
 * regione e un totale generale in fondo: righe e ordine cambiano col seed.
 * I task chiedono una somma condizionale sui soli codici prodotto (SUMIF /
 * SUMIFS), cosi' la formula resta giusta anche se il dump cambia lunghezza.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

const REGIONI = ['NORD', 'CENTRO', 'SUD'] as const;
const ROW_START = 5;

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

    const nRegioni = r.int(2, 3);
    type Riga = { codice: string; ricavi: number; costi: number };
    const righe: Riga[] = [];
    let prodotto = 1;
    let totRev = 0;
    let totCost = 0;
    for (let g = 0; g < nRegioni; g++) {
      const n = r.int(2, 4);
      let subRev = 0;
      let subCost = 0;
      for (let k = 0; k < n; k++) {
        const ricavi = roundTo(triangular(r, 3_000_000, 8_000_000, 15_000_000), 10_000);
        const costi = roundTo(ricavi * triangular(r, 0.5, 0.6, 0.72), 10_000);
        righe.push({ codice: `PROD-${String(prodotto++).padStart(2, '0')} (${REGIONI[g]})`, ricavi, costi });
        subRev += ricavi;
        subCost += costi;
      }
      righe.push({ codice: `SUBTOTALE-${REGIONI[g]}`, ricavi: subRev, costi: subCost });
      totRev += subRev;
      totCost += subCost;
    }
    righe.push({ codice: 'TOTALE GENERALE', ricavi: totRev, costi: totCost });

    const fine = ROW_START + righe.length - 1;
    const rowOut = fine + 3;
    const B_REV = `B${rowOut}`;
    const B_COST = `B${rowOut + 1}`;
    const B_MARGIN = `B${rowOut + 2}`;
    const colA = `A${ROW_START}:A${fine}`;
    const colB = `B${ROW_START}:B${fine}`;
    const colC = `C${ROW_START}:C${fine}`;

    const condTask = (id: string, target: string, cosa: string, atteso: number): Task => ({
      id,
      prompt: `In ${target} ${cosa}, sommando solo le righe dei prodotti con una somma condizionale.`,
      targetCell: `Model!${target}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: atteso },
        { kind: 'mustUseFunction', functions: ['SUMIF', 'SUMIFS'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['real.dirty-tables'],
      minKeystrokes: 30,
    });

    const tasks: Task[] = [
      condTask('T1', B_REV, 'i ricavi totali veri', totRev),
      condTask('T2', B_COST, 'i costi diretti totali veri', totCost),
      {
        id: 'T3',
        prompt: `In ${B_MARGIN} il margine lordo effettivo.`,
        targetCell: `Model!${B_MARGIN}`,
        check: [
          { kind: 'mustBeFormula' },
          { kind: 'value', expected: totRev - totCost },
          { kind: 'mustReference', cells: [B_REV, B_COST] },
        ],
        skills: ['real.dirty-tables'],
        minKeystrokes: 8,
      },
    ];

    const brief = [
      "Il CFO della target ti manda l'estrazione del gestionale per prodotto. Sembra pulita, ma dentro " +
        'ci sono i **subtotali per regione** e il **totale generale**: una SUM sulla colonna conta ogni ' +
        'euro tre volte.',
      '',
      'Somma solo le righe di dettaglio: hanno tutte un codice che comincia con "PROD". Scrivi le formule ' +
        "in modo che restino giuste anche se domani l'estrazione arriva con piu' righe: niente somme " +
        'cella per cella.',
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['PULIZIA REPORT GREZZO ERP'], { style: STILE_TITOLO }),
      riga('A4', ['Codice linea', 'Ricavi (€)', 'Costi diretti (€)'], { style: STILE_TITOLO }),
      ...righe.map((x, i) => [
        { ref: `A${ROW_START + i}`, content: x.codice, locked: true },
        { ref: `B${ROW_START + i}`, content: x.ricavi, style: STILE_INPUT, locked: true },
        { ref: `C${ROW_START + i}`, content: x.costi, style: STILE_INPUT, locked: true },
      ]),

      riga(`A${rowOut - 1}`, ['Aggregati depurati', 'Risultato (€)'], { style: STILE_TITOLO }),
      colonna(`A${rowOut}`, ['Ricavi totali puliti', 'Costi diretti totali puliti', 'Margine lordo effettivo'], {
        style: STILE_ETICHETTA,
      }),
      [{ ref: B_REV, content: null, locked: false, style: STILE_FORMULA }],
      [{ ref: B_COST, content: null, locked: false, style: STILE_FORMULA }],
      [{ ref: B_MARGIN, content: null, locked: false, style: STILE_TOTALE }],
    ], { colWidths: { A: 260, B: 140, C: 140 } });

    return {
      templateId: 'M11-02-DIRTYTABLES',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 40 }),
      startAt: `Model!${B_REV}`,
      hints: [
        hint('H1', `=SUMIF(${colA},"PROD*",${colB}): l'asterisco accetta qualunque seguito dopo "PROD".`, 10, 'T1'),
        hint('H2', `=SUMIF(${colA},"PROD*",${colC})`, 10, 'T2'),
        hint('H3', `=${B_REV}-${B_COST}`, 5, 'T3'),
      ],
    };
  },
});
