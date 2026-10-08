/**
 * M8 · 05 — Management Incentive Plan: sweet equity e ratchet.
 *
 * Il management riceve una quota dell'equity di uscita che sale (ratchet) se
 * lo sponsor raggiunge un MoIC minimo. La quota dipende da una condizione,
 * quindi la cella va costruita con IF: se cambia l'uscita, la quota deve
 * aggiornarsi da sola.
 *
 * Il seed decide se il ratchet scatta o no (circa meta' dei casi ciascuno),
 * e il MoIC realizzato non cade mai a meno di 0,1x dall'hurdle: nessun
 * pareggio ambiguo, e chi scrive la quota a mano sbaglia meta' delle volte.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  pct,
  multiplo,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
// Geometria fissa
const B_ENTRY_EQ = 'B4'; // Equity investita all'ingresso (dato)
const B_EXIT_EQ = 'B5'; // Equity lorda realizzata all'uscita (dato)

const B_HURDLE = 'B8'; // Soglia hurdle MoIC (dato)
const C_BASE_PCT = 'C8'; // Quota base (dato)
const C_RATCHET_PCT = 'C9'; // Quota ratchet (dato)

const B_ACT_MOIC = 'B12'; // T1
const B_MGT_PCT = 'B13'; // T2
const B_SPONSOR_NET = 'B14'; // T3

export default defineTemplate({
  id: 'M8-05-MIPRATCHET',
  module: 'M8',
  get title() {
    return tx('M8-05-MIPRATCHET.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.mip'],
  prerequisites: ['M8-01-SOURCESUSES'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const entryEq = roundTo(triangular(r, 20_000_000, 30_000_000, 40_000_000), 1_000_000);
    const hurdleMoic = roundTo(triangular(r, 2, 2.5, 3), 0.25);
    const basePct = roundTo(triangular(r, 0.04, 0.06, 0.08), 0.01);
    const ratchetPct = basePct + roundTo(triangular(r, 0.03, 0.05, 0.07), 0.01);

    // Sopra o sotto l'hurdle a caso, di 0,1x-0,8x.
    const sopra = r.next() < 0.5;
    const scarto = 0.1 + r.next() * 0.7;
    const realizedMoic = hurdleMoic + (sopra ? scarto : -scarto);
    const exitEq = roundTo(entryEq * realizedMoic, 100_000);

    const actualMoic = exitEq / entryEq;
    const mgtPct = actualMoic >= hurdleMoic ? ratchetPct : basePct;
    const sponsorNet = exitEq * (1 - mgtPct);

    const brief = [tx('M8-05-MIPRATCHET.2', { p0: eur(entryEq), p1: eur(exitEq), p2: pct(basePct, 0), p3: multiplo(hurdleMoic), p4: pct(ratchetPct, 0) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M8-05-MIPRATCHET.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M8-05-MIPRATCHET.4'), tx('M8-05-MIPRATCHET.20')], { style: STILE_TITOLO }),
      colonna('A4', [tx('M8-05-MIPRATCHET.5'), tx('M8-05-MIPRATCHET.6')], { style: STILE_ETICHETTA }),
      colonna(B_ENTRY_EQ, [entryEq, exitEq], { style: STILE_INPUT }),

      riga('A7', [tx('M8-05-MIPRATCHET.7'), tx('M8-05-MIPRATCHET.8'), tx('M8-05-MIPRATCHET.9')], { style: STILE_TITOLO }),
      colonna('A8', [tx('M8-05-MIPRATCHET.10'), tx('M8-05-MIPRATCHET.11')], { style: STILE_ETICHETTA }),
      [{ ref: B_HURDLE, content: hurdleMoic, style: STILE_INPUT_MULTIPLO, locked: true }],
      colonna(C_BASE_PCT, [basePct, ratchetPct], { style: STILE_INPUT_PCT }),

      riga('A11', [tx('M8-05-MIPRATCHET.12'), tx('M8-05-MIPRATCHET.21')], { style: STILE_TITOLO }),
      colonna('A12', [tx('M8-05-MIPRATCHET.13'), tx('M8-05-MIPRATCHET.14'), tx('M8-05-MIPRATCHET.15')], {
        style: STILE_ETICHETTA,
      }),
      colonna(B_ACT_MOIC, [null], { style: { ...STILE_FORMULA, numFmt: '0.00x' }, locked: false }),
      colonna(B_MGT_PCT, [null], { style: STILE_FORMULA_PCT, locked: false }),
      colonna(B_SPONSOR_NET, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M8-05-MIPRATCHET.16', { B_MGT_PCT }),
      targetCell: `Model!${B_MGT_PCT}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: mgtPct },
        { kind: 'mustReference', cells: [B_ACT_MOIC, B_HURDLE, C_RATCHET_PCT, C_BASE_PCT] },
        { kind: 'mustUseFunction', functions: ['IF'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['lbo.mip'],
      minKeystrokes: 22,
    };

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M8-05-MIPRATCHET.17', { B_ACT_MOIC }),
        target: `Model!${B_ACT_MOIC}`,
        atteso: actualMoic,
        referenzia: [B_EXIT_EQ, B_ENTRY_EQ],
        senzaLiteral: [],
        skills: ['lbo.mip'],
        minKeystrokes: 8,
      }),
      t2,
      taskFormula({
        id: 'T3',
        prompt: tx('M8-05-MIPRATCHET.18', { B_SPONSOR_NET }),
        target: `Model!${B_SPONSOR_NET}`,
        atteso: sponsorNet,
        referenzia: [B_EXIT_EQ, B_MGT_PCT],
        senzaLiteral: [1],
        skills: ['lbo.mip'],
        minKeystrokes: 12,
      }),
    ];

    return {
      templateId: 'M8-05-MIPRATCHET',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!${B_ACT_MOIC}`,
      hints: [
        hint('H1', '=B5/B4', 10, 'T1'),
        hint('H2', '=IF(B12>=B8,C9,C8)', 15, 'T2'),
        hint('H3', tx('M8-05-MIPRATCHET.19'), 10, 'T3'),
      ],
    };
  },
});
