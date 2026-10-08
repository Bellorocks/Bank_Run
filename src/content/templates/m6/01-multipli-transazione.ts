/**
 * M6 · 01 — Il multiplo di transazione non e' un multiplo trading.
 *
 * Un multiplo trading nasce dal prezzo di una singola azione scambiata in
 * borsa da investitori di minoranza. Un multiplo di transazione nasce da cio'
 * che un compratore ha pagato per il 100% dell'azienda, cioe' per il
 * controllo: a parita' di EBITDA e' tipicamente piu' alto.
 *
 * La formula e' la stessa (EV / EBITDA), ma l'EV di un deal va ricostruito:
 * il prezzo annunciato e' quello pagato per l'EQUITY, e il compratore si
 * accolla anche il debito netto della target. Dividere il prezzo dell'equity
 * per l'EBITDA mescola un numeratore "azionisti" con un denominatore "tutta
 * l'azienda": e' l'errore che il livello intercetta.
 *
 *   T1  EV della transazione = prezzo dell'equity + debito netto assunto
 *   T2  Multiplo di transazione = EV / EBITDA
 *   T3  Premio sul multiplo trading = (transazione − trading) / trading
 *
 * Il premio sul multiplo non coincide col premio di controllo sul prezzo per
 * azione (che si misura sull'equity): e' il suo riflesso sul multiplo, ed e'
 * il punto di partenza del livello successivo.
 */

import {
  defineTemplate,
  colonna,
  eurM,
  foglio,
  hint,
  multiplo,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { SECTORS, STEP_MULTIPLE, ebitdaMargin, evEbitdaMultiple, growthRate, revenue } from '../../../rng/finance';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

import { sectorName, tx } from '../../../i18n/content';
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };

const B_PREZZO = 'B4'; // Prezzo pagato per il 100% dell'equity (dato)
const B_DEBITO = 'B5'; // Debito netto della target, assunto dal compratore (dato)
const B_EBITDA_TARGET = 'B6'; // EBITDA della target al momento del deal (dato)
const B_MULT_TRADING = 'B7'; // Multiplo EV/EBITDA trading medio di settore (dato)

const B_EV = 'B10'; // T1
const B_MULT_TRANSAZIONE = 'B11'; // T2
const B_SCOSTAMENTO = 'B12'; // T3

export default defineTemplate({
  id: 'M6-01-MULTIPLIDITRANSAZIONE',
  module: 'M6',
  get title() {
    return tx('M6-01-MULTIPLIDITRANSAZIONE.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 280,
  skills: ['prec.transaction-multiples'],
  prerequisites: ['M5-04-MULTIPLI1'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const sector = r.pick(SECTORS);
    const ricavi = revenue(r);
    const margin = ebitdaMargin(r, sector);
    const ebitdaTarget = roundTo(ricavi * margin, 1000);
    const growth = growthRate(r, sector);
    const multiploTrading = evEbitdaMultiple(r, sector, growth, margin);

    // Premio sul multiplo: 15%-40%, mai sotto (il punto didattico del livello).
    const premioFrazione = triangular(r, 0.15, 0.25, 0.4);
    const multiploTransazioneTarget = roundTo(multiploTrading * (1 + premioFrazione), STEP_MULTIPLE);
    const evTarget = multiploTransazioneTarget * ebitdaTarget;
    const debitoNetto = roundTo(ebitdaTarget * triangular(r, 0.5, 1.5, 2.5), 1000);
    const prezzoPagato = roundTo(evTarget - debitoNetto, 1000);

    const ev = prezzoPagato + debitoNetto;
    const multiploTransazione = ev / ebitdaTarget;
    const scostamento = (multiploTransazione - multiploTrading) / multiploTrading;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M6-01-MULTIPLIDITRANSAZIONE.2', { B_EV }),
        target: `Model!${B_EV}`,
        atteso: ev,
        referenzia: [B_PREZZO, B_DEBITO],
        senzaLiteral: [],
        skills: ['prec.transaction-multiples'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M6-01-MULTIPLIDITRANSAZIONE.3', { B_MULT_TRANSAZIONE }),
        target: `Model!${B_MULT_TRANSAZIONE}`,
        atteso: multiploTransazione,
        referenzia: [B_EV, B_EBITDA_TARGET],
        senzaLiteral: [],
        skills: ['prec.transaction-multiples'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt:
          tx('M6-01-MULTIPLIDITRANSAZIONE.4', { B_SCOSTAMENTO }),
        target: `Model!${B_SCOSTAMENTO}`,
        atteso: scostamento,
        referenzia: [B_MULT_TRANSAZIONE, B_MULT_TRADING],
        senzaLiteral: [],
        skills: ['prec.transaction-multiples'],
        minKeystrokes: 12,
      }),
    ];

    return {
      templateId: 'M6-01-MULTIPLIDITRANSAZIONE',
      seed: rng.seed,
      brief: [tx('M6-01-MULTIPLIDITRANSAZIONE.5', { sector: sectorName(sector), p1: eurM(ebitdaTarget), p2: eurM(debitoNetto), p3: eurM(prezzoPagato), p4: multiplo(multiploTrading) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M6-01-MULTIPLIDITRANSAZIONE.6')], { style: STILE_TITOLO }),
            riga('A3', [tx('M6-01-MULTIPLIDITRANSAZIONE.7')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M6-01-MULTIPLIDITRANSAZIONE.8'),
                tx('M6-01-MULTIPLIDITRANSAZIONE.9'),
                tx('M6-01-MULTIPLIDITRANSAZIONE.10'),
                tx('M6-01-MULTIPLIDITRANSAZIONE.11'),
              ],
              { style: STILE_ETICHETTA },
            ),
            colonna(B_PREZZO, [prezzoPagato, debitoNetto, ebitdaTarget], { style: STILE_INPUT }),
            [{ ref: B_MULT_TRADING, content: multiploTrading, style: STILE_INPUT_MULTIPLO, locked: true }],

            riga('A9', [tx('M6-01-MULTIPLIDITRANSAZIONE.12')], { style: STILE_TITOLO }),
            colonna(
              'A10',
              [tx('M6-01-MULTIPLIDITRANSAZIONE.13'), tx('M6-01-MULTIPLIDITRANSAZIONE.14'), tx('M6-01-MULTIPLIDITRANSAZIONE.15')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EV, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_MULT_TRANSAZIONE, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_SCOSTAMENTO, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 380, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M6-01-MULTIPLIDITRANSAZIONE.16', { B_PREZZO, B_DEBITO }), 10, 'T1'),
        hint('H2', `=${B_EV}/${B_EBITDA_TARGET}`, 8, 'T2'),
        hint('H3', `=(${B_MULT_TRANSAZIONE}-${B_MULT_TRADING})/${B_MULT_TRADING}`, 10, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_EV}`,
    };
  },
});
