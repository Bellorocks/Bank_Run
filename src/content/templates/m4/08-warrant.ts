/**
 * M4 · 08 — Treasury Stock Method sui warrant: lo stesso metodo, un altro strumento.
 *
 *   Equity Value = Enterprise Value - Net Debt (base) - Σ debt-like items +
 *                  Σ cash-like items - Minorities + Partecipazioni non consolidate
 *
 * Questo livello resta sul pezzo "azioni fully diluted" del bridge, ma cambia
 * strumento: non piu' stock option ai dipendenti (M4-07), bensi' WARRANT —
 * tipicamente emessi in un aumento di capitale (uno ogni tot azioni sottoscritte,
 * per rendere l'operazione piu' appetibile) o abbinati a un'obbligazione
 * (un'obbligazione "cum warrant", dove il warrant e' staccato e negoziato a
 * parte). Il punto didattico e' che il TSM NON CAMBIA: e' un metodo generale
 * per qualunque strumento che dia diritto a comprare azioni a un prezzo fisso
 * (lo strike, qui spesso chiamato "prezzo di esercizio del warrant") quando
 * quel prezzo e' sotto il prezzo corrente di mercato. Chi riconosce lo schema
 * — e non lo tratta come tre formule nuove da imparare a memoria — ha capito
 * il metodo davvero.
 *
 * LA LOGICA DEL TSM, IN TRE PASSI (identica a M4-07, applicata ai warrant):
 *
 *   1. Se tutti i warrant in the money venissero esercitati, l'azienda
 *      incasserebbe un provento ipotetico: numero warrant × prezzo di
 *      esercizio. Denaro vero che entrerebbe in cassa — e' il punto di
 *      partenza del metodo, qualunque sia lo strumento diluitivo.
 *   2. Il TSM assume che quel provento venga IMMEDIATAMENTE reimpiegato per
 *      riacquistare azioni proprie sul mercato aperto, al prezzo CORRENTE
 *      dell'azione (non al prezzo di esercizio: sul mercato si paga il
 *      prezzo di mercato). Le azioni riacquistabili sono quindi provento
 *      ipotetico / prezzo corrente.
 *   3. La diluizione NETTA e' il numero di warrant esercitati meno le azioni
 *      che il riacquisto "assorbe": e' SEMPRE minore del numero lordo di
 *      warrant, per la stessa ragione geometrica di M4-07 — finche' il
 *      prezzo di esercizio e' positivo e sotto il prezzo corrente (i warrant
 *      generati qui sono sempre "in the money" per costruzione), le azioni
 *      riacquistabili sono un numero positivo minore del numero di warrant.
 *
 * VINCOLO SUL GENERATORE: il prezzo di esercizio deve SEMPRE essere
 * strettamente minore del prezzo corrente, generato come frazione del
 * prezzo corrente (25%-75%, un range leggermente diverso da M4-07 solo per
 * variare i numeri prodotti, non la logica), cosi' l'ordine e' garantito per
 * costruzione, non verificato a posteriori.
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
  STILE_TITOLO,
  eur,
  num,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

import { tx } from '../../../i18n/content';
// Stili locali: prezzi per azione (due decimali) e conteggi di azioni
// potenzialmente frazionari (il TSM non arrotonda le azioni riacquistabili
// a un intero — e' un modello, non un ordine di borsa reale).
const STILE_INPUT_PREZZO: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0.00' };
const STILE_INPUT_CONTEGGIO: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0' };
const STILE_FORMULA_EURO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0' };
const STILE_FORMULA_AZIONI: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0.0' };
const STILE_TOTALE_AZIONI: CellStyle = {
  fontColor: MODEL_COLORS.formula,
  bold: true,
  numFmt: '#,##0.0',
  borders: { top: { style: 'thin' } },
};

// --- Geometria fissa: non dipende dal seed. --------------------------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3; // "Dati di base"
const ROW_PREZZO = 4;
const ROW_WARRANT = 5;
const ROW_ESERCIZIO = 6;

const ROW_SEZ2 = 8; // "Treasury Stock Method"
const ROW_T1 = 9;
const ROW_T2 = 10;
const ROW_T3 = 11;

const B_PREZZO = `B${ROW_PREZZO}`;
const B_WARRANT = `B${ROW_WARRANT}`;
const B_ESERCIZIO = `B${ROW_ESERCIZIO}`;
const B_T1 = `B${ROW_T1}`;
const B_T2 = `B${ROW_T2}`;
const B_T3 = `B${ROW_T3}`;

export default defineTemplate({
  id: 'M4-08-WARRANT',
  module: 'M4',
  get title() {
    return tx('M4-08-WARRANT.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['ev.dilution'],
  prerequisites: ['M4-07-TREASURYSTOCK'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Scenario: warrant emessi in un aumento di capitale (assegnati un tanto
    // ogni azione sottoscritta) oppure legati a un prestito obbligazionario
    // "cum warrant" poi negoziati separatamente. Il testo varia, la logica no.
    const daAumentoCapitale = r.bool(0.5);

    // Prezzo corrente per azione (dato, bloccato): tipico range small/mid-cap.
    const prezzoCorrente = roundTo(triangular(r, 8, 22, 60), 0.5);

    // Prezzo di esercizio come FRAZIONE del prezzo corrente (25%-75%):
    // garantisce per costruzione esercizio < prezzo corrente, mai verificato
    // a posteriori. Il margine (max 75%) lascia sempre almeno il 25% di
    // "sconto" implicito, cosi' il warrant e' inequivocabilmente in the
    // money anche dopo l'arrotondamento a 0,50 sotto.
    const fracEsercizio = triangular(r, 0.25, 0.45, 0.75);
    let prezzoEsercizio = roundTo(prezzoCorrente * fracEsercizio, 0.5);
    // Clamp di sicurezza: anche nel caso limite in cui l'arrotondamento
    // porti il prezzo di esercizio a toccare il prezzo corrente, resta
    // strettamente sotto (mai un warrant "at the money" o "out of the
    // money" in questo livello).
    prezzoEsercizio = Math.min(prezzoEsercizio, prezzoCorrente - 0.5);

    // Numero di warrant in circolazione (dato, bloccato): un pacchetto tipico,
    // in centinaia di migliaia — stesso ordine di grandezza di M4-07 ma
    // generato con un range distinto per non produrre numeri identici.
    const numeroWarrant = r.int(150, 1800) * 1000;

    const proventiIpotetici = numeroWarrant * prezzoEsercizio;
    const azioniRiacquistabili = proventiIpotetici / prezzoCorrente;
    const diluizioneNetta = numeroWarrant - azioniRiacquistabili;

    const originePrompt = daAumentoCapitale
      ? tx('M4-08-WARRANT.2')
      : tx('M4-08-WARRANT.3');

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M4-08-WARRANT.4', { B_T1, B_WARRANT, B_ESERCIZIO }),
      target: `Model!${B_T1}`,
      atteso: proventiIpotetici,
      referenzia: [B_WARRANT, B_ESERCIZIO],
      senzaLiteral: [],
      skills: ['ev.dilution'],
      minKeystrokes: 8,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M4-08-WARRANT.5', { B_T2, B_T1, B_PREZZO }),
      target: `Model!${B_T2}`,
      atteso: azioniRiacquistabili,
      referenzia: [B_T1, B_PREZZO],
      senzaLiteral: [],
      skills: ['ev.dilution'],
      minKeystrokes: 6,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M4-08-WARRANT.6', { B_T3, B_WARRANT, B_T2 }),
      target: `Model!${B_T3}`,
      atteso: diluizioneNetta,
      referenzia: [B_WARRANT, B_T2],
      senzaLiteral: [],
      skills: ['ev.dilution'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M4-08-WARRANT',
      seed: rng.seed,
      brief: [tx('M4-08-WARRANT.7', { originePrompt, p1: eur(prezzoCorrente, 2), p2: num(numeroWarrant), p3: eur(prezzoEsercizio, 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M4-08-WARRANT.8')], {
              style: STILE_TITOLO,
            }),

            riga(`A${ROW_SEZ1}`, [tx('M4-08-WARRANT.9')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_PREZZO}`,
              [
                tx('M4-08-WARRANT.10'),
                tx('M4-08-WARRANT.11'),
                tx('M4-08-WARRANT.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_PREZZO, content: prezzoCorrente, style: STILE_INPUT_PREZZO, locked: true }],
            [{ ref: B_WARRANT, content: numeroWarrant, style: STILE_INPUT_CONTEGGIO, locked: true }],
            [{ ref: B_ESERCIZIO, content: prezzoEsercizio, style: STILE_INPUT_PREZZO, locked: true }],

            riga(`A${ROW_SEZ2}`, [tx('M4-08-WARRANT.13')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_T1}`,
              [
                tx('M4-08-WARRANT.14'),
                tx('M4-08-WARRANT.15'),
                tx('M4-08-WARRANT.16'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_T1, content: null, locked: false, style: STILE_FORMULA_EURO }],
            [{ ref: B_T2, content: null, locked: false, style: STILE_FORMULA_AZIONI }],
            [{ ref: B_T3, content: null, locked: false, style: STILE_TOTALE_AZIONI }],
          ],
          { colWidths: { A: 440, B: 150 }, frozenRows: ROW_SEZ1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M4-08-WARRANT.17', { B_WARRANT, B_ESERCIZIO }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M4-08-WARRANT.18', { B_T1, B_PREZZO }),
          10,
          'T2',
        ),
        hint(
          'H3',
          tx('M4-08-WARRANT.19', { B_WARRANT, B_T2 }),
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_T1}`,
    };
  },
});
