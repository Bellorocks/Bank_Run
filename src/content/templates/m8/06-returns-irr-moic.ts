/**
 * M8 · 06 — Rendimenti LBO: MoIC e IRR.
 *
 * Le due metriche con cui il private equity giudica un deal:
 *
 *   MoIC = equity all'uscita / equity investita
 *   IRR  = MoIC^(1/N) − 1, se non ci sono flussi intermedi (un versamento,
 *          un incasso dopo N anni)
 *
 * Lo stesso MoIC vale IRR molto diversi a seconda della durata: e' la ragione
 * per cui il livello fa variare l'orizzonte col seed. L'IRR puo' essere
 * calcolato dal MoIC appena trovato o direttamente dai due valori di equity:
 * il check di riferimento chiede solo la durata, il valore fa il resto.
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

// Geometria fissa
const B_ENTRY_EQ = 'B4'; // Equity investita (dato)
const B_EXIT_EQ = 'B5'; // Equity all'uscita (dato)
const B_YEARS = 'B6'; // Orizzonte in anni (dato)
const B_HURDLE = 'B7'; // Hurdle rate (dato)

const B_MOIC = 'B10'; // T1
const B_IRR = 'B11'; // T2
const B_SPREAD = 'B12'; // T3

export default defineTemplate({
  id: 'M8-06-RETURNSIRRMOIC',
  module: 'M8',
  title: 'Rendimenti LBO: calcolo analitico di MoIC e IRR',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.returns'],
  prerequisites: ['M8-03-DEBTSCHEDULE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const entryEq = roundTo(triangular(r, 25_000_000, 35_000_000, 50_000_000), 1_000_000);
    const years = r.int(3, 7);
    const hurdleRate = roundTo(triangular(r, 0.15, 0.2, 0.25), 0.01);
    const expectedMoic = roundTo(triangular(r, 1.8, 2.6, 3.6), 0.05);
    const exitEq = roundTo(entryEq * expectedMoic, 100_000);

    const actualMoic = exitEq / entryEq;
    const actualIrr = Math.pow(actualMoic, 1 / years) - 1;
    const spread = actualIrr - hurdleRate;

    const brief = [
      "Il comitato investimenti vuole i rendimenti dell'operazione.",
      '',
      `- **Equity investita dallo sponsor**: ${eur(entryEq)}`,
      `- **Equity incassata all'uscita**: ${eur(exitEq)}, dopo **${years} anni**`,
      `- **Hurdle rate** del fondo: ${pct(hurdleRate, 0)}`,
      '',
      'Nessun dividendo o versamento intermedio: un solo flusso in uscita e uno in entrata. Il **MoIC** dice ' +
        "quante volte torna il capitale; l'**IRR** dice a che tasso annuo composto e' cresciuto. Lo stesso " +
        'MoIC in 3 anni o in 7 anni sono due investimenti molto diversi.',
      '',
      "Calcola MoIC, IRR e lo scarto dell'IRR rispetto all'hurdle (positivo se lo supera).",
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['RENDIMENTI LBO (RETURNS)'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri', 'Valore'], { style: STILE_TITOLO }),
      colonna(
        'A4',
        [
          "Equity investita all'ingresso, €",
          "Equity incassata all'uscita, €",
          'Durata dell\'investimento, anni',
          'Hurdle rate (IRR minimo richiesto)',
        ],
        { style: STILE_ETICHETTA },
      ),
      colonna('B4', [entryEq, exitEq], { style: STILE_INPUT }),
      [{ ref: B_YEARS, content: years, style: { ...STILE_INPUT, numFmt: '0' }, locked: true }],
      [{ ref: B_HURDLE, content: hurdleRate, style: STILE_INPUT_PCT, locked: true }],

      riga('A9', ['Metriche di rendimento', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A10', ['MoIC', 'IRR annuo composto', 'Scarto IRR vs hurdle'], { style: STILE_ETICHETTA }),
      colonna(B_MOIC, [null], { style: { ...STILE_FORMULA, numFmt: '0.00x' }, locked: false }),
      colonna(B_IRR, [null], { style: STILE_FORMULA_PCT, locked: false }),
      colonna(B_SPREAD, [null], { style: { ...STILE_TOTALE, numFmt: '0.0%' }, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `In ${B_MOIC} il MoIC dello sponsor.`,
        target: `Model!${B_MOIC}`,
        atteso: actualMoic,
        referenzia: [B_EXIT_EQ, B_ENTRY_EQ],
        senzaLiteral: [],
        skills: ['lbo.returns'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: `In ${B_IRR} l'IRR: il tasso annuo composto che trasforma l'equity investita in quella incassata in ${B_YEARS} anni.`,
        target: `Model!${B_IRR}`,
        atteso: actualIrr,
        referenzia: [B_YEARS],
        senzaLiteral: [1],
        skills: ['lbo.returns'],
        minKeystrokes: 14,
      }),
      taskFormula({
        id: 'T3',
        prompt: `In ${B_SPREAD} di quanto l'IRR supera l'hurdle (negativo se resta sotto).`,
        target: `Model!${B_SPREAD}`,
        atteso: spread,
        referenzia: [B_IRR, B_HURDLE],
        senzaLiteral: [],
        skills: ['lbo.returns'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M8-06-RETURNSIRRMOIC',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!${B_MOIC}`,
      hints: [
        hint('H1', '=B5/B4', 10, 'T1'),
        hint('H2', '=B10^(1/B6)-1, oppure =(B5/B4)^(1/B6)-1: radice N-esima del MoIC, meno 1.', 15, 'T2'),
        hint('H3', '=B11-B7', 10, 'T3'),
      ],
    };
  },
});
