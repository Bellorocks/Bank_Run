/**
 * M4 · 04 — Cash-like: non tutta la cassa di bilancio e' davvero disponibile.
 *
 *   Equity Value = Enterprise Value - Net Debt (base) - Σ debt-like items +
 *                  Σ cash-like items - Minorities + Partecipazioni non consolidate
 *
 * Questo livello insegna il lato "cash-like" del bridge, simmetrico a quello
 * "debt-like": non tutta la cassa che compare in bilancio riduce davvero il
 * debito netto. Due voci vanno escluse dalla cassa "utilizzabile":
 *
 *   - **restricted cash**: cassa vincolata contrattualmente (tipicamente a
 *     garanzia di un covenant o di una linea di credito). L'azienda non puo'
 *     usarla liberamente per ripagare debito: e' li', ma non e' sua da
 *     spendere.
 *   - **cassa operativa minima**: il minimo indispensabile per far girare il
 *     business senza restare a corto di liquidita' (pagare fornitori e
 *     stipendi tra un incasso e l'altro). Non e' vincolata da un contratto,
 *     ma non e' comunque "distribuibile": e' capitale di esercizio dissimulato
 *     da cassa.
 *
 * L'errore didattico che il livello mette alla prova: trattare tutta la
 * cassa di bilancio come se riducesse il Net Debt uno a uno. Se una parte di
 * quella cassa non e' davvero disponibile, il Net Debt "vero" (quello che
 * conta per il bridge) e' PIU' ALTO di quanto la cassa totale suggerirebbe —
 * non perche' il debito sia cambiato, ma perche' meno cassa e' davvero
 * disponibile per abbatterlo.
 *
 * Geometria: fissa, non dipende dal seed (nessuna tabella a righe variabili
 * in questo livello), ma tutti i riferimenti sono comunque scritti come
 * variabili derivate dalle costanti di riga, mai come letterali sparsi nel
 * codice.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// --- Geometria fissa: non dipende dal seed. --------------------------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3; // "Cassa di bilancio: cosa e' davvero disponibile"
const ROW_CASSA_TOT = 4;
const ROW_RESTRICTED = 5;
const ROW_MINIMA = 6;

const ROW_SEZ2 = 8; // "Cassa realmente disponibile (cash-like)"
const ROW_T1 = 9;

const ROW_SEZ3 = 11; // "Net Debt rivisto"
const ROW_NETDEBT_BASE = 12;
const ROW_T2 = 13;

const B_CASSA_TOT = `B${ROW_CASSA_TOT}`;
const B_RESTRICTED = `B${ROW_RESTRICTED}`;
const B_MINIMA = `B${ROW_MINIMA}`;
const B_T1 = `B${ROW_T1}`;
const B_NETDEBT_BASE = `B${ROW_NETDEBT_BASE}`;
const B_T2 = `B${ROW_T2}`;

export default defineTemplate({
  id: 'M4-04-CASHLIKE',
  module: 'M4',
  get title() {
    return tx('M4-04-CASHLIKE.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 220,
  skills: ['ev.cash-like'],
  prerequisites: ['M4-01-NETDEBT'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Cassa totale di bilancio (dato, bloccato).
    const cassaTotale = r.int(800, 3000) * 1000;

    // Restricted cash e cassa operativa minima, come FRAZIONI della cassa
    // totale: cosi' restano sempre entrambe positive e la loro somma resta
    // sempre ben al di sotto della cassa totale (vincolo da rispettare per
    // costruzione, non da verificare a posteriori).
    //   - restricted: tipicamente una fetta piccola (5%-18%).
    //   - minima operativa: tipicamente piu' consistente (12%-30%).
    // Somma massima teorica 0,18 + 0,30 = 0,48: resta sempre oltre meta' della
    // cassa totale davvero disponibile, cosi' il livello non produce mai una
    // cassa "utilizzabile" negativa o irrisoria.
    const fracRestricted = triangular(r, 0.05, 0.1, 0.18);
    const fracMinima = triangular(r, 0.12, 0.2, 0.3);
    const restrictedCash = roundTo(cassaTotale * fracRestricted, 1000);
    const cassaMinima = roundTo(cassaTotale * fracMinima, 1000);

    // Net Debt di base (dato, bloccato): calcolato altrove usando la cassa
    // TOTALE di bilancio, non quella rivista. E' il numero di partenza che
    // questo livello mette in discussione — non un riferimento a un altro
    // template, ma un proprio dato autosufficiente generato qui.
    const debitoFinanziarioLordo = roundTo(
      triangular(r, cassaTotale * 1.2, cassaTotale * 2, cassaTotale * 3.5),
      1000,
    );
    const netDebtBase = debitoFinanziarioLordo - cassaTotale;

    const cassaDisponibile = cassaTotale - restrictedCash - cassaMinima;
    // La cassa non disponibile non abbatte il debito: va RIAGGIUNTA al Net Debt
    // di base, che l'aveva sottratta per intero.
    const netDebtRivisto = netDebtBase + (cassaTotale - cassaDisponibile);

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M4-04-CASHLIKE.2', { B_T1, B_CASSA_TOT, B_RESTRICTED, B_MINIMA }),
      target: `Model!${B_T1}`,
      atteso: cassaDisponibile,
      referenzia: [B_CASSA_TOT, B_RESTRICTED, B_MINIMA],
      senzaLiteral: [],
      skills: ['ev.cash-like'],
      minKeystrokes: 10,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M4-04-CASHLIKE.3', { B_T2, B_NETDEBT_BASE, B_CASSA_TOT, B_T1 }),
      target: `Model!${B_T2}`,
      atteso: netDebtRivisto,
      referenzia: [B_NETDEBT_BASE, B_CASSA_TOT, B_T1],
      senzaLiteral: [],
      skills: ['ev.cash-like'],
      minKeystrokes: 14,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M4-04-CASHLIKE',
      seed: rng.seed,
      brief: [tx('M4-04-CASHLIKE.4', { p0: eur(cassaTotale), p1: eur(restrictedCash), p2: eur(cassaMinima), p3: eur(netDebtBase) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M4-04-CASHLIKE.5')], {
              style: STILE_TITOLO,
            }),

            riga(`A${ROW_SEZ1}`, [tx('M4-04-CASHLIKE.6')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_CASSA_TOT}`,
              [
                tx('M4-04-CASHLIKE.7'),
                tx('M4-04-CASHLIKE.8'),
                tx('M4-04-CASHLIKE.9'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_CASSA_TOT, content: cassaTotale, style: STILE_INPUT, locked: true }],
            [{ ref: B_RESTRICTED, content: restrictedCash, style: STILE_INPUT, locked: true }],
            [{ ref: B_MINIMA, content: cassaMinima, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, [tx('M4-04-CASHLIKE.10')], { style: STILE_TITOLO }),
            colonna(`A${ROW_T1}`, [tx('M4-04-CASHLIKE.11')], { style: STILE_ETICHETTA }),
            [{ ref: B_T1, content: null, locked: false, style: STILE_FORMULA }],

            riga(`A${ROW_SEZ3}`, [tx('M4-04-CASHLIKE.12')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_NETDEBT_BASE}`,
              [tx('M4-04-CASHLIKE.13'), tx('M4-04-CASHLIKE.14')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_NETDEBT_BASE, content: netDebtBase, style: STILE_INPUT, locked: true }],
            [{ ref: B_T2, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 440, B: 140 }, frozenRows: ROW_SEZ1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M4-04-CASHLIKE.15', { B_CASSA_TOT, B_RESTRICTED, B_MINIMA }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M4-04-CASHLIKE.16', { B_NETDEBT_BASE, B_CASSA_TOT, B_T1 }),
          12,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: `Model!${B_T1}`,
    };
  },
});
