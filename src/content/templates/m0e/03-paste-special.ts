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

export default defineTemplate({
  id: 'M0E-03-PASTESPECIAL',
  module: 'M0-E',
  title: 'Ctrl+Alt+V: valori e trasposizione',
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
        'B6 contiene una formula vera: guardala nella barra della formula. Copiala (Ctrl+C), poi vai su ' +
        'D7 e incolla SOLO IL VALORE, non la formula: Ctrl+Alt+V per aprire Incolla speciale, poi il tasto ' +
        "V (Valori), poi Invio. Se in D7 finisce di nuovo una formula non hai fatto l'esercizio, anche se il " +
        'numero che vedi e\' quello giusto.',
      targetCell: 'Model!D7',
      check: [
        {
          kind: 'value',
          expected: totale,
          message:
            'D7 non contiene il numero atteso. Copia B6 e usa Ctrl+Alt+V poi V (Valori) poi Invio: non ' +
            'digitare il numero a mano e non incollare la formula intera.',
        },
      ],
      skills: ['spd.paste-special'],
      minKeystrokes: 8,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        `La serie orizzontale in B11:F11 va incollata come colonna a partire da B14. Seleziona B11:F11, ` +
        'copia (Ctrl+C), vai su B14, apri Incolla speciale (Ctrl+Alt+V), premi E (Trasponi), poi Invio. ' +
        "Controlla B18, l'ultima cella della colonna: e' li' che una trasposizione mancata si vede, perche' " +
        'senza il tasto E i cinque numeri finirebbero di nuovo in riga, non in colonna.',
      targetCell: 'Model!B18',
      check: [
        {
          kind: 'value',
          expected: serie[4],
          message:
            "B18 non e' l'ultimo numero della serie trasposta. Se e' vuota, la copia non e' arrivata fin " +
            "li': manca il tasto E (Trasponi) nella sotto-keymap di Ctrl+Alt+V.",
        },
      ],
      skills: ['spd.paste-special', 'spd.selection'],
      minKeystrokes: 12,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0E-03-PASTESPECIAL',
      seed: rng.seed,
      brief: [
        '## Ctrl+Alt+V ha una sotto-keymap',
        '',
        'Un Incolla speciale non e\' un\'unica azione: e\' un menu che si apre e a cui rispondi con una',
        'lettera sola, senza mai staccare le mani dalla tastiera. Le lettere sono quelle vere di Excel:',
        '',
        '- **V** — solo i valori, la formula sparisce e resta il numero',
        '- **F** — solo le formule',
        '- **T** — solo i formati',
        '- **E** — trasponi: una riga diventa una colonna (o viceversa)',
        '',
        'Poi **Invio** conferma. Niente mouse: qui e\' spento del tutto, e\' la regola di ogni livello di',
        'M0-E.',
        '',
        `Drill 1: B6 e' una formula che somma ${num(numA)} e ${num(numB)}. Il compito e' portarne SOLO il`,
        'risultato altrove, senza portarsi dietro la formula: Ctrl+Alt+V, poi V, poi Invio.',
        '',
        'Drill 2: una riga di cinque numeri va ribaltata in una colonna. Ctrl+Alt+V, poi E, poi Invio.',
        'Se dimentichi la E, Excel incolla la riga tale e quale: stessa forma, posto sbagliato.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Ctrl+Alt+V: incolla speciale'], { style: STILE_TITOLO }),

            riga('A3', ['Drill 1 — incolla solo il valore'], { style: STILE_TITOLO }),
            blocco('A4', [['Numero 1'], ['Numero 2'], ["Totale (e' una formula)"]], { style: STILE_ETICHETTA }),
            blocco('B4', [[numA], [numB]], { style: STILE_INPUT }),
            blocco('B6', [['=B4+B5']], { style: STILE_FORMULA }),
            blocco('A7', [['Incolla qui SOLO il valore ->']], { style: STILE_ETICHETTA }),

            riga('A10', ['Drill 2 — trasponi una riga in colonna'], { style: STILE_TITOLO }),
            blocco('A11', [['Serie orizzontale']], { style: STILE_ETICHETTA }),
            riga('B11', serie, { style: STILE_INPUT }),
            blocco('A14', [['Incolla qui trasposta v']], { style: STILE_ETICHETTA }),

            areaLibera(['D7', 'B14', 'B15', 'B16', 'B17', 'B18']),
          ],
          { colWidths: { A: 260, B: 90, C: 40, D: 90, E: 90, F: 90 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          'Ctrl+C su B6, freccia fino a D7, poi Ctrl+Alt+V. Nel dialogo premi V (Valori), non Invio subito.',
          8,
          'T1',
        ),
        hint('H2', "Se dopo Invio la barra della formula su D7 mostra ancora \"=\", hai incollato Tutto (A) invece di Valori (V).", 6, 'T1'),
        hint(
          'H3',
          'Seleziona B11:F11 con Maiusc+freccia destra x4, Ctrl+C, vai su B14, Ctrl+Alt+V, poi E, poi Invio.',
          8,
          'T2',
        ),
        hint('H4', "Senza E la riga resta una riga: controlla se i numeri sono finiti accanto a B14 invece che sotto.", 6, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 25 }),
      startAt: 'Model!B6',
    };
  },
});
