/**
 * M0-E · 03 — Ctrl+Alt+V: Incolla speciale e la sua sotto-keymap.
 *
 * Puro drill di velocita' (spec §12, M0-E): mouse disattivato hard, niente
 * contenuto finanziario, numeri neutri. Il punto didattico non e' calcolare
 * niente — e' costruire il riflesso "Ctrl+Alt+V, poi una lettera, poi Invio"
 * finche' non serve piu' pensarci.
 *
 * Due drill, due lettere della sotto-keymap (vedi `src/engine/clipboard.ts`,
 * `KEY_TO_OPTIONS`, e `PASTE_SPECIAL_OPTIONS` in `src/keymap/bindings.ts`):
 *  - T1 usa **V** (Valori): una cella con una formula viva va copiata altrove
 *    come solo numero, senza trascinarsi dietro il calcolo.
 *  - T2 usa **E** (Trasponi): una riga di numeri va copiata come colonna.
 *
 * Nota sul grading di T1: `types.ts` non ha un check che dica "questa cella
 * NON deve essere una formula" (solo il duale, `mustBeFormula`). Il task si
 * verifica quindi solo sul valore numerico e lo spiega senza ambiguita' nel
 * prompt: chi lascia la formula invece di incollare il valore supera lo
 * stesso il check numerico, ma non ha fatto l'esercizio — e' un limite noto,
 * non un errore di questo file.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  num,
} from '../../authoring';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0E-03-PASTESPECIAL',
  module: 'M0-E',
  get title() {
    return tx('M0E-03-PASTESPECIAL.title');
  },
  rank: 2,
  mode: 'SPEEDRUN',
  estimatedSeconds: 90,
  skills: ['spd.paste-special', 'spd.selection'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Drill 1: una cella con una formula VERA (non un numero che sembra una
    // formula) — altrimenti "incolla solo il valore" non avrebbe niente da
    // spogliare.
    const numA = r.int(10, 90);
    const numB = r.int(10, 90);
    const totale = numA + numB;

    // Drill 2: cinque numeri distinti, cosi' l'ultima cella della colonna
    // trasposta non puo' tornare giusta "per caso" con una copia non trasposta.
    const serie: number[] = [];
    while (serie.length < 5) {
      const n = r.int(10, 99);
      if (!serie.includes(n)) serie.push(n);
    }

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0E-03-PASTESPECIAL.2'),
      targetCell: 'Model!D7',
      check: [
        {
          kind: 'value',
          expected: totale,
          message:
            tx('M0E-03-PASTESPECIAL.3'),
        },
      ],
      skills: ['spd.paste-special'],
      minKeystrokes: 8,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0E-03-PASTESPECIAL.4'),
      targetCell: 'Model!B18',
      check: [
        {
          kind: 'value',
          expected: serie[4],
          message:
            tx('M0E-03-PASTESPECIAL.5'),
        },
      ],
      skills: ['spd.paste-special', 'spd.selection'],
      minKeystrokes: 12,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0E-03-PASTESPECIAL',
      seed: rng.seed,
      brief: [tx('M0E-03-PASTESPECIAL.6', { p0: num(numA), p1: num(numB) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0E-03-PASTESPECIAL.7')], { style: STILE_TITOLO }),

            riga('A3', [tx('M0E-03-PASTESPECIAL.8')], { style: STILE_TITOLO }),
            blocco('A4', [[tx('M0E-03-PASTESPECIAL.9')], [tx('M0E-03-PASTESPECIAL.10')], [tx('M0E-03-PASTESPECIAL.11')]], { style: STILE_ETICHETTA }),
            blocco('B4', [[numA], [numB]], { style: STILE_INPUT }),
            blocco('B6', [['=B4+B5']], { style: STILE_FORMULA }),
            blocco('A7', [[tx('M0E-03-PASTESPECIAL.12')]], { style: STILE_ETICHETTA }),

            riga('A10', [tx('M0E-03-PASTESPECIAL.13')], { style: STILE_TITOLO }),
            blocco('A11', [[tx('M0E-03-PASTESPECIAL.14')]], { style: STILE_ETICHETTA }),
            riga('B11', serie, { style: STILE_INPUT }),
            blocco('A14', [[tx('M0E-03-PASTESPECIAL.15')]], { style: STILE_ETICHETTA }),

            areaLibera(['D7', 'B14', 'B15', 'B16', 'B17', 'B18']),
          ],
          { colWidths: { A: 260, B: 90, C: 40, D: 90, E: 90, F: 90 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0E-03-PASTESPECIAL.16'),
          8,
          'T1',
        ),
        hint('H2', tx('M0E-03-PASTESPECIAL.17'), 6, 'T1'),
        hint(
          'H3',
          tx('M0E-03-PASTESPECIAL.18'),
          8,
          'T2',
        ),
        hint('H4', tx('M0E-03-PASTESPECIAL.19'), 6, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 25 }),
      startAt: 'Model!B6',
    };
  },
});
