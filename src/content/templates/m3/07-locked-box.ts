/**
 * M3 · 07 — Locked box vs completion accounts: due meccanismi di prezzo.
 *
 * M3-05 (prerequisito) ha gia' insegnato, senza nominarlo esplicitamente, lo
 * schema delle COMPLETION ACCOUNTS: prezzo concordato al signing, poi
 * AGGIUSTATO DOPO IL CLOSING sui conti veri a quella data (NWC contro il peg,
 * debito netto effettivo). Fino al closing il rischio economico resta al
 * venditore, che consegna l'azienda "com'e'" e viene pagato su quei conti.
 *
 * Questo livello introduce l'ALTERNATIVA: il LOCKED BOX. Il prezzo dell'equity
 * si fissa sui conti di una data PASSATA (la "locked box date", tipicamente
 * l'ultimo bilancio certificato): valore d'impresa MENO il debito netto a quella
 * data. Da li' non si muove piu'. Dalla locked box date il rischio E il
 * beneficio economico passano al COMPRATORE: la cassa che l'azienda genera nel
 * frattempo restera' nell'azienda che compra. Due conseguenze:
 *
 *   - il venditore, che ha ancora le chiavi fino al closing, non deve far
 *     uscire valore a proprio favore: e' il "leakage", protetto da un covenant
 *     (prossimo livello);
 *   - il venditore viene compensato per la cassa che lascia al compratore con
 *     una "ticking fee": un interesse concordato a priori sul prezzo
 *     dell'equity, per i giorni fra locked box date e closing.
 *
 * TRE TASK IN CASCATA:
 *   T1  Prezzo dell'equity alla locked box date = EV - debito netto a quella data
 *   T2  Ticking fee = T1 × tasso annuo × giorni / 365
 *   T3  Importo pagato al closing = T1 + T2
 *
 * SEMPLIFICAZIONE DICHIARATA: i giorni fra locked box date e closing sono un
 * input contrattuale, non calcolati da due date di calendario.
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
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
  eur,
  eurM,
  pct,
} from '../../authoring';
import { roundTo } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EV = 'B5'; // valore d'impresa concordato (dato, bloccato)
const B_DEBITO = 'B6'; // debito netto alla locked box date (dato, bloccato)
const B_TASSO = 'B7'; // tasso annuo della ticking fee (dato, bloccato)
const B_GIORNI = 'B8'; // giorni fra locked box date e closing (dato, bloccato)

const B_EQUITY = 'B11'; // T1
const B_TICKING = 'B12'; // T2
const B_PAGATO = 'B13'; // T3

export default defineTemplate({
  id: 'M3-07-LOCKEDBOX',
  module: 'M3',
  get title() {
    return tx('M3-07-LOCKEDBOX.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 280,
  skills: ['nwc.locked-box'],
  prerequisites: ['M3-05-PEGNWC'],

  generate: (rng) => {
    const rBase = rng.fork('base');
    const rTasso = rng.fork('tasso');
    const rGiorni = rng.fork('giorni');

    const enterpriseValue = rBase.int(5000, 60000) * 1000;
    // Debito netto alla locked box date: fra il 15% e il 50% del valore d'impresa.
    const debitoNetto = roundTo(enterpriseValue * (0.15 + rBase.next() * 0.35), 1000);
    // Tasso della ticking fee: 4%-8%, al decimo di punto.
    const tassoAnnuo = roundTo(0.04 + rTasso.next() * 0.04, 0.001);
    const giorni = rGiorni.int(60, 180);

    const prezzoEquity = enterpriseValue - debitoNetto;
    const tickingFee = prezzoEquity * tassoAnnuo * (giorni / 365);
    const pagatoAlClosing = prezzoEquity + tickingFee;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M3-07-LOCKEDBOX.2', { B_EQUITY, B_EV, B_DEBITO }),
      target: `Model!${B_EQUITY}`,
      atteso: prezzoEquity,
      referenzia: [B_EV, B_DEBITO],
      senzaLiteral: [],
      skills: ['nwc.locked-box'],
      minKeystrokes: 6,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M3-07-LOCKEDBOX.3', { B_TICKING, B_EQUITY, B_TASSO, B_GIORNI }),
      target: `Model!${B_TICKING}`,
      atteso: tickingFee,
      referenzia: [B_EQUITY, B_TASSO, B_GIORNI],
      senzaLiteral: [365],
      skills: ['nwc.locked-box'],
      minKeystrokes: 14,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M3-07-LOCKEDBOX.4', { B_PAGATO, B_EQUITY, B_TICKING }),
      target: `Model!${B_PAGATO}`,
      atteso: pagatoAlClosing,
      referenzia: [B_EQUITY, B_TICKING],
      senzaLiteral: [],
      skills: ['nwc.locked-box'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M3-07-LOCKEDBOX',
      seed: rng.seed,
      brief: [tx('M3-07-LOCKEDBOX.5', { p0: eurM(enterpriseValue), p1: eur(debitoNetto), p2: pct(tassoAnnuo), giorni })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M3-07-LOCKEDBOX.6')], { style: STILE_TITOLO }),

            riga('A3', [tx('M3-07-LOCKEDBOX.7')], { style: STILE_TITOLO }),
            colonna(
              'A5',
              [
                tx('M3-07-LOCKEDBOX.8'),
                tx('M3-07-LOCKEDBOX.9'),
                tx('M3-07-LOCKEDBOX.10'),
                tx('M3-07-LOCKEDBOX.11'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EV, content: enterpriseValue, style: STILE_INPUT, locked: true }],
            [{ ref: B_DEBITO, content: debitoNetto, style: STILE_INPUT, locked: true }],
            [{ ref: B_TASSO, content: tassoAnnuo, style: STILE_INPUT_PCT, locked: true }],
            [{ ref: B_GIORNI, content: giorni, style: STILE_INPUT, locked: true }],

            riga('A10', [tx('M3-07-LOCKEDBOX.12')], { style: STILE_TITOLO }),
            colonna(
              'A11',
              [tx('M3-07-LOCKEDBOX.13'), tx('M3-07-LOCKEDBOX.14'), tx('M3-07-LOCKEDBOX.15')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EQUITY, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_TICKING, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_PAGATO, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 420, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M3-07-LOCKEDBOX.16', { B_EV, B_DEBITO }), 8, 'T1'),
        hint(
          'H2',
          tx('M3-07-LOCKEDBOX.17', { B_EQUITY, B_TASSO, B_GIORNI }),
          10,
          'T2',
        ),
        hint('H3', tx('M3-07-LOCKEDBOX.18', { B_EQUITY, B_TICKING }), 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 120 }),
      startAt: `Model!${B_EQUITY}`,
    };
  },
});
