/**
 * M0-A · 05 — Riferimento relativo, assoluto, misto (e F4).
 *
 * Struttura scelta apposta: una tabella che si riempie con UNA formula copiata
 * in DUE direzioni. E' l'unica forma in cui la differenza fra `$C$2`, `$B7` e
 * `C$6` diventa evidente invece che teorica — su una riga sola ci si arriva per
 * caso e non si impara niente.
 *
 * La formula corretta usa tutte e tre le forme di ancoraggio insieme:
 *   =$C$2 * $B7 * C$6
 *      ^^^^^ base: ferma sempre
 *            ^^^^ fattore di scenario: scende con le righe, non scivola a destra
 *                   ^^^^ moltiplicatore d'anno: scorre a destra, non scende
 * Sbagliarne uno solo produce zeri o numeri plausibili ma falsi: entrambi i modi
 * in cui questo errore si presenta nella vita vera.
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
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  num,
  pct,
} from '../../authoring';

import { tx } from '../../../i18n/content';
const ANNI = 4;

const SCENARI = () => ([
  { nome: tx('M0A-05-ANCORAGGI.16'), fattore: 0.9 },
  { nome: tx('M0A-05-ANCORAGGI.17'), fattore: 1.0 },
  { nome: tx('M0A-05-ANCORAGGI.18'), fattore: 1.15 },
] as const);

export default defineTemplate({
  id: 'M0A-05-ANCORAGGI',
  module: 'M0-A',
  get title() {
    return tx('M0A-05-ANCORAGGI.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['xl.references', 'xl.anchoring', 'xl.copy-shift'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');
    const base = r.int(80, 260) * 1000;
    const inflazione = Math.round((0.015 + r.next() * 0.035) * 1000) / 1000;

    const moltiplicatori = Array.from({ length: ANNI }, (_, i) =>
      Math.round(Math.pow(1 + inflazione, i) * 1e6) / 1e6,
    );
    const valore = (scenario: number, anno: number): number =>
      base * SCENARI()[scenario].fattore * moltiplicatori[anno];

    const totaleAmbizioso = moltiplicatori.reduce((acc, _m, a) => acc + valore(2, a), 0);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M0A-05-ANCORAGGI.2'),
        target: 'Model!C7',
        atteso: valore(0, 0),
        referenzia: ['C2', 'B7', 'C6'],
        ancoraggio: '$C$2',
        senzaLiteral: [],
        skills: ['xl.anchoring'],
        minKeystrokes: 18,
      }),
      {
        id: 'T2',
        prompt:
          tx('M0A-05-ANCORAGGI.3'),
        targetCell: 'Model!C7:F9',
        check: [
          { kind: 'consistentRow' as const, range: 'Model!C7:F9' },
          { kind: 'noError' as const },
        ],
        skills: ['xl.copy-shift'],
        minKeystrokes: 12,
      },
      {
        // Task a se' stante, non un check dentro T2: l'angolo in basso a destra
        // e' il punto in cui un ancoraggio sbagliato smette di nascondersi, e
        // merita un feedback tutto suo.
        id: 'T3',
        prompt:
          tx('M0A-05-ANCORAGGI.4'),
        targetCell: 'Model!F9',
        check: [
          { kind: 'mustBeFormula' as const },
          {
            kind: 'value' as const,
            expected: valore(2, ANNI - 1),
            message:
              tx('M0A-05-ANCORAGGI.5'),
          },
        ],
        skills: ['xl.anchoring'],
        minKeystrokes: 0,
      },
      taskFormula({
        id: 'T4',
        prompt: tx('M0A-05-ANCORAGGI.6'),
        target: 'Model!C11',
        atteso: totaleAmbizioso,
        referenzia: ['C9', 'F9'],
        skills: ['xl.aggregates'],
        minKeystrokes: 12,
      }),
    ];

    const intestazioniAnno = Array.from({ length: ANNI }, (_, i) => tx('common.anno', { n: i + 1 }));

    return {
      templateId: 'M0A-05-ANCORAGGI',
      seed: rng.seed,
      brief: [tx('M0A-05-ANCORAGGI.7', { p0: num(base), p1: pct(inflazione) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0A-05-ANCORAGGI.8')], { style: STILE_TITOLO }),
            blocco('A2', [[tx('M0A-05-ANCORAGGI.9')]], { style: STILE_ETICHETTA }),
            blocco('C2', [[base]], { style: STILE_INPUT }),
            blocco('A3', [[tx('M0A-05-ANCORAGGI.10')]], { style: STILE_ETICHETTA }),
            blocco('C3', [[inflazione]], { style: STILE_INPUT_PCT }),

            riga('A5', [tx('M0A-05-ANCORAGGI.19'), tx('M0A-05-ANCORAGGI.20')], { style: STILE_TITOLO }),
            riga('C5', intestazioniAnno, { style: STILE_TITOLO }),
            blocco('A6', [[tx('M0A-05-ANCORAGGI.11')]], { style: STILE_ETICHETTA }),
            riga('C6', moltiplicatori, { style: { ...STILE_FORMULA, numFmt: '0.000' } }),

            blocco('A7', SCENARI().map((s) => [s.nome, s.fattore]), { style: STILE_ETICHETTA }),
            blocco('A11', [[tx('M0A-05-ANCORAGGI.12')]], { style: STILE_ETICHETTA }),

            areaLibera([
              'C7', 'D7', 'E7', 'F7',
              'C8', 'D8', 'E8', 'F8',
              'C9', 'D9', 'E9', 'F9',
              'C11',
            ]),
          ],
          {
            colWidths: { A: 190, B: 90, C: 110, D: 110, E: 110, F: 110 },
            frozenRows: 6,
            frozenCols: 2,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0A-05-ANCORAGGI.13'),
          15,
          'T1',
        ),
        hint('H2', tx('M0A-05-ANCORAGGI.14'), 12, 'T2'),
        hint('H3', tx('M0A-05-ANCORAGGI.15'), 8, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 75 }),
      startAt: 'Model!C7',
    };
  },
});
