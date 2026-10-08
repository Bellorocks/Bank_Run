/**
 * M7 · 11 — Normalizzazione del capex nel terminal value.
 *
 * M3-04 (skill nwc.capex) ha insegnato la scomposizione del capex TOTALE di UN
 * anno in mantenimento (proxy: converge verso il D&A) e crescita (il resto,
 * discrezionale). Questo livello riprende lo STESSO proxy — capex di
 * mantenimento ≈ D&A — ma lo applica a un problema diverso: non scomporre il
 * capex di un anno storico, ma NORMALIZZARE il capex dell'ultimo anno
 * esplicito prima di usarlo per costruire il terminal value (M7-09, skill
 * dcf.terminal-value).
 *
 * PERCHE' SERVE UNA NORMALIZZAZIONE A PARTE
 *
 * Il Gordon growth (M7-09) assume che oltre l'ultimo anno esplicito l'azienda
 * cresca per sempre a un tasso g basso e costante — la crescita di
 * un'economia matura. Ma un'azienda in perpetuo regime stazionario non puo'
 * continuare a ESPANDERE la propria capacita' produttiva all'infinito: nel
 * lungo periodo il capex deve limitarsi a rimpiazzare cio' che si consuma,
 * cioe' convergere verso il D&A — esattamente il proxy di M3-04, qui applicato
 * non a un anno storico ma all'anno "stilizzato" che rappresenta la
 * perpetuita'.
 *
 * Se invece si portasse nel terminal value il capex GREZZO proiettato per
 * l'ultimo anno esplicito — magari ancora alto perche' quell'anno un progetto
 * di espansione era ancora in corso — il FCF terminale (e quindi il Terminal
 * Value, che di norma pesa la maggioranza della valutazione: M7-09) verrebbe
 * sistematicamente SOTTOSTIMATO: si starebbe implicitamente assumendo che
 * l'azienda continui a espandersi per sempre, il che contraddice l'assunzione
 * stessa di regime stazionario su cui si fonda Gordon growth.
 *
 * LE DUE FORMULE, IN CASCATA
 *
 *   T1  Capex normalizzato (per il terminal value) = D&A dell'ultimo anno
 *   T2  FCF normalizzato (per il terminal value)
 *         = FCF prima della normalizzazione + (Capex grezzo − Capex normalizzato)
 *
 * Il ragionamento di T2: il FCF "prima della normalizzazione" e' gia' stato
 * calcolato sottraendo il capex GREZZO (piu' alto). Per ottenere il FCF che
 * si sarebbe avuto usando il capex normalizzato (piu' basso, quindi meno
 * cassa assorbita) si "restituisce" al FCF esattamente la differenza fra i
 * due capex: quanto in piu' era stato sottratto rispetto a quanto si sarebbe
 * dovuto sottrarre in regime stazionario. Il capex grezzo e' sempre superiore
 * al D&A per costruzione (rappresenta un anno ancora "di crescita" non
 * normalizzato), quindi quella differenza e' sempre positiva: il FCF
 * normalizzato e' sempre maggiore o uguale al FCF di partenza.
 *
 * Questo livello NON ricalcola il Terminal Value stesso (quello e' M7-09):
 * si ferma al FCF normalizzato, l'input pulito che un livello combo
 * userebbe come numeratore della formula di Gordon.
 *
 * Geometria fissa: nessuna riga dipende dal seed, i riferimenti di cella sono
 * letterali per costruzione, come negli altri livelli di M7.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eurM,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_CAPEX_GREZZO = 'B4'; // Capex proiettato per l'ultimo anno esplicito, non normalizzato (dato, bloccato)
const B_DA = 'B5'; // D&A dell'ultimo anno esplicito, proxy del capex di mantenimento (dato, bloccato)
const B_FCF_PRIMA = 'B6'; // FCF dell'ultimo anno esplicito, calcolato col capex GREZZO (dato, bloccato)

const B_CAPEX_NORM = 'B9'; // T1: capex normalizzato per il terminal value
const B_FCF_NORM = 'B10'; // T2: FCF normalizzato per il terminal value

export default defineTemplate({
  id: 'M7-11-CAPEXTERMINALE',
  module: 'M7',
  title: 'Normalizzazione del capex nel terminal value',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['dcf.terminal-capex'],
  prerequisites: ['M7-09-GORDONGROWTH'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // D&A dell'ultimo anno esplicito: proxy del capex di mantenimento
    // sostenibile in perpetuo, stesso principio di M3-04. Mid-cap tipica, in
    // milioni, arrotondato a 50.000 € per evitare code decimali innaturali.
    const da = roundTo(triangular(r, 1_000_000, 2_000_000, 4_000_000), 50_000);

    // Capex grezzo dell'ultimo anno esplicito: SEMPRE superiore al D&A
    // (fattore 1,05x - 2,50x, stesso range di M3-04), per rappresentare un
    // anno ancora "di crescita" non normalizzato — a volte di poco sopra il
    // mantenimento, a volte un vero e proprio progetto di espansione.
    const fattoreCapex = 1.05 + r.next() * 1.45; // 1,05x - 2,50x
    const capexGrezzo = roundTo(da * fattoreCapex, 50_000);

    // Guard-rail (§4.3): il punto didattico regge solo se il capex grezzo
    // resta strettamente sopra il D&A — altrimenti la differenza (capexGrezzo
    // - capexNormalizzato) in T2 non sarebbe piu' positiva e la normalizzazione
    // diventerebbe un no-op o, peggio, un'inversione. I range sopra lo
    // garantiscono per costruzione (fattore minimo 1,05x), ma il throw
    // documenta l'invariante ed intercetta subito una futura modifica ai
    // range che lo rompesse.
    if (capexGrezzo <= da) {
      throw new Error(
        `M7-11-CAPEXTERMINALE: capex grezzo (${capexGrezzo}) non e' strettamente superiore al D&A ` +
          `(${da}) per il seed ${rng.seed} — la normalizzazione perderebbe senso didattico.`,
      );
    }

    // FCF dell'ultimo anno esplicito, PRIMA della normalizzazione: dato
    // indipendente, gia' calcolato a monte (fuori da questo livello) usando
    // il capex grezzo. Mid-cap tipica, in milioni.
    const fcfPrima = roundTo(triangular(r, 3_000_000, 6_000_000, 10_000_000), 50_000);

    const capexNormalizzato = da;
    const fcfNormalizzato = fcfPrima + (capexGrezzo - capexNormalizzato);

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_CAPEX_NORM} calcola il capex NORMALIZZATO da usare nel terminal value: la stessa ` +
        `convenzione di M3-04 (capex di mantenimento ≈ D&A), qui applicata all'anno "stilizzato" della ` +
        `perpetuita'. Nel lungo periodo un'azienda in regime stazionario non puo' continuare a espandere ` +
        `la propria capacita' produttiva per sempre: il capex deve convergere verso il D&A dell'ultimo ` +
        `anno esplicito (${B_DA}). Usa direttamente quella cella come stima, senza copiare il numero a mano.`,
      target: `Model!${B_CAPEX_NORM}`,
      atteso: capexNormalizzato,
      referenzia: [B_DA],
      senzaLiteral: [],
      skills: ['dcf.terminal-capex'],
      minKeystrokes: 3,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_FCF_NORM} calcola il FCF normalizzato per il terminal value: il FCF dell'ultimo anno ` +
        `esplicito PRIMA della normalizzazione (${B_FCF_PRIMA} — gia' calcolato col capex grezzo, non ` +
        `toccarlo) PIU' la differenza fra il capex grezzo (${B_CAPEX_GREZZO}) e il capex normalizzato ` +
        `appena calcolato in T1 (${B_CAPEX_NORM} — NON ricalcolarlo da zero). ` +
        `Formula: FCF normalizzato = ${B_FCF_PRIMA} + (${B_CAPEX_GREZZO} − ${B_CAPEX_NORM}). ` +
        "Il senso: quel FCF di partenza aveva gia' sottratto il capex GREZZO, piu' alto di quanto " +
        "servirebbe in regime stazionario; questa formula gli \"restituisce\" esattamente la fetta di " +
        "capex in eccesso. ATTENZIONE all'ordine della sottrazione dentro la parentesi: capex grezzo " +
        `MENO capex normalizzato (${B_CAPEX_GREZZO} − ${B_CAPEX_NORM}), mai il contrario — invertirlo ` +
        'toglierebbe cassa invece di restituirla, sottostimando ulteriormente il FCF terminale invece di ' +
        'correggerlo. Usa le tre celle date, senza copiare i numeri a mano.',
      target: `Model!${B_FCF_NORM}`,
      atteso: fcfNormalizzato,
      referenzia: [B_FCF_PRIMA, B_CAPEX_GREZZO, B_CAPEX_NORM],
      senzaLiteral: [],
      skills: ['dcf.terminal-capex'],
      minKeystrokes: 20,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M7-11-CAPEXTERMINALE',
      seed: rng.seed,
      brief: [
        '## Normalizzazione del capex nel terminal value',
        '',
        "M3-04 ha insegnato a scomporre il capex TOTALE di un anno in capex di mantenimento (proxy: " +
          "converge verso il D&A) e capex di crescita (il resto, discrezionale). Qui riprendiamo lo " +
          "STESSO proxy — capex di mantenimento ≈ D&A — ma per un problema diverso: normalizzare il " +
          "capex dell'ultimo anno esplicito prima di usarlo per costruire il terminal value (M7-09).",
        '',
        "**Perche' serve.** Il Gordon growth (M7-09) assume che oltre l'ultimo anno esplicito l'azienda " +
          "cresca per sempre a un tasso g basso e costante — un regime stazionario. Ma un'azienda in " +
          "regime stazionario non puo' continuare a ESPANDERE la propria capacita' produttiva " +
          "all'infinito: nel lungo periodo il capex deve limitarsi a rimpiazzare cio' che si consuma, " +
          "cioe' convergere verso il D&A. Se invece si portasse nel terminal value il capex GREZZO " +
          "proiettato per l'ultimo anno esplicito — magari ancora alto perche' quell'anno un progetto di " +
          "espansione era ancora in corso — il FCF terminale (e quindi il Terminal Value, che di norma " +
          "pesa la maggioranza della valutazione) verrebbe sistematicamente SOTTOSTIMATO.",
        '',
        '> **Capex normalizzato (per il terminal value) = D&A dell\'ultimo anno esplicito**',
        '> **FCF normalizzato = FCF prima della normalizzazione + (Capex grezzo − Capex normalizzato)**',
        '',
        "Il FCF \"prima della normalizzazione\" e' gia' stato calcolato sottraendo il capex GREZZO, piu' " +
          "alto. Per ottenere il FCF che si sarebbe avuto in regime stazionario, gli si \"restituisce\" " +
          "esattamente la differenza fra i due capex: quanto in piu' era stato sottratto rispetto a " +
          "quanto si sarebbe dovuto sottrarre.",
        '',
        `**I dati**, gia' pronti come assunzioni: capex grezzo dell'ultimo anno esplicito ${eurM(capexGrezzo)}, ` +
          `D&A dell'ultimo anno esplicito ${eurM(da)}, FCF dell'ultimo anno esplicito prima della ` +
          `normalizzazione ${eurM(fcfPrima)}.`,
        '',
        "Calcola prima il capex normalizzato, poi usalo per normalizzare il FCF. Questo livello si ferma " +
          "qui: il FCF normalizzato che ottieni e' l'input pulito che andrebbe al numeratore della " +
          'formula di Gordon (M7-09), non ricalcoli qui il Terminal Value stesso.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Normalizzazione del capex nel terminal value'], { style: STILE_TITOLO }),

            riga('A3', ["Dati di partenza (ultimo anno esplicito)"], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Capex grezzo, non normalizzato, €',
                'D&A, €',
                'FCF prima della normalizzazione del capex, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_CAPEX_GREZZO, content: capexGrezzo, style: STILE_INPUT, locked: true },
              { ref: B_DA, content: da, style: STILE_INPUT, locked: true },
              { ref: B_FCF_PRIMA, content: fcfPrima, style: STILE_INPUT, locked: true },
            ],

            riga('A8', ['Normalizzazione per il terminal value'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'Capex normalizzato, €',
                'FCF normalizzato, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_CAPEX_NORM, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_FCF_NORM, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 440, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_DA}: il capex normalizzato per il terminal value e' semplicemente il D&A dell'ultimo ` +
            "anno, stessa convenzione di M3-04.",
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_FCF_PRIMA}+(${B_CAPEX_GREZZO}-${B_CAPEX_NORM}): il FCF di partenza piu' la differenza ` +
            "fra capex grezzo e capex normalizzato — non il contrario.",
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_CAPEX_NORM}`,
    };
  },
});
