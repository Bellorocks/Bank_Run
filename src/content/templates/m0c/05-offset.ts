/**
 * M0-C · 05 — OFFSET e i range dinamici.
 *
 * Il punto didattico e' spostarsi da un punto fermo (l'ancora) invece di cercare
 * un valore. INDEX/MATCH risponde a "dov'e' questo dato?"; OFFSET risponde a
 * "cosa c'e' a N righe da qui?" — ed e' proprio quel "N" che deve venire da una
 * cella, non da un numero scritto in formula: e' la differenza fra una formula
 * che regge solo per questo seed e una che regge quando N cambia (T2 lo verifica
 * con un secondo parametro, per assicurarsi che non sia rimasta memorizzata la
 * prima risposta).
 *
 * Il brief include anche il prezzo da pagare: OFFSET e' una funzione volatile,
 * si ricalcola sempre. Non e' solo un elogio della funzione — e' lo stesso
 * spirito di onesta' tecnica di M0B-04-IFERROR ("non ovunque per abitudine").
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
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  num,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const SERIE = () => ([
  tx('M0C-05-OFFSET.1'),
  tx('M0C-05-OFFSET.2'),
  tx('M0C-05-OFFSET.3'),
  tx('M0C-05-OFFSET.4'),
  tx('M0C-05-OFFSET.5'),
  tx('M0C-05-OFFSET.6'),
  tx('M0C-05-OFFSET.7'),
] as const);

const HEADER_ROW = 3;
const DATA_START = 4;

export default defineTemplate({
  id: 'M0C-05-OFFSET',
  module: 'M0-C',
  get title() {
    return tx('M0C-05-OFFSET.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.offset'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');
    const filiale = r.pick(SERIE());

    const periodi = r.int(8, 10);

    // Serie mensile plausibile: un primo valore, poi una passeggiata casuale
    // limitata (mai un balzo assurdo da un mese al successivo).
    const valori: number[] = [];
    let v = roundTo(triangular(r, 180_000, 320_000, 650_000), 1000);
    valori.push(v);
    for (let i = 1; i < periodi; i++) {
      const variazione = triangular(r, -0.09, 0.015, 0.13);
      v = roundTo(v * (1 + variazione), 1000);
      valori.push(v);
    }

    // Due parametri distinti: se il secondo task tornasse a dare la risposta
    // del primo, vorrebbe dire che lo studente ha scritto -N a mano invece di
    // leggerlo dalla cella.
    const nIndietro = r.int(2, periodi - 3);
    let mIndietro = r.int(1, periodi - 1);
    while (mIndietro === nIndietro) mIndietro = r.int(1, periodi - 1);

    const dataEndRow = DATA_START + periodi - 1;
    const paramNRow = dataEndRow + 2;
    const t1Row = paramNRow + 2;
    const paramMRow = t1Row + 2;
    const t2Row = paramMRow + 2;

    const ancoraRef = `B${dataEndRow}`;
    const paramNRef = `B${paramNRow}`;
    const t1TargetRef = `B${t1Row}`;
    const paramMRef = `B${paramMRow}`;
    const t2TargetRef = `B${t2Row}`;

    const meseLabels = Array.from({ length: periodi }, (_, i) =>
      i === periodi - 1 ? tx('M0C-05-OFFSET.9', { p0: i + 1 }) : tx('common.mese', { n: i + 1 }),
    );

    const expected1 = valori[periodi - 1 - nIndietro];
    const expected2 = valori[periodi - 1 - mIndietro];

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0C-05-OFFSET.10', { t1TargetRef, nIndietro, ancoraRef, paramNRef }),
      targetCell: `Model!${t1TargetRef}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: expected1,
          message:
            tx('M0C-05-OFFSET.11', { ancoraRef, paramNRef }),
        },
        { kind: 'mustReference', cells: [ancoraRef, paramNRef] },
        { kind: 'mustUseFunction', functions: ['OFFSET'] },
        { kind: 'mustNotContainLiteral', except: [0] },
      ],
      skills: ['xl.offset'],
      minKeystrokes: 20,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0C-05-OFFSET.12', { t2TargetRef, paramMRef, paramNRef, nIndietro }),
      targetCell: `Model!${t2TargetRef}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: expected2,
          message: tx('M0C-05-OFFSET.13', { mIndietro, ancoraRef }),
        },
        { kind: 'mustReference', cells: [ancoraRef, paramMRef] },
        { kind: 'mustUseFunction', functions: ['OFFSET'] },
        { kind: 'mustNotContainLiteral', except: [0] },
      ],
      skills: ['xl.offset'],
      minKeystrokes: 20,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0C-05-OFFSET',
      seed: rng.seed,
      brief: [tx('M0C-05-OFFSET.14', { filiale, periodi, ancoraRef, paramNRef })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0C-05-OFFSET.15')], { style: STILE_TITOLO }),
            riga(`A${HEADER_ROW}`, [tx('M0C-05-OFFSET.24'), tx('M0C-05-OFFSET.16')], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, meseLabels, { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, valori, { style: STILE_INPUT }),
            blocco(`A${paramNRow}`, [[tx('M0C-05-OFFSET.17')]], { style: STILE_ETICHETTA }),
            blocco(`B${paramNRow}`, [[nIndietro]], { style: STILE_INPUT }),
            blocco(`A${t1Row}`, [[tx('M0C-05-OFFSET.18')]], { style: STILE_ETICHETTA }),
            blocco(`A${paramMRow}`, [[tx('M0C-05-OFFSET.19')]], { style: STILE_ETICHETTA }),
            blocco(`B${paramMRow}`, [[mIndietro]], { style: STILE_INPUT }),
            blocco(`A${t2Row}`, [[tx('M0C-05-OFFSET.20')]], { style: STILE_ETICHETTA }),
            areaLibera([t1TargetRef, t2TargetRef]),
          ],
          { colWidths: { A: 320, B: 150 }, frozenRows: HEADER_ROW },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0C-05-OFFSET.21', { ancoraRef, paramNRef }),
          12,
          'T1',
        ),
        hint('H2', tx('M0C-05-OFFSET.22', { paramNRef, p1: num(nIndietro) }), 8, 'T1'),
        hint('H3', tx('M0C-05-OFFSET.23', { paramMRef, paramNRef }), 8, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!${t1TargetRef}`,
    };
  },
});
