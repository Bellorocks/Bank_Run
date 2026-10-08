/**
 * M10 · 04 — Stress Test di Credito: shock su ricavi, margini e tassi.
 *
 * Le banche verificano la tenuta del debito in uno scenario avverso:
 *
 *   EBITDA stressato   = ricavi × (1 + shock ricavi) × (margine + shock margine)
 *   Interessi stressati = debito × tasso stressato
 *   DSCR stressato     = EBITDA stressato × conversione in cassa / (interessi + quota capitale)
 *   Esito              = "BREACH" se il DSCR stressato scende sotto il covenant, altrimenti "OK"
 *
 * Tutte le ipotesi stanno in cella (nessun 60% nascosto dentro una formula)
 * e il seed decide se lo scenario rompe il covenant: circa meta' dei casi
 * ciascuno, mai a meno di 0,05x dalla soglia.
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
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const B_REV_BASE = 'B4';
const B_MRG_BASE = 'B5';
const B_DEBT = 'B6';
const B_MAND_AMORT = 'B7';
const B_CONV = 'B8';

const B_REV_SHOCK = 'B11';
const B_MRG_SHOCK = 'B12';
const B_RATE_STRESS = 'B13';
const B_MIN_DSCR = 'B14';

const B_EBITDA_STRESS = 'B17'; // T1
const B_INT_STRESS = 'B18'; // T2
const B_DSCR_STRESS = 'B19'; // T3
const B_ESITO = 'B20'; // T4

export default defineTemplate({
  id: 'M10-04-STRESSTEST',
  module: 'M10',
  get title() {
    return tx('M10-04-STRESSTEST.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['cred.stress'],
  prerequisites: ['M10-03-AMORTIZATION', 'M8-04-COVENANTS'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const revBase = roundTo(triangular(r, 80_000_000, 100_000_000, 120_000_000), 1_000_000);
    const mrgBase = roundTo(triangular(r, 0.15, 0.2, 0.25), 0.005);
    const conv = roundTo(triangular(r, 0.5, 0.6, 0.7), 0.05);
    const revShock = -roundTo(triangular(r, 0.1, 0.15, 0.25), 0.01);
    const mrgShock = -roundTo(triangular(r, 0.015, 0.03, 0.045), 0.005);
    const rateStress = roundTo(triangular(r, 0.07, 0.085, 0.1), 0.0025);
    const minDscr = roundTo(triangular(r, 1.05, 1.15, 1.25), 0.05);

    const revStress = revBase * (1 + revShock);
    const mrgStress = mrgBase + mrgShock;
    const ebitdaStress = revStress * mrgStress;
    const cfadsStress = ebitdaStress * conv;

    // Il debito si dimensiona per far cadere il DSCR stressato sopra o sotto il
    // covenant a caso, di 0,05x-0,45x.
    const sopra = r.next() < 0.5;
    const target = minDscr + (sopra ? 1 : -1) * (0.05 + r.next() * 0.4);
    const amortPct = roundTo(triangular(r, 0.08, 0.1, 0.15), 0.01);
    // servizio = debito × (tasso + amortPct) = cfads / target
    const debt = roundTo(cfadsStress / target / (rateStress + amortPct), 500_000);
    const mandAmort = roundTo(debt * amortPct, 100_000);

    const intStress = debt * rateStress;
    const dscrStress = cfadsStress / (intStress + mandAmort);
    const esito = dscrStress < minDscr ? 'BREACH' : 'OK';

    const brief = [tx('M10-04-STRESSTEST.2', { p0: eur(revBase), p1: pct(mrgBase), p2: eur(debt), p3: eur(mandAmort), p4: pct(conv, 0), p5: pct(revShock, 0), p6: pct(mrgShock), p7: pct(rateStress, 2), p8: multiplo(minDscr) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M10-04-STRESSTEST.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M10-04-STRESSTEST.4'), tx('M10-04-STRESSTEST.24')], { style: STILE_TITOLO }),
      colonna(
        'A4',
        [
          tx('M10-04-STRESSTEST.5'),
          tx('M10-04-STRESSTEST.6'),
          tx('M10-04-STRESSTEST.7'),
          tx('M10-04-STRESSTEST.8'),
          tx('M10-04-STRESSTEST.9'),
        ],
        { style: STILE_ETICHETTA },
      ),
      [{ ref: B_REV_BASE, content: revBase, style: STILE_INPUT, locked: true }],
      [{ ref: B_MRG_BASE, content: mrgBase, style: STILE_INPUT_PCT, locked: true }],
      colonna(B_DEBT, [debt, mandAmort], { style: STILE_INPUT }),
      [{ ref: B_CONV, content: conv, style: { ...STILE_INPUT_PCT, numFmt: '0%' }, locked: true }],

      riga('A10', [tx('M10-04-STRESSTEST.10'), tx('M10-04-STRESSTEST.25')], { style: STILE_TITOLO }),
      colonna(
        'A11',
        [tx('M10-04-STRESSTEST.11'), tx('M10-04-STRESSTEST.12'), tx('M10-04-STRESSTEST.13'), tx('M10-04-STRESSTEST.14')],
        { style: STILE_ETICHETTA },
      ),
      colonna(B_REV_SHOCK, [revShock, mrgShock], { style: STILE_INPUT_PCT }),
      [{ ref: B_RATE_STRESS, content: rateStress, style: { ...STILE_INPUT_PCT, numFmt: '0.00%' }, locked: true }],
      [{ ref: B_MIN_DSCR, content: minDscr, style: STILE_INPUT_MULTIPLO, locked: true }],

      riga('A16', [tx('M10-04-STRESSTEST.15'), tx('M10-04-STRESSTEST.26')], { style: STILE_TITOLO }),
      colonna('A17', [tx('M10-04-STRESSTEST.16'), tx('M10-04-STRESSTEST.17'), tx('M10-04-STRESSTEST.18'), tx('M10-04-STRESSTEST.19')], {
        style: STILE_ETICHETTA,
      }),
      colonna(B_EBITDA_STRESS, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_INT_STRESS, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_DSCR_STRESS, [null], { style: { ...STILE_FORMULA, numFmt: '0.00x' }, locked: false }),
      colonna(B_ESITO, [null], { style: { ...STILE_TOTALE, numFmt: '@' }, locked: false }),
    ]);

    const t4: Task = {
      id: 'T4',
      prompt: tx('M10-04-STRESSTEST.20', { B_ESITO }),
      targetCell: `Model!${B_ESITO}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'text', expected: esito },
        { kind: 'mustReference', cells: [B_DSCR_STRESS, B_MIN_DSCR] },
        { kind: 'mustUseFunction', functions: ['IF'] },
      ],
      skills: ['cred.stress', 'xl.if'],
      minKeystrokes: 26,
    };

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M10-04-STRESSTEST.21', { B_EBITDA_STRESS }),
        target: `Model!${B_EBITDA_STRESS}`,
        atteso: ebitdaStress,
        referenzia: [B_REV_BASE, B_REV_SHOCK, B_MRG_BASE, B_MRG_SHOCK],
        senzaLiteral: [1],
        skills: ['cred.stress'],
        minKeystrokes: 18,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M10-04-STRESSTEST.22', { B_INT_STRESS }),
        target: `Model!${B_INT_STRESS}`,
        atteso: intStress,
        referenzia: [B_DEBT, B_RATE_STRESS],
        senzaLiteral: [],
        skills: ['cred.stress'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M10-04-STRESSTEST.23', { B_DSCR_STRESS }),
        target: `Model!${B_DSCR_STRESS}`,
        atteso: dscrStress,
        referenzia: [B_EBITDA_STRESS, B_CONV, B_INT_STRESS, B_MAND_AMORT],
        senzaLiteral: [],
        skills: ['cred.stress'],
        minKeystrokes: 16,
      }),
      t4,
    ];

    return {
      templateId: 'M10-04-STRESSTEST',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!${B_EBITDA_STRESS}`,
      hints: [
        hint('H1', '=B4*(1+B11)*(B5+B12)', 15, 'T1'),
        hint('H2', '=B6*B13', 10, 'T2'),
        hint('H3', '=B17*B8/(B18+B7)', 15, 'T3'),
        hint('H4', '=IF(B19<B14,"BREACH","OK")', 10, 'T4'),
      ],
    };
  },
});
