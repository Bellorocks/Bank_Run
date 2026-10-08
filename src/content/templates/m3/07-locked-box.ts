/**
 * M3 · 07 — Locked box vs completion accounts: due meccanismi di prezzo.
 *
 * M3-05 (prerequisito) ha gia' insegnato, senza nominarlo esplicitamente, lo
 * schema delle COMPLETION ACCOUNTS: prezzo base concordato al signing, poi
 * AGGIUSTATO DOPO IL CLOSING in base al NWC effettivo rilevato a quella data
 * (confrontato col peg). E' lo schema in cui il compratore paga in funzione
 * dei conti VERI, misurati a consuntivo.
 *
 * Questo livello introduce l'ALTERNATIVA: il LOCKED BOX. Il valore d'impresa
 * si fissa a una data di riferimento PASSATA (la "locked box date", tipicamente
 * l'ultimo bilancio disponibile al momento della negoziazione), sulla base dei
 * conti a quella data — e li' resta: nessun aggiustamento successivo sui conti
 * reali al closing, quanto siano andati meglio o peggio. Il venditore continua
 * a gestire l'azienda (e a incassarne il valore economico) nel periodo fra
 * locked box date e closing, quindi il rischio E il beneficio di quel periodo
 * sono suoi — non del compratore. In cambio di questo "congelamento", il
 * venditore riceve un INTERESSE concordato a priori sul valore d'impresa, che
 * compensa il tempo trascorso fino al trasferimento effettivo (il closing):
 * e' il prezzo del denaro che il venditore avrebbe altrimenti incassato prima.
 *
 * IL CONFRONTO DIDATTICO CENTRALE (va esplicitato nel brief, non lasciato
 * implicito): completion accounts aggiusta il prezzo sui conti REALI misurati
 * al closing (rischio/incertezza sul prezzo finale, ma prezzo "giusto" ex
 * post); locked box fissa il prezzo alla data di riferimento e lo aggiusta
 * solo con un INTERESSE concordato a priori — nessuna sorpresa su quanto si
 * incassera' (certezza per il venditore, che sa gia' oggi il prezzo esatto),
 * ma il compratore si accolla il rischio che l'azienda vada peggio del
 * previsto fra locked box date e closing (protetto in pratica dal covenant di
 * "leakage", argomento del prossimo livello del modulo).
 *
 * SEMPLIFICAZIONE DICHIARATA: il numero di giorni fra locked box date e
 * closing e' dato direttamente come input (non costruito con DATE() a partire
 * da due date di calendario) — e' un dato contrattuale concordato, non un
 * calcolo che il giocatore deve fare qui; le due date restano nel testo del
 * brief solo per dare concretezza narrativa.
 *
 * DUE TASK IN CASCATA:
 *   T1  Interesse locked box = valore d'impresa × tasso annuo × (giorni / 365)
 *   T2  Prezzo finale per il compratore (schema locked box) = valore d'impresa + T1
 *
 * Geometria fissa: nessuna riga dipende dal seed, quindi i riferimenti di
 * cella sono letterali per costruzione, come nel resto del modulo.
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
import type { Task } from '../../types';

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EV = 'B5'; // valore d'impresa alla locked box date (dato, bloccato)
const B_TASSO = 'B6'; // tasso di interesse annuo concordato (dato, bloccato)
const B_GIORNI = 'B7'; // giorni fra locked box date e closing (dato, bloccato)

const B_INTERESSE = 'B10'; // T1
const B_PREZZO_FINALE = 'B11'; // T2

export default defineTemplate({
  id: 'M3-07-LOCKEDBOX',
  module: 'M3',
  title: 'Locked box vs completion accounts',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['nwc.locked-box'],
  prerequisites: ['M3-05-PEGNWC'],

  generate: (rng) => {
    const rBase = rng.fork('base');
    const rTasso = rng.fork('tasso');
    const rGiorni = rng.fork('giorni');

    // Valore d'impresa alla locked box date, in migliaia — stessa scala degli
    // altri livelli del modulo.
    const enterpriseValue = rBase.int(5000, 60000) * 1000;

    // Tasso di interesse annuo concordato a compensazione del venditore per il
    // tempo fra locked box date e closing: 6%-10%, arrotondato al decimo di
    // punto, come da brief.
    const tassoAnnuo = roundTo(0.06 + rTasso.next() * 0.04, 0.001);

    // Giorni fra locked box date e closing: dato diretto, realistico per una
    // trattativa M&A (fra due e sei mesi circa).
    const giorni = rGiorni.int(60, 180);

    // Stessa algebra dei task, usata qui per calcolare i valori attesi in
    // forma chiusa.
    const interesseLockedBox = enterpriseValue * tassoAnnuo * (giorni / 365);
    const prezzoFinale = enterpriseValue + interesseLockedBox;

    const t1: Task = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_INTERESSE} calcola l'interesse locked box: il valore d'impresa alla locked box date ` +
        `(${B_EV}), moltiplicato per il tasso annuo concordato (${B_TASSO}), moltiplicato per la ` +
        `quota di anno trascorsa fra locked box date e closing (${B_GIORNI} / 365). E' l'interesse che ` +
        "compensa il venditore per il tempo in cui il prezzo resta \"congelato\" al valore della locked " +
        "box date, mentre l'azienda continua a generare (o assorbire) valore sotto la sua gestione.",
      target: `Model!${B_INTERESSE}`,
      atteso: interesseLockedBox,
      referenzia: [B_EV, B_TASSO, B_GIORNI],
      senzaLiteral: [365],
      skills: ['nwc.locked-box'],
      minKeystrokes: 14,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_PREZZO_FINALE} calcola il prezzo finale a carico del compratore nello schema locked ` +
        `box: il valore d'impresa alla locked box date (${B_EV}) PIU' l'interesse locked box appena ` +
        `calcolato (${B_INTERESSE}). Nota il contrasto con M3-05: li' il prezzo si aggiustava DOPO il ` +
        "closing confrontando il NWC effettivo con un peg concordato (le completion accounts) — qui " +
        "invece il prezzo e' gia' definitivo OGGI, un valore fisso alla locked box date piu' un " +
        "interesse anch'esso concordato a priori: nessun aggiustamento successivo sui conti reali al " +
        'closing, quali che siano.',
      target: `Model!${B_PREZZO_FINALE}`,
      atteso: prezzoFinale,
      referenzia: [B_EV, B_INTERESSE],
      senzaLiteral: [],
      skills: ['nwc.locked-box'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M3-07-LOCKEDBOX',
      seed: rng.seed,
      brief: [
        '## Locked box vs completion accounts: due modi di fissare il prezzo',
        '',
        "Nel livello precedente (il peg del NWC) hai gia' lavorato, implicitamente, con lo schema delle " +
          '**completion accounts**: prezzo base concordato al signing, poi AGGIUSTATO DOPO il closing ' +
          "confrontando il NWC effettivo a quella data con un peg concordato in anticipo. E' uno schema " +
          "che paga sui conti VERI, misurati a consuntivo — ma lascia entrambe le parti nell'incertezza " +
          "su quale sara' il prezzo finale fino a quando quei conti non sono pronti, spesso settimane " +
          'dopo il closing.',
        '',
        "Questo livello introduce l'alternativa piu' diffusa nelle operazioni competitive: il **locked " +
          'box**. Il valore d\'impresa si fissa a una data di riferimento PASSATA — la "locked box ' +
          'date", tipicamente l\'ultimo bilancio disponibile al momento della trattativa — sulla base dei ' +
          "conti a quella data, e da li' non si muove piu': nessun aggiustamento successivo sui conti " +
          "reali al closing. Il venditore continua a gestire l'azienda (e a incassarne il valore " +
          "economico) nel periodo che intercorre fra la locked box date e il closing effettivo — quindi " +
          "sia il rischio sia il beneficio di quel periodo restano SUOI, non del compratore. In cambio di " +
          "questo \"congelamento\" del prezzo, il venditore riceve un INTERESSE concordato a priori sul " +
          "valore d'impresa: e' il prezzo del denaro che avrebbe altrimenti incassato prima, se il " +
          'closing fosse coinciso con la locked box date.',
        '',
        `Il valore d'impresa alla locked box date e' ${eurM(enterpriseValue)} (${eur(enterpriseValue)}). ` +
          `Le parti hanno concordato un tasso di interesse annuo del ${pct(tassoAnnuo)} e un periodo di ` +
          `${giorni} giorni fra la locked box date e il closing.`,
        '',
        '**Il confronto da tenere a mente**: nelle completion accounts il prezzo finale dipende da un ' +
          "NUMERO CHE NON CONOSCI ancora al signing (il NWC vero al closing); nel locked box il prezzo " +
          "finale e' gia' calcolabile OGGI, perche' dipende solo da un tasso e da un numero di giorni " +
          'concordati a priori — nessuna sorpresa per il venditore, ma il compratore si accolla il ' +
          "rischio che l'azienda vada peggio del previsto fra locked box date e closing (nella pratica, " +
          'un rischio mitigato da un covenant di "leakage", che vedrai nel prossimo livello).',
        '',
        "Calcola l'interesse locked box (task 1) e il prezzo finale a carico del compratore (task 2).",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Locked box vs completion accounts'], { style: STILE_TITOLO }),

            riga('A3', ['Dati concordati al signing'], { style: STILE_TITOLO }),
            colonna(
              'A5',
              [
                "Valore d'impresa alla locked box date, €",
                'Tasso di interesse annuo concordato',
                'Giorni fra locked box date e closing',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EV, content: enterpriseValue, style: STILE_INPUT, locked: true }],
            [{ ref: B_TASSO, content: tassoAnnuo, style: STILE_INPUT_PCT, locked: true }],
            [{ ref: B_GIORNI, content: giorni, style: STILE_INPUT, locked: true }],

            riga('A9', ['Schema locked box'], { style: STILE_TITOLO }),
            colonna(
              'A10',
              [
                'Interesse locked box, €',
                'Prezzo finale per il compratore, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_INTERESSE, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_PREZZO_FINALE, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 420, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_EV}*${B_TASSO}*(${B_GIORNI}/365): valore d'impresa per tasso annuo per quota di anno trascorsa.`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_EV}+${B_INTERESSE}: valore d'impresa PIU' l'interesse locked box, nessun altro aggiustamento.`,
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 130 }),
      startAt: `Model!${B_INTERESSE}`,
    };
  },
});
