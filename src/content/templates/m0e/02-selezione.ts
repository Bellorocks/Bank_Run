/**
 * M0-E · 02 — Selezionare in fretta: Ctrl+Spazio, Maiusc+Spazio, Ctrl+Maiusc+Freccia, Ctrl+A.
 *
 * Drill puro, niente finanza: una tabellina di numeri neutri, quattro somme.
 * Il punto non e' il calcolo (SUM di cinque numeri non insegna niente da solo),
 * e' arrivarci senza trascinare il mouse:
 *  - T1/T2: Ctrl+Barra spaziatrice seleziona una colonna intera in un colpo.
 *  - T3: Maiusc+Barra spaziatrice fa lo stesso per la riga.
 *  - T4: Ctrl+A dentro a un blocco di dati seleziona la "current region", il
 *    rettangolo di dati che ti circonda — non l'intero foglio.
 * Ctrl+Maiusc+Freccia (estendere la selezione fino al bordo dei dati) e' la
 * tecnica jolly che funziona su tutti e quattro i task, ed e' spiegata nel brief
 * per chi preferisce quella.
 *
 * Il check e' SEMPRE sul valore e su cosa la formula referenzia, mai su come la
 * cella e' stata selezionata: la selezione non e' osservabile dal grader, e va
 * bene cosi'. E' il giocatore a scegliere se essere lento o veloce.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';

import { tx } from '../../../i18n/content';
const ETICHETTE_RIGA = () => ([tx('M0E-02-SELEZIONE.1'), tx('M0E-02-SELEZIONE.2'), tx('M0E-02-SELEZIONE.3'), tx('M0E-02-SELEZIONE.4'), tx('M0E-02-SELEZIONE.5')] as const);

export default defineTemplate({
  id: 'M0E-02-SELEZIONE',
  module: 'M0-E',
  get title() {
    return tx('M0E-02-SELEZIONE.title');
  },
  rank: 1,
  mode: 'SPEEDRUN',
  estimatedSeconds: 75,
  skills: ['spd.selection', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Numeri neutri: qui non c'e' niente da capire, solo da selezionare in fretta.
    const dati: number[][] = Array.from({ length: 5 }, () => [
      r.int(10, 95),
      r.int(10, 95),
      r.int(10, 95),
    ]);
    const colB = dati.map((row) => row[0]);
    const colD = dati.map((row) => row[2]);
    const sumB = colB.reduce((a, b) => a + b, 0);
    const sumD = colD.reduce((a, b) => a + b, 0);

    const rigaIdx = r.int(0, 4);
    const rigaNum = 4 + rigaIdx; // le righe dati partono da riga 4
    const rigaLabel = ETICHETTE_RIGA()[rigaIdx];
    const rowSum = dati[rigaIdx][0] + dati[rigaIdx][1] + dati[rigaIdx][2];

    const grandTotal = dati.reduce((acc, row) => acc + row[0] + row[1] + row[2], 0);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M0E-02-SELEZIONE.7'),
        target: 'Model!B9',
        atteso: sumB,
        referenzia: ['B4', 'B5', 'B6', 'B7', 'B8'],
        skills: ['spd.selection', 'xl.aggregates'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt:
          tx('M0E-02-SELEZIONE.8'),
        target: 'Model!D9',
        atteso: sumD,
        referenzia: ['D4', 'D5', 'D6', 'D7', 'D8'],
        skills: ['spd.selection', 'xl.aggregates'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T3',
        prompt:
          tx('M0E-02-SELEZIONE.9', { rigaNum, rigaLabel }),
        target: `Model!E${rigaNum}`,
        atteso: rowSum,
        referenzia: [`B${rigaNum}`, `C${rigaNum}`, `D${rigaNum}`],
        skills: ['spd.selection', 'xl.aggregates'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T4',
        prompt:
          tx('M0E-02-SELEZIONE.10'),
        target: 'Model!B11',
        atteso: grandTotal,
        referenzia: ['B4', 'D4', 'B8', 'D8'],
        skills: ['spd.selection', 'xl.aggregates'],
        minKeystrokes: 14,
      }),
    ];

    return {
      templateId: 'M0E-02-SELEZIONE',
      seed: rng.seed,
      brief: [tx('M0E-02-SELEZIONE.11')].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0E-02-SELEZIONE.12')], { style: STILE_TITOLO }),
            riga('A3', [tx('M0E-02-SELEZIONE.23'), tx('M0E-02-SELEZIONE.13'), tx('M0E-02-SELEZIONE.14'), tx('M0E-02-SELEZIONE.15'), tx('M0E-02-SELEZIONE.16')], {
              style: STILE_TITOLO,
            }),
            colonna('A4', [...ETICHETTE_RIGA()], { style: STILE_ETICHETTA }),
            blocco('B4', dati, { style: STILE_INPUT }),
            blocco('A9', [[tx('M0E-02-SELEZIONE.17')]], { style: STILE_ETICHETTA }),
            blocco('A11', [[tx('M0E-02-SELEZIONE.18')]], { style: STILE_ETICHETTA }),
            areaLibera(['B9', 'D9', `E${rigaNum}`, 'B11']),
          ],
          { colWidths: { A: 220, B: 100, C: 100, D: 100, E: 110 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M0E-02-SELEZIONE.19'), 6, 'T1'),
        hint('H2', tx('M0E-02-SELEZIONE.20'), 5, 'T2'),
        hint('H3', tx('M0E-02-SELEZIONE.21'), 6, 'T3'),
        hint('H4', tx('M0E-02-SELEZIONE.22'), 8, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 20 }),
      startAt: 'Model!B9',
    };
  },
});
