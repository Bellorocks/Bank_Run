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
  title: 'Stress test di credito: shock su ricavi, margini e tassi',
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

    const brief = [
      'Le banche vogliono sapere se il debito regge una recessione. Applica lo scenario avverso.',
      '',
      `- **Ricavi base**: ${eur(revBase)}, margine EBITDA ${pct(mrgBase)}`,
      `- **Debito**: ${eur(debt)}, quota capitale annua ${eur(mandAmort)}`,
      `- **Conversione EBITDA in cassa per il servizio del debito**: ${pct(conv, 0)}`,
      `- **Scenario**: ricavi ${pct(revShock, 0)}, margine ${pct(mrgShock)} (punti percentuali), tasso stressato ${pct(rateStress, 2)}`,
      `- **Covenant**: DSCR minimo ${multiplo(minDscr)}`,
      '',
      "Attenzione allo shock sul margine: e' in **punti percentuali**, si somma al margine, non lo moltiplica.",
      '',
      "Calcola EBITDA, interessi e DSCR sotto stress, poi l'esito del test: \"BREACH\" se il DSCR stressato " +
        'scende sotto il covenant, altrimenti "OK".',
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['STRESS TEST DI CREDITO (RECESSION SCENARIO)'], { style: STILE_TITOLO }),
      riga('A3', ['Dati baseline', 'Valore'], { style: STILE_TITOLO }),
      colonna(
        'A4',
        [
          'Ricavi baseline (€)',
          'Margine EBITDA baseline',
          'Debito (€)',
          'Quota capitale annua (€)',
          'Conversione EBITDA in cassa (CFADS / EBITDA)',
        ],
        { style: STILE_ETICHETTA },
      ),
      [{ ref: B_REV_BASE, content: revBase, style: STILE_INPUT, locked: true }],
      [{ ref: B_MRG_BASE, content: mrgBase, style: STILE_INPUT_PCT, locked: true }],
      colonna(B_DEBT, [debt, mandAmort], { style: STILE_INPUT }),
      [{ ref: B_CONV, content: conv, style: { ...STILE_INPUT_PCT, numFmt: '0%' }, locked: true }],

      riga('A10', ['Scenario di stress e covenant', 'Valore'], { style: STILE_TITOLO }),
      colonna(
        'A11',
        ['Shock ricavi', 'Shock margine EBITDA (punti %)', "Tasso d'interesse stressato", 'DSCR minimo (covenant)'],
        { style: STILE_ETICHETTA },
      ),
      colonna(B_REV_SHOCK, [revShock, mrgShock], { style: STILE_INPUT_PCT }),
      [{ ref: B_RATE_STRESS, content: rateStress, style: { ...STILE_INPUT_PCT, numFmt: '0.00%' }, locked: true }],
      [{ ref: B_MIN_DSCR, content: minDscr, style: STILE_INPUT_MULTIPLO, locked: true }],

      riga('A16', ['Metriche sotto stress', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A17', ['EBITDA stressato (€)', 'Interessi stressati (€)', 'DSCR stressato (x)', 'Esito del test'], {
        style: STILE_ETICHETTA,
      }),
      colonna(B_EBITDA_STRESS, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_INT_STRESS, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_DSCR_STRESS, [null], { style: { ...STILE_FORMULA, numFmt: '0.00x' }, locked: false }),
      colonna(B_ESITO, [null], { style: { ...STILE_TOTALE, numFmt: '@' }, locked: false }),
    ]);

    const t4: Task = {
      id: 'T4',
      prompt: `In ${B_ESITO} l'esito del test, deciso da una formula: "BREACH" o "OK".`,
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
        prompt: `In ${B_EBITDA_STRESS} l'EBITDA nello scenario di stress: ricavi colpiti dallo shock, margine ridotto.`,
        target: `Model!${B_EBITDA_STRESS}`,
        atteso: ebitdaStress,
        referenzia: [B_REV_BASE, B_REV_SHOCK, B_MRG_BASE, B_MRG_SHOCK],
        senzaLiteral: [1],
        skills: ['cred.stress'],
        minKeystrokes: 18,
      }),
      taskFormula({
        id: 'T2',
        prompt: `In ${B_INT_STRESS} gli interessi al tasso stressato.`,
        target: `Model!${B_INT_STRESS}`,
        atteso: intStress,
        referenzia: [B_DEBT, B_RATE_STRESS],
        senzaLiteral: [],
        skills: ['cred.stress'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: `In ${B_DSCR_STRESS} il DSCR sotto stress: la cassa per il servizio del debito diviso interessi e quota capitale.`,
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
