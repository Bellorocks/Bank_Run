/**
 * M5 · 08 — Aggiustamenti al multiplo: size, crescita, margine.
 *
 * IL PUNTO DIDATTICO: la mediana del comp set (M5-06/07) e' un multiplo di
 * mercato osservato su societa' CONFRONTABILI, non identiche al target. Se il
 * target si discosta dal peer set su assi che il mercato prezza — dimensione,
 * crescita, marginalita' — applicargli quel multiplo cosi' com'e' significa
 * ignorare quello scostamento. Due aggiustamenti, entrambi in punti
 * percentuali sul multiplo:
 *
 *  - SIZE: un'azienda piu' piccola dei suoi peer quotati comanda tipicamente
 *    un multiplo PIU' BASSO — meno liquidita' del titolo, meno diversificazione
 *    di prodotto/cliente, piu' rischio percepito. Il contrario vale quando il
 *    target e' PIU' GRANDE dei peer: merita un multiplo PIU' ALTO. Qui il
 *    target e' sempre piu' grande del comp set, quindi l'aggiustamento size
 *    e' sempre positivo.
 *  - CRESCITA/MARGINE: un target che cresce piu' rapidamente o e' piu'
 *    marginale dei suoi peer merita un multiplo piu' alto (l'inverso se
 *    cresce meno o e' meno marginale) — qui l'aggiustamento arriva CON SEGNO,
 *    perche' entrambe le direzioni sono scenari plausibili.
 *
 * DUE TASK, in sequenza OBBLIGATA:
 *  - T1: applica SOLO l'aggiustamento size alla mediana.
 *  - T2: applica l'aggiustamento crescita/margine al risultato di T1 (non
 *        alla mediana originale) — l'ordine e' arbitrario (i due fattori
 *        commutano), ma l'INPUT del secondo passo deve essere l'OUTPUT del
 *        primo. La composizione e' MOLTIPLICATIVA — mediana × (1+size) ×
 *        (1+crescita) — non additiva. Il brief spiega perche': i due
 *        aggiustamenti sono percentuali applicate in sequenza, ciascuna sulla
 *        base gia' corretta dal passo precedente, non due percentuali sommate
 *        sulla stessa base originaria — sommarle (mediana × (1+size+crescita))
 *        e' un errore comune che sottostima leggermente l'effetto combinato
 *        di due aggiustamenti positivi (o lo sovrastima se di segno opposto),
 *        perche' ignora l'interazione fra i due fattori.
 *
 * Geometria fissa: nessuna posizione dipende dal seed.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  multiplo,
  par,
  pct,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT_MULTIPLO,
  STILE_INPUT_PCT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

import { tx } from '../../../i18n/content';
/** Output di una formula che restituisce un multiplo: nero, "x". */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_MEDIANA = 'B4'; // Multiplo mediano del comp set (dato, bloccato)
const B_SIZE = 'B5'; // Aggiustamento per size, pp (dato, bloccato, sempre positivo)
const B_CRESCITA = 'B6'; // Aggiustamento per crescita/margine, pp (dato, bloccato, con segno)

const B_STEP1 = 'B9'; // T1: multiplo aggiustato per size
const B_STEP2 = 'B10'; // T2: multiplo aggiustato finale (size + crescita/margine)

export default defineTemplate({
  id: 'M5-08-AGGIUSTAMENTISIZE',
  module: 'M5',
  get title() {
    return tx('M5-08-AGGIUSTAMENTISIZE.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['comps.adjustments'],
  prerequisites: ['M5-07-OUTLIER'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Il multiplo mediano del comp set: il risultato concettuale di
    // M5-06/07, qui ridato come DATO bloccato (nessuna cella condivisa fra
    // template). ---------------------------------------------------------
    const medianaMultiplo = roundTo(triangular(r, 6.0, 8.0, 12.0), 0.1);

    // --- Aggiustamento size: il target e' sempre PIU' GRANDE del comp set in
    // questo livello, quindi l'aggiustamento e' sempre positivo, tipicamente
    // +5%/+15%. ------------------------------------------------------------
    const aggSize = roundTo(triangular(r, 0.05, 0.08, 0.15), 0.001);

    // --- Aggiustamento crescita/margine: con segno. Positivo se il target
    // cresce di piu' o margina di piu' dei peer, negativo nel caso opposto —
    // entrambi gli scenari sono realistici, quindi entrambi compaiono. -----
    const segnoCrescita = r.bool() ? 1 : -1;
    const magnitudeCrescita = roundTo(triangular(r, 0.02, 0.05, 0.10), 0.001);
    const aggCrescita = segnoCrescita * magnitudeCrescita;

    const multiploStep1 = medianaMultiplo * (1 + aggSize);
    const multiploStep2 = multiploStep1 * (1 + aggCrescita);

    const direzioneCrescita =
      segnoCrescita > 0
        ? tx('M5-08-AGGIUSTAMENTISIZE.2')
        : tx('M5-08-AGGIUSTAMENTISIZE.3');

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M5-08-AGGIUSTAMENTISIZE.4', { B_STEP1, B_MEDIANA, B_SIZE }),
      target: `Model!${B_STEP1}`,
      atteso: multiploStep1,
      referenzia: [B_MEDIANA, B_SIZE],
      senzaLiteral: [1],
      skills: ['comps.adjustments'],
      minKeystrokes: 14,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M5-08-AGGIUSTAMENTISIZE.5', { B_STEP2, B_CRESCITA, B_STEP1, B_MEDIANA, B_SIZE }),
      target: `Model!${B_STEP2}`,
      atteso: multiploStep2,
      referenzia: [B_STEP1, B_CRESCITA],
      senzaLiteral: [1],
      skills: ['comps.adjustments'],
      minKeystrokes: 14,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M5-08-AGGIUSTAMENTISIZE',
      seed: rng.seed,
      brief: [tx('M5-08-AGGIUSTAMENTISIZE.6', { p0: pct(aggSize), direzioneCrescita, p2: aggCrescita >= 0 ? '+' : '', p3: pct(aggCrescita), p4: multiplo(medianaMultiplo), p5: pct(aggSize), p6: aggCrescita >= 0 ? '+' : '', p7: pct(aggCrescita) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M5-08-AGGIUSTAMENTISIZE.7')], { style: STILE_TITOLO }),
            riga('A3', [tx('M5-08-AGGIUSTAMENTISIZE.8')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M5-08-AGGIUSTAMENTISIZE.9'),
                tx('M5-08-AGGIUSTAMENTISIZE.10'),
                tx('M5-08-AGGIUSTAMENTISIZE.11'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_MEDIANA, content: medianaMultiplo, style: STILE_INPUT_MULTIPLO, locked: true },
              { ref: B_SIZE, content: aggSize, style: STILE_INPUT_PCT, locked: true },
              { ref: B_CRESCITA, content: aggCrescita, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A8', [tx('M5-08-AGGIUSTAMENTISIZE.12')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M5-08-AGGIUSTAMENTISIZE.13'),
                tx('M5-08-AGGIUSTAMENTISIZE.14'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_STEP1, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_STEP2, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
          ],
          { colWidths: { A: 440, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M5-08-AGGIUSTAMENTISIZE.15', { B_MEDIANA, B_SIZE, p2: multiplo(multiploStep1), p3: pct(aggSize) }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M5-08-AGGIUSTAMENTISIZE.16', { B_STEP1, B_CRESCITA, p2: multiplo(multiploStep2), p3: aggCrescita >= 0 ? '+' : '', p4: pct(aggCrescita) }),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${B_STEP1}`,
    };
  },
});
