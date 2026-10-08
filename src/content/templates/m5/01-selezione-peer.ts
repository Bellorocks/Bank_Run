/**
 * M5 · 01 — Selezione dei peer: chi e' davvero comparabile.
 *
 * Primo livello del modulo M5 (trading comps). Il meccanismo di fondo del
 * modulo — moltiplicare un multiplo osservato su un peer per la metrica del
 * target — e' banale. Il lavoro vero, quello che separa un comp set
 * difendibile da uno arbitrario, e' scegliere i peer giusti PRIMA di guardare
 * i loro multipli. Un peer che opera nello stesso settore del target ma e'
 * dieci volte piu' grande (o piu' piccolo) non e' comparabile: quotazioni,
 * liquidita', crescita e rischio di un'azienda di quella taglia rispondono a
 * dinamiche diverse, e il suo multiplo diluisce il segnale invece di
 * rafforzarlo. Serve ENTRAMBI i criteri, non uno a scelta.
 *
 * I due criteri di comparabilita' ("stesso settore" e "size comparabile")
 * arrivano gia' calcolati in tabella, come dato: il livello non chiede di
 * derivarli (quello e' fuori scopo qui — la size comparabile useria una
 * soglia arbitraria che varia da desk a desk), chiede di COMBINARLI nel modo
 * giusto, che e' invece un giudizio sempre uguale e sempre necessario.
 *
 * DUE TASK:
 *
 *   T1 — la colonna "Comparabile": AND(stesso settore = SI, size comparabile
 *        = SI), riga per riga. Il target e' l'intero range, non una cella
 *        sola (check `consistentRow`, come in m1/08-da-schedule.ts): la
 *        stessa formula, trascinata, mai ritoccata a mano su una singola
 *        riga. Non verifica il valore di ogni riga (consistentRow controlla
 *        solo la coerenza strutturale) — la correttezza aritmetica e'
 *        verificata indirettamente da T2, che incatena il COUNTIF su questa
 *        colonna: un AND scritto con la logica invertita (OR al posto di
 *        AND, o viceversa) passerebbe comunque T1 ma farebbe fallire T2.
 *
 *   T2 — quanti peer sono DAVVERO comparabili: COUNTIF sulla colonna
 *        Comparabile, con criterio TRUE. Il motore accetta TRUE sia nudo sia
 *        come TRUE(), come Excel (vedi engineExtensions.addBooleanNames).
 *
 * Geometria: tutta funzione di `nCandidati` (6-8, dal seed), mai un
 * letterale fisso — le righe della tabella e la riga di sintesi si spostano
 * se cambia il numero di candidati.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  multiplo,
  num,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import { revenue, SECTORS } from '../../../rng/finance';
import { roundTo } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';
import type { CellSpec, Task } from '../../types';

import { tx } from '../../../i18n/content';
/** Input testuale (settore, SI/NO): stesso blu degli input numerici, senza formato numerico. */
const STILE_INPUT_TESTO: CellStyle = { fontColor: MODEL_COLORS.input };

/** Prima lettera maiuscola: i nomi settore di finance.ts sono tutti minuscoli. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Soglia di size comparabile: un candidato entra nella banda se il suo
// fatturato sta fra 0,4x e 2,5x quello del target. Non e' l'unica soglia
// plausibile (ogni desk ha la propria), ma e' abbastanza larga da lasciare
// dentro aziende di taglia diversa dal target e abbastanza stretta da
// escludere i casi palesemente fuori scala — il punto del livello.
const SIZE_LO = 0.4;
const SIZE_HI = 2.5;

/** Probabilita' che un candidato operi nello stesso settore del target. */
const PROB_STESSO_SETTORE = 0.55;

export default defineTemplate({
  id: 'M5-01-SELEZIONEPEER',
  module: 'M5',
  get title() {
    return tx('M5-01-SELEZIONEPEER.title');
  },
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 300,
  skills: ['comps.peer-selection'],
  prerequisites: ['M4-05-BRIDGECOMPLETO'],

  generate: (rng) => {
    const rTarget = rng.fork('target');
    const rCandidati = rng.fork('candidati');
    const rMeta = rng.fork('meta');

    const targetSettore = rTarget.pick(SECTORS);
    const targetFatturato = revenue(rTarget.fork('fatturato'));

    const nCandidati = rMeta.int(6, 8);
    const altriSettori = SECTORS.filter((s) => s !== targetSettore);

    const candidati = Array.from({ length: nCandidati }, (_, i) => {
      const stessoSettore = rCandidati.bool(PROB_STESSO_SETTORE);
      const settore = stessoSettore ? targetSettore : rCandidati.pick(altriSettori);
      // Moltiplicatore uniforme largo: copre sia candidati palesemente fuori
      // scala sia candidati vicini al target, cosi' al variare del seed
      // capitano tutte le combinazioni di settore/size, non solo le comode.
      const moltiplicatore = 0.15 + rCandidati.next() * (4.0 - 0.15);
      const fatturato = roundTo(targetFatturato * moltiplicatore, 1000);
      const sizeComparabile = fatturato >= targetFatturato * SIZE_LO && fatturato <= targetFatturato * SIZE_HI;
      const comparabile = stessoSettore && sizeComparabile;
      return {
        label: tx('M5-01-SELEZIONEPEER.2', { p0: i + 1 }),
        settore,
        fatturato,
        stessoSettore,
        sizeComparabile,
        comparabile,
      };
    });

    const numComparabili = candidati.filter((c) => c.comparabile).length;

    // --- Geometria: tutta funzione di nCandidati, nessun letterale fisso. ---
    const PROFILE_TITLE_ROW = 3;
    const R_SETTORE_TARGET = PROFILE_TITLE_ROW + 1;
    const R_FATTURATO_TARGET = PROFILE_TITLE_ROW + 2;

    const TABLE_TITLE_ROW = R_FATTURATO_TARGET + 2;
    const HEADER_ROW = TABLE_TITLE_ROW + 1;
    const CAND_ROW_FIRST = HEADER_ROW + 1;
    const CAND_ROW_LAST = CAND_ROW_FIRST + nCandidati - 1;

    const SUMMARY_ROW = CAND_ROW_LAST + 2;

    const rangeComparabile = `F${CAND_ROW_FIRST}:F${CAND_ROW_LAST}`;
    const cellsComparabile = Array.from({ length: nCandidati }, (_, i) => `F${CAND_ROW_FIRST + i}`);
    const cellsComparabileSpec: CellSpec[] = cellsComparabile.map((ref) => ({
      ref,
      content: null,
      locked: false,
      style: STILE_FORMULA,
    }));

    // T1 — coerenza di riga sull'intera colonna: scritto a mano (non
    // taskFormula) perche' il target e' un range, non una cella sola. La
    // correttezza aritmetica di ogni riga la verifica indirettamente T2.
    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M5-01-SELEZIONEPEER.3', { CAND_ROW_FIRST, CAND_ROW_LAST }),
      targetCell: `Model!${rangeComparabile}`,
      check: [
        { kind: 'consistentRow', range: `Model!${rangeComparabile}` },
        { kind: 'noError' },
        { kind: 'mustUseFunction', functions: ['AND'] },
      ],
      skills: ['comps.peer-selection'],
      minKeystrokes: 24,
    };

    const t2 = (() => {
      const base = taskFormula({
        id: 'T2',
        prompt:
          tx('M5-01-SELEZIONEPEER.4', { SUMMARY_ROW, rangeComparabile }),
        target: `Model!B${SUMMARY_ROW}`,
        atteso: numComparabili,
        referenzia: cellsComparabile,
        senzaLiteral: [],
        skills: ['comps.peer-selection'],
        minKeystrokes: 22,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['COUNTIF'] }] };
    })();

    const tasks = [t1, t2];

    return {
      templateId: 'M5-01-SELEZIONEPEER',
      seed: rng.seed,
      brief: [tx('M5-01-SELEZIONEPEER.5', { p0: cap(targetSettore), p1: eur(targetFatturato), p2: multiplo(SIZE_LO), p3: multiplo(SIZE_HI), p4: eur(targetFatturato * SIZE_LO), p5: eur(targetFatturato * SIZE_HI), p6: num(nCandidati) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M5-01-SELEZIONEPEER.6')], { style: STILE_TITOLO }),

            riga(`A${PROFILE_TITLE_ROW}`, [tx('M5-01-SELEZIONEPEER.7')], { style: STILE_TITOLO }),
            colonna(`A${R_SETTORE_TARGET}`, [tx('M5-01-SELEZIONEPEER.8'), tx('M5-01-SELEZIONEPEER.9')], { style: STILE_ETICHETTA }),
            blocco(`B${R_SETTORE_TARGET}`, [[cap(targetSettore)]], { style: STILE_INPUT_TESTO }),
            blocco(`B${R_FATTURATO_TARGET}`, [[targetFatturato]], { style: STILE_INPUT }),

            riga(`A${TABLE_TITLE_ROW}`, [tx('M5-01-SELEZIONEPEER.10')], { style: STILE_TITOLO }),
            riga(
              `A${HEADER_ROW}`,
              [tx('M5-01-SELEZIONEPEER.16'), tx('M5-01-SELEZIONEPEER.17'), tx('M5-01-SELEZIONEPEER.18'), tx('M5-01-SELEZIONEPEER.11'), tx('M5-01-SELEZIONEPEER.12'), tx('M5-01-SELEZIONEPEER.19')],
              { style: STILE_TITOLO },
            ),
            colonna(
              `A${CAND_ROW_FIRST}`,
              candidati.map((c) => c.label),
              { style: STILE_ETICHETTA },
            ),
            blocco(
              `B${CAND_ROW_FIRST}`,
              candidati.map((c) => [cap(c.settore)]),
              { style: STILE_INPUT_TESTO },
            ),
            blocco(
              `C${CAND_ROW_FIRST}`,
              candidati.map((c) => [c.fatturato]),
              { style: STILE_INPUT },
            ),
            blocco(
              `D${CAND_ROW_FIRST}`,
              candidati.map((c) => [c.stessoSettore ? tx('common.tok.si') : tx('common.tok.no')]),
              { style: STILE_INPUT_TESTO },
            ),
            blocco(
              `E${CAND_ROW_FIRST}`,
              candidati.map((c) => [c.sizeComparabile ? tx('common.tok.si') : tx('common.tok.no')]),
              { style: STILE_INPUT_TESTO },
            ),
            cellsComparabileSpec,

            colonna(`A${SUMMARY_ROW}`, [tx('M5-01-SELEZIONEPEER.13')], { style: STILE_ETICHETTA }),
            [{ ref: `B${SUMMARY_ROW}`, content: null, locked: false, style: STILE_TOTALE }],
          ],
          {
            colWidths: { A: 150, B: 130, C: 130, D: 140, E: 160, F: 140 },
            frozenRows: HEADER_ROW,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M5-01-SELEZIONEPEER.14', { CAND_ROW_FIRST, CAND_ROW_LAST }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M5-01-SELEZIONEPEER.15'),
          6,
          'T1',
        ),
        hint(
          'H3',
          `=COUNTIF(${rangeComparabile},TRUE)`,
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!F${CAND_ROW_FIRST}`,
    };
  },
});
