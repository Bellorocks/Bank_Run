/**
 * M11 · 04 — Dati Mancanti: stima difendibile tramite benchmark di settore.
 *
 * Il teaser non riporta gli ammortamenti (D&A) ne' il capex. L'analista li
 * stima dai peer, e la parola chiave e' "difendibile": il benchmark si prende
 * dalla MEDIANA dei peer, perche' nel campione c'e' sempre un'azienda fuori
 * profilo (qui una molto piu' capital-intensive) che sposterebbe la media.
 *
 *   T1  D&A % benchmark   = MEDIAN(D&A % dei peer)
 *   T2  Capex % benchmark = MEDIAN(capex % dei peer)
 *   T3  EBITDA stimato    = EBIT + ricavi × T1
 *   T4  FCF proxy         = EBITDA stimato − ricavi × T2
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

const B_REVENUES = 'B4';
const B_EBIT = 'B5';
const ROW_PEER = 9;

const NOMI = ['Alfa Componenti', 'Beta Meccanica', 'Gamma Industrie', 'Delta Tech', 'Epsilon Group', 'Zeta Forge'];

export default defineTemplate({
  id: 'M11-04-MISSINGDATA',
  module: 'M11',
  title: 'Dati mancanti: stima difendibile tramite benchmark settoriali',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 330,
  skills: ['real.estimate'],
  prerequisites: ['M11-01-READCEE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const revenues = roundTo(triangular(r, 50_000_000, 70_000_000, 90_000_000), 1_000_000);
    const ebit = roundTo(revenues * triangular(r, 0.08, 0.12, 0.16), 100_000);

    const nPeer = r.int(5, 6);
    const outlier = r.int(0, nPeer - 1);
    const peers = Array.from({ length: nPeer }, (_, i) => {
      const fuori = i === outlier;
      return {
        nome: NOMI[i],
        da: roundTo(fuori ? triangular(r, 0.12, 0.15, 0.18) : triangular(r, 0.04, 0.055, 0.07), 0.001),
        capex: roundTo(fuori ? triangular(r, 0.12, 0.16, 0.2) : triangular(r, 0.035, 0.05, 0.065), 0.001),
      };
    });
    const mediana = (xs: number[]) => {
      const s = [...xs].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    const daBench = mediana(peers.map((p) => p.da));
    const capexBench = mediana(peers.map((p) => p.capex));
    const estEbitda = ebit + revenues * daBench;
    const estFcf = estEbitda - revenues * capexBench;

    const fine = ROW_PEER + nPeer - 1;
    const rowOut = fine + 3;
    const B_DA_BENCH = `B${rowOut}`;
    const B_CAPEX_BENCH = `B${rowOut + 1}`;
    const B_EBITDA = `B${rowOut + 2}`;
    const B_FCF = `B${rowOut + 3}`;
    const rgDa = `B${ROW_PEER}:B${fine}`;
    const rgCapex = `C${ROW_PEER}:C${fine}`;

    const benchTask = (id: string, target: string, cosa: string, atteso: number, rg: string): Task => ({
      id,
      prompt: `In ${target} il benchmark di ${cosa} da usare per la stima: un valore difendibile, che non si faccia trascinare dal peer fuori profilo.`,
      targetCell: `Model!${target}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: atteso },
        { kind: 'mustReference', cells: [rg.split(':')[0], rg.split(':')[1]] },
        { kind: 'mustUseFunction', functions: ['MEDIAN'] },
      ],
      skills: ['real.estimate'],
      minKeystrokes: 18,
    });

    const tasks: Task[] = [
      benchTask('T1', B_DA_BENCH, 'D&A in % dei ricavi', daBench, rgDa),
      benchTask('T2', B_CAPEX_BENCH, 'capex in % dei ricavi', capexBench, rgCapex),
      taskFormula({
        id: 'T3',
        prompt: `In ${B_EBITDA} l'EBITDA stimato del target: EBIT riportato piu' gli ammortamenti stimati col benchmark.`,
        target: `Model!${B_EBITDA}`,
        atteso: estEbitda,
        referenzia: [B_EBIT, B_REVENUES, B_DA_BENCH],
        senzaLiteral: [],
        skills: ['real.estimate'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T4',
        prompt: `In ${B_FCF} il free cash flow proxy: EBITDA stimato meno il capex stimato col benchmark.`,
        target: `Model!${B_FCF}`,
        atteso: estFcf,
        referenzia: [B_EBITDA, B_REVENUES, B_CAPEX_BENCH],
        senzaLiteral: [],
        skills: ['real.estimate'],
        minKeystrokes: 12,
      }),
    ];

    const brief = [
      "Il teaser del sell-side riporta ricavi ed EBIT, ma non ammortamenti e capex. Li stimi dai peer quotati.",
      '',
      `- **Ricavi del target**: ${eur(revenues)}`,
      `- **EBIT riportato**: ${eur(ebit)}`,
      '',
      "Uno dei peer ha un modello di business molto piu' capital-intensive degli altri: tenerlo nella media " +
        "gonfierebbe ammortamenti e capex stimati. Un benchmark difendibile davanti al comitato e' quello che " +
        'non dipende da un solo nome.',
      '',
      'Calcola i due benchmark, poi EBITDA stimato e free cash flow proxy.',
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['STIMA DATI MANCANTI DA BENCHMARK'], { style: STILE_TITOLO }),
      riga('A3', ['Dati del target', 'Valore (€)'], { style: STILE_TITOLO }),
      colonna('A4', ['Ricavi (€)', 'EBIT riportato (€)'], { style: STILE_ETICHETTA }),
      colonna(B_REVENUES, [revenues, ebit], { style: STILE_INPUT }),

      riga(`A${ROW_PEER - 1}`, ['Peer', 'D&A / ricavi', 'Capex / ricavi'], { style: STILE_TITOLO }),
      ...peers.map((p, i) => [
        { ref: `A${ROW_PEER + i}`, content: p.nome, locked: true },
        { ref: `B${ROW_PEER + i}`, content: p.da, style: STILE_INPUT_PCT, locked: true },
        { ref: `C${ROW_PEER + i}`, content: p.capex, style: STILE_INPUT_PCT, locked: true },
      ]),

      riga(`A${rowOut - 1}`, ['Stime', 'Risultato'], { style: STILE_TITOLO }),
      colonna(
        `A${rowOut}`,
        ['Benchmark D&A / ricavi', 'Benchmark capex / ricavi', 'EBITDA stimato (€)', 'Free cash flow proxy (€)'],
        { style: STILE_ETICHETTA },
      ),
      [{ ref: B_DA_BENCH, content: null, locked: false, style: STILE_FORMULA_PCT }],
      [{ ref: B_CAPEX_BENCH, content: null, locked: false, style: STILE_FORMULA_PCT }],
      [{ ref: B_EBITDA, content: null, locked: false, style: STILE_FORMULA }],
      [{ ref: B_FCF, content: null, locked: false, style: STILE_TOTALE }],
    ], { colWidths: { A: 300, B: 140, C: 140 } });

    return {
      templateId: 'M11-04-MISSINGDATA',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_DA_BENCH}`,
      hints: [
        hint('H1', `=MEDIAN(${rgDa}): la mediana ignora il peer fuori profilo, la media no.`, 10, 'T1'),
        hint('H2', `=MEDIAN(${rgCapex})`, 10, 'T2'),
        hint('H3', `=${B_EBIT}+${B_REVENUES}*${B_DA_BENCH}`, 10, 'T3'),
        hint('H4', `=${B_EBITDA}-${B_REVENUES}*${B_CAPEX_BENCH}`, 10, 'T4'),
      ],
    };
  },
});
