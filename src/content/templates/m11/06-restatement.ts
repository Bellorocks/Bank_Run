/**
 * M11 · 06 — Restatement Contabile: correzione retroattiva di bilanci storici.
 *
 * La due diligence scopre che negli ultimi due esercizi sono stati anticipati
 * ricavi e capitalizzati costi che andavano spesati. Le rettifiche sono ante
 * imposte: sull'utile netto pesano solo per la parte netta.
 *
 *   T1  Utile restated (riga, due anni) = utile riportato − rettifica × (1 − aliquota)
 *   T2  Patrimonio netto restated a fine anno 2
 *         = PN iniziale + utili restated − dividendi distribuiti nel biennio
 *   T3  Di quanto il PN riportato era sovrastimato
 *
 * Il PN riportato e' dato: la differenza col PN restated e' esattamente la
 * somma delle rettifiche nette, e il terzo task lo fa verificare.
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

const B_TAX = 'B4';
const B_PN_INIT = 'B5';
const B_PN_REPORTED = 'B6';

const ROW_NI = 9;
const ROW_ADJ = 10;
const ROW_DIV = 11;
const ROW_REST = 14;
const B_PN_REST = 'B15';
const B_SOVRASTIMA = 'B16';

export default defineTemplate({
  id: 'M11-06-RESTATEMENT',
  module: 'M11',
  title: 'Restatement: correzione retroattiva di serie storiche',
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['real.restatement'],
  prerequisites: ['M11-01-READCEE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const taxRate = 0.24;
    const pnInit = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 100_000);
    const ni = [
      roundTo(triangular(r, 12_000_000, 15_000_000, 18_000_000), 10_000),
      roundTo(triangular(r, 14_000_000, 17_000_000, 20_000_000), 10_000),
    ];
    const adj = [
      roundTo(triangular(r, 2_000_000, 3_000_000, 4_000_000), 10_000),
      roundTo(triangular(r, 1_500_000, 2_500_000, 3_500_000), 10_000),
    ];
    const div = ni.map((x) => roundTo(x * triangular(r, 0.2, 0.4, 0.6), 10_000));

    const rest = ni.map((x, i) => x - adj[i] * (1 - taxRate));
    const pnReported = pnInit + ni[0] + ni[1] - div[0] - div[1];
    const pnRest = pnInit + rest[0] + rest[1] - div[0] - div[1];
    const sovrastima = pnReported - pnRest;

    const rg = `B${ROW_REST}:C${ROW_REST}`;
    const t1: Task = {
      id: 'T1',
      prompt:
        `Riga ${ROW_REST}: l'utile netto restated dei due anni, togliendo l'effetto netto delle rettifiche. ` +
        `Una formula in B${ROW_REST}, copiata in C${ROW_REST}.`,
      targetCell: `Model!${rg}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: rest[0] },
        { kind: 'value', expected: rest[1], at: `C${ROW_REST}` },
        { kind: 'mustReference', cells: [`B${ROW_NI}`, `B${ROW_ADJ}`, B_TAX] },
        { kind: 'mustNotContainLiteral', except: [1] },
        { kind: 'consistentRow', range: `Model!${rg}` },
        { kind: 'noError' },
      ],
      skills: ['real.restatement'],
      minKeystrokes: 22,
    };

    const tasks = [
      t1,
      taskFormula({
        id: 'T2',
        prompt: `In ${B_PN_REST} il patrimonio netto restated a fine anno 2.`,
        target: `Model!${B_PN_REST}`,
        atteso: pnRest,
        referenzia: [B_PN_INIT, `B${ROW_REST}`, `C${ROW_REST}`, `B${ROW_DIV}`, `C${ROW_DIV}`],
        senzaLiteral: [],
        skills: ['real.restatement'],
        minKeystrokes: 22,
      }),
      taskFormula({
        id: 'T3',
        prompt: `In ${B_SOVRASTIMA} di quanto il patrimonio netto riportato era sovrastimato.`,
        target: `Model!${B_SOVRASTIMA}`,
        atteso: sovrastima,
        referenzia: [B_PN_REPORTED, B_PN_REST],
        senzaLiteral: [],
        skills: ['real.restatement'],
        minKeystrokes: 8,
      }),
    ];

    const brief = [
      'La due diligence contabile ha trovato due problemi negli ultimi due esercizi: ricavi riconosciuti in ' +
        "anticipo e costi di sviluppo capitalizzati che andavano spesati. Vanno corretti all'indietro.",
      '',
      `- Patrimonio netto a inizio anno 1: ${eur(pnInit)}; aliquota fiscale ${pct(taxRate, 0)}`,
      '- Le rettifiche sono **ante imposte**: ridurre l\'utile ante imposte riduce anche le imposte, quindi ' +
        "l'utile netto scende solo della parte netta.",
      '- I dividendi gia\' distribuiti non cambiano: sono usciti davvero.',
      '',
      "Calcola gli utili restated, il patrimonio netto restated a fine anno 2 e quanto quello riportato " +
        "era sovrastimato. Controllo: la sovrastima e' la somma delle rettifiche nette.",
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['RESTATEMENT RETROATTIVO BIENNIO STORICO'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri generali', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', ['Aliquota fiscale', 'Patrimonio netto a inizio anno 1 (€)', 'Patrimonio netto riportato a fine anno 2 (€)'], {
        style: STILE_ETICHETTA,
      }),
      [{ ref: B_TAX, content: taxRate, style: STILE_INPUT_PCT, locked: true }],
      colonna(B_PN_INIT, [pnInit, pnReported], { style: STILE_INPUT }),

      riga('A8', ['Dati storici e rettifiche (€)', 'Anno 1', 'Anno 2'], { style: STILE_TITOLO }),
      colonna(`A${ROW_NI}`, ['Utile netto riportato', 'Rettifiche ante imposte da spesare', 'Dividendi distribuiti'], {
        style: STILE_ETICHETTA,
      }),
      riga(`B${ROW_NI}`, ni, { style: STILE_INPUT }),
      riga(`B${ROW_ADJ}`, adj, { style: STILE_INPUT }),
      riga(`B${ROW_DIV}`, div, { style: STILE_INPUT }),

      riga('A13', ['Valori restated (€)', 'Anno 1', 'Anno 2'], { style: STILE_TITOLO }),
      colonna(`A${ROW_REST}`, ['Utile netto restated', 'Patrimonio netto restated a fine anno 2', 'Sovrastima del PN riportato'], {
        style: STILE_ETICHETTA,
      }),
      riga(`B${ROW_REST}`, [null, null], { style: STILE_FORMULA, locked: false }),
      colonna(B_PN_REST, [null, null], { style: STILE_TOTALE, locked: false }),
    ]);

    return {
      templateId: 'M11-06-RESTATEMENT',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!B${ROW_REST}`,
      hints: [
        hint('H1', `In B${ROW_REST}: =B${ROW_NI}-B${ROW_ADJ}*(1-$B$4), poi copia a destra.`, 10, 'T1'),
        hint('H2', `=B5+SUM(B${ROW_REST}:C${ROW_REST})-SUM(B${ROW_DIV}:C${ROW_DIV})`, 10, 'T2'),
        hint('H3', `=B6-B15`, 10, 'T3'),
      ],
    };
  },
});
