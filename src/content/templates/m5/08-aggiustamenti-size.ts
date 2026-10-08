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
  title: 'Aggiustamenti al multiplo: size, crescita, margine',
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
        ? 'cresce piu\' rapidamente e/o margina di piu\' dei suoi peer quotati'
        : 'cresce piu\' lentamente e/o margina meno dei suoi peer quotati';

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_STEP1} applica alla mediana del comp set (${B_MEDIANA}) SOLO l'aggiustamento per size ` +
        `(${B_SIZE}): multiplo mediano × (1 + aggiustamento size). Il target e' piu' grande dei peer del ` +
        "comp set, quindi merita un multiplo piu' alto del loro — meno liquidita' e meno diversificazione " +
        "sono rischi tipici del peer piccolo, non del target. Formula: " + `${B_MEDIANA}*(1+${B_SIZE}).`,
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
        `In ${B_STEP2} applica l'aggiustamento per crescita/margine (${B_CRESCITA}) al risultato di T1 ` +
        `(${B_STEP1}), NON alla mediana originaria (${B_MEDIANA}): ${B_STEP1} × (1 + aggiustamento ` +
        "crescita/margine). I due aggiustamenti si compongono in SEQUENZA, moltiplicativamente, non si " +
        "sommano: ciascuno e' una percentuale applicata sulla base GIA' corretta dal passo precedente, " +
        `non sulla mediana originaria. Sommare le due percentuali (${B_MEDIANA}*(1+${B_SIZE}+${B_CRESCITA})) ` +
        "sembra equivalente ma non lo e': ignora l'interazione fra i due fattori e distorce leggermente " +
        "il risultato, in un verso o nell'altro a seconda dei segni. Formula: " +
        `${B_STEP1}*(1+${B_CRESCITA}).`,
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
      brief: [
        '## Aggiustamenti al multiplo: size, crescita, margine',
        '',
        "La mediana del comp set e' un multiplo di mercato osservato su societa' CONFRONTABILI, non " +
          "identiche al target. Se il target si discosta dal peer set su assi che il mercato prezza — " +
          "dimensione, crescita, marginalita' — applicargli quel multiplo cosi' com'e' significa ignorare " +
          "quello scostamento. Prima di applicare la mediana al target, si aggiusta.",
        '',
        "**Size.** Un'azienda piu' piccola dei suoi peer quotati comanda tipicamente un multiplo piu' " +
          "basso: meno liquidita' del titolo, meno diversificazione di prodotto e cliente, piu' rischio " +
          "percepito da chi compra. Il target di oggi e' piu' grande del comp set, quindi l'aggiustamento " +
          `va nella direzione opposta: +${pct(aggSize)} sul multiplo mediano.`,
        '',
        "**Crescita/margine.** Un target che cresce piu' velocemente o margina di piu' dei suoi peer " +
          "merita un multiplo piu' alto; il contrario se cresce meno o margina meno. Il target di oggi " +
          `${direzioneCrescita}: l'aggiustamento e' ${aggCrescita >= 0 ? '+' : ''}${pct(aggCrescita)} sul ` +
          "multiplo, con il segno che riflette la direzione.",
        '',
        "**L'ordine conta, ma non come pensi.** I due aggiustamenti si applicano in SEQUENZA, " +
          "moltiplicativamente — ciascuno sulla base gia' corretta dal passo precedente — non sommati " +
          "sulla mediana originaria. Sommare due percentuali su basi diverse e' un errore comune: sembra " +
          "un'approssimazione ragionevole, ma ignora l'interazione fra i due fattori e distorce il " +
          "risultato.",
        '',
        `**I dati.** Multiplo mediano del comp set: ${multiplo(medianaMultiplo)}. Aggiustamento size: ` +
          `+${pct(aggSize)}. Aggiustamento crescita/margine: ${aggCrescita >= 0 ? '+' : ''}${pct(aggCrescita)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Aggiustamenti al multiplo: size, crescita, margine'], { style: STILE_TITOLO }),
            riga('A3', ['Dati del comp set e del target'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Multiplo mediano del comp set (EV/EBITDA), x',
                'Aggiustamento per size, pp',
                'Aggiustamento per crescita/margine, pp',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_MEDIANA, content: medianaMultiplo, style: STILE_INPUT_MULTIPLO, locked: true },
              { ref: B_SIZE, content: aggSize, style: STILE_INPUT_PCT, locked: true },
              { ref: B_CRESCITA, content: aggCrescita, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A8', ['Multiplo aggiustato'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'Multiplo aggiustato per size, x',
                'Multiplo aggiustato finale (size + crescita/margine), x',
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
          `=${B_MEDIANA}*(1+${B_SIZE}) — qui vale ${multiplo(multiploStep1)}: la mediana aumentata ` +
            `dell'aggiustamento size, ${pct(aggSize)}.`,
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_STEP1}*(1+${B_CRESCITA}) — qui vale ${multiplo(multiploStep2)}: il risultato di T1, non ` +
            `la mediana originaria, corretto per l'aggiustamento crescita/margine ` +
            `(${aggCrescita >= 0 ? '+' : ''}${pct(aggCrescita)}).`,
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${B_STEP1}`,
    };
  },
});
