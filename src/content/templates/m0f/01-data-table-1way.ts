/**
 * M0-F · 01 — La tabella a una variabile, senza il comando che manca.
 *
 * NOTA DI IMPLEMENTAZIONE: la vera Data Table di Excel (Dati > Analisi di
 * simulazione > Struttura) non e' implementata nel motore — nessun comando in
 * `GridSession` la produce, e non esiste un modo per una `LevelTemplate` di
 * registrare la formula `{=TABLE(,cella)}` che Excel scrive da solo su tutto
 * il corpo della tabella. Aggiungerla era fuori dal perimetro di questo file
 * (avrebbe voluto dire costruire in `workbook.ts` un supporto per formule
 * array multi-cella che oggi non c'e').
 *
 * Il livello insegna quindi il concetto per via indiretta, seguendo lo stesso
 * pattern di `m0b/06-named-ranges.ts`: quello che una vera Data Table fa in
 * automatico — sostituire, riga per riga, un valore diverso nella cella di
 * input e ricalcolare la stessa formula — qui lo si fa a mano, scrivendo UNA
 * formula con gli ancoraggi giusti e riempiendola in basso. E' esattamente
 * l'operazione che Excel esegue dietro le quinte quando la Data Table gira;
 * il brief spiega il comando vero, come si userebbe, e perche' qui si ottiene
 * lo stesso risultato senza di lui.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  taskFormula,
  eur,
  multiplo,
  num,
} from '../../authoring';
import { roundTo } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const RIGHE_TABELLA = 6;
const RIGA_PRIMO_MULTIPLO = 8;
const RIGA_ULTIMO_MULTIPLO = RIGA_PRIMO_MULTIPLO + RIGHE_TABELLA - 1; // 13
const RIGA_ESCURSIONE = 15;

/** Colonna di output: prezzo per azione, due decimali. Nero come ogni formula. */
const STILE_LIBERA_PREZZO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0.00' };

export default defineTemplate({
  id: 'M0F-01-DATATABLE1',
  module: 'M0-F',
  get title() {
    return tx('M0F-01-DATATABLE1.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['xl.data-table', 'xl.anchoring', 'xl.row-consistency', 'xl.fill', 'xl.aggregates'],
  prerequisites: ['M0A-05-ANCORAGGI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitda = r.int(15, 45) * 1_000_000;
    const multiploBase = roundTo(4.5 + r.next() * 2, 0.5); // 4,5x – 6,5x: il piu' basso della colonna
    const fraction = 0.3 + r.next() * 0.35; // frazione del deal value al multiplo piu' basso
    const debitoNetto = roundTo(ebitda * multiploBase * fraction, 100_000);
    const azioni = r.int(4, 12) * 1_000_000;

    const multipli = Array.from({ length: RIGHE_TABELLA }, (_, i) =>
      roundTo(multiploBase + i * 0.5, 0.5),
    );
    const prezzi = multipli.map((m) => (m * ebitda - debitoNetto) / azioni);
    const escursione = prezzi[RIGHE_TABELLA - 1] - prezzi[0];

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0F-01-DATATABLE1.2', { RIGA_PRIMO_MULTIPLO }),
      targetCell: `Model!B${RIGA_PRIMO_MULTIPLO}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: prezzi[0] },
        {
          kind: 'mustReference',
          cells: [`A${RIGA_PRIMO_MULTIPLO}`, 'B3', 'B4', 'B5'],
        },
        { kind: 'mustNotContainLiteral', except: [] },
        { kind: 'anchoring', pattern: '$B$3' },
        { kind: 'anchoring', pattern: '$B$4' },
        { kind: 'anchoring', pattern: '$B$5' },
      ],
      skills: ['xl.data-table', 'xl.anchoring'],
      minKeystrokes: 34,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0F-01-DATATABLE1.3', { RIGA_PRIMO_MULTIPLO, RIGA_ULTIMO_MULTIPLO }),
      targetCell: `Model!B${RIGA_PRIMO_MULTIPLO}:B${RIGA_ULTIMO_MULTIPLO}`,
      check: [
        { kind: 'consistentRow', range: `Model!B${RIGA_PRIMO_MULTIPLO}:B${RIGA_ULTIMO_MULTIPLO}` },
        { kind: 'noError' },
      ],
      skills: ['xl.row-consistency', 'xl.fill'],
      minKeystrokes: 8,
    };

    const t3: Task = {
      // Task a se' stante, come in M0A-05-ANCORAGGI T3: l'ultima riga e' dove un
      // ancoraggio dimenticato smette di dare un numero plausibile per caso.
      id: 'T3',
      prompt:
        tx('M0F-01-DATATABLE1.4', { RIGA_ULTIMO_MULTIPLO }),
      targetCell: `Model!B${RIGA_ULTIMO_MULTIPLO}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: prezzi[RIGHE_TABELLA - 1],
          message:
            tx('M0F-01-DATATABLE1.5'),
        },
      ],
      skills: ['xl.anchoring'],
      minKeystrokes: 0,
    };

    const t4 = taskFormula({
      id: 'T4',
      prompt:
        tx('M0F-01-DATATABLE1.6', { RIGA_ESCURSIONE }),
      target: `Model!B${RIGA_ESCURSIONE}`,
      atteso: escursione,
      referenzia: [`B${RIGA_PRIMO_MULTIPLO}`, `B${RIGA_ULTIMO_MULTIPLO}`],
      skills: ['xl.aggregates'],
      minKeystrokes: 20,
    });

    const tasks = [t1, t2, t3, t4];

    return {
      templateId: 'M0F-01-DATATABLE1',
      seed: rng.seed,
      brief: [tx('M0F-01-DATATABLE1.7', { p0: eur(ebitda), p1: eur(debitoNetto), p2: num(azioni), p3: multiplo(multipli[0]), p4: multiplo(multipli[RIGHE_TABELLA - 1]), p5: multiplo(0.5) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0F-01-DATATABLE1.8')], {
              style: STILE_TITOLO,
            }),
            blocco('A3', [[tx('M0F-01-DATATABLE1.9')], [tx('M0F-01-DATATABLE1.10')], [tx('M0F-01-DATATABLE1.11')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('B3', [[ebitda], [debitoNetto], [azioni]], { style: STILE_INPUT }),

            riga('A7', [tx('M0F-01-DATATABLE1.12'), tx('M0F-01-DATATABLE1.13')], { style: STILE_TITOLO }),
            blocco(
              `A${RIGA_PRIMO_MULTIPLO}`,
              multipli.map((m) => [m]),
              { style: STILE_INPUT_MULTIPLO },
            ),

            blocco(`A${RIGA_ESCURSIONE}`, [[tx('M0F-01-DATATABLE1.14')]], { style: STILE_ETICHETTA }),

            ...Array.from({ length: RIGHE_TABELLA }, (_, i) => [
              {
                ref: `B${RIGA_PRIMO_MULTIPLO + i}`,
                content: null,
                locked: false,
                style: STILE_LIBERA_PREZZO,
              },
            ]),
            [{ ref: `B${RIGA_ESCURSIONE}`, content: null, locked: false, style: STILE_LIBERA_PREZZO }],
          ],
          {
            colWidths: { A: 240, B: 160 },
            frozenRows: 7,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0F-01-DATATABLE1.15', { RIGA_PRIMO_MULTIPLO }),
          14,
          'T1',
        ),
        hint('H2', tx('M0F-01-DATATABLE1.16', { RIGA_PRIMO_MULTIPLO, RIGA_ULTIMO_MULTIPLO }), 8, 'T2'),
        hint(
          'H3',
          tx('M0F-01-DATATABLE1.17'),
          10,
          'T3',
        ),
        hint('H4', `=MAX(B${RIGA_PRIMO_MULTIPLO}:B${RIGA_ULTIMO_MULTIPLO})-MIN(B${RIGA_PRIMO_MULTIPLO}:B${RIGA_ULTIMO_MULTIPLO})`, 10, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 85 }),
      startAt: `Model!B${RIGA_PRIMO_MULTIPLO}`,
    };
  },
});
