/**
 * M6 · 01 — Il multiplo di transazione non e' un multiplo trading.
 *
 * IL PUNTO DIDATTICO: un multiplo osservato in un'operazione M&A passata (un
 * "precedent transaction") e in un multiplo trading di borsa MISURANO cose
 * diverse, anche quando la formula (EV / EBITDA) e' identica. Il multiplo
 * trading nasce dal prezzo di UNA SINGOLA AZIONE scambiata ogni giorno da
 * investitori che comprano una quota minoritaria e liquida. Il multiplo di
 * transazione nasce dal prezzo che un compratore ha pagato per il 100% —
 * cioe' per il CONTROLLO: la possibilita' di nominare il management, decidere
 * la strategia, disporre della cassa. Il controllo vale un premio, e quel
 * premio si legge nel multiplo: a parita' di EBITDA, un compratore che paga
 * di piu' per la stessa azienda produce un multiplo piu' alto — non perche'
 * l'azienda valga di piu' "sul mercato", ma perche' sta comprando qualcosa di
 * diverso da un'azione in borsa.
 *
 * Questo livello isola l'osservazione, senza ancora scomporla: si vede che il
 * multiplo di transazione supera SEMPRE il multiplo trading dello stesso
 * settore nello stesso periodo, e si misura di quanto in percentuale. Il
 * livello successivo del modulo (M6-02, skill prec.control-premium) prende
 * quello scostamento e lo scompone nelle sue componenti — a partire da qui
 * e' solo il fatto grezzo da osservare e quantificare.
 *
 * I tre dati (prezzo pagato, EBITDA del target, multiplo trading di settore)
 * arrivano gia' pronti come DATO bloccato: sono il frutto della ricerca su un
 * deal comparabile reso pubblico (comunicato stampa, prospetto, database
 * M&A), non qualcosa che si ricostruisce dentro questo livello.
 */

import {
  defineTemplate,
  colonna,
  eurM,
  foglio,
  hint,
  multiplo,
  par,
  pct,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { SECTORS, STEP_MULTIPLE, ebitdaMargin, evEbitdaMultiple, growthRate, revenue } from '../../../rng/finance';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

/** Output di una formula che restituisce un multiplo: nero, "x". */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_PREZZO = 'B4'; // Prezzo pagato per il 100% del target (dato, bloccato)
const B_EBITDA_TARGET = 'B5'; // EBITDA del target al momento del deal (dato, bloccato)
const B_MULT_TRADING = 'B6'; // Multiplo EV/EBITDA trading medio di settore, stesso periodo (dato, bloccato)

const B_MULT_TRANSAZIONE = 'B9'; // T1
const B_SCOSTAMENTO = 'B10'; // T2

export default defineTemplate({
  id: 'M6-01-MULTIPLIDITRANSAZIONE',
  module: 'M6',
  title: "Il multiplo di transazione e il premio di controllo",
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['prec.transaction-multiples'],
  prerequisites: ['M5-04-MULTIPLI1'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Profilo settoriale del deal: stesso meccanismo di rng/finance.ts
    // gia' usato in M5, per un EBITDA e un multiplo trading di settore
    // plausibili e coerenti fra loro. ------------------------------------
    const sector = r.pick(SECTORS);
    const ricavi = revenue(r);
    const margin = ebitdaMargin(r, sector);
    const ebitdaTarget = roundTo(ricavi * margin, 1000);
    const growth = growthRate(r, sector);
    const multiploTrading = evEbitdaMultiple(r, sector, growth, margin);

    // --- Premio di controllo implicito nel prezzo pagato: quanto il
    // compratore ha pagato SOPRA il multiplo trading per il 100% del
    // target. Range 15%-40%, MAI sotto: e' il punto didattico del livello,
    // il multiplo di transazione deve SEMPRE superare quello trading dello
    // stesso settore e periodo. La moda al 25% riflette i premi di
    // controllo tipici osservati nei deal mid-market. ---------------------
    const premioFrazione = triangular(r, 0.15, 0.25, 0.4);
    const multiploTransazioneTarget = roundTo(multiploTrading * (1 + premioFrazione), STEP_MULTIPLE);
    const prezzoPagato = roundTo(multiploTransazioneTarget * ebitdaTarget, 1000);

    // Valori "veri" usati come atteso nei task: ricalcolati dai DATI
    // effettivamente scritti in foglio (dopo l'arrotondamento a migliaia /
    // decimi), non dai parametri intermedi di generazione.
    const multiploTransazione = prezzoPagato / ebitdaTarget;
    const scostamento = (multiploTransazione - multiploTrading) / multiploTrading;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_MULT_TRANSAZIONE} calcola il multiplo di transazione: dividi il Prezzo pagato per il ` +
        `100% del target (${B_PREZZO}) per l'EBITDA del target al momento del deal (${B_EBITDA_TARGET}). ` +
        "Formula: Prezzo pagato / EBITDA target. E' la stessa aritmetica di un multiplo EV/EBITDA " +
        "trading — ma qui il numeratore non e' il prezzo di un'azione scambiata in borsa: e' quanto " +
        "un compratore ha pagato per possedere e controllare l'intera azienda.",
      target: `Model!${B_MULT_TRANSAZIONE}`,
      atteso: multiploTransazione,
      referenzia: [B_PREZZO, B_EBITDA_TARGET],
      senzaLiteral: [],
      skills: ['prec.transaction-multiples'],
      minKeystrokes: 8,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_SCOSTAMENTO} calcola di quanto il multiplo di transazione (${B_MULT_TRANSAZIONE}) supera ` +
        `il multiplo trading medio di settore (${B_MULT_TRADING}), in percentuale: (${B_MULT_TRANSAZIONE} ` +
        `- ${B_MULT_TRADING}) / ${B_MULT_TRADING}. Il risultato e' sempre positivo: e' il PREMIO DI ` +
        "CONTROLLO implicito nel prezzo pagato — chi acquisisce il 100% compra la possibilita' di " +
        "nominare il management, decidere la strategia e disporre della cassa, non una singola azione " +
        "liquida scambiata ogni giorno da un investitore minoritario. Questo numero e' il punto di " +
        "partenza del prossimo livello, che lo scompone nelle sue componenti.",
      target: `Model!${B_SCOSTAMENTO}`,
      atteso: scostamento,
      referenzia: [B_MULT_TRANSAZIONE, B_MULT_TRADING],
      senzaLiteral: [],
      skills: ['prec.transaction-multiples'],
      minKeystrokes: 12,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M6-01-MULTIPLIDITRANSAZIONE',
      seed: rng.seed,
      brief: [
        '## Il multiplo di transazione non e\' un multiplo trading',
        '',
        "Un multiplo trading (EV/EBITDA di una societa' quotata) nasce dal prezzo di UNA SINGOLA " +
          "AZIONE, scambiata ogni giorno da investitori che comprano una quota minoritaria e liquida " +
          "del capitale. Un multiplo di TRANSAZIONE nasce da tutt'altro: e' il prezzo che un " +
          "compratore ha pagato per il 100% di un'azienda in un'operazione M&A — cioe' per il " +
          '**controllo**: la possibilita\' di nominare il management, decidere la strategia, disporre ' +
          'della cassa.',
        '',
        "Il controllo vale un premio, e quel premio si legge direttamente nel multiplo: a parita' di " +
          "EBITDA, un compratore che paga di piu' per l'intera azienda produce un multiplo PIU' ALTO " +
          "di quello a cui la stessa azienda tratterebbe in borsa — non perche' l'azienda valga di " +
          "piu' \"sul mercato\", ma perche' il compratore sta acquistando qualcosa di diverso da " +
          "un'azione. Questo livello isola il fatto grezzo: il multiplo di transazione SUPERA sempre " +
          "il multiplo trading dello stesso settore, nello stesso periodo. Il livello successivo del " +
          'modulo scompone quello scostamento nelle sue componenti.',
        '',
        `**Il deal.** Un compratore ha acquisito il 100% di un target del settore ${sector} in ` +
          `un'operazione M&A comparabile, quando l'EBITDA del target era di ${eurM(ebitdaTarget)} e il ` +
          `multiplo EV/EBITDA trading medio del settore, nello stesso periodo, era ${multiplo(multiploTrading)}. ` +
          `Il prezzo pagato per il 100% del target e' stato di ${eurM(prezzoPagato)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ["Il multiplo di transazione e il premio di controllo"], { style: STILE_TITOLO }),
            riga('A3', ['Dati del deal comparabile'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Prezzo pagato per il 100% del target, €',
                'EBITDA del target al momento del deal, €',
                'Multiplo EV/EBITDA trading medio di settore, stesso periodo, x',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_PREZZO, content: prezzoPagato, style: STILE_INPUT, locked: true }],
            [{ ref: B_EBITDA_TARGET, content: ebitdaTarget, style: STILE_INPUT, locked: true }],
            [{ ref: B_MULT_TRADING, content: multiploTrading, style: STILE_INPUT_MULTIPLO, locked: true }],

            riga('A8', ['Multiplo di transazione e confronto col trading'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'Multiplo di transazione (Prezzo / EBITDA target), x',
                'Scostamento dal multiplo trading, %',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_MULT_TRANSAZIONE, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_SCOSTAMENTO, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 340, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_PREZZO}/${B_EBITDA_TARGET}: Prezzo pagato su EBITDA del target (qui vale ` +
            `${multiplo(multiploTransazione)}).`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=(${B_MULT_TRANSAZIONE}-${B_MULT_TRADING})/${B_MULT_TRADING}: quanto il multiplo di ` +
            `transazione supera quello trading, in percentuale del trading (qui vale ${pct(scostamento)}) ` +
            '— e\' il premio di controllo implicito nel prezzo pagato.',
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${B_MULT_TRANSAZIONE}`,
    };
  },
});
