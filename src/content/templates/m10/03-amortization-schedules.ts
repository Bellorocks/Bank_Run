/**
 * M10 · 03 — Piani di Ammortamento: quota capitale costante, balloon e bullet.
 *
 * Tre profili di rimborso dello stesso prestito a 5 anni:
 *
 *   - lineare (all'italiana): quota capitale costante = capitale / durata,
 *     interessi sul debito di inizio anno, quindi decrescenti;
 *   - balloon: piccola quota capitale costante negli anni 1-4, maxirata
 *     finale pari al debito residuo;
 *   - bullet: nessun rimborso fino alla scadenza, interessi pieni ogni anno.
 *
 * Il punto didattico e' il costo: piu' il capitale resta in essere, piu'
 * interessi si pagano. L'ultimo task quantifica quanto costa in piu' il
 * bullet rispetto al lineare. Le righe di debito iniziale/finale sono gia'
 * collegate; il giocatore costruisce quote capitale e interessi.
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
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const ANNI = 5;
const COLONNE = ['C', 'D', 'E', 'F', 'G'] as const;

const B_PRINCIPAL = 'B4';
const B_YEARS = 'B5';
const B_RATE = 'B6';
const B_BALLOON_PCT = 'B7';

// Lineare
const ROW_L_INIZ = 10;
const ROW_L_QUOTA = 11;
const ROW_L_INT = 12;
const ROW_L_FINE = 13;
// Balloon
const ROW_B_INIZ = 16;
const ROW_B_QUOTA = 17;
const ROW_B_FINE = 18;
// Confronto
const B_BULLET_INT = 'B21';
const B_EXTRA = 'B22';

export default defineTemplate({
  id: 'M10-03-AMORTIZATION',
  module: 'M10',
  get title() {
    return tx('M10-03-AMORTIZATION.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 420,
  skills: ['cred.amortization'],
  prerequisites: ['M10-02-DEBTCAPACITY'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const principal = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 1_000_000);
    const rate = roundTo(triangular(r, 0.04, 0.06, 0.08), 0.0025);
    const balloonPct = roundTo(triangular(r, 0.03, 0.06, 0.1), 0.01);

    const quotaL = principal / ANNI;
    const iniziL = Array.from({ length: ANNI }, (_, t) => principal - quotaL * t);
    const intL = iniziL.map((d) => d * rate);
    const quotaB = principal * balloonPct;
    const balloon = principal - quotaB * (ANNI - 1);
    const bulletInt = principal * rate * ANNI;
    const extra = bulletInt - intL.reduce((a, b) => a + b, 0);

    const ultima = COLONNE[ANNI - 1];
    const penultima = COLONNE[ANNI - 2];
    const tasks: Task[] = [
      rigaTask('T1', `${COLONNE[0]}${ROW_L_QUOTA}:${ultima}${ROW_L_QUOTA}`, tx('M10-03-AMORTIZATION.2'), quotaL, quotaL, [B_PRINCIPAL, B_YEARS]),
      rigaTask(
        'T2',
        `${COLONNE[0]}${ROW_L_INT}:${ultima}${ROW_L_INT}`,
        tx('M10-03-AMORTIZATION.3'),
        intL[0],
        intL[ANNI - 1],
        [`${COLONNE[0]}${ROW_L_INIZ}`, B_RATE],
      ),
      rigaTask(
        'T3',
        `${COLONNE[0]}${ROW_B_QUOTA}:${penultima}${ROW_B_QUOTA}`,
        tx('M10-03-AMORTIZATION.4'),
        quotaB,
        quotaB,
        [B_PRINCIPAL, B_BALLOON_PCT],
      ),
      taskFormula({
        id: 'T4',
        prompt: tx('M10-03-AMORTIZATION.5', { ultima, ROW_B_QUOTA }),
        target: `Model!${ultima}${ROW_B_QUOTA}`,
        atteso: balloon,
        referenzia: [`${ultima}${ROW_B_INIZ}`],
        senzaLiteral: [],
        skills: ['cred.amortization'],
        minKeystrokes: 5,
      }),
      taskFormula({
        id: 'T5',
        prompt: tx('M10-03-AMORTIZATION.6', { B_BULLET_INT }),
        target: `Model!${B_BULLET_INT}`,
        atteso: bulletInt,
        referenzia: [B_PRINCIPAL, B_RATE, B_YEARS],
        senzaLiteral: [],
        skills: ['cred.amortization'],
        minKeystrokes: 10,
      }),
      taskFormula({
        id: 'T6',
        prompt: tx('M10-03-AMORTIZATION.7', { B_EXTRA }),
        target: `Model!${B_EXTRA}`,
        atteso: extra,
        referenzia: [B_BULLET_INT, `${COLONNE[0]}${ROW_L_INT}`, `${ultima}${ROW_L_INT}`],
        senzaLiteral: [],
        skills: ['cred.amortization'],
        minKeystrokes: 14,
      }),
    ];

    const brief = [tx('M10-03-AMORTIZATION.8', { p0: eur(principal), ANNI, p2: pct(rate, 2), p3: pct(balloonPct, 0) })].join('\n');

    const intest = ['', ...COLONNE.map((_, i) => tx('common.anno', { n: i + 1 }))];
    const iniz = (row: number, rowFine: number) =>
      riga(`${COLONNE[0]}${row}`, COLONNE.map((_, i) => (i === 0 ? `=${B_PRINCIPAL}` : `=${COLONNE[i - 1]}${rowFine}`)), {
        style: STILE_FORMULA,
      });
    const fine = (row: number, rowIniz: number, rowQuota: number) =>
      riga(`${COLONNE[0]}${row}`, COLONNE.map((c) => `=${c}${rowIniz}-${c}${rowQuota}`), { style: STILE_FORMULA });
    const libere = (row: number, cols: readonly string[]) =>
      cols.map((c) => ({ ref: `${c}${row}`, content: null, locked: false, style: STILE_FORMULA }));

    const sheet = foglio('Model', [
      riga('A1', [tx('M10-03-AMORTIZATION.9')], { style: STILE_TITOLO }),
      riga('A3', [tx('M10-03-AMORTIZATION.27'), tx('M10-03-AMORTIZATION.28')], { style: STILE_TITOLO }),
      colonna('A4', [tx('M10-03-AMORTIZATION.10'), tx('M10-03-AMORTIZATION.11'), tx('M10-03-AMORTIZATION.12'), tx('M10-03-AMORTIZATION.13')], {
        style: STILE_ETICHETTA,
      }),
      [{ ref: B_PRINCIPAL, content: principal, style: STILE_INPUT, locked: true }],
      [{ ref: B_YEARS, content: ANNI, style: { ...STILE_INPUT, numFmt: '0' }, locked: true }],
      [{ ref: B_RATE, content: rate, style: { ...STILE_INPUT_PCT, numFmt: '0.00%' }, locked: true }],
      [{ ref: B_BALLOON_PCT, content: balloonPct, style: { ...STILE_INPUT_PCT, numFmt: '0%' }, locked: true }],

      riga('A9', [tx('M10-03-AMORTIZATION.14'), ...intest.slice(1)], { style: STILE_TITOLO }),
      colonna(`A${ROW_L_INIZ}`, [tx('M10-03-AMORTIZATION.15'), tx('M10-03-AMORTIZATION.16'), tx('M10-03-AMORTIZATION.29'), tx('M10-03-AMORTIZATION.17')], {
        style: STILE_ETICHETTA,
      }),
      iniz(ROW_L_INIZ, ROW_L_FINE),
      libere(ROW_L_QUOTA, COLONNE),
      libere(ROW_L_INT, COLONNE),
      fine(ROW_L_FINE, ROW_L_INIZ, ROW_L_QUOTA),

      riga('A15', [tx('M10-03-AMORTIZATION.18'), ...intest.slice(1)], { style: STILE_TITOLO }),
      colonna(`A${ROW_B_INIZ}`, [tx('M10-03-AMORTIZATION.19'), tx('M10-03-AMORTIZATION.20'), tx('M10-03-AMORTIZATION.21')], {
        style: STILE_ETICHETTA,
      }),
      iniz(ROW_B_INIZ, ROW_B_FINE),
      libere(ROW_B_QUOTA, COLONNE),
      fine(ROW_B_FINE, ROW_B_INIZ, ROW_B_QUOTA),

      riga('A20', [tx('M10-03-AMORTIZATION.30'), '€'], { style: STILE_TITOLO }),
      colonna('A21', [tx('M10-03-AMORTIZATION.22'), tx('M10-03-AMORTIZATION.23')], {
        style: STILE_ETICHETTA,
      }),
      [{ ref: B_BULLET_INT, content: null, locked: false, style: STILE_FORMULA }],
      [{ ref: B_EXTRA, content: null, locked: false, style: STILE_TOTALE }],
    ]);

    return {
      templateId: 'M10-03-AMORTIZATION',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${COLONNE[0]}${ROW_L_QUOTA}`,
      hints: [
        hint('H1', tx('M10-03-AMORTIZATION.24', { ROW_L_QUOTA }), 10, 'T1'),
        hint('H2', `In C${ROW_L_INT}: =C${ROW_L_INIZ}*$B$6.`, 10, 'T2'),
        hint('H3', tx('M10-03-AMORTIZATION.25', { ROW_B_QUOTA, ROW_B_INIZ }), 10, 'T3'),
        hint('H4', `=B4*B6*B5; poi =B21-SUM(C${ROW_L_INT}:G${ROW_L_INT}).`, 10, 'T6'),
      ],
    };
  },
});

function rigaTask(
  id: string,
  rg: string,
  cosa: string,
  primo: number,
  ultimo: number,
  referenzia: readonly string[],
): Task {
  const [da, a] = rg.split(':');
  return {
    id,
    prompt: tx('M10-03-AMORTIZATION.26', { da, a, cosa }),
    targetCell: `Model!${rg}`,
    check: [
      { kind: 'mustBeFormula' },
      { kind: 'value', expected: primo },
      { kind: 'value', expected: ultimo, at: a },
      { kind: 'mustReference', cells: referenzia },
      { kind: 'mustNotContainLiteral', except: [] },
      { kind: 'consistentRow', range: `Model!${rg}` },
      { kind: 'noError' },
    ],
    skills: ['cred.amortization'],
    minKeystrokes: 16,
  };
}
