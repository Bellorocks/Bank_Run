/**
 * M7 · 06 — Country risk premium: aggiustare Ke per il rischio paese.
 *
 * Il CAPM "base" (M7-04) stima Ke da tre dati di mercato (Rf, beta, ERP), ma
 * quei dati sono tipicamente osservati su un mercato "risk free puro" (es. il
 * Bund tedesco per l'area euro). Se l'azienda opera in un mercato con un
 * rischio sovrano non trascurabile — l'Italia e' l'esempio di questo livello,
 * ma vale per qualunque paese il cui debito sovrano paga uno spread misurabile
 * sopra il benchmark risk-free — quella stima e' incompleta: chi investe in
 * equity in quel paese chiede un rendimento extra anche per il rischio paese,
 * non solo per il rischio sistematico dell'azienda.
 *
 * IL PUNTO DIDATTICO — Ke aggiustato = Ke base + CRP
 *
 *   Ke base   il costo del capitale proprio dal CAPM "puro" (M7-04): Rf +
 *             beta * ERP, con Rf preso da un benchmark risk-free reale (es.
 *             Bund).
 *   CRP       (country risk premium) lo spread del rendimento del debito
 *             sovrano del paese in questione rispetto a quel benchmark
 *             risk-free — per l'Italia, tipicamente lo spread BTP-Bund. E' un
 *             rischio ULTERIORE, che non c'entra col rischio sistematico
 *             dell'azienda (quello lo cattura gia' il beta): c'entra col
 *             paese in cui l'azienda opera.
 *
 * Il CRP si SOMMA a Ke base, non lo moltiplica: e' un premio ADDIZIONALE per
 * un rischio di natura diversa (rischio paese) rispetto a quello che il beta
 * gia' cattura (rischio sistematico dell'azienda relativo al suo mercato). Un
 * errore comune e sottile e' trattarlo come se fosse un altro moltiplicatore
 * dell'ERP (confondendolo col beta) — ma il CRP e' un dato macro indipendente
 * dall'azienda, non un fattore di rischio azienda-specifico: si aggiunge come
 * addendo a parte.
 *
 * Rilevanza SPECIFICA per paese: questo aggiustamento non si applica a
 * prescindere. Ha senso quando il debito sovrano del paese in questione paga
 * uno spread misurabile sopra il benchmark risk-free (l'Italia, con lo spread
 * BTP-Bund, ne e' l'esempio classico nell'area euro) — non e' un addendo
 * universale da sommare sempre a ogni Ke, a ogni paese, indipendentemente dal
 * suo rischio sovrano.
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
const STILE_FORMULA_PCT: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0%' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_KE_BASE = 'B4'; // Ke base dal CAPM (dato, bloccato — risultato concettuale di M7-04)
const B_CRP = 'B5'; // Country risk premium Italia (dato, bloccato)

const B_KE_ADJ = 'B10'; // T1: costo del capitale proprio aggiustato per il rischio paese

export default defineTemplate({
  id: 'M7-06-COUNTRYRISK',
  module: 'M7',
  get title() {
    return tx('M7-06-COUNTRYRISK.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['dcf.country-risk'],
  prerequisites: ['M7-04-CAPM'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Ke base dal CAPM: 8%-14%, moda 10% — il risultato concettuale di
    // M7-04, qui ridato come dato bloccato (nessuna cella live condivisa fra
    // template diversi).
    const keBase = roundTo(triangular(r, 0.08, 0.1, 0.14), 0.001);

    // Country risk premium Italia: 1%-2%, moda 1,5% — l'ordine di grandezza
    // storico dello spread BTP-Bund su orizzonti di lungo periodo.
    const crp = roundTo(triangular(r, 0.01, 0.015, 0.02), 0.001);

    const keAdj = keBase + crp;

    // NB: costruito a mano (non con taskFormula) per stringere la tolleranza
    // del check 'value', per lo stesso motivo di M7-04-CAPM: la tolleranza
    // di default di taskFormula ('hybrid', pavimento assoluto 0,01) e' un
    // intero punto percentuale — enorme rispetto alla scala di Ke (8-16%).
    // Con quel pavimento una formula strutturalmente SBAGLIATA come
    // Ke base * (1 + CRP) invece di Ke base + CRP puo' cadere comunque
    // dentro la tolleranza su alcuni seed. mustReference e
    // mustNotContainLiteral non bastano a intercettarlo: entrambe le formule
    // referenziano le stesse due celle e non contengono numeri magici.
    // L'unico argine strutturale e' il check 'value' con tolleranza stretta.
    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M7-06-COUNTRYRISK.2', { B_KE_ADJ, B_KE_BASE, B_CRP }),
      targetCell: `Model!${B_KE_ADJ}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: keAdj,
          tolerance: 0.0001,
          toleranceMode: 'absolute',
          message:
            tx('M7-06-COUNTRYRISK.3'),
        },
        { kind: 'mustReference', cells: [B_KE_BASE, B_CRP] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['dcf.country-risk'],
      minKeystrokes: 8,
    };

    const tasks = [t1];

    return {
      templateId: 'M7-06-COUNTRYRISK',
      seed: rng.seed,
      brief: [tx('M7-06-COUNTRYRISK.4', { p0: pct(keBase, 2), p1: pct(crp, 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-06-COUNTRYRISK.5')], { style: STILE_TITOLO }),
            riga('A3', [tx('M7-06-COUNTRYRISK.11')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [tx('M7-06-COUNTRYRISK.6'), tx('M7-06-COUNTRYRISK.7')],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_KE_BASE, content: keBase, style: STILE_INPUT_PCT, locked: true },
              { ref: B_CRP, content: crp, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A9', [tx('M7-06-COUNTRYRISK.8')], { style: STILE_TITOLO }),
            colonna('A10', [tx('M7-06-COUNTRYRISK.9')], { style: STILE_ETICHETTA }),
            [{ ref: B_KE_ADJ, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 320, B: 120 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M7-06-COUNTRYRISK.10', { B_KE_BASE, B_CRP, p2: pct(keAdj, 2) }),
          10,
          'T1',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_KE_ADJ}`,
    };
  },
});
