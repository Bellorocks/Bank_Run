/**
 * M0-C · 06 — CHOOSE: lo switch di scenario.
 *
 * IF sceglie fra due risposte. Un modello vero raramente ha solo due scenari —
 * di solito ne ha tre (prudente / base / ambizioso), a volte di piu' — e
 * annidare IF dentro IF per selezionarne uno diventa illeggibile in fretta.
 * CHOOSE risolve il problema di petto: un indice, e tante opzioni quante servono.
 *
 * Il punto didattico e' in due parti:
 *  - T1 e' il caso base: CHOOSE seleziona fra tre VALORI gia' pronti in tabella.
 *    Qui si impara solo la sintassi: indice, poi le opzioni nello stesso ordine.
 *  - T2 e' il caso che conta davvero: CHOOSE seleziona fra tre FORMULE diverse,
 *    una per scenario, non fra tre numeri. Ogni argomento di CHOOSE puo' essere
 *    un'espressione qualunque — qui il ricavo gia' scelto in T1 moltiplicato per
 *    il tasso di crescita del proprio scenario — ed e' esattamente cosi' che si
 *    costruisce uno scenario switch che pilota un intero modello con una sola
 *    cella (l'indice), invece di duplicare tre volte ogni riga.
 *
 * L'indice di scenario e i tre valori/tassi sono generati dal rng: lo scenario
 * "vincente" — quale dei tre viene davvero mostrato — cambia da seed a seed.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  eur,
  num,
  pct,
} from '../../authoring';
import { revenue } from '../../../rng/finance';
import { roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const NOMI_SCENARIO = () => ([tx('common.prudente'), tx('common.base'), tx('common.ambizioso')] as const);

export default defineTemplate({
  id: 'M0C-06-CHOOSE',
  module: 'M0-C',
  get title() {
    return tx('M0C-06-CHOOSE.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.choose'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // L'indice che decide quale dei tre scenari e' "acceso" in questa istanza.
    const indice = r.int(1, 3);

    const ricaviBase = Math.round(revenue(r) / 100_000) * 100_000;
    const fattorePrudente = roundTo(0.82 + r.next() * 0.1, 0.001); // 0,82x - 0,92x
    const fattoreAmbizioso = roundTo(1.12 + r.next() * 0.18, 0.001); // 1,12x - 1,30x

    const valori = [
      Math.round((ricaviBase * fattorePrudente) / 10_000) * 10_000,
      ricaviBase,
      Math.round((ricaviBase * fattoreAmbizioso) / 10_000) * 10_000,
    ];

    const crescite = [
      roundTo(0.005 + r.next() * 0.02, 0.001), // Prudente: 0,5% - 2,5%
      roundTo(0.03 + r.next() * 0.03, 0.001), // Base: 3,0% - 6,0%
      roundTo(0.08 + r.next() * 0.07, 0.001), // Ambizioso: 8,0% - 15,0%
    ];

    const ricaviAnno1Scelto = valori[indice - 1];
    const ricaviAnno2Scelto = ricaviAnno1Scelto * (1 + crescite[indice - 1]);

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0C-06-CHOOSE.2'),
      targetCell: 'Model!B9',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: ricaviAnno1Scelto,
          message:
            tx('M0C-06-CHOOSE.3'),
        },
        { kind: 'mustReference', cells: ['B2', 'B5', 'B6', 'B7'] },
        { kind: 'mustUseFunction', functions: ['CHOOSE'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.choose'],
      minKeystrokes: 20,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0C-06-CHOOSE.4'),
      targetCell: 'Model!B11',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: ricaviAnno2Scelto,
          message:
            tx('M0C-06-CHOOSE.5'),
        },
        { kind: 'mustReference', cells: ['B2', 'B9', 'C5', 'C6', 'C7'] },
        { kind: 'mustUseFunction', functions: ['CHOOSE'] },
        { kind: 'mustNotContainLiteral', except: [1] },
      ],
      skills: ['xl.choose'],
      minKeystrokes: 32,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0C-06-CHOOSE',
      seed: rng.seed,
      brief: [tx('M0C-06-CHOOSE.6', { p0: num(indice), p1: NOMI_SCENARIO()[indice - 1], p2: eur(valori[0]), p3: eur(valori[1]), p4: eur(valori[2]), p5: pct(crescite[0]), p6: pct(crescite[1]), p7: pct(crescite[2]) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0C-06-CHOOSE.7')], { style: STILE_TITOLO }),
            blocco(
              'A2',
              [[tx('M0C-06-CHOOSE.8')]],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[indice]], { style: STILE_INPUT }),

            riga('A4', [tx('M0C-06-CHOOSE.16'), tx('M0C-06-CHOOSE.9'), tx('M0C-06-CHOOSE.10')], { style: STILE_TITOLO }),
            blocco('A5', NOMI_SCENARIO().map((n) => [n]), { style: STILE_ETICHETTA }),
            blocco('B5', valori.map((v) => [v]), { style: STILE_INPUT }),
            blocco('C5', crescite.map((c) => [c]), { style: STILE_INPUT_PCT }),

            blocco('A9', [[tx('M0C-06-CHOOSE.11')]], { style: STILE_ETICHETTA }),
            blocco('A11', [[tx('M0C-06-CHOOSE.12')]], { style: STILE_ETICHETTA }),
            areaLibera(['B9', 'B11']),
          ],
          { colWidths: { A: 300, B: 150, C: 140 }, frozenRows: 4, frozenCols: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0C-06-CHOOSE.13'),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0C-06-CHOOSE.14'),
          12,
          'T2',
        ),
        hint(
          'H3',
          tx('M0C-06-CHOOSE.15'),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: 'Model!B9',
    };
  },
});
