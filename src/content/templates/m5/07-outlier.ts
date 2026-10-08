/**
 * M5 · 07 — Escludere un outlier: mai "il numero che non mi piace".
 *
 * IL PUNTO DIDATTICO: M5-06 ha mostrato che la mediana RESISTE a un outlier
 * senza doverlo toccare. Questo livello insegna il passo successivo, piu'
 * delicato: a volte un peer non va solo "pesato meno" nella sintesi, va
 * ESCLUSO dal comp set — ma escludere un peer non e' mai una scelta
 * arbitraria fatta a occhio sul numero che stona. E' una scelta che richiede
 * una motivazione difendibile, scritta da qualche parte, che chiunque
 * riapra il modello possa leggere e giudicare. Qui la motivazione e' nel
 * brief e nel foglio stesso: un peer e' stato acquisito di recente, e il
 * suo multiplo riflette un premio di controllo pagato per il 100% delle
 * azioni, non un prezzo di mercato ordinario per una quota di minoranza
 * quotata — le due cose non sono comparabili.
 *
 * Il comp set arriva GIA' etichettato: una colonna "Includi nel comp set"
 * con SI per ogni peer normale e NO per l'outlier, motivato in una colonna
 * a fianco. Il giocatore non decide se escludere — quella decisione e' gia'
 * stata presa e documentata, come capiterebbe aprendo il modello di un
 * collega. Il suo compito e' costruire correttamente le due sintesi:
 *
 *  - T1: la MEDIANA su TUTTO l'elenco (nessuna esclusione: la mediana, come
 *    visto in M5-06, tollera un outlier senza bisogno di rimuoverlo).
 *  - T2: la MEDIA "pulita", calcolata SOLO sui peer con Includi = "SI" —
 *    AVERAGEIF con quel criterio. Escludere l'outlier dalla media e' cio'
 *    che rende la media di nuovo un riassunto onesto del comp set, ma solo
 *    perche' l'esclusione e' documentata: senza quella nota nel foglio,
 *    AVERAGEIF("SI") sarebbe indistinguibile da "ho tolto il numero che non
 *    mi piaceva".
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
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

/** Output di una formula che restituisce un multiplo: nero, "x". */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };

/** Le due storie plausibili dietro un peer che va escluso, non solo osservato. */
const OUTLIER_REASONS = [
  "e' stato acquisito da un concorrente poche settimane fa: il multiplo pagato riflette un premio " +
    "di controllo per rilevare il 100% delle azioni, non un prezzo di mercato ordinario per una " +
    'quota di minoranza quotata — le due cose non sono comparabili',
  "ha sospeso la quotazione per mesi in attesa di un'operazione straordinaria: l'ultimo prezzo " +
    "disponibile e' precedente alla sospensione e non riflette le condizioni di mercato correnti",
] as const;

/** Mediana aritmetica: valore centrale se n dispari, media dei due centrali se pari. */
function mediana(valori: readonly number[]): number {
  const ordinati = [...valori].sort((a, b) => a - b);
  const mid = Math.floor(ordinati.length / 2);
  return ordinati.length % 2 !== 0 ? ordinati[mid] : (ordinati[mid - 1] + ordinati[mid]) / 2;
}

export default defineTemplate({
  id: 'M5-07-OUTLIER',
  module: 'M5',
  title: 'Escludere un outlier: mai "il numero che non mi piace"',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['comps.statistics'],
  prerequisites: ['M5-06-MEDIANAMEDIA'],

  generate: (rng) => {
    const rMeta = rng.fork('meta');
    const rNormali = rng.fork('normali');
    const rOutlier = rng.fork('outlier');

    const n = rMeta.int(8, 9);

    // --- I multipli "normali": clusterizzati in una banda stretta, cosi'
    // l'outlier risalti senza ambiguita' qualunque sia il seed. ---------------
    const normali: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      normali.push(roundTo(triangular(rNormali, 5.5, 7.0, 9.0), 0.1));
    }
    const mediaNormali = normali.reduce((a, x) => a + x, 0) / normali.length;

    // --- L'outlier: sempre presente, mai opzionale. Fattore 2,0x-3,0x sopra
    // la media dei peer normali. ----------------------------------------------
    const fattoreOutlier = triangular(rOutlier, 2.0, 2.4, 3.0);
    const multiploOutlier = roundTo(mediaNormali * fattoreOutlier, 0.1);
    const insertIdx = rOutlier.int(0, n - 1);
    const motivoOutlier = rOutlier.pick(OUTLIER_REASONS);

    const multipli: number[] = [];
    const includi: string[] = [];
    let ni = 0;
    for (let i = 0; i < n; i++) {
      if (i === insertIdx) {
        multipli.push(multiploOutlier);
        includi.push('NO');
      } else {
        multipli.push(normali[ni]);
        includi.push('SI');
        ni++;
      }
    }
    const peerLabels = multipli.map((_x, i) => `Peer ${i + 1}`);

    const medianaCompleta = mediana(multipli);
    const mediaPulita = mediaNormali; // media dei SOLI peer con Includi = "SI"

    // --- Geometria: tutta funzione di n, mai un letterale fisso. ------------
    const HEADER_ROW = 3;
    const DATA_START = 4;
    const dataEnd = DATA_START + n - 1;
    const riepilogoRow = dataEnd + 2;
    const R_MEDIANA = riepilogoRow + 1;
    const R_MEDIA_PULITA = riepilogoRow + 2;

    const rangeMultipli = `B${DATA_START}:B${dataEnd}`;
    const rangeIncludi = `C${DATA_START}:C${dataEnd}`;
    const outlierRow = DATA_START + insertIdx;

    const t1 = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          `In B${R_MEDIANA} calcola la MEDIANA di TUTTI i ${num(n)} multipli del comp set (${rangeMultipli}), ` +
          "outlier incluso — nessuna esclusione qui: la mediana, come visto nel livello precedente, " +
          "non ha bisogno di rimuovere un peer anomalo per restarne quasi immune. Una sola funzione: MEDIAN.",
        target: `Model!B${R_MEDIANA}`,
        atteso: medianaCompleta,
        referenzia: [`B${DATA_START}`, `B${dataEnd}`],
        senzaLiteral: [],
        skills: ['comps.statistics'],
        minKeystrokes: 18,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['MEDIAN'] }] };
    })();

    const t2 = (() => {
      const base = taskFormula({
        id: 'T2',
        prompt:
          `In B${R_MEDIA_PULITA} calcola la MEDIA "pulita" del comp set: la media dei SOLI multipli con ` +
          `Includi = "SI" (criterio in ${rangeIncludi}, importi in ${rangeMultipli}). Il peer in riga ` +
          `${outlierRow} e' etichettato "NO" con una motivazione scritta accanto — non escluderlo perche' ` +
          "il suo numero stona, ma perche' quella motivazione e' documentata e verificabile. Una media " +
          "che scarta un outlier senza una nota che lo giustifichi non e' analisi, e' arbitrio. Una sola " +
          "funzione, con un criterio: AVERAGEIF.",
        target: `Model!B${R_MEDIA_PULITA}`,
        atteso: mediaPulita,
        referenzia: [`C${DATA_START}`, `C${dataEnd}`, `B${DATA_START}`, `B${dataEnd}`],
        senzaLiteral: [],
        skills: ['comps.statistics'],
        minKeystrokes: 32,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['AVERAGEIF'] }] };
    })();

    const tasks = [t1, t2];

    return {
      templateId: 'M5-07-OUTLIER',
      seed: rng.seed,
      brief: [
        '## Escludere un outlier: mai "il numero che non mi piace"',
        '',
        "M5-06 ha mostrato che la mediana resiste a un outlier senza doverlo toccare. Ma a volte un " +
          "peer non va solo pesato di meno nella sintesi: va escluso del tutto dal comp set. La " +
          "differenza tra queste due mosse e' tutta nella motivazione.",
        '',
        "Escludere un peer non e' mai una scelta fatta a occhio sul numero che stona. E' una scelta " +
          "che richiede una nota difendibile — scritta da qualche parte, cosi' che chiunque riapra il " +
          "modello possa leggerla e giudicarla — non un giudizio implicito nella testa di chi ha " +
          "costruito il foglio.",
        '',
        `Il comp set di oggi ha ${num(n)} peer, gia' etichettati: "Includi nel comp set" vale "SI" per ` +
          `ogni peer normale, "NO" per un solo peer, perche' ${motivoOutlier}.`,
        '',
        "Il tuo compito non e' decidere chi escludere — quella decisione e' gia' presa e documentata. " +
          "E' costruire correttamente le due sintesi che ne derivano: la mediana su tutto l'elenco, e " +
          'la media "pulita" solo sui peer inclusi.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Escludere un outlier: mai "il numero che non mi piace"'], { style: STILE_TITOLO }),
            riga(`A${HEADER_ROW}`, ['Peer', 'Multiplo EV/EBITDA, x', 'Includi nel comp set', 'Motivo esclusione'], {
              style: STILE_TITOLO,
            }),
            colonna(`A${DATA_START}`, peerLabels, { style: STILE_ETICHETTA }),
            blocco(
              `B${DATA_START}`,
              multipli.map((m) => [m]),
              { style: STILE_INPUT_MULTIPLO },
            ),
            colonna(`C${DATA_START}`, includi, { style: STILE_ETICHETTA }),
            [{ ref: `D${outlierRow}`, content: motivoOutlier, locked: true, style: STILE_ETICHETTA }],

            riga(`A${riepilogoRow}`, ['Sintesi del comp set'], { style: STILE_TITOLO }),
            colonna(
              `A${R_MEDIANA}`,
              ['Mediana di tutti i multipli, x', 'Media "pulita" (solo Includi = SI), x'],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: `B${R_MEDIANA}`, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: `B${R_MEDIA_PULITA}`, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
          ],
          { colWidths: { A: 100, B: 190, C: 150, D: 480 }, frozenRows: HEADER_ROW },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `=MEDIAN(${rangeMultipli}) — qui vale ${multiplo(medianaCompleta)}, outlier incluso.`, 8, 'T1'),
        hint(
          'H2',
          `=AVERAGEIF(${rangeIncludi},"SI",${rangeMultipli}) — qui vale ${multiplo(mediaPulita)}: la media dei ` +
            `${num(n - 1)} peer con Includi = "SI", il peer in riga ${outlierRow} escluso.`,
          12,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!B${R_MEDIANA}`,
    };
  },
});
