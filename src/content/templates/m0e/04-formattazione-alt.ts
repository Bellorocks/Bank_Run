/**
 * M0-E · 04 — Sequenze Alt legacy per la formattazione.
 *
 * Drill puro di velocita', senza nessun dato finanziario: tre caselle, tre
 * gesti da tastiera. Il punto didattico non e' calcolare niente, e' abituare
 * la mano a un CAMMINO invece che a un accordo — `Alt` apre la barra dei
 * menu, poi `H`, poi `O`, poi `I`: quattro tasti in sequenza, mai premuti
 * insieme (vedi `src/keymap/altSequence.ts`).
 *
 * Onesta' sul grading, come richiesto dal compito: in `types.ts` non esiste
 * nessun Check per grassetto o colore di riempimento, quindi Alt,H,H (colore)
 * e Alt,H,O,I (autofit) non hanno NIENTE da verificare a parte il valore
 * scritto nella cella e il tempo impiegato — il brief lo dice chiaro invece
 * di far finta che il gioco stia guardando il colore. Il terzo gesto,
 * Ctrl+Maiusc+4 (valuta), e' l'unico dei tre che produce un `numFmt`
 * ispezionabile: qui il check `numberFormat` c'e' davvero ed e' bloccante,
 * come in M0A-08-FORMATI.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  num,
} from '../../authoring';
import { DEFAULT_FORMATS } from '../../../engine/numberFormat';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0E-04-FORMATALT',
  module: 'M0-E',
  get title() {
    return tx('M0E-04-FORMATALT.title');
  },
  rank: 2,
  mode: 'SPEEDRUN',
  estimatedSeconds: 75,
  skills: ['spd.alt-format', 'xl.numfmt'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Numeri tondi, senza nessun significato economico: qui si allena il
    // gesto, non la lettura di un bilancio.
    const valore1 = r.int(100, 999);
    const valore2 = r.int(1000, 9999);
    const valoreA = r.int(10, 500);
    const valoreB = r.int(10, 500);
    const totale = valoreA + valoreB;

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0E-04-FORMATALT.2', { p0: num(valore1) }),
      targetCell: 'Model!B3',
      check: [{ kind: 'value' as const, expected: valore1 }],
      skills: ['spd.alt-format'],
      minKeystrokes: 8,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0E-04-FORMATALT.3', { p0: num(valore2) }),
      targetCell: 'Model!B5',
      check: [{ kind: 'value' as const, expected: valore2 }],
      skills: ['spd.alt-format'],
      minKeystrokes: 9,
    };

    const t3Base = taskFormula({
      id: 'T3',
      prompt:
        tx('M0E-04-FORMATALT.4', { p0: num(valoreA), p1: num(valoreB) }),
      target: 'Model!B9',
      atteso: totale,
      referenzia: ['B7', 'B8'],
      skills: ['xl.numfmt'],
      minKeystrokes: 10,
    });

    const t3: Task = {
      ...t3Base,
      check: [
        ...t3Base.check,
        {
          kind: 'numberFormat' as const,
          expected: DEFAULT_FORMATS.valuta,
          message:
            tx('M0E-04-FORMATALT.5'),
        },
      ],
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0E-04-FORMATALT',
      seed: rng.seed,
      brief: [tx('M0E-04-FORMATALT.6')].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0E-04-FORMATALT.7')], { style: STILE_TITOLO }),
            blocco('A3', [[tx('M0E-04-FORMATALT.8')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('A5', [[tx('M0E-04-FORMATALT.9')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('A7', [[tx('M0E-04-FORMATALT.10')], [tx('M0E-04-FORMATALT.11')], [tx('M0E-04-FORMATALT.12')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('B7', [[valoreA], [valoreB]], { style: STILE_INPUT }),
            areaLibera(['B3', 'B5', 'B9']),
          ],
          { colWidths: { A: 90, B: 130 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M0E-04-FORMATALT.13'), 6, 'T1'),
        hint('H2', tx('M0E-04-FORMATALT.14'), 6, 'T2'),
        hint('H3', tx('M0E-04-FORMATALT.15'), 6, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 20, ritmo: 4 }),
      startAt: 'Model!B3',
    };
  },
});
