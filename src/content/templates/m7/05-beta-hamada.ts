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
  title: "Beta di Hamada: unlever e relever il beta di un peer",
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
        `In ${B_BETA_UNLEV} calcola il beta UNLEVERED del peer: togli l'effetto della leva ` +
        `finanziaria DEL PEER dal suo beta levered osservato (${B_BETA_PEER}), usando il D/E del ` +
        `peer (${B_DE_PEER}) e l'aliquota fiscale (${B_TAX}). ` +
        'Formula di Hamada (unlever): Beta unlevered = Beta levered / (1 + (1 - aliquota) × D/E). ' +
        "Il beta unlevered e' il beta \"puro\" del business — quello che avrebbe l'azienda se fosse " +
        "finanziata solo con equity, senza debito — indipendente da come il peer specifico e' " +
        "finanziato. E' un risultato INTERMEDIO: non e' ancora il beta da usare nel CAPM " +
        "dell'azienda da valutare (quello arriva in T2). Usa le tre celle date, senza copiare i " +
        'numeri a mano.',
      targetCell: `Model!${B_BETA_UNLEV}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: betaUnlevered,
          tolerance: 0.0005,
          toleranceMode: 'absolute',
          message:
            "Il valore non torna: controlla che tu stia DIVIDENDO il beta levered per " +
            '(1 + (1 - aliquota) × D/E del peer), non moltiplicando o usando l\'aliquota da sola ' +
            'al posto di (1 - aliquota).',
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
        `In ${B_BETA_RELEV} calcola il beta RELEVERED alla struttura TARGET: riparti dal beta ` +
        `unlevered appena calcolato (${B_BETA_UNLEV}) e applica la leva TARGET dell'azienda da ` +
        `valutare (${B_DE_TARGET}), con la stessa aliquota fiscale (${B_TAX}). ` +
        'Formula di Hamada (relever): Beta relevered = Beta unlevered × (1 + (1 - aliquota) × D/E ' +
        `target). Attenzione: la leva da usare qui e' quella TARGET, NON quella del peer (${B_DE_PEER} ` +
        "e' gia' stata usata e \"consumata\" in T1) — il punto dell'esercizio e' proprio rivestire il " +
        "beta puro del business con la struttura di capitale DELL'AZIENDA DA VALUTARE, non con " +
        "quella del peer da cui e' partito. Usa le tre celle date, senza copiare i numeri a mano.",
      targetCell: `Model!${B_BETA_RELEV}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: betaRelevered,
          tolerance: 0.0005,
          toleranceMode: 'absolute',
          message:
            "Il valore non torna: controlla che tu stia MOLTIPLICANDO il beta unlevered per " +
            '(1 + (1 - aliquota) × D/E TARGET) — usa la leva target, non quella del peer.',
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
      brief: [
        "## Beta di Hamada: unlever e relever il beta di un peer",
        '',
        "Il CAPM (M7-04) ha bisogno di un beta, ma il beta osservato di un peer quotato NON si puo' " +
          "riusare cosi' com'e': quel beta riflette anche la struttura di capitale (il rapporto " +
          "Debito/Equity, \"D/E\") DI QUEL peer, non quella dell'azienda che stai valutando. Piu' " +
          "un'azienda e' indebitata, piu' il rischio si amplifica per chi detiene l'equity — quindi " +
          "il beta levered osservato \"contiene\" un pezzo di rischio che dipende da quanto debito ha " +
          "il peer, non solo dal rischio del business in se'.",
        '',
        'La formula di Hamada separa le due cose in due passi, in questo ordine:',
        '',
        '**1) Unlever — togli la leva DEL PEER:**',
        '',
        '> **Beta unlevered = Beta levered peer / (1 + (1 - aliquota) × D/E peer)**',
        '',
        "Il beta unlevered e' il beta \"puro\" del business: quello che avrebbe l'azienda se fosse " +
          "finanziata solo con equity, senza debito. E' un risultato INTERMEDIO, mai il numero " +
          "finale da usare nel CAPM.",
        '',
        '**2) Relever — applica la leva TARGET:**',
        '',
        '> **Beta relevered = Beta unlevered × (1 + (1 - aliquota) × D/E target)**',
        '',
        "Qui si applica il D/E TARGET — quello dell'azienda da valutare, non quello del peer — per " +
          "ottenere il beta che riflette IL SUO rischio.",
        '',
        "L'aliquota fiscale entra perche' gli interessi sul debito sono deducibili: lo scudo " +
          "fiscale riduce l'effetto della leva sul rischio dell'equity, per questo compare come " +
          '(1 - aliquota) e non da sola.',
        '',
        `**I dati**, gia' pronti come assunzioni: beta levered del peer comparabile ${num(betaPeer, 2)}, ` +
          `D/E del peer ${num(dePeer, 2)}x, aliquota fiscale ${pct(TAX_RATE, 0)}, D/E target ` +
          `dell'azienda da valutare ${num(deTarget, 2)}x.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ["Beta di Hamada: unlever e relever"], { style: STILE_TITOLO }),
            riga('A3', ['Dati'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Beta levered del peer comparabile',
                'D/E del peer',
                'Aliquota fiscale',
                "D/E target (azienda da valutare)",
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_BETA_PEER, content: betaPeer, style: STILE_INPUT_BETA, locked: true },
              { ref: B_DE_PEER, content: dePeer, style: STILE_INPUT_MULTIPLO, locked: true },
              { ref: B_TAX, content: TAX_RATE, style: STILE_INPUT_PCT, locked: true },
              { ref: B_DE_TARGET, content: deTarget, style: STILE_INPUT_MULTIPLO, locked: true },
            ],

            riga('A9', ['Formula di Hamada'], { style: STILE_TITOLO }),
            colonna(
              'A10',
              ["Beta unlevered (del business)", 'Beta relevered (a struttura target)'],
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
          `=${B_BETA_PEER}/(1+(1-${B_TAX})*${B_DE_PEER}): beta levered del peer diviso ` +
            `(1 + (1 - aliquota) × D/E del peer) (qui vale ${num(betaUnlevered, 2)}).`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_BETA_UNLEV}*(1+(1-${B_TAX})*${B_DE_TARGET}): beta unlevered moltiplicato per ` +
            `(1 + (1 - aliquota) × D/E TARGET) (qui vale ${num(betaRelevered, 2)}).`,
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_BETA_UNLEV}`,
    };
  },
});
