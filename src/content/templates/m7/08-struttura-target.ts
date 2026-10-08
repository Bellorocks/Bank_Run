/**
 * M7 · 08 — Struttura di capitale: TARGET, non ATTUALE.
 *
 * Il WACC (M7-07) e' una media ponderata fra Ke e Kd after-tax, pesata per la
 * struttura di capitale D/(D+E) e E/(D+E). Ma QUALE struttura? Un'azienda
 * appena uscita da un LBO (leveraged buyout) e' spesso indebitata MOLTO oltre
 * quello che sara' il suo assetto di lungo periodo: il piano industriale
 * prevede un deleveraging (riduzione progressiva del debito) verso una
 * struttura "target" — spesso vicina alla media del settore — nell'arco di
 * qualche anno.
 *
 * IL PUNTO DIDATTICO — il WACC del DCF usa la leva di LUNGO periodo, non quella di oggi
 *
 * Il WACC che sconta i flussi di cassa di un DCF deve rappresentare il costo
 * del capitale "a regime": la struttura finanziaria che l'azienda avra' per
 * la maggior parte del suo orizzonte di vita, non uno stato temporaneo (un
 * picco di leva subito dopo un'acquisizione, o viceversa una fase di
 * deleveraging quasi completato). Usare i pesi ATTUALI di un'azienda
 * appena fatta oggetto di un LBO significa dare al debito (piu' economico
 * dell'equity) un peso ARTIFICIALMENTE alto — e questo abbassa il WACC
 * calcolato, quindi ALZA il valore attuale dei flussi scontati: un errore che
 * sovrastima sistematicamente la valutazione, proprio nel momento (un LBO) in
 * cui sopravvalutare l'azienda costa di piu'.
 *
 * Questo livello isola l'effetto dei PESI a parita' di Ke e di Kd after-tax:
 * stesso costo del capitale proprio, stesso costo del debito, due strutture
 * di capitale diverse, due WACC diversi.
 *
 * Semplificazione dichiarata: in realta' anche Ke cambierebbe con la leva
 * (andrebbe rilevered il beta con la formula di Hamada, come in M7-05, alla
 * NUOVA leva) — ma qui Ke e' tenuto costante apposta, per non confondere
 * l'effetto dei pesi con l'effetto di un beta diverso. Il punto di questo
 * livello e' solo "quale struttura pesare", non "come cambia tutta la
 * catena quando cambia la leva".
 *
 * Geometria fissa: nessuna riga dipende dal seed, i riferimenti di cella sono
 * letterali per costruzione, come negli altri livelli M7.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  pct,
  riga,
  STILE_ETICHETTA,
  STILE_INPUT_PCT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const STILE_FORMULA_PCT: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.00%' };
/** Differenza in punti base: un numero, non una percentuale, un decimale. */
const STILE_FORMULA_BPS: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0.0" bps"' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_WD_ATTUALE = 'B4'; // Peso debito ATTUALE D/(D+E), post-LBO (dato, bloccato)
const B_WD_TARGET = 'B5'; // Peso debito TARGET D/(D+E), struttura di lungo periodo (dato, bloccato)
const B_KE = 'B6'; // Ke, costante per costruzione in questo esercizio (dato, bloccato)
const B_KD_AT = 'B7'; // Kd after-tax, gia' calcolato altrove (dato, bloccato)

const B_WACC_ATTUALE = 'B11'; // T1: WACC con la struttura ATTUALE (sbagliato per il DCF)
const B_WACC_TARGET = 'B12'; // T2: WACC con la struttura TARGET (corretto per il DCF)
const B_DIFF_BPS = 'B13'; // T3: differenza in punti base fra i due WACC

export default defineTemplate({
  id: 'M7-08-STRUTTURATARGET',
  module: 'M7',
  get title() {
    return tx('M7-08-STRUTTURATARGET.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['dcf.wacc'],
  prerequisites: ['M7-07-WACC'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Peso debito ATTUALE D/(D+E): 0,45-0,65, moda 0,55 — un'azienda appena
    // fatta oggetto di un LBO, molto indebitata rispetto al suo assetto
    // "a regime".
    const wdAttuale = roundTo(triangular(r, 0.45, 0.55, 0.65), 0.01);

    // Peso debito TARGET D/(D+E): 0,20-0,40, moda 0,30 — la struttura di
    // lungo periodo verso cui l'azienda si deleveraghera', tipicamente
    // vicina alla media di settore. Per costruzione questo range NON si
    // sovrappone mai a quello del peso attuale sopra (max qui 0,40 < min
    // sopra 0,45): il deleveraging e' sempre non banale, per qualunque seed.
    const wdTarget = roundTo(triangular(r, 0.2, 0.3, 0.4), 0.01);

    // Guard-rail (§4.3): l'esercizio ha senso solo se la leva attuale e'
    // davvero piu' alta di quella target (altrimenti il "deleveraging" del
    // brief non descriverebbe i numeri generati). I range sopra lo
    // garantiscono per costruzione; questo throw intercetta subito, in fase
    // di generazione, un'eventuale futura modifica ai range che rompesse
    // l'invariante, invece di lasciar passare un livello silenziosamente
    // incoerente.
    if (wdTarget >= wdAttuale) {
      throw new Error(
        `M7-08-STRUTTURATARGET: peso debito target (${wdTarget}) non e' inferiore al peso debito ` +
          `attuale (${wdAttuale}) per il seed ${rng.seed}: il deleveraging del brief non e' coerente ` +
          'con i dati generati.',
      );
    }

    // Ke: 10%-15%, moda 12% — costante per costruzione (semplificazione
    // dichiarata nel commento in testa al file).
    const ke = roundTo(triangular(r, 0.1, 0.12, 0.15), 0.001);

    // Kd after-tax: 3%-5%, moda 4% — gia' al netto dello scudo fiscale,
    // dato bloccato (risultato concettuale di M7-07, qui ridato come proprio
    // dato: nessuna cella live condivisa fra template diversi).
    const kdAfterTax = roundTo(triangular(r, 0.03, 0.04, 0.05), 0.001);

    const waccAttuale = ke * (1 - wdAttuale) + kdAfterTax * wdAttuale;
    const waccTarget = ke * (1 - wdTarget) + kdAfterTax * wdTarget;
    const diffBps = (waccTarget - waccAttuale) * 10000;

    // NB: tutti e tre i task sono costruiti a mano (non con taskFormula) per
    // stringere la tolleranza del check 'value'. La tolleranza di default di
    // taskFormula ('hybrid', pavimento assoluto 0,01) e' enorme rispetto alla
    // scala di T1/T2 (WACC 6-13%): una formula strutturalmente SBAGLIATA —
    // es. scambiare peso debito e peso equity, o usare la struttura attuale
    // al posto della target e viceversa — resterebbe spesso "vicina" al
    // valore corretto e verrebbe accettata per errore. mustReference e
    // mustNotContainLiteral non bastano da sole: l'argine strutturale
    // principale e' il check 'value' con tolleranza stretta.
    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M7-08-STRUTTURATARGET.2', { B_WACC_ATTUALE, B_KE, B_KD_AT, B_WD_ATTUALE }),
      targetCell: `Model!${B_WACC_ATTUALE}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: waccAttuale,
          tolerance: 0.0001,
          toleranceMode: 'absolute',
          message:
            tx('M7-08-STRUTTURATARGET.3', { B_WD_ATTUALE }),
        },
        { kind: 'mustReference', cells: [B_KE, B_KD_AT, B_WD_ATTUALE] },
        { kind: 'mustNotContainLiteral', except: [1] },
      ],
      skills: ['dcf.wacc'],
      minKeystrokes: 22,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M7-08-STRUTTURATARGET.4', { B_WACC_TARGET, B_KE, B_KD_AT, B_WD_TARGET, B_WD_ATTUALE }),
      targetCell: `Model!${B_WACC_TARGET}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: waccTarget,
          tolerance: 0.0001,
          toleranceMode: 'absolute',
          message:
            tx('M7-08-STRUTTURATARGET.5', { B_WD_TARGET, B_WD_ATTUALE }),
        },
        { kind: 'mustReference', cells: [B_KE, B_KD_AT, B_WD_TARGET] },
        { kind: 'mustNotContainLiteral', except: [1] },
      ],
      skills: ['dcf.wacc'],
      minKeystrokes: 22,
    };

    const t3: Task = {
      id: 'T3',
      prompt:
        tx('M7-08-STRUTTURATARGET.6', { B_DIFF_BPS, B_WACC_TARGET, B_WACC_ATTUALE }),
      targetCell: `Model!${B_DIFF_BPS}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: diffBps,
          tolerance: 0.05,
          toleranceMode: 'absolute',
          message:
            tx('M7-08-STRUTTURATARGET.7', { B_WACC_TARGET, B_WACC_ATTUALE }),
        },
        { kind: 'mustReference', cells: [B_WACC_TARGET, B_WACC_ATTUALE] },
        { kind: 'mustNotContainLiteral', except: [10000] },
      ],
      skills: ['dcf.wacc'],
      minKeystrokes: 18,
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M7-08-STRUTTURATARGET',
      seed: rng.seed,
      brief: [tx('M7-08-STRUTTURATARGET.8', { p0: pct(wdAttuale, 0), p1: pct(wdTarget, 0), p2: pct(ke, 2), p3: pct(kdAfterTax, 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-08-STRUTTURATARGET.9')], { style: STILE_TITOLO }),
            riga('A3', [tx('M7-08-STRUTTURATARGET.21')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M7-08-STRUTTURATARGET.10'),
                tx('M7-08-STRUTTURATARGET.11'),
                tx('M7-08-STRUTTURATARGET.12'),
                tx('M7-08-STRUTTURATARGET.13'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_WD_ATTUALE, content: wdAttuale, style: STILE_INPUT_PCT, locked: true },
              { ref: B_WD_TARGET, content: wdTarget, style: STILE_INPUT_PCT, locked: true },
              { ref: B_KE, content: ke, style: STILE_INPUT_PCT, locked: true },
              { ref: B_KD_AT, content: kdAfterTax, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A10', [tx('M7-08-STRUTTURATARGET.14')], { style: STILE_TITOLO }),
            colonna(
              'A11',
              [
                tx('M7-08-STRUTTURATARGET.15'),
                tx('M7-08-STRUTTURATARGET.16'),
                tx('M7-08-STRUTTURATARGET.17'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_WACC_ATTUALE, content: null, locked: false, style: STILE_FORMULA_PCT },
              { ref: B_WACC_TARGET, content: null, locked: false, style: STILE_FORMULA_PCT },
              { ref: B_DIFF_BPS, content: null, locked: false, style: STILE_FORMULA_BPS },
            ],
          ],
          { colWidths: { A: 340, B: 120 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M7-08-STRUTTURATARGET.18', { B_KE, B_WD_ATTUALE, B_KD_AT, p3: pct(waccAttuale, 2) }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M7-08-STRUTTURATARGET.19', { B_KE, B_WD_TARGET, B_KD_AT, p3: pct(waccTarget, 2) }),
          10,
          'T2',
        ),
        hint(
          'H3',
          tx('M7-08-STRUTTURATARGET.20', { B_WACC_TARGET, B_WACC_ATTUALE, p2: roundTo(diffBps, 0.1) }),
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 130 }),
      startAt: `Model!${B_WACC_ATTUALE}`,
    };
  },
});
