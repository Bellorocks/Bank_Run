/**
 * M8 · 10 — Exit Timing: scenari temporali e trade-off tra MoIC e IRR.
 *
 * Il momento dell'uscita (anno 3, 5 o 7) cambia la dinamica dei rendimenti:
 * allungare l'holding period fa crescere il MoIC, ma non e' detto che faccia
 * crescere l'IRR, perche' il tempo pesa all'esponente:
 *
 *   IRR = MoIC^(1/anni) − 1
 *
 * I tre MoIC sono estratti dal seed, quindi lo scenario con l'IRR piu' alto
 * cambia da partita a partita: il secondo task chiede di farlo trovare al
 * foglio, non all'occhio. Nessun pareggio: gli IRR distano sempre piu' di
 * 0,2 punti.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  eur,
  multiplo,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const ANNI = [3, 5, 7] as const;
const COLONNE = ['B', 'C', 'D'] as const;
const ETICHETTE = () => [3, 5, 7].map((n) => tx('M8-10-EXITTIMING.anni', { n }));

const B_ENTRY = 'B4';
const ROW_INTEST = 6;
const ROW_ANNI = 7;
const ROW_EXIT = 8;
const ROW_MOIC = 9;
const ROW_IRR = 10;
const B_MIGLIORE = 'B12';

export default defineTemplate({
  id: 'M8-10-EXITTIMING',
  module: 'M8',
  get title() {
    return tx('M8-10-EXITTIMING.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.exit'],
  prerequisites: ['M8-06-RETURNSIRRMOIC'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const entryEq = roundTo(triangular(r, 25_000_000, 30_000_000, 40_000_000), 1_000_000);

    let moic: number[] = [];
    let irr: number[] = [];
    // Ritenta finche' gli IRR non sono ben separati (al massimo poche volte).
    for (let tentativo = 0; ; tentativo++) {
      const m3 = roundTo(triangular(r, 1.6, 2, 2.5), 0.05);
      const m5 = roundTo(m3 * triangular(r, 1.15, 1.35, 1.65), 0.05);
      const m7 = roundTo(m5 * triangular(r, 1.1, 1.3, 1.55), 0.05);
      moic = [m3, m5, m7];
      irr = moic.map((m, i) => Math.pow(m, 1 / ANNI[i]) - 1);
      const ordinati = [...irr].sort((a, b) => b - a);
      if (ordinati[0] - ordinati[1] > 0.002 || tentativo > 50) break;
    }
    const exit = moic.map((m) => roundTo(entryEq * m, 100_000));
    // Il MoIC nel foglio e' exit/entry: gli attesi partono dagli importi arrotondati.
    const moicFoglio = exit.map((x) => x / entryEq);
    const irrFoglio = moicFoglio.map((m, i) => Math.pow(m, 1 / ANNI[i]) - 1);
    const migliore = ETICHETTE()[irrFoglio.indexOf(Math.max(...irrFoglio))];

    const rg = `${COLONNE[0]}${ROW_IRR}:${COLONNE[2]}${ROW_IRR}`;
    const tasks: Task[] = [
      {
        id: 'T1',
        prompt:
          tx('M8-10-EXITTIMING.2', { ROW_IRR }),
        targetCell: `Model!${rg}`,
        check: [
          { kind: 'mustBeFormula' },
          { kind: 'value', expected: irrFoglio[0] },
          { kind: 'value', expected: irrFoglio[2], at: `D${ROW_IRR}` },
          { kind: 'mustReference', cells: [`B${ROW_MOIC}`, `B${ROW_ANNI}`] },
          { kind: 'mustNotContainLiteral', except: [1] },
          { kind: 'consistentRow', range: `Model!${rg}` },
          { kind: 'noError' },
        ],
        skills: ['lbo.exit'],
        minKeystrokes: 20,
      },
      {
        id: 'T2',
        prompt:
          tx('M8-10-EXITTIMING.3', { B_MIGLIORE, ROW_INTEST }),
        targetCell: `Model!${B_MIGLIORE}`,
        check: [
          { kind: 'mustBeFormula' },
          { kind: 'text', expected: migliore },
          { kind: 'mustReference', cells: [`B${ROW_IRR}`, `D${ROW_IRR}`] },
        ],
        skills: ['lbo.exit', 'xl.index-match'],
        minKeystrokes: 40,
      },
    ];

    const brief = [tx('M8-10-EXITTIMING.4', { p0: eur(entryEq) }), ...ANNI.map((a, i) => tx('M8-10-EXITTIMING.5', { a, p1: eur(exit[i]), p2: multiplo(moic[i]) })), tx('M8-10-EXITTIMING.6')].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M8-10-EXITTIMING.7')], { style: STILE_TITOLO }),
      riga('A3', [tx('M8-10-EXITTIMING.8'), tx('M8-10-EXITTIMING.9')], { style: STILE_TITOLO }),
      colonna('A4', [tx('M8-10-EXITTIMING.10')], { style: STILE_ETICHETTA }),
      [{ ref: B_ENTRY, content: entryEq, style: STILE_INPUT, locked: true }],

      riga(`A${ROW_INTEST}`, [tx('M8-10-EXITTIMING.17'), ...ETICHETTE()], { style: STILE_TITOLO }),
      colonna(
        `A${ROW_ANNI}`,
        [tx('M8-10-EXITTIMING.11'), tx('M8-10-EXITTIMING.12'), tx('M8-10-EXITTIMING.13'), tx('M8-10-EXITTIMING.14')],
        { style: STILE_ETICHETTA },
      ),
      riga(`B${ROW_ANNI}`, [...ANNI], { style: { ...STILE_INPUT, numFmt: '0' } }),
      riga(`B${ROW_EXIT}`, exit, { style: STILE_INPUT }),
      riga(
        `B${ROW_MOIC}`,
        COLONNE.map((c) => `=${c}${ROW_EXIT}/$B$4`),
        { style: { ...STILE_FORMULA, numFmt: '0.00x' } },
      ),
      riga(`B${ROW_IRR}`, [null, null, null], { style: STILE_FORMULA_PCT, locked: false }),

      colonna(`A${B_MIGLIORE.slice(1)}`, [tx('M8-10-EXITTIMING.15')], { style: STILE_ETICHETTA }),
      [{ ref: B_MIGLIORE, content: null, locked: false, style: { ...STILE_FORMULA, numFmt: '@' } }],
    ]);

    return {
      templateId: 'M8-10-EXITTIMING',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!B${ROW_IRR}`,
      hints: [
        hint('H1', tx('M8-10-EXITTIMING.16', { ROW_IRR, ROW_MOIC, ROW_ANNI }), 10, 'T1'),
        hint(
          'H2',
          `=INDEX(B${ROW_INTEST}:D${ROW_INTEST},MATCH(MAX(${rg}),${rg},0)): cerca il massimo e restituisci l'intestazione.`,
          15,
          'T2',
        ),
      ],
    };
  },
});
