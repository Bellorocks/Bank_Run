/**
 * M8 · 03 — Debt Schedule: interessi, ammortamento obbligatorio e cash sweep.
 *
 * Il motore di rimborso del debito in un LBO, su tre anni:
 *
 *   Interessi       = debito di inizio anno × tasso (niente circolarita')
 *   Excess cash     = CFADS − interessi − ammortamento obbligatorio
 *   Cash sweep      = excess cash × quota di sweep
 *   Debito finale   = debito iniziale − ammortamento − cash sweep
 *
 * Il debito finale di un anno e' quello iniziale dell'anno dopo (gia'
 * collegato nel foglio). Ogni riga e' una formula sola copiata sui tre anni:
 * il task controlla coerenza, primo e ultimo anno.
 *
 * Vincolo per costruzione: il CFADS copre sempre interessi e ammortamento
 * (excess cash positivo), e il debito non si estingue entro l'anno 3.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
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

const ANNI = 3;
const COLONNE = ['C', 'D', 'E'] as const;

const B_TASSO = 'B4';
const B_AMORT = 'B5';
const B_SWEEP = 'B6';

const ROW_CFADS = 9;
const ROW_INIZIALE = 10;
const ROW_INTERESSI = 11;
const ROW_EXCESS = 12;
const ROW_SWEEP = 13;
const ROW_FINALE = 14;

const range = (row: number) => `${COLONNE[0]}${row}:${COLONNE[ANNI - 1]}${row}`;

export default defineTemplate({
  id: 'M8-03-DEBTSCHEDULE',
  module: 'M8',
  title: 'Debt schedule: ammortamento obbligatorio e cash sweep',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 420,
  skills: ['lbo.debt-schedule'],
  prerequisites: ['M8-02-DEBTSTRUCTURE', 'M0F-04-ITERATIVO'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const debito0 = roundTo(triangular(r, 35_000_000, 45_000_000, 55_000_000), 1_000_000);
    const tasso = roundTo(triangular(r, 0.06, 0.075, 0.09), 0.0025);
    const amort = roundTo(debito0 * triangular(r, 0.05, 0.075, 0.1), 250_000);
    const sweepPct = roundTo(triangular(r, 0.25, 0.5, 0.75), 0.05);
    const crescita = triangular(r, 0.05, 0.08, 0.12);
    const cfads1 = roundTo(debito0 * tasso + amort + triangular(r, 1_500_000, 3_000_000, 5_000_000), 100_000);
    const cfads = Array.from({ length: ANNI }, (_, t) => roundTo(cfads1 * Math.pow(1 + crescita, t), 100_000));

    const interessi: number[] = [];
    const excess: number[] = [];
    const sweep: number[] = [];
    const finale: number[] = [];
    let d = debito0;
    for (let t = 0; t < ANNI; t++) {
      const i = d * tasso;
      const x = cfads[t] - i - amort;
      if (x <= 0) throw new Error('M8-03: excess cash non positivo');
      const sw = x * sweepPct;
      interessi.push(i);
      excess.push(x);
      sweep.push(sw);
      d = d - amort - sw;
      finale.push(d);
    }
    if (d <= 0) throw new Error("M8-03: debito estinto prima dell'anno 3");

    const c1 = COLONNE[0];
    const tasks: Task[] = [
      rigaTask(
        'T1',
        ROW_INTERESSI,
        `Riga ${ROW_INTERESSI}: gli interessi di ogni anno, sul debito di inizio anno.`,
        interessi,
        [`${c1}${ROW_INIZIALE}`, B_TASSO],
      ),
      rigaTask(
        'T2',
        ROW_EXCESS,
        `Riga ${ROW_EXCESS}: l'excess cash, cioe' il CFADS che resta dopo aver pagato interessi e ammortamento obbligatorio.`,
        excess,
        [`${c1}${ROW_CFADS}`, `${c1}${ROW_INTERESSI}`, B_AMORT],
      ),
      rigaTask(
        'T3',
        ROW_SWEEP,
        `Riga ${ROW_SWEEP}: il cash sweep, la parte dell'excess cash che il contratto destina al rimborso anticipato.`,
        sweep,
        [`${c1}${ROW_EXCESS}`, B_SWEEP],
      ),
      rigaTask(
        'T4',
        ROW_FINALE,
        `Riga ${ROW_FINALE}: il debito di fine anno, dopo ammortamento obbligatorio e cash sweep.`,
        finale,
        [`${c1}${ROW_INIZIALE}`, B_AMORT, `${c1}${ROW_SWEEP}`],
      ),
    ];

    const brief = [
      '## Debt schedule',
      '',
      `Debito senior al closing: ${eur(debito0)}, al ${pct(tasso, 2)}. Il contratto prevede un ammortamento ` +
        `obbligatorio di ${eur(amort)} l'anno e un **cash sweep** del ${pct(sweepPct, 0)}: quella quota ` +
        "dell'excess cash va obbligatoriamente a rimborso anticipato.",
      '',
      "L'ordine conta: col CFADS si pagano prima gli interessi (sul debito di inizio anno), poi " +
        "l'ammortamento obbligatorio; quel che resta e' l'excess cash, e solo una parte di quello va in sweep.",
      '',
      'Costruisci le quattro righe del piano, una formula per riga copiata sui tre anni. Il debito di ' +
        "inizio anno e' gia' collegato a quello di fine anno precedente.",
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['DEBT SCHEDULE & CASH SWEEP'], { style: STILE_TITOLO }),
      riga('A3', ['Ipotesi'], { style: STILE_TITOLO }),
      colonna('A4', ["Tasso d'interesse", 'Ammortamento obbligatorio annuo, €', 'Quota di cash sweep'], {
        style: STILE_ETICHETTA,
      }),
      [{ ref: B_TASSO, content: tasso, style: { ...STILE_INPUT_PCT, numFmt: '0.00%' }, locked: true }],
      [{ ref: B_AMORT, content: amort, style: STILE_INPUT, locked: true }],
      [{ ref: B_SWEEP, content: sweepPct, style: { ...STILE_INPUT_PCT, numFmt: '0%' }, locked: true }],

      riga('A8', ['Piano (€)', 'Closing', ...COLONNE.map((_, i) => `Anno ${i + 1}`)], { style: STILE_TITOLO }),
      colonna(
        `A${ROW_CFADS}`,
        ['CFADS', 'Debito di inizio anno', 'Interessi', 'Excess cash', 'Cash sweep', 'Debito di fine anno'],
        { style: STILE_ETICHETTA },
      ),
      riga(`${c1}${ROW_CFADS}`, cfads, { style: STILE_INPUT }),
      riga(
        `${c1}${ROW_INIZIALE}`,
        COLONNE.map((_, i) => `=${i === 0 ? 'B' : COLONNE[i - 1]}${ROW_FINALE}`),
        { style: STILE_FORMULA },
      ),
      [{ ref: `B${ROW_FINALE}`, content: debito0, style: STILE_INPUT, locked: true }],
      ...[ROW_INTERESSI, ROW_EXCESS, ROW_SWEEP, ROW_FINALE].map((row) =>
        COLONNE.map((c) => ({
          ref: `${c}${row}`,
          content: null,
          locked: false,
          style: row === ROW_FINALE ? STILE_TOTALE : STILE_FORMULA,
        })),
      ),
    ]);

    return {
      templateId: 'M8-03-DEBTSCHEDULE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${c1}${ROW_INTERESSI}`,
      hints: [
        hint('H1', `In ${c1}${ROW_INTERESSI}: =${c1}${ROW_INIZIALE}*$B$4, poi copia a destra.`, 10, 'T1'),
        hint('H2', `In ${c1}${ROW_EXCESS}: =${c1}${ROW_CFADS}-${c1}${ROW_INTERESSI}-$B$5.`, 10, 'T2'),
        hint('H3', `In ${c1}${ROW_SWEEP}: =${c1}${ROW_EXCESS}*$B$6.`, 10, 'T3'),
        hint('H4', `In ${c1}${ROW_FINALE}: =${c1}${ROW_INIZIALE}-$B$5-${c1}${ROW_SWEEP}.`, 10, 'T4'),
      ],
    };
  },
});

function rigaTask(id: string, row: number, prompt: string, attesi: readonly number[], referenzia: readonly string[]): Task {
  const rg = range(row);
  return {
    id,
    prompt: `${prompt} Una formula in ${COLONNE[0]}${row}, copiata fino a ${COLONNE[ANNI - 1]}${row}.`,
    targetCell: `Model!${rg}`,
    check: [
      { kind: 'mustBeFormula' },
      { kind: 'value', expected: attesi[0] },
      { kind: 'value', expected: attesi[ANNI - 1], at: `${COLONNE[ANNI - 1]}${row}` },
      { kind: 'mustReference', cells: referenzia },
      { kind: 'mustNotContainLiteral', except: [] },
      { kind: 'consistentRow', range: `Model!${rg}` },
      { kind: 'noError' },
    ],
    skills: ['lbo.debt-schedule'],
    minKeystrokes: 20,
  };
}
