/**
 * M2 · 11 — Addback aggressivi: leggere la prova, non fidarsi dell'etichetta.
 *
 * Chiude la sequenza "isolare con SUMIF" del modulo (dopo M2-05, che ha
 * introdotto il pattern con un'etichetta gia' esplicita "ricorrente"/
 * "straordinaria"). La meccanica Excel e' la STESSA — SUMIF su una colonna
 * criterio testuale — ma il punto didattico si sposta: qui la colonna
 * "Valida" e' gia' compilata SI/NO (per tenere il grading verificabile con
 * gli strumenti del motore, niente scelta multipla nella UI), ma le
 * ETICHETTE non sono piu' auto-esplicative come "ricorrente"/"straordinaria".
 * Ogni voce e' una proposta di rettifica del management descritta come la
 * leggerebbe davvero un analista in un data room: alcune hanno una PROVA
 * concreta dietro (una fattura, un verbale, un contratto di transazione),
 * altre sono stime, aspirazioni o riclassificazioni opportunistiche che
 * suonano plausibili ma non reggono a un secondo sguardo.
 *
 * Il valore didattico non e' nel filtro tecnico (SUMIF su "SI" e' meccanico
 * quanto in M2-05) ma nel fatto che il brief mostra ESPLICITAMENTE, voce per
 * voce, perche' ciascuna e' stata accettata o respinta — cosi' chi risolve il
 * livello e' costretto a leggere la giustificazione, non solo a copiare un
 * filtro. Le voci legittime e quelle aggressive vengono pescate da due pool
 * distinti e poi rimescolate insieme (mai raggruppate), stesso principio di
 * M2-05: "prendi le prime righe" non deve mai essere una scorciatoia che
 * funziona per caso.
 *
 * Geometria: DATA_END dipende da `n` (5 o 6, deciso a runtime dal seed), ma
 * ogni riferimento sotto e' calcolato come funzione di DATA_START/n, mai
 * scritto come letterale fisso (classe di bug #1 dello spec).
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
  num,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
// Rettifiche LEGITTIME: dietro ciascuna c'e' una prova concreta e verificabile
// (una fattura, un verbale, un contratto di transazione) — Valida = "SI".
const LEGITTIME = () => ([
  tx('M2-11-ADDBACKAGGRESSIVI.1'),
  tx('M2-11-ADDBACKAGGRESSIVI.2'),
  tx('M2-11-ADDBACKAGGRESSIVI.3'),
  tx('M2-11-ADDBACKAGGRESSIVI.4'),
  tx('M2-11-ADDBACKAGGRESSIVI.5'),
] as const);

// Rettifiche AGGRESSIVE: suonano plausibili ma sono stime, aspirazioni o
// riclassificazioni opportunistiche — nessun documento dietro — Valida = "NO".
const AGGRESSIVE = () => ([
  tx('M2-11-ADDBACKAGGRESSIVI.6'),
  tx('M2-11-ADDBACKAGGRESSIVI.7'),
  tx('M2-11-ADDBACKAGGRESSIVI.8'),
  tx('M2-11-ADDBACKAGGRESSIVI.9'),
  tx('M2-11-ADDBACKAGGRESSIVI.10'),
] as const);

interface Rettifica {
  readonly descrizione: string;
  readonly valida: 'SI' | 'NO';
  readonly importo: number;
}

// --- Geometria fissa dell'intestazione: non dipende dal seed. --------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3;
const ROW_EBITDA = 4; // B4: EBITDA riportato (dato, bloccato)
const ROW_SEZ2 = 6;
const ROW_HEADER = 7; // Voce | Valida | Importo (€)
const DATA_START = 8;

export default defineTemplate({
  id: 'M2-11-ADDBACKAGGRESSIVI',
  module: 'M2',
  get title() {
    return tx('M2-11-ADDBACKAGGRESSIVI.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 280,
  skills: ['qoe.aggressive'],
  prerequisites: ['M2-09-RUNRATE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBITDA "come riportato" in bilancio, prima di qualunque rettifica.
    const ebitdaRiportato = r.int(700, 3800) * 1000;

    // 5 o 6 proposte totali, con un mix garantito: almeno una legittima e
    // almeno una aggressiva (mai tutte dello stesso tipo, altrimenti SUMIF e
    // SUM darebbero lo stesso risultato e il livello non insegnerebbe niente).
    const n = r.int(5, 6);
    const kValide = r.int(1, n - 1);
    const nAggressive = n - kValide;

    const descrizioniValide = r.shuffle([...LEGITTIME()]).slice(0, kValide);
    const descrizioniAggressive = r.shuffle([...AGGRESSIVE()]).slice(0, nAggressive);

    const vociValide: Rettifica[] = descrizioniValide.map((descrizione) => ({
      descrizione,
      valida: 'SI',
      // Rettifiche documentate: tipicamente importi piu' consistenti (causa
      // legale, ristrutturazione, dismissione di una sede).
      importo: roundTo(triangular(r, 15_000, 45_000, 120_000), 500),
    }));
    const vociAggressive: Rettifica[] = descrizioniAggressive.map((descrizione) => ({
      descrizione,
      valida: 'NO',
      // Stime/aspirazioni del management: spesso presentate come importi
      // "rotondi" e generosi, proprio perche' non ancorate a un documento.
      importo: roundTo(triangular(r, 10_000, 35_000, 100_000), 500),
    }));

    // Rimescolate insieme: nell'elenco che il giocatore vede, legittime e
    // aggressive non sono raggruppate.
    const voci: Rettifica[] = r.shuffle([...vociValide, ...vociAggressive]);

    const DATA_END = DATA_START + n - 1;
    const ROW_SEZ3 = DATA_END + 2;
    const ROW_RETT = ROW_SEZ3 + 1; // T1
    const ROW_NORM = ROW_RETT + 1; // T2

    const rifValida = `B${DATA_START}`;
    const rifImporti = `C${DATA_START}`;
    const B_EBITDA_RIP = `B${ROW_EBITDA}`;
    const C_RETTIFICA = `C${ROW_RETT}`;
    const C_EBITDA_NORM = `C${ROW_NORM}`;

    const rettifica = voci
      .filter((v) => v.valida === 'SI')
      .reduce((acc, v) => acc + v.importo, 0);
    const totaleElencoCompleto = voci.reduce((acc, v) => acc + v.importo, 0);
    const ebitdaNormalizzato = ebitdaRiportato + rettifica;

    const t1: Task = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M2-11-ADDBACKAGGRESSIVI.12', { C_RETTIFICA }),
        target: `Model!${C_RETTIFICA}`,
        atteso: rettifica,
        referenzia: [rifValida, rifImporti],
        senzaLiteral: [],
        skills: ['qoe.aggressive'],
        minKeystrokes: 30,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUMIF'] }],
      };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M2-11-ADDBACKAGGRESSIVI.13', { C_EBITDA_NORM, B_EBITDA_RIP, C_RETTIFICA }),
      target: `Model!${C_EBITDA_NORM}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, C_RETTIFICA],
      senzaLiteral: [],
      skills: ['qoe.aggressive'],
      minKeystrokes: 6,
    });

    // Un task per voce: il giudizio e' del giocatore, non e' scritto nel foglio.
    const giudizi: Task[] = voci.map((v, i) => ({
      id: `V${i + 1}`,
      prompt: tx('M2-11-ADDBACKAGGRESSIVI.14', { p0: DATA_START + i, p1: DATA_START + i }),
      targetCell: `Model!B${DATA_START + i}`,
      check: [
        {
          kind: 'text' as const,
          expected: v.valida === 'SI' ? tx('common.tok.si') : tx('common.tok.no'),
          message:
            v.valida === 'SI'
              ? tx('M2-11-ADDBACKAGGRESSIVI.15')
              : tx('M2-11-ADDBACKAGGRESSIVI.16'),
        },
      ],
      skills: ['qoe.aggressive'],
      minKeystrokes: 3,
    }));

    const tasks = [...giudizi, t1, t2];

    return {
      templateId: 'M2-11-ADDBACKAGGRESSIVI',
      seed: rng.seed,
      brief: [tx('M2-11-ADDBACKAGGRESSIVI.17', { p0: eur(ebitdaRiportato), p1: num(n), p2: eur(totaleElencoCompleto) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M2-11-ADDBACKAGGRESSIVI.18')], { style: STILE_TITOLO }),
            riga(`A${ROW_SEZ1}`, [tx('M2-11-ADDBACKAGGRESSIVI.19')], { style: STILE_TITOLO }),
            colonna(`A${ROW_EBITDA}`, [tx('M2-11-ADDBACKAGGRESSIVI.20')], { style: STILE_ETICHETTA }),
            [{ ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, [tx('M2-11-ADDBACKAGGRESSIVI.21')], { style: STILE_TITOLO }),
            riga(`A${ROW_HEADER}`, [tx('M2-11-ADDBACKAGGRESSIVI.28'), tx('M2-11-ADDBACKAGGRESSIVI.29'), tx('M2-11-ADDBACKAGGRESSIVI.22')], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, voci.map((v) => v.descrizione), { style: STILE_ETICHETTA }),
            voci.map((_, i) => ({ ref: `B${DATA_START + i}`, content: null, locked: false })),
            colonna(`C${DATA_START}`, voci.map((v) => v.importo), { style: STILE_INPUT }),

            riga(`A${ROW_SEZ3}`, [tx('M2-11-ADDBACKAGGRESSIVI.30')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_RETT}`,
              [tx('M2-11-ADDBACKAGGRESSIVI.23'), tx('M2-11-ADDBACKAGGRESSIVI.24')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: C_RETTIFICA, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: C_EBITDA_NORM, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 480, B: 90, C: 140 }, frozenRows: ROW_HEADER },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M2-11-ADDBACKAGGRESSIVI.25', { rifValida, DATA_END, rifImporti }),
          12,
          'T1',
        ),
        hint(
          'H2',
          tx('M2-11-ADDBACKAGGRESSIVI.26'),
          10,
          'T1',
        ),
        hint(
          'H3',
          tx('M2-11-ADDBACKAGGRESSIVI.27', { B_EBITDA_RIP, C_RETTIFICA }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!B${DATA_START}`,
    };
  },
});
