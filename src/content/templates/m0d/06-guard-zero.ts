/**
 * M0-D · 06 — Guard sui denominatori: proteggere una divisione che tocca zero.
 *
 * Il punto didattico non e' "usa IFERROR", quello e' gia' M0B-04-IFERROR. Qui la
 * differenza e' strutturale: la formula non vive in una cella isolata, viaggia
 * copiata su piu' periodi (T1 -> T2), e SOLO uno dei quattro ha il denominatore
 * a zero. Il giocatore lo sa gia' quando scrive la prima cella (T1), quindi il
 * guard va scritto nella formula base fin dall'inizio — non aggiunto dopo, a
 * mano, sulla cella che esplode. E' il rovescio della medaglia di M0B-04: la',
 * IFERROR ovunque era un'abitudine da rompere; qui, se anche un solo periodo
 * della riga puo' avere zero al denominatore, il guard nella riga e' obbligatorio
 * per TUTTE le celle, perche' e' una sola formula copiata, non quattro formule.
 *
 * Il fallback scelto e' un flag testuale ("n.d."), non una stima numerica: a
 * differenza di M0B-04 (dove un prezzo di listino era un proxy difendibile del
 * costo), qui non esiste alcun numero difendibile per "costo per ordine" quando
 * gli ordini evasi sono zero. Il valore corretto in quella cella non e' un
 * numero verosimile, e' l'ammissione che il numero non esiste.
 *
 * Il congelamento dei riquadri e' trattato come argomento affine nel brief
 * (spec: si accostano), ma resta fuori dal grader: non e' osservabile a valore,
 * e la combinazione Alt legacy per "Blocca riquadri" non ha una sequenza propria
 * in `src/keymap/altSequence.ts` (nessun ramo "Visualizza", nessun binding per
 * `structure.freezePanes` — verificato: `bindingsForCommand('structure.freezePanes')`
 * e' vuoto in `bindings.test.ts`). Il foglio di questo livello arriva pero' gia'
 * con riga di intestazione ed etichette bloccate, cosi' l'effetto si vede subito
 * anche senza un task che lo verifichi.
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
  STILE_TITOLO,
  eur,
  num,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const MAGAZZINI = () => ([
  tx('M0D-06-GUARDZERO.1'),
  tx('M0D-06-GUARDZERO.2'),
  tx('M0D-06-GUARDZERO.3'),
  tx('M0D-06-GUARDZERO.4'),
  tx('M0D-06-GUARDZERO.5'),
] as const);

const MOTIVI_CHIUSURA = () => ([
  tx('M0D-06-GUARDZERO.6'),
  tx('M0D-06-GUARDZERO.7'),
  tx('M0D-06-GUARDZERO.8'),
  tx('M0D-06-GUARDZERO.9'),
] as const);

const PERIODI = () => ([1, 2, 3, 4].map((n) => tx('common.trim', { n })));
const COLS = ['B', 'C', 'D', 'E'] as const;

export default defineTemplate({
  id: 'M0D-06-GUARDZERO',
  module: 'M0-D',
  get title() {
    return tx('M0D-06-GUARDZERO.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.div-guard', 'xl.iferror', 'xl.freeze'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const magazzino = r.pick(MAGAZZINI());
    const motivo = r.pick(MOTIVI_CHIUSURA());
    // Deliberato, non lasciato al caso: UN trimestre a zero ordini, e non il
    // primo — cosi' T1 costruisce la formula su un caso normale, sapendo gia'
    // che dovra' reggere anche quello che non e' normale.
    const idxZero = r.int(1, PERIODI().length - 1);

    const costoGestione = PERIODI().map(() => roundTo(triangular(r, 18_000, 32_000, 70_000), 100));
    const ordini = PERIODI().map((_, i) => (i === idxZero ? 0 : r.int(300, 3200)));
    const costoPerOrdine = PERIODI().map((_, i) => (i === idxZero ? null : costoGestione[i] / ordini[i]));

    const colZero = COLS[idxZero];

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0D-06-GUARDZERO.11', { magazzino, motivo }),
      targetCell: 'Model!B6',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: costoPerOrdine[0] as number,
          message:
            tx('M0D-06-GUARDZERO.12'),
        },
        { kind: 'mustReference', cells: ['B4', 'B5'] },
        { kind: 'mustUseFunction', functions: ['IFERROR'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.iferror', 'xl.div-guard'],
      minKeystrokes: 22,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0D-06-GUARDZERO.13'),
      // Bersaglio sul trimestre a zero ordini, non sull'angolo B6: 'noError' guarda
      // solo la cella di targetCell (non l'intero range), e B6 non ha MAI il
      // denominatore a zero (idxZero parte da 1), quindi punterebbe un check che
      // non potrebbe mai fallire. 'consistentRow' resta esplicitamente sull'intera
      // riga tramite il proprio campo `range`, che e' indipendente da targetCell.
      targetCell: `Model!${colZero}6`,
      check: [
        { kind: 'consistentRow', range: 'Model!B6:E6' },
        {
          kind: 'noError',
          message: tx('M0D-06-GUARDZERO.14'),
        },
      ],
      skills: ['xl.copy-shift', 'xl.div-guard'],
      minKeystrokes: 12,
    };

    const t3: Task = {
      id: 'T3',
      prompt:
        tx('M0D-06-GUARDZERO.15', { colZero, magazzino }),
      targetCell: `Model!${colZero}6`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'text',
          expected: tx('common.tok.nd'),
          message:
            tx('M0D-06-GUARDZERO.16'),
        },
        { kind: 'mustReference', cells: [`${colZero}4`, `${colZero}5`] },
        { kind: 'mustUseFunction', functions: ['IFERROR'] },
      ],
      skills: ['xl.div-guard'],
      minKeystrokes: 0,
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0D-06-GUARDZERO',
      seed: rng.seed,
      brief: [tx('M0D-06-GUARDZERO.17', { magazzino, p1: eur(costoGestione[0]), p2: num(ordini[0]), p3: PERIODI()[idxZero], motivo, p5: eur(costoGestione[idxZero]) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0D-06-GUARDZERO.18', { magazzino })], { style: STILE_TITOLO }),
            riga('B3', [...PERIODI()], { style: STILE_TITOLO }),
            blocco('A4', [[tx('M0D-06-GUARDZERO.19')]], { style: STILE_ETICHETTA }),
            riga('B4', [...costoGestione], { style: STILE_INPUT }),
            blocco('A5', [[tx('M0D-06-GUARDZERO.20')]], { style: STILE_ETICHETTA }),
            riga('B5', [...ordini], { style: STILE_INPUT }),
            blocco('A6', [[tx('M0D-06-GUARDZERO.21')]], { style: STILE_ETICHETTA }),
            areaLibera(['B6', 'C6', 'D6', 'E6']),
          ],
          {
            colWidths: { A: 260, B: 110, C: 110, D: 110, E: 110 },
            frozenRows: 3,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0D-06-GUARDZERO.22'),
          10,
          'T1',
        ),
        hint('H2', tx('M0D-06-GUARDZERO.23'), 8, 'T2'),
        hint('H3', tx('M0D-06-GUARDZERO.24', { colZero }), 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: 'Model!B6',
    };
  },
});
