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

const NOMI_SCENARIO = ['Prudente', 'Base', 'Ambizioso'] as const;

export default defineTemplate({
  id: 'M0C-06-CHOOSE',
  module: 'M0-C',
  title: 'CHOOSE: lo switch di scenario',
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
        'In B9 usa CHOOSE per restituire il ricavo dello scenario indicato dall\'indice in B2: ' +
        'il primo argomento di CHOOSE e\' l\'indice, gli argomenti successivi sono le opzioni, ' +
        'nello stesso ordine in cui compaiono nella tabella (B5 Prudente, B6 Base, B7 Ambizioso).',
      targetCell: 'Model!B9',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: ricaviAnno1Scelto,
          message:
            'Il valore non corrisponde al ricavo dello scenario in B2: controlla che la seconda ' +
            'opzione di CHOOSE (posizione 2) sia lo scenario Base in B6, non un altro.',
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
        "In B11 calcola i ricavi dell'anno 2 dello stesso scenario selezionato in B2. Parti dal " +
        "ricavo che hai gia' scelto in B9 e fallo crescere: non con un tasso solo, ma con quello " +
        "giusto per lo scenario acceso. Qui CHOOSE non sceglie fra tre numeri gia' pronti come " +
        'prima, ma fra tre FORMULE diverse — una per scenario — perche\' ciascuna moltiplica B9 ' +
        'per (1 + il proprio tasso di crescita): C5 per il Prudente, C6 per il Base, C7 per l\'Ambizioso.',
      targetCell: 'Model!B11',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: ricaviAnno2Scelto,
          message:
            "Il valore non torna: ogni opzione di CHOOSE deve moltiplicare B9 per (1 + il tasso " +
            "di crescita del proprio scenario), non un tasso fisso preso da una sola riga.",
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
      brief: [
        '## Un indice, tante opzioni',
        '',
        "`IF` sceglie fra due risposte. Ma un modello vero raramente vive di due scenari soli:",
        'di solito sono tre — prudente, base, ambizioso — e a volte di piu\'. Annidare `IF` dentro',
        '`IF` per arrivarci funziona, ma diventa illeggibile in fretta e fragile a ogni scenario',
        'aggiunto.',
        '',
        '**`CHOOSE(indice, opzione1, opzione2, opzione3, ...)`** restituisce l\'opzione nella',
        'posizione indicata da `indice` — 1 restituisce la prima, 2 la seconda, e cosi\' via.',
        "Un solo numero, l'indice, pilota quale scenario e' \"acceso\" in tutto il modello: cambialo",
        'e ogni cella che usa CHOOSE si aggiorna da sola, senza toccare le formule.',
        '',
        `In questa istanza l'indice di scenario e' **${num(indice)}** (${NOMI_SCENARIO[indice - 1]}).`,
        `I tre ricavi di partenza sono ${eur(valori[0])} (Prudente), ${eur(valori[1])} (Base) e`,
        `${eur(valori[2])} (Ambizioso); le tre ipotesi di crescita per l'anno successivo sono`,
        `${pct(crescite[0])}, ${pct(crescite[1])} e ${pct(crescite[2])}.`,
        '',
        "Nel secondo task la differenza col primo e' precisa: non stai piu' scegliendo fra tre",
        "numeri gia' pronti, ma fra tre FORMULE — ciascuna e' il calcolo che vale se quello e' lo",
        "scenario giusto. E' cosi' che CHOOSE smette di essere una scorciatoia per IF e diventa il",
        "mattone dello scenario switch: la stessa struttura che, piu' avanti, pilotera' un intero",
        'modello di valutazione con un solo numero da cambiare.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Selezione di scenario'], { style: STILE_TITOLO }),
            blocco(
              'A2',
              [["Indice scenario selezionato (1 = Prudente, 2 = Base, 3 = Ambizioso)"]],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[indice]], { style: STILE_INPUT }),

            riga('A4', ['Scenario', 'Ricavi anno 1 (€)', 'Crescita anno 2'], { style: STILE_TITOLO }),
            blocco('A5', NOMI_SCENARIO.map((n) => [n]), { style: STILE_ETICHETTA }),
            blocco('B5', valori.map((v) => [v]), { style: STILE_INPUT }),
            blocco('C5', crescite.map((c) => [c]), { style: STILE_INPUT_PCT }),

            blocco('A9', [['Ricavi anno 1 dello scenario selezionato']], { style: STILE_ETICHETTA }),
            blocco('A11', [['Ricavi anno 2 dello scenario selezionato']], { style: STILE_ETICHETTA }),
            areaLibera(['B9', 'B11']),
          ],
          { colWidths: { A: 300, B: 150, C: 140 }, frozenRows: 4, frozenCols: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          "CHOOSE(B2, B5, B6, B7): il primo argomento e' l'indice, gli altri tre sono le opzioni " +
            "nell'ordine in cui compaiono nella tabella. Con indice 2 restituisce la seconda, B6.",
          10,
          'T1',
        ),
        hint(
          'H2',
          "Stessa struttura di CHOOSE, ma ogni opzione ora e' una formula: B9 moltiplicato per " +
            '(1 + il tasso di crescita del rispettivo scenario), non un tasso preso da una sola riga.',
          12,
          'T2',
        ),
        hint(
          'H3',
          "Il \"+ 1\" dentro la parentesi e' ammesso: serve a trasformare un tasso di crescita in " +
            'un moltiplicatore (crescita 5% => moltiplicatore 1,05).',
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: 'Model!B9',
    };
  },
});
