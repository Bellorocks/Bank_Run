/**
 * M0-B · 04 — IFERROR: intercettare l'errore senza nasconderlo sotto il tappeto.
 *
 * Il punto didattico e' in due parti, e serve entrambe o non insegna niente:
 *  - T1 e' il caso in cui l'errore e' legittimo (una quantita' a zero fa esplodere
 *    una divisione) e IFERROR serve DAVVERO, ma il valore alternativo dev'essere
 *    una stima difendibile — il prezzo di listino gia' in tabella — non uno zero
 *    buttato li' per far sparire il cancelletto rosso;
 *  - T2 e' il caso gemello in cui il denominatore non e' mai zero: avvolgere
 *    comunque la formula in IFERROR non e' prudenza, e' nascondere un errore
 *    futuro che quella formula dovrebbe invece segnalare.
 *
 * Senza il secondo task il livello insegnerebbe "metti sempre IFERROR", che e'
 * esattamente l'abitudine dannosa da cui lo skill xl.iferror mette in guardia.
 */

import {
  defineTemplate,
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
  eur,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const LINEE = () => ([
  tx('M0B-04-IFERROR.1'),
  tx('M0B-04-IFERROR.2'),
  tx('M0B-04-IFERROR.3'),
  tx('M0B-04-IFERROR.4'),
  tx('M0B-04-IFERROR.5'),
  tx('M0B-04-IFERROR.6'),
  tx('M0B-04-IFERROR.7'),
  tx('M0B-04-IFERROR.8'),
] as const);

const MOTIVI_FERMO = () => ([
  tx('M0B-04-IFERROR.9'),
  tx('M0B-04-IFERROR.10'),
  tx('M0B-04-IFERROR.11'),
  tx('M0B-04-IFERROR.12'),
] as const);

export default defineTemplate({
  id: 'M0B-04-IFERROR',
  module: 'M0-B',
  get title() {
    return tx('M0B-04-IFERROR.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 210,
  skills: ['xl.iferror', 'xl.div-guard'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const idx1 = r.int(0, LINEE().length - 1);
    let idx2 = r.int(0, LINEE().length - 1);
    while (idx2 === idx1) idx2 = r.int(0, LINEE().length - 1);
    const linea1 = LINEE()[idx1];
    const linea2 = LINEE()[idx2];
    const motivo = r.pick(MOTIVI_FERMO());

    // Linea 1: produzione ferma questo mese. Il costo di produzione (spese fisse
    // gia' sostenute) non e' zero, ma le unita' prodotte si': B4/C4 esplode.
    const costo1 = roundTo(triangular(r, 12_000, 28_000, 65_000), 10);
    const quantita1 = 0;
    const listino1 = roundTo(triangular(r, 25, 70, 180), 0.5);

    // Linea 2: mese normale, il denominatore non e' mai zero.
    const costo2 = roundTo(triangular(r, 20_000, 55_000, 140_000), 10);
    const quantita2 = r.int(60, 900);
    const listino2 = roundTo(triangular(r, 25, 70, 180), 0.5);
    const costoUnitario2 = costo2 / quantita2;

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0B-04-IFERROR.14', { linea1, motivo }),
      targetCell: 'Model!E4',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: listino1,
          message:
            tx('M0B-04-IFERROR.15'),
        },
        { kind: 'mustReference', cells: ['B4', 'C4', 'D4'] },
        { kind: 'mustUseFunction', functions: ['IFERROR'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.iferror', 'xl.div-guard'],
      minKeystrokes: 18,
    };

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M0B-04-IFERROR.16', { linea2 }),
      target: 'Model!E5',
      atteso: costoUnitario2,
      referenzia: ['B5', 'C5'],
      senzaLiteral: [],
      skills: ['xl.arithmetic'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M0B-04-IFERROR',
      seed: rng.seed,
      brief: [tx('M0B-04-IFERROR.17', { linea1, motivo, p2: eur(costo1), linea2 })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0B-04-IFERROR.18')], { style: STILE_TITOLO }),
            riga(
              'A3',
              [tx('M0B-04-IFERROR.19'), tx('M0B-04-IFERROR.20'), tx('M0B-04-IFERROR.21'), tx('M0B-04-IFERROR.22'), tx('M0B-04-IFERROR.23')],
              { style: STILE_TITOLO },
            ),
            colonna('A4', [linea1, linea2], { style: STILE_ETICHETTA }),
            colonna('B4', [costo1, costo2], { style: STILE_INPUT }),
            colonna('C4', [quantita1, quantita2], { style: STILE_INPUT }),
            colonna('D4', [listino1, listino2], { style: { ...STILE_INPUT, numFmt: '#,##0.0' } }),
            areaLibera(['E4', 'E5']),
          ],
          { colWidths: { A: 230, B: 170, C: 150, D: 160, E: 160 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0B-04-IFERROR.24'),
          10,
          'T1',
        ),
        hint('H2', tx('M0B-04-IFERROR.25'), 8, 'T1'),
        hint('H3', tx('M0B-04-IFERROR.26'), 6, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: 'Model!E4',
    };
  },
});
