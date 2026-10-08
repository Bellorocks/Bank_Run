/**
 * M6 · 02 — Il premio di controllo, nelle due direzioni.
 *
 * IL PUNTO DIDATTICO: M6-01 ha isolato il fatto grezzo — un multiplo di
 * transazione supera sempre il multiplo trading dello stesso target nello
 * stesso periodo. Questo livello lo trasforma in un NUMERO USABILE, il premio
 * di controllo in percentuale, e mostra che serve in DUE DIREZIONI opposte:
 *
 *  - ESTRARRE (T1): da un deal gia' avvenuto, quanto ha pagato il compratore
 *    SOPRA il prezzo a cui il target trattava in borsa PRIMA che il deal
 *    venisse annunciato. Il benchmark e' il multiplo trading PRE-annuncio,
 *    non uno qualunque: dopo l'annuncio il prezzo dell'azione salta gia' per
 *    incorporare l'attesa del deal, quindi confrontarsi con quello
 *    sottostimerebbe il premio davvero pagato.
 *
 *  - APPLICARE (T2, esercizio inverso): preso quel premio percentuale come
 *    riferimento di mercato, stimare un multiplo di transazione PLAUSIBILE
 *    per un target NUOVO, mai coinvolto in nessun deal — semplicemente
 *    applicando lo stesso premio al suo multiplo trading attuale. E'
 *    esattamente il ragionamento che un banker fa in una pitch: "i deal
 *    comparabili nel settore hanno pagato un premio del 20-25% sopra il
 *    trading pre-annuncio; il nostro target tratta oggi a 8,0x; un compratore
 *    plausibile potrebbe pagare intorno a 8,0x × (1+premio)".
 *
 * T2 riusa il premio CALCOLATO in T1 (mustReference sulla cella, non un nuovo
 * numero indipendente): il punto e' che il premio e' un dato di mercato che si
 * osserva una volta e si riapplica, non qualcosa che si re-inventa ogni volta.
 *
 * I due scenari (deal comparabile osservato / nuovo target ipotetico) sono
 * generati con `rng.fork` su stream indipendenti: non c'e' nessuna relazione
 * concettuale fra il settore del deal comparabile e quello del nuovo target,
 * quindi non deve essercene una nemmeno nei numeri generati.
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
  STILE_FORMULA_PCT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { SECTORS, STEP_MULTIPLE, ebitdaMargin, evEbitdaMultiple, growthRate } from '../../../rng/finance';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

/** Output di una formula che restituisce un multiplo: nero, "x". */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_MULT_TRANSAZIONE_OSS = 'B4'; // Multiplo di transazione osservato nel deal comparabile (dato, bloccato)
const B_MULT_TRADING_PRE = 'B5'; // Multiplo trading del target di quel deal, PRIMA dell'annuncio (dato, bloccato)

const B_PREMIO = 'B8'; // T1: premio di controllo, %

const B_MULT_TRADING_NUOVO = 'B11'; // Multiplo trading ATTUALE del nuovo target ipotetico (dato, bloccato)
const B_MULT_IMPLICITO = 'B12'; // T2: multiplo di transazione implicito

export default defineTemplate({
  id: 'M6-02-PREMIOCONTROLLO',
  module: 'M6',
  title: 'Il premio di controllo: estrazione e applicazione',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['prec.control-premium'],
  prerequisites: ['M6-01-MULTIPLIDITRANSAZIONE'],

  generate: (rng) => {
    // --- Scenario 1: il deal comparabile gia' avvenuto, da cui ESTRARRE il
    // premio. Un multiplo trading di settore plausibile PRIMA dell'annuncio,
    // e il multiplo di transazione che il compratore ha effettivamente
    // pagato — sempre sopra, mai sotto: e' il fatto grezzo di M6-01, qui
    // ridato come DATO bloccato di un deal nuovo (nessuna cella condivisa
    // fra template). Range 15%-40%, moda 25%, come in M6-01. -----------------
    const r1 = rng.fork('deal-comparabile');
    const sector1 = r1.pick(SECTORS);
    const growth1 = growthRate(r1, sector1);
    const margin1 = ebitdaMargin(r1, sector1);
    const multiploTradingPre = evEbitdaMultiple(r1, sector1, growth1, margin1);
    const premioFrazioneGenerata = triangular(r1, 0.15, 0.25, 0.4);
    const multiploTransazioneOss = roundTo(multiploTradingPre * (1 + premioFrazioneGenerata), STEP_MULTIPLE);

    // --- Scenario 2: il nuovo target ipotetico, mai coinvolto in nessun
    // deal, su cui APPLICARE il premio estratto in T1. Stream indipendente
    // dal primo: nessuna relazione fra i due settori, di proposito. ---------
    const r2 = rng.fork('nuovo-target');
    const sector2 = r2.pick(SECTORS);
    const growth2 = growthRate(r2, sector2);
    const margin2 = ebitdaMargin(r2, sector2);
    const multiploTradingNuovo = evEbitdaMultiple(r2, sector2, growth2, margin2);

    // Valori "veri" usati come atteso nei task: ricalcolati dai DATI
    // effettivamente scritti in foglio (dopo l'arrotondamento a 0,1x), non
    // dai parametri intermedi di generazione.
    const premioCalcolato = multiploTransazioneOss / multiploTradingPre - 1;
    const multiploImplicito = multiploTradingNuovo * (1 + premioCalcolato);

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_PREMIO} estrai il premio di controllo dal deal comparabile: dividi il multiplo di ` +
        `transazione effettivamente pagato (${B_MULT_TRANSAZIONE_OSS}) per il multiplo trading dello ` +
        `stesso target PRIMA dell'annuncio del deal (${B_MULT_TRADING_PRE}), poi sottrai 1. Formula: ` +
        `${B_MULT_TRANSAZIONE_OSS}/${B_MULT_TRADING_PRE}-1. Il benchmark e' il trading PRE-annuncio e ` +
        "non un multiplo qualsiasi: dopo l'annuncio il prezzo dell'azione salta gia' per incorporare " +
        "l'attesa del deal, quindi confrontarsi con quello sottostimerebbe il premio che il compratore " +
        'ha davvero pagato per il controllo.',
      target: `Model!${B_PREMIO}`,
      atteso: premioCalcolato,
      referenzia: [B_MULT_TRANSAZIONE_OSS, B_MULT_TRADING_PRE],
      senzaLiteral: [1],
      skills: ['prec.control-premium'],
      minKeystrokes: 14,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_MULT_IMPLICITO} fai l'ESERCIZIO INVERSO: prima si e' ESTRATTO il premio di controllo da ` +
        `un deal osservato (${B_PREMIO}), ora lo si APPLICA per stimare un multiplo di transazione ` +
        `PLAUSIBILE su un target nuovo, mai coinvolto in nessun deal. Moltiplica il suo multiplo trading ` +
        `attuale (${B_MULT_TRADING_NUOVO}) per (1 + il premio calcolato in ${B_PREMIO}): ` +
        `${B_MULT_TRADING_NUOVO}*(1+${B_PREMIO}). Riusa la cella del premio gia' calcolato — non ` +
        "ricalcolarlo o riscriverlo come numero a mano: e' un dato di mercato osservato una volta e " +
        'riapplicato, non qualcosa che si re-inventa a ogni target.',
      target: `Model!${B_MULT_IMPLICITO}`,
      atteso: multiploImplicito,
      referenzia: [B_MULT_TRADING_NUOVO, B_PREMIO],
      senzaLiteral: [1],
      skills: ['prec.control-premium'],
      minKeystrokes: 16,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M6-02-PREMIOCONTROLLO',
      seed: rng.seed,
      brief: [
        '## Il premio di controllo: estrazione e applicazione',
        '',
        "Il livello precedente ha mostrato il fatto grezzo: un multiplo di transazione supera sempre " +
          "il multiplo trading dello stesso target, nello stesso periodo. Qui quel fatto diventa un " +
          "NUMERO USABILE, il premio di controllo in percentuale — e lo si usa in DUE DIREZIONI opposte.",
        '',
        "**Estrarre (T1).** Da un deal gia' avvenuto, quanto ha pagato il compratore SOPRA il prezzo a " +
          "cui il target trattava in borsa PRIMA che il deal venisse annunciato. Il benchmark e' il " +
          "trading PRE-annuncio: dopo l'annuncio il prezzo dell'azione salta gia' per incorporare " +
          "l'attesa del deal, quindi confrontarsi con quello sottostimerebbe il premio davvero pagato.",
        '',
        "**Applicare (T2, esercizio inverso).** Preso quel premio percentuale come riferimento di " +
          "mercato, si stima un multiplo di transazione plausibile per un target NUOVO, mai coinvolto in " +
          "nessun deal — moltiplicando il suo multiplo trading attuale per (1 + premio). E' esattamente " +
          "il ragionamento di una pitch: \"i deal comparabili hanno pagato un premio del 20-25% sopra il " +
          "trading pre-annuncio; il nostro target tratta oggi a un certo multiplo; un compratore " +
          "plausibile potrebbe pagare intorno a quel multiplo aumentato dello stesso premio\".",
        '',
        `**Il deal comparabile.** Un target del settore ${sector1} trattava in borsa a ` +
          `${multiplo(multiploTradingPre)} EV/EBITDA prima che il deal venisse annunciato. Il compratore ` +
          `ha poi pagato il 100% del target a un multiplo di transazione di ${multiplo(multiploTransazioneOss)}.`,
        '',
        `**Il nuovo target.** Un target ipotetico del settore ${sector2}, mai coinvolto in nessuna ` +
          `operazione M&A, tratta oggi in borsa a ${multiplo(multiploTradingNuovo)} EV/EBITDA.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Il premio di controllo: estrazione e applicazione'], { style: STILE_TITOLO }),
            riga('A3', ['Deal comparabile osservato'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Multiplo di transazione pagato (Prezzo / EBITDA target), x',
                "Multiplo trading del target, PRIMA dell'annuncio del deal, x",
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_MULT_TRANSAZIONE_OSS, content: multiploTransazioneOss, style: STILE_INPUT_MULTIPLO, locked: true }],
            [{ ref: B_MULT_TRADING_PRE, content: multiploTradingPre, style: STILE_INPUT_MULTIPLO, locked: true }],

            riga('A7', ['Premio di controllo estratto dal deal'], { style: STILE_TITOLO }),
            colonna('A8', ['Premio di controllo, %'], { style: STILE_ETICHETTA }),
            [{ ref: B_PREMIO, content: null, locked: false, style: STILE_FORMULA_PCT }],

            riga('A10', ['Nuovo target: stima inversa del multiplo di transazione'], { style: STILE_TITOLO }),
            colonna(
              'A11',
              [
                'Multiplo trading ATTUALE del nuovo target, x',
                'Multiplo di transazione implicito, con lo stesso premio, x',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_MULT_TRADING_NUOVO, content: multiploTradingNuovo, style: STILE_INPUT_MULTIPLO, locked: true }],
            [{ ref: B_MULT_IMPLICITO, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
          ],
          { colWidths: { A: 420, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_MULT_TRANSAZIONE_OSS}/${B_MULT_TRADING_PRE}-1: multiplo pagato diviso multiplo trading ` +
            `pre-annuncio, meno 1 (qui vale ${pct(premioCalcolato)}).`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_MULT_TRADING_NUOVO}*(1+${B_PREMIO}): multiplo trading attuale del nuovo target, ` +
            `aumentato dello stesso premio di controllo estratto in T1 (qui vale ${multiplo(multiploImplicito)}).`,
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_PREMIO}`,
    };
  },
});
