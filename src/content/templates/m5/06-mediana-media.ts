/**
 * M5 · 06 — Mediana vs media: come si sintetizza un comp set.
 *
 * IL PUNTO DIDATTICO: un comp set non e' un solo multiplo, e' un elenco. Per
 * applicarlo al target serve UN numero solo, e il modo in cui lo si ottiene
 * non e' indifferente. La MEDIA aritmetica pesa ogni osservazione allo stesso
 * modo, quindi un singolo peer anomalo — comprato a premio, o con un EBITDA
 * temporaneamente compresso da un evento straordinario — la trascina verso
 * l'alto (o il basso) quanto tutti gli altri peer messi insieme. La MEDIANA
 * no: e' il valore centrale dell'elenco ordinato, quindi non le importa QUANTO
 * lontano sia un outlier, solo che sia uno solo. Per questo un comp set si
 * sintetizza con la mediana, non con la media.
 *
 * Il livello genera SEMPRE un outlier — non e' un caso raro del seed, e' il
 * punto stesso dell'esercizio: un peer con un multiplo 2-3 volte piu' alto
 * degli altri, con una nota che ne spiega la causa (acquisizione a premio
 * recente, o EBITDA temporaneamente compresso).
 *
 * TRE TASK, in sequenza:
 *  - T1: la media dei multipli (AVERAGE).
 *  - T2: la mediana degli stessi multipli (MEDIAN) — stesso range, funzione
 *        diversa, risultato diverso: la differenza tra i due numeri E' la
 *        lezione.
 *  - T3: quanto l'outlier "tira" la media rispetto alla mediana, in
 *        percentuale: (Media - Mediana) / Mediana. Rende visibile e
 *        quantificato cio' che T1 e T2 hanno solo mostrato in cifre assolute.
 *
 * Geometria interamente funzione di `n` (8 o 9 peer, dal seed): nessuna riga
 * e' un letterale fisso.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  multiplo,
  num,
  par,
  pct,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA_PCT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

/** Output di una formula che restituisce un multiplo: nero, "x". */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };

/** Le due storie plausibili dietro un multiplo fuori scala in un comp set reale. */
const OUTLIER_REASONS = [
  "peer acquisito di recente a un multiplo di premio, non ancora digerito dal mercato",
  "peer con EBITDA temporaneamente compresso da un evento straordinario, che gonfia artificialmente il multiplo",
] as const;

/** Mediana aritmetica: valore centrale se n dispari, media dei due centrali se pari. */
function mediana(valori: readonly number[]): number {
  const ordinati = [...valori].sort((a, b) => a - b);
  const mid = Math.floor(ordinati.length / 2);
  return ordinati.length % 2 !== 0 ? ordinati[mid] : (ordinati[mid - 1] + ordinati[mid]) / 2;
}

export default defineTemplate({
  id: 'M5-06-MEDIANAMEDIA',
  module: 'M5',
  title: 'Mediana vs media: come si sintetizza un comp set',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 290,
  skills: ['comps.statistics'],
  prerequisites: ['M5-05-MULTIPLI2'],

  generate: (rng) => {
    const rMeta = rng.fork('meta');
    const rNormali = rng.fork('normali');
    const rOutlier = rng.fork('outlier');

    const n = rMeta.int(8, 9);

    // --- I multipli "normali": clusterizzati in una banda stretta, cosi' che
    // l'outlier — 2-3 volte la loro media — risalti senza ambiguita' qualunque
    // sia il seed. -----------------------------------------------------------
    const normali: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      normali.push(roundTo(triangular(rNormali, 5.5, 7.0, 9.0), 0.1));
    }
    const mediaNormali = normali.reduce((a, x) => a + x, 0) / normali.length;

    // --- L'outlier: sempre presente, mai opzionale. Fattore 2,0x-3,0x sopra
    // la media dei peer normali, come chiede il brief. -----------------------
    const fattoreOutlier = triangular(rOutlier, 2.0, 2.4, 3.0);
    const multiploOutlier = roundTo(mediaNormali * fattoreOutlier, 0.1);
    const insertIdx = rOutlier.int(0, n - 1);
    const motivoOutlier = rOutlier.pick(OUTLIER_REASONS);

    const multipli: number[] = [];
    let ni = 0;
    for (let i = 0; i < n; i++) {
      if (i === insertIdx) {
        multipli.push(multiploOutlier);
      } else {
        multipli.push(normali[ni]);
        ni++;
      }
    }
    const peerLabels = multipli.map((_x, i) => `Peer ${i + 1}`);

    const media = multipli.reduce((a, x) => a + x, 0) / n;
    const med = mediana(multipli);
    const pullEffect = (media - med) / med;

    // --- Geometria: tutta funzione di n, mai un letterale fisso. ------------
    const HEADER_ROW = 3;
    const DATA_START = 4;
    const dataEnd = DATA_START + n - 1;
    const riepilogoRow = dataEnd + 2;
    const R_MEDIA = riepilogoRow + 1;
    const R_MEDIANA = riepilogoRow + 2;
    const R_PULL = riepilogoRow + 3;

    const rangeMultipli = `B${DATA_START}:B${dataEnd}`;
    const outlierRow = DATA_START + insertIdx;

    const t1 = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          `In B${R_MEDIA} calcola la MEDIA dei ${num(n)} multipli EV/EBITDA del comp set (${rangeMultipli}). ` +
          'Una sola funzione: AVERAGE.',
        target: `Model!B${R_MEDIA}`,
        atteso: media,
        referenzia: [`B${DATA_START}`, `B${dataEnd}`],
        senzaLiteral: [],
        skills: ['comps.statistics'],
        minKeystrokes: 18,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['AVERAGE'] }] };
    })();

    const t2 = (() => {
      const base = taskFormula({
        id: 'T2',
        prompt:
          `In B${R_MEDIANA} calcola la MEDIANA degli stessi ${num(n)} multipli (${rangeMultipli}): il valore ` +
          "centrale dell'elenco ordinato, non la media. Una sola funzione: MEDIAN. Confronta il risultato con " +
          `B${R_MEDIA}: sono diversi, ed e' proprio questa differenza il punto del livello.`,
        target: `Model!B${R_MEDIANA}`,
        atteso: med,
        referenzia: [`B${DATA_START}`, `B${dataEnd}`],
        senzaLiteral: [],
        skills: ['comps.statistics'],
        minKeystrokes: 18,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['MEDIAN'] }] };
    })();

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In B${R_PULL} quantifica quanto l'outlier "tira" la media rispetto alla mediana: (Media - Mediana) / ` +
        `Mediana, cioe' (B${R_MEDIA}-B${R_MEDIANA})/B${R_MEDIANA}. Un numero vicino a zero direbbe che la media ` +
        "e' un buon riassunto del comp set; un numero grande direbbe l'opposto — che senza mediana avresti " +
        "applicato al target un multiplo distorto da un solo peer anomalo.",
      target: `Model!B${R_PULL}`,
      atteso: pullEffect,
      referenzia: [`B${R_MEDIA}`, `B${R_MEDIANA}`],
      senzaLiteral: [],
      skills: ['comps.statistics'],
      minKeystrokes: 14,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M5-06-MEDIANAMEDIA',
      seed: rng.seed,
      brief: [
        "## Mediana vs media: come si sintetizza un comp set",
        '',
        "Un comp set non e' un solo multiplo, e' un elenco. Per applicarlo al target serve UN numero " +
          "solo — e come lo ottieni non e' indifferente.",
        '',
        "La **media** aritmetica pesa ogni peer allo stesso modo: sommi tutto e dividi per quanti sono. " +
          "Un singolo peer anomalo — comprato a premio di recente, o con un EBITDA temporaneamente " +
          "compresso da un evento straordinario — la trascina verso l'alto tanto quanto TUTTI gli altri " +
          "peer messi insieme.",
        '',
        "La **mediana** no: e' il valore centrale dell'elenco ordinato (o la media dei due centrali, se " +
          "i peer sono in numero pari). Non le importa QUANTO lontano sia un outlier dal resto del " +
          "gruppo — solo che sia uno solo. Per questo un comp set si sintetizza con la mediana, non con " +
          "la media: e' la statistica che resiste agli outlier.",
        '',
        `Il comp set di oggi ha ${num(n)} peer. Uno di loro e' un ${motivoOutlier} — un caso reale, non ` +
          'un errore di battitura: capita, ed e\' per questo che la mediana esiste come prassi.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ["Mediana vs media: come si sintetizza un comp set"], { style: STILE_TITOLO }),
            riga(`A${HEADER_ROW}`, ['Peer', 'Multiplo EV/EBITDA, x', 'Nota'], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, peerLabels, { style: STILE_ETICHETTA }),
            blocco(
              `B${DATA_START}`,
              multipli.map((m) => [m]),
              { style: STILE_INPUT_MULTIPLO },
            ),
            [{ ref: `C${outlierRow}`, content: motivoOutlier, locked: true, style: STILE_ETICHETTA }],

            riga(`A${riepilogoRow}`, ['Sintesi del comp set'], { style: STILE_TITOLO }),
            colonna(
              `A${R_MEDIA}`,
              [
                'Media dei multipli, x',
                'Mediana dei multipli, x',
                "Quanto l'outlier tira la media rispetto alla mediana, %",
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: `B${R_MEDIA}`, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: `B${R_MEDIANA}`, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: `B${R_PULL}`, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 100, B: 190, C: 480 }, frozenRows: HEADER_ROW },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `=AVERAGE(${rangeMultipli}) — qui vale ${multiplo(media)}.`, 8, 'T1'),
        hint(
          'H2',
          `=MEDIAN(${rangeMultipli}) — qui vale ${multiplo(med)}. E' piu' basso della media proprio perche' ` +
            "un solo peer (l'outlier) sta trascinando la media verso l'alto, ma non conta piu' di un peer " +
            "qualsiasi nella mediana.",
          8,
          'T2',
        ),
        hint(
          'H3',
          `=(B${R_MEDIA}-B${R_MEDIANA})/B${R_MEDIANA} — qui vale ${pct(pullEffect)}: la media supera la ` +
            "mediana di questa percentuale, un effetto interamente dovuto all'outlier.",
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 95 }),
      startAt: `Model!B${R_MEDIA}`,
    };
  },
});
