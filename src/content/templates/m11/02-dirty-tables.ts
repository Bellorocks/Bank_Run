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

import { tx } from '../../../i18n/content';
const REGIONI = () => ([tx('M11-02-DIRTYTABLES.nord'), tx('M11-02-DIRTYTABLES.centro'), tx('M11-02-DIRTYTABLES.sud')] as const);
const ROW_START = 5;

export default defineTemplate({
  id: 'M11-02-DIRTYTABLES',
  module: 'M11',
  get title() {
    return tx('M11-02-DIRTYTABLES.title');
  },
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
        righe.push({ codice: `PROD-${String(prodotto++).padStart(2, '0')} (${REGIONI()[g]})`, ricavi, costi });
        subRev += ricavi;
        subCost += costi;
      }
      righe.push({ codice: tx('M11-02-DIRTYTABLES.subtotale', { regione: REGIONI()[g] }), ricavi: subRev, costi: subCost });
      totRev += subRev;
      totCost += subCost;
    }
    righe.push({ codice: tx('M11-02-DIRTYTABLES.2'), ricavi: totRev, costi: totCost });

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
      prompt: tx('M11-02-DIRTYTABLES.3', { target, cosa }),
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
      condTask('T1', B_REV, tx('M11-02-DIRTYTABLES.4'), totRev),
      condTask('T2', B_COST, tx('M11-02-DIRTYTABLES.5'), totCost),
      {
        id: 'T3',
        prompt: tx('M11-02-DIRTYTABLES.6', { B_MARGIN }),
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

    const brief = [tx('M11-02-DIRTYTABLES.7')].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M11-02-DIRTYTABLES.8')], { style: STILE_TITOLO }),
      riga('A4', [tx('M11-02-DIRTYTABLES.9'), tx('M11-02-DIRTYTABLES.10'), tx('M11-02-DIRTYTABLES.11')], { style: STILE_TITOLO }),
      ...righe.map((x, i) => [
        { ref: `A${ROW_START + i}`, content: x.codice, locked: true },
        { ref: `B${ROW_START + i}`, content: x.ricavi, style: STILE_INPUT, locked: true },
        { ref: `C${ROW_START + i}`, content: x.costi, style: STILE_INPUT, locked: true },
      ]),

      riga(`A${rowOut - 1}`, [tx('M11-02-DIRTYTABLES.12'), tx('M11-02-DIRTYTABLES.13')], { style: STILE_TITOLO }),
      colonna(`A${rowOut}`, [tx('M11-02-DIRTYTABLES.14'), tx('M11-02-DIRTYTABLES.15'), tx('M11-02-DIRTYTABLES.16')], {
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
        hint('H1', tx('M11-02-DIRTYTABLES.17', { colA, colB }), 10, 'T1'),
        hint('H2', `=SUMIF(${colA},"PROD*",${colC})`, 10, 'T2'),
        hint('H3', `=${B_REV}-${B_COST}`, 5, 'T3'),
      ],
    };
  },
});
