/**
 * M7 · 05 — Beta di Hamada: unlever e relever il beta di un peer.
 *
 * Il CAPM (M7-04) ha bisogno di un beta, ma il beta osservato di un peer
 * quotato NON e' un dato riutilizzabile cosi' com'e': quel beta riflette anche
 * la struttura di capitale (il rapporto Debito/Equity, "D/E") DI QUEL peer,
 * non quella dell'azienda che si sta valutando. Piu' un'azienda e' indebitata,
 * piu' il rischio che l'equity si porta addosso e' amplificato (la leva
 * finanziaria amplifica sia i guadagni sia le perdite per chi detiene
 * l'equity) — quindi il beta levered osservato "contiene" un pezzo di rischio
 * che dipende da QUANTO debito ha il peer, non solo dal rischio del business
 * in se'.
 *
 * La formula di Hamada separa le due cose in due passi:
 *
 * IL PUNTO DIDATTICO — due passi, in questo ordine
 *
 *   1) UNLEVER (spogliare): dal beta levered osservato del peer si toglie
 *      l'effetto della leva DEL PEER, ottenendo il beta UNLEVERED — il beta
 *      "puro" del business, quello che avrebbe l'azienda se fosse finanziata
 *      solo con equity, senza debito. E' una proprieta' del business (il
 *      settore, il tipo di ricavi), non della struttura finanziaria di chi lo
 *      possiede.
 *
 *      Beta unlevered = Beta levered peer / (1 + (1 - aliquota) × D/E peer)
 *
 *   2) RELEVER (rivestire): il beta unlevered e' un risultato INTERMEDIO, mai
 *      il numero finale da usare nel CAPM dell'azienda da valutare. Si
 *      applica la leva TARGET — il D/E che l'azienda da valutare ha o avra'
 *      davvero — per ottenere il beta che riflette IL SUO rischio, non quello
 *      del peer.
 *
 *      Beta relevered = Beta unlevered × (1 + (1 - aliquota) × D/E target)
 *
 * L'aliquota fiscale entra perche' gli interessi sul debito sono deducibili:
 * lo scudo fiscale riduce l'effetto della leva sul rischio dell'equity, ed e'
 * per questo che compare come (1 - aliquota) e non aliquota da sola.
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
  STILE_INPUT_MULTIPLO,
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
const STILE_FORMULA_BETA: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.00' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_BETA_PEER = 'B4'; // Beta levered osservato del peer (dato, bloccato)
const B_DE_PEER = 'B5'; // D/E del peer (dato, bloccato)
const B_TAX = 'B6'; // Aliquota fiscale, fissa 24% (dato, bloccato)
const B_DE_TARGET = 'B7'; // D/E target dell'azienda da valutare (dato, bloccato)

const B_BETA_UNLEV = 'B10'; // T1: beta unlevered (il beta "puro" del business)
const B_BETA_RELEV = 'B11'; // T2: beta relevered alla struttura target

const TAX_RATE = 0.24;

export default defineTemplate({
  id: 'M7-05-BETAHAMADA',
  module: 'M7',
  get title() {
    return tx('M7-05-BETAHAMADA.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['dcf.beta'],
  prerequisites: ['M7-04-CAPM'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Beta levered del peer: 1,0-1,6, moda 1,2 — un peer quotato con una leva
    // finanziaria non trascurabile, il caso piu' istruttivo per il punto
    // didattico dell'unlevering.
    const betaPeer = roundTo(triangular(r, 1.0, 1.2, 1.6), 0.05);

    // D/E del peer: 0,3-0,8, moda 0,5.
    const dePeer = roundTo(triangular(r, 0.3, 0.5, 0.8), 0.05);

    // D/E target: DIVERSO dal D/E del peer per costruzione — altrimenti
    // l'esercizio di relevering sarebbe banale (unlever e relever alla stessa
    // leva si annullerebbero a vicenda). Lo scarto e' un offset di 0,15-0,4
    // applicato in una direzione scelta a caso (in su o in giu' rispetto al
    // D/E del peer).
    const sign = r.bool() ? 1 : -1;
    const offset = roundTo(triangular(r, 0.15, 0.25, 0.4), 0.05);
    let deTargetRaw = dePeer + sign * offset;
    // Guard-rail: con dePeer in [0,3; 0,8] e offset in [0,15; 0,4] la somma
    // dePeer+offset resta sempre <= 1,2 (mai troppo alta), ma dePeer-offset
    // puo' scendere sotto zero o troppo vicino a zero per essere un D/E
    // target plausibile. In quel caso si forza la direzione verso l'alto,
    // che e' sempre positiva e in range.
    if (deTargetRaw < 0.15) {
      deTargetRaw = dePeer + offset;
    }
    const deTarget = roundTo(deTargetRaw, 0.05);

    // Vincolo del template (§4.3): la differenza fra i due D/E deve restare
    // non banale per QUALUNQUE seed. Se un giorno cambiano i range sopra e
    // questo smette di essere garantito, e' un bug di generazione da vedere
    // subito con un livello che non nasce, non un esercizio banale silenzioso.
    if (Math.abs(deTarget - dePeer) < 0.1) {
      throw new Error(
        `M7-05-BETAHAMADA: D/E target (${deTarget}) troppo vicino al D/E del peer (${dePeer}) ` +
          `per il seed ${rng.seed}: l'esercizio di relevering diventerebbe banale.`,
      );
    }

    const betaUnlevered = betaPeer / (1 + (1 - TAX_RATE) * dePeer);
    const betaRelevered = betaUnlevered * (1 + (1 - TAX_RATE) * deTarget);

    // NB: entrambi i task sono costruiti a mano (non con taskFormula) per
    // stringere la tolleranza del check 'value'. Il beta unlevered/relevered
    // vive nell'ordine di 0,5-1,6: la tolleranza di default di taskFormula
    // ('hybrid', pavimento assoluto 0,01) e' relativamente permissiva su
    // questa scala, e alcune formule strutturalmente SBAGLIATE (es. usare
    // aliquota invece di (1-aliquota), o moltiplicare invece di dividere in
    // T1) restano comunque vicine al valore corretto su certi seed.
    // mustReference e mustNotContainLiteral non bastano a intercettarle da
    // sole: l'argine strutturale principale e' il check 'value' con
    // tolleranza stretta.
    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M7-05-BETAHAMADA.2', { B_BETA_UNLEV, B_BETA_PEER, B_DE_PEER, B_TAX }),
      targetCell: `Model!${B_BETA_UNLEV}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: betaUnlevered,
          tolerance: 0.0005,
          toleranceMode: 'absolute',
          message:
            tx('M7-05-BETAHAMADA.3'),
        },
        { kind: 'mustReference', cells: [B_BETA_PEER, B_DE_PEER, B_TAX] },
        { kind: 'mustNotContainLiteral', except: [1] },
      ],
      skills: ['dcf.beta'],
      minKeystrokes: 20,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M7-05-BETAHAMADA.4', { B_BETA_RELEV, B_BETA_UNLEV, B_DE_TARGET, B_TAX, B_DE_PEER }),
      targetCell: `Model!${B_BETA_RELEV}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: betaRelevered,
          tolerance: 0.0005,
          toleranceMode: 'absolute',
          message:
            tx('M7-05-BETAHAMADA.5'),
        },
        { kind: 'mustReference', cells: [B_BETA_UNLEV, B_DE_TARGET, B_TAX] },
        { kind: 'mustNotContainLiteral', except: [1] },
      ],
      skills: ['dcf.beta'],
      minKeystrokes: 20,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M7-05-BETAHAMADA',
      seed: rng.seed,
      brief: [tx('M7-05-BETAHAMADA.6', { p0: num(betaPeer, 2), p1: num(dePeer, 2), p2: pct(TAX_RATE, 0), p3: num(deTarget, 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-05-BETAHAMADA.7')], { style: STILE_TITOLO }),
            riga('A3', [tx('M7-05-BETAHAMADA.17')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M7-05-BETAHAMADA.8'),
                tx('M7-05-BETAHAMADA.9'),
                tx('M7-05-BETAHAMADA.10'),
                tx('M7-05-BETAHAMADA.11'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_BETA_PEER, content: betaPeer, style: STILE_INPUT_BETA, locked: true },
              { ref: B_DE_PEER, content: dePeer, style: STILE_INPUT_MULTIPLO, locked: true },
              { ref: B_TAX, content: TAX_RATE, style: STILE_INPUT_PCT, locked: true },
              { ref: B_DE_TARGET, content: deTarget, style: STILE_INPUT_MULTIPLO, locked: true },
            ],

            riga('A9', [tx('M7-05-BETAHAMADA.12')], { style: STILE_TITOLO }),
            colonna(
              'A10',
              [tx('M7-05-BETAHAMADA.13'), tx('M7-05-BETAHAMADA.14')],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_BETA_UNLEV, content: null, locked: false, style: STILE_FORMULA_BETA },
              { ref: B_BETA_RELEV, content: null, locked: false, style: STILE_FORMULA_BETA },
            ],
          ],
          { colWidths: { A: 300, B: 120 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M7-05-BETAHAMADA.15', { B_BETA_PEER, B_TAX, B_DE_PEER, p3: num(betaUnlevered, 2) }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M7-05-BETAHAMADA.16', { B_BETA_UNLEV, B_TAX, B_DE_TARGET, p3: num(betaRelevered, 2) }),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_BETA_UNLEV}`,
    };
  },
});
