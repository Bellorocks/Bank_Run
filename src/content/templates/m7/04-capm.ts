/**
 * M7 · 04 — CAPM: il costo del capitale proprio (Ke).
 *
 * Nel DCF il FCFF si sconta al WACC, ma il WACC stesso e' una media pesata fra
 * il costo del debito e il costo del capitale proprio (Ke). Questo livello
 * insegna a calcolare Ke con il CAPM (Capital Asset Pricing Model), il pezzo
 * che manca prima di poter costruire il WACC (M7-07).
 *
 * IL PUNTO DIDATTICO — CAPM: Ke = Rf + beta * ERP
 *
 *   Rf   (risk free rate)      il rendimento di un investimento senza rischio
 *                              (tipicamente un titolo di stato a lunga scadenza).
 *   ERP  (equity risk premium) il rendimento EXTRA che il mercato azionario nel
 *                              suo complesso richiede rispetto al risk free, per
 *                              accettare il rischio di detenere azioni invece di
 *                              titoli di stato.
 *   beta                       il rischio SISTEMATICO di QUESTA azienda, relativo
 *                              al mercato: quanto la sua azione si muove piu' o
 *                              meno del mercato nel suo complesso. beta = 1
 *                              significa "si muove come il mercato"; beta > 1
 *                              significa piu' volatile del mercato (l'azienda
 *                              amplifica i movimenti di mercato, quindi il
 *                              mercato le chiede un rendimento atteso PIU' ALTO
 *                              per compensare il rischio maggiore); beta < 1
 *                              significa il contrario, un'azione piu' difensiva,
 *                              che si muove meno del mercato, e quindi un Ke piu'
 *                              basso.
 *
 * Il beta e' il moltiplicatore che applica l'ERP (un dato di mercato uguale per
 * tutte le aziende quotate nello stesso mercato) al rischio specifico di
 * QUESTA azienda: ERP * beta e' quindi il premio per il rischio azionario
 * SPECIFICO, che si somma al risk free per ottenere il rendimento atteso totale
 * richiesto da chi detiene l'equity di questa azienda.
 *
 * I tre dati (Rf, beta, ERP) arrivano gia' pronti come DATO bloccato: sono
 * assunzioni di mercato che un modello di valutazione riceve dall'esterno
 * (fonti tipiche: rendimento di un BTP decennale per Rf, un provider come
 * Damodaran per l'ERP, la regressione dei rendimenti storici contro un indice
 * per il beta) — non si ricostruiscono qui.
 *
 * Geometria fissa: nessuna riga dipende dal seed, i riferimenti di cella sono
 * letterali per costruzione, come negli altri livelli M7.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  num,
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
/** Beta: un numero puro (non una percentuale, non una valuta), due decimali. */
const STILE_INPUT_BETA: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '0.00' };
const STILE_FORMULA_PCT: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0%' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_RF = 'B4'; // Risk free rate (dato, bloccato)
const B_BETA = 'B5'; // Beta (dato, bloccato)
const B_ERP = 'B6'; // Equity risk premium (dato, bloccato)

const B_KE = 'B10'; // T1: costo del capitale proprio

export default defineTemplate({
  id: 'M7-04-CAPM',
  module: 'M7',
  get title() {
    return tx('M7-04-CAPM.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['dcf.capm'],
  prerequisites: ['M7-02-COSTRUZIONEFCF'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Risk free rate: 3%-4%, moda 3,5% — il range di un titolo di stato a
    // lunga scadenza di un emittente solido in questo scenario.
    const rf = roundTo(triangular(r, 0.03, 0.035, 0.04), 0.001);

    // Beta: 0,8-1,5, moda 1,1 — leggermente sbilanciato verso aziende un po'
    // piu' volatili del mercato, il caso piu' istruttivo per il punto
    // didattico (beta > 1 => Ke piu' alto).
    const beta = roundTo(triangular(r, 0.8, 1.1, 1.5), 0.05);

    // Equity risk premium: 5%-6%, moda 5,5%.
    const erp = roundTo(triangular(r, 0.05, 0.055, 0.06), 0.001);

    const ke = rf + beta * erp;

    // NB: costruito a mano (non con taskFormula) per poter stringere la
    // tolleranza del check 'value'. Ke vive nell'ordine di 0,08-0,15: la
    // tolleranza di default di taskFormula e' `hybrid` con un PAVIMENTO
    // ASSOLUTO di 0,01 (§4.1 tolerance) — un intero punto percentuale, enorme
    // rispetto alla scala di Ke. Con quel pavimento una formula strutturalmente
    // SBAGLIATA come "ruoli scambiati", (Rf+ERP)*beta invece di Rf+beta*ERP,
    // spesso cade comunque dentro la tolleranza e viene accettata per errore
    // (verificato empiricamente: succede sulla maggioranza dei seed, incluso
    // il seed di default usato nei test del progetto). mustReference e
    // mustNotContainLiteral non bastano a intercettarlo, perche' quella
    // formula referenzia comunque tutte e tre le celle e non contiene numeri
    // magici: l'unico argine e' il check 'value' con tolleranza stretta.
    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M7-04-CAPM.2', { B_KE, B_RF, B_BETA, B_ERP }),
      targetCell: `Model!${B_KE}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: ke,
          tolerance: 0.0001,
          toleranceMode: 'absolute',
          message:
            tx('M7-04-CAPM.3'),
        },
        { kind: 'mustReference', cells: [B_RF, B_BETA, B_ERP] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['dcf.capm'],
      minKeystrokes: 12,
    };

    const tasks = [t1];

    return {
      templateId: 'M7-04-CAPM',
      seed: rng.seed,
      brief: [tx('M7-04-CAPM.4', { p0: pct(rf, 2), p1: num(beta, 2), p2: pct(erp, 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-04-CAPM.5')], { style: STILE_TITOLO }),
            riga('A3', [tx('M7-04-CAPM.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [tx('M7-04-CAPM.7'), tx('M7-04-CAPM.12'), tx('M7-04-CAPM.8')],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_RF, content: rf, style: STILE_INPUT_PCT, locked: true },
              { ref: B_BETA, content: beta, style: STILE_INPUT_BETA, locked: true },
              { ref: B_ERP, content: erp, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A9', [tx('M7-04-CAPM.9')], { style: STILE_TITOLO }),
            colonna('A10', [tx('M7-04-CAPM.10')], { style: STILE_ETICHETTA }),
            [{ ref: B_KE, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 260, B: 120 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M7-04-CAPM.11', { B_RF, B_BETA, B_ERP, p3: pct(ke, 2) }),
          10,
          'T1',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_KE}`,
    };
  },
});
