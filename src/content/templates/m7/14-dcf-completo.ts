/**
 * M7 · 14 — DCF completo e reconciliation al valore di mercato.
 *
 * Il livello di chiusura del modulo valutazioni: dai free cash flow
 * proiettati all'Enterprise Value, costruito per intero dal giocatore.
 *
 *   Fattore di sconto (riga)   = 1 / (1 + WACC)^t           (fine anno)
 *   PV dei FCF (riga)          = FCF × fattore
 *   Somma PV FCF espliciti
 *   Terminal value (Gordon)    = FCF anno 5 × (1 + g) / (WACC − g)
 *   PV del terminal value      = TV × fattore dell'anno 5
 *   Enterprise Value           = somma PV + PV del TV
 *   Peso del TV sull'EV        = PV TV / EV
 *   Reconciliation col mercato = (EV di mercato − EV DCF) / EV DCF
 *
 * Il peso del terminal value e' il dato che un buon analista guarda per
 * primo: quasi sempre oltre meta' del valore sta dopo l'orizzonte esplicito.
 * Vincolo per costruzione: WACC supera g di almeno 3 punti.
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
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';
import type { CellStyle } from '../../../engine/types';

import { tx } from '../../../i18n/content';
const ANNI = 5;
const COLONNE = ['C', 'D', 'E', 'F', 'G'] as const;
const ULTIMA = COLONNE[ANNI - 1];

const B_WACC = 'B4';
const B_G = 'B5';
const B_EV_MKT = 'B6';

const ROW_INTEST = 9;
const ROW_FCF = 10;
const ROW_T = 11;
const ROW_DF = 12;
const ROW_PV = 13;

const B_SUM_PV = 'B16';
const B_TV = 'B17';
const B_PV_TV = 'B18';
const B_EV = 'B19';
const B_PESO_TV = 'B20';
const B_RECON = 'B21';

const STILE_FATTORE: CellStyle = { ...STILE_FORMULA, numFmt: '0.0000' };

export default defineTemplate({
  id: 'M7-14-DCFCOMPLETO',
  module: 'M7',
  get title() {
    return tx('M7-14-DCFCOMPLETO.title');
  },
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 600,
  skills: ['dcf.terminal-value', 'dcf.wacc', 'dcf.build-fcf'],
  prerequisites: [
    'M7-07-WACC',
    'M7-08-STRUTTURATARGET',
    'M7-10-EXITMULTIPLE',
    'M7-11-CAPEXTERMINALE',
    'M7-12-NOL',
    'M7-13-SENSITIVITY',
  ],
  combo: true,

  generate: (rng) => {
    const r = rng.fork('dati');

    const wacc = roundTo(triangular(r, 0.075, 0.09, 0.11), 0.0025);
    const g = roundTo(Math.min(wacc - 0.03, triangular(r, 0.01, 0.02, 0.03)), 0.0025);
    const fcf1 = roundTo(triangular(r, 8_000_000, 12_000_000, 18_000_000), 100_000);
    const crescite = Array.from({ length: ANNI - 1 }, () => triangular(r, 0.02, 0.06, 0.1));
    const fcf = [fcf1];
    for (const c of crescite) fcf.push(roundTo(fcf[fcf.length - 1] * (1 + c), 100_000));

    const df = fcf.map((_, t) => 1 / Math.pow(1 + wacc, t + 1));
    const pv = fcf.map((x, t) => x * df[t]);
    const sumPv = pv.reduce((a, b) => a + b, 0);
    const tv = (fcf[ANNI - 1] * (1 + g)) / (wacc - g);
    const pvTv = tv * df[ANNI - 1];
    const ev = sumPv + pvTv;
    const pesoTv = pvTv / ev;
    const evMkt = roundTo(ev * triangular(r, 0.8, 1, 1.25), 1_000_000);
    const recon = (evMkt - ev) / ev;

    const rigaTask = (id: string, row: number, cosa: string, attesi: number[], referenzia: string[]): Task => {
      const rg = `${COLONNE[0]}${row}:${ULTIMA}${row}`;
      return {
        id,
        prompt: tx('M7-14-DCFCOMPLETO.2', { row, cosa, p2: COLONNE[0], ULTIMA }),
        targetCell: `Model!${rg}`,
        check: [
          { kind: 'mustBeFormula' },
          { kind: 'value', expected: attesi[0] },
          { kind: 'value', expected: attesi[ANNI - 1], at: `${ULTIMA}${row}` },
          { kind: 'mustReference', cells: referenzia },
          { kind: 'mustNotContainLiteral', except: [1] },
          { kind: 'consistentRow', range: `Model!${rg}` },
          { kind: 'noError' },
        ],
        skills: ['dcf.build-fcf'],
        minKeystrokes: 18,
      };
    };
    const cella = (id: string, target: string, prompt: string, atteso: number, referenzia: string[], ammessi: number[] = []) =>
      taskFormula({
        id,
        prompt,
        target: `Model!${target}`,
        atteso,
        referenzia,
        senzaLiteral: ammessi,
        skills: ['dcf.terminal-value'],
        minKeystrokes: 14,
      });

    const c1 = COLONNE[0];
    const tasks: Task[] = [
      rigaTask('T1', ROW_DF, tx('M7-14-DCFCOMPLETO.3'), df, [`${c1}${ROW_T}`, B_WACC]),
      rigaTask('T2', ROW_PV, tx('M7-14-DCFCOMPLETO.4'), pv, [`${c1}${ROW_FCF}`, `${c1}${ROW_DF}`]),
      cella('T3', B_SUM_PV, tx('M7-14-DCFCOMPLETO.5', { B_SUM_PV }), sumPv, [`${c1}${ROW_PV}`, `${ULTIMA}${ROW_PV}`]),
      cella(
        'T4',
        B_TV,
        tx('M7-14-DCFCOMPLETO.6', { B_TV, ANNI }),
        tv,
        [`${ULTIMA}${ROW_FCF}`, B_G, B_WACC],
        [1],
      ),
      cella('T5', B_PV_TV, tx('M7-14-DCFCOMPLETO.7', { B_PV_TV }), pvTv, [B_TV, `${ULTIMA}${ROW_DF}`]),
      cella('T6', B_EV, tx('M7-14-DCFCOMPLETO.8', { B_EV }), ev, [B_SUM_PV, B_PV_TV]),
      cella('T7', B_PESO_TV, tx('M7-14-DCFCOMPLETO.9', { B_PESO_TV }), pesoTv, [B_PV_TV, B_EV]),
      cella(
        'T8',
        B_RECON,
        tx('M7-14-DCFCOMPLETO.10', { B_RECON, B_EV_MKT }),
        recon,
        [B_EV_MKT, B_EV],
      ),
    ];

    const brief = [tx('M7-14-DCFCOMPLETO.11', { p0: pct(wacc, 2), ANNI, p2: pct(g, 2), p3: eur(evMkt) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M7-14-DCFCOMPLETO.12')], { style: STILE_TITOLO }),
      riga('A3', [tx('M7-14-DCFCOMPLETO.27'), tx('M7-14-DCFCOMPLETO.28')], { style: STILE_TITOLO }),
      colonna('A4', [tx('M7-14-DCFCOMPLETO.29'), tx('M7-14-DCFCOMPLETO.13'), tx('M7-14-DCFCOMPLETO.14')], { style: STILE_ETICHETTA }),
      [{ ref: B_WACC, content: wacc, style: { ...STILE_INPUT_PCT, numFmt: '0.00%' }, locked: true }],
      [{ ref: B_G, content: g, style: { ...STILE_INPUT_PCT, numFmt: '0.00%' }, locked: true }],
      [{ ref: B_EV_MKT, content: evMkt, style: STILE_INPUT, locked: true }],

      riga(`A${ROW_INTEST}`, [tx('M7-14-DCFCOMPLETO.15'), '', ...COLONNE.map((_, i) => tx('common.anno', { n: i + 1 }))], { style: STILE_TITOLO }),
      colonna(`A${ROW_FCF}`, [tx('M7-14-DCFCOMPLETO.16'), tx('M7-14-DCFCOMPLETO.17'), tx('M7-14-DCFCOMPLETO.18'), tx('M7-14-DCFCOMPLETO.19')], {
        style: STILE_ETICHETTA,
      }),
      riga(`${c1}${ROW_FCF}`, fcf, { style: STILE_INPUT }),
      riga(`${c1}${ROW_T}`, COLONNE.map((_, i) => i + 1), { style: { ...STILE_INPUT, numFmt: '0' } }),
      COLONNE.map((c) => ({ ref: `${c}${ROW_DF}`, content: null, locked: false, style: STILE_FATTORE })),
      COLONNE.map((c) => ({ ref: `${c}${ROW_PV}`, content: null, locked: false, style: STILE_FORMULA })),

      riga('A15', [tx('M7-14-DCFCOMPLETO.30'), tx('M7-14-DCFCOMPLETO.31')], { style: STILE_TITOLO }),
      colonna(
        'A16',
        [
          tx('M7-14-DCFCOMPLETO.20'),
          tx('M7-14-DCFCOMPLETO.21', { ANNI }),
          tx('M7-14-DCFCOMPLETO.22'),
          tx('M7-14-DCFCOMPLETO.23'),
          tx('M7-14-DCFCOMPLETO.24'),
          tx('M7-14-DCFCOMPLETO.25'),
        ],
        { style: STILE_ETICHETTA },
      ),
      [{ ref: B_SUM_PV, content: null, locked: false, style: STILE_FORMULA }],
      [{ ref: B_TV, content: null, locked: false, style: STILE_FORMULA }],
      [{ ref: B_PV_TV, content: null, locked: false, style: STILE_FORMULA }],
      [{ ref: B_EV, content: null, locked: false, style: STILE_TOTALE }],
      [{ ref: B_PESO_TV, content: null, locked: false, style: STILE_FORMULA_PCT }],
      [{ ref: B_RECON, content: null, locked: false, style: STILE_FORMULA_PCT }],
    ], { colWidths: { A: 300, B: 140, C: 120, D: 120, E: 120, F: 120, G: 120 } });

    return {
      templateId: 'M7-14-DCFCOMPLETO',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${c1}${ROW_DF}`,
      hints: [
        hint('H1', tx('M7-14-DCFCOMPLETO.26', { c1, ROW_DF, ROW_T }), 15, 'T1'),
        hint('H2', `In ${c1}${ROW_PV}: =${c1}${ROW_FCF}*${c1}${ROW_DF}.`, 10, 'T2'),
        hint('H3', `=${ULTIMA}${ROW_FCF}*(1+B5)/(B4-B5)`, 15, 'T4'),
        hint('H4', tx('M7-14-DCFCOMPLETO.h4', { ULTIMA, ROW_DF }), 10, 'T5'),
        hint('H5', '=(B6-B19)/B19', 10, 'T8'),
      ],
    };
  },
});
