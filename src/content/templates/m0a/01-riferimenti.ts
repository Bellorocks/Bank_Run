/**
 * M0-A · 01 — La griglia e il riferimento di cella.
 *
 * Il primo livello del gioco. Non da' niente per scontato: una cella ha un nome,
 * il segno `=` cambia la natura di quello che scrivi, e una formula puo' puntare
 * a un'altra formula.
 *
 * Il punto didattico e' T3: il risultato si costruisce referenziando una cella
 * che a sua volta e' una formula. Chi arriva da una calcolatrice sommerebbe di
 * nuovo tutto da capo, ed e' esattamente l'abitudine da rompere subito.
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
  eur,
} from '../../authoring';
import { revenue } from '../../../rng/finance';

import { tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0A-01-RIFERIMENTI',
  module: 'M0-A',
  get title() {
    return tx('M0A-01-RIFERIMENTI.title');
  },
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 120,
  skills: ['xl.grid', 'xl.formula-basics'],
  prerequisites: [],

  generate: (rng) => {
    const r = rng.fork('dati');
    // Numeri tondi al primo livello: qui si impara la meccanica, non l'aritmetica.
    const ricavi = Math.round(revenue(r) / 100_000) * 100_000;
    const costi = Math.round((ricavi * (0.6 + r.next() * 0.2)) / 100_000) * 100_000;
    const aumento = r.int(2, 9) * 50_000;
    const margine = ricavi - costi;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M0A-01-RIFERIMENTI.2'),
        target: 'Model!B4',
        atteso: margine,
        referenzia: ['B2', 'B3'],
        senzaLiteral: [],
        skills: ['xl.formula-basics'],
        minKeystrokes: 8,
      }),
      {
        id: 'T2',
        prompt:
          tx('M0A-01-RIFERIMENTI.3'),
        targetCell: 'Model!B6',
        check: [{ kind: 'text' as const, expected: 'B2' }],
        skills: ['xl.grid'],
        minKeystrokes: 4,
      },
      taskFormula({
        id: 'T3',
        prompt:
          tx('M0A-01-RIFERIMENTI.4'),
        target: 'Model!B8',
        atteso: margine + aumento,
        referenzia: ['B4', 'B7'],
        senzaLiteral: [],
        skills: ['xl.formula-basics'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M0A-01-RIFERIMENTI',
      seed: rng.seed,
      brief: [tx('M0A-01-RIFERIMENTI.5', { p0: eur(ricavi), p1: eur(costi) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0A-01-RIFERIMENTI.6')], { style: STILE_TITOLO }),
            blocco('A2', [[tx('M0A-01-RIFERIMENTI.13')], [tx('M0A-01-RIFERIMENTI.14')], [tx('M0A-01-RIFERIMENTI.15')]], { style: STILE_ETICHETTA }),
            blocco('A6', [[tx('M0A-01-RIFERIMENTI.7')]], { style: STILE_ETICHETTA }),
            blocco('A7', [[tx('M0A-01-RIFERIMENTI.8')]], { style: STILE_ETICHETTA }),
            blocco('A8', [[tx('M0A-01-RIFERIMENTI.9')]], { style: STILE_ETICHETTA }),
            // Gli input sono blu: e' la convenzione di mestiere che il grader
            // verifichera' dal rank 3, ma la si vede applicata fin da qui.
            blocco('B2', [[ricavi], [costi]], { style: STILE_INPUT }),
            blocco('B7', [[aumento]], { style: STILE_INPUT }),
            areaLibera(['B4', 'B6', 'B8']),
          ],
          { colWidths: { A: 240, B: 130 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M0A-01-RIFERIMENTI.10'), 8, 'T1'),
        hint('H2', tx('M0A-01-RIFERIMENTI.11'), 8, 'T2'),
        hint('H3', tx('M0A-01-RIFERIMENTI.12'), 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 40 }),
      startAt: 'Model!B4',
    };
  },
});
