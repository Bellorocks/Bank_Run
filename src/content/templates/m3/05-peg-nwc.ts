/**
 * M3 · 05 — Il peg del NWC e l'aggiustamento prezzo al closing.
 *
 * QUESTO E' IL LIVELLO [COMBO] del blocco "sintesi" di M3 (non l'ultimo per
 * numero di dipendenze nel DAG — factoring/locked-box/leakage vengono dopo —
 * ma il punto in cui NWC (M3-01), la sua lettura in giorni (M3-02, nwc.cycle)
 * e il suo impatto sulla cassa (M3-03, nwc.fcf-impact) confluiscono in un
 * meccanismo contrattuale vero e proprio: il "peg" di un'operazione di M&A.
 *
 * COS'E' IL PEG — in un signing/closing, compratore e venditore concordano un
 * livello di NWC "normale" (il peg) PRIMA di conoscere il NWC effettivo alla
 * data di closing. Se al closing il NWC effettivo differisce dal peg, il
 * prezzo si aggiusta: e' il meccanismo che protegge entrambe le parti da un
 * venditore che "spreme" il circolante (non riordina magazzino, incassa tutto
 * e non paga i fornitori) prima di vendere, o da un compratore che pretende
 * un prezzo piu' basso solo perche' il closing e' capitato in un mese
 * stagionalmente debole.
 *
 * PERCHE' LA MEDIA DI 12 MESI (e non l'ultimo mese, o un trimestre) — questo
 * e' il punto didattico centrale del livello, ed e' la ragione per cui i 12
 * valori storici hanno un pattern STAGIONALE deliberato, non piatto: un'unica
 * azienda con vendite concentrate prima delle feste costruisce NWC (magazzino
 * + crediti) nei mesi che precedono il picco e lo libera dopo. Se il peg
 * fosse "il NWC di un mese a caso", il suo valore dipenderebbe da QUALE mese
 * capita di guardare — un compratore che chiude a novembre pagherebbe un peg
 * gonfiato dalla stagionalita', uno che chiude a febbraio uno sgonfiato. Una
 * media aritmetica su un ANNO INTERO (un ciclo stagionale completo) risolve
 * il problema per costruzione: i mesi sopra e sotto la media si compensano a
 * vicenda, e cio' che resta e' un livello "normale" che non dipende dal mese
 * di chiusura. Per questo il task 1 e' una AVERAGE semplice sui 12 mesi, non
 * una media ponderata — la "correzione per la stagionalita'" del peg sta
 * proprio nell'usare un ciclo completo, non in un calcolo piu' complesso.
 *
 * SEMPLIFICAZIONE DICHIARATA (stessa di M3-01/02/03): il NWC qui e' la
 * definizione OPERATIVA/commerciale — crediti commerciali + rimanenze -
 * debiti commerciali — non la definizione contabile completa che includerebbe
 * anche ratei/risconti. I 12 valori mensili e il NWC di closing arrivano gia'
 * come dati (bloccati): costruirli da crediti/rimanenze/debiti e' cio' che
 * M3-01/02 hanno gia' esercitato, qui non si ripete.
 *
 * TRE TASK IN CASCATA:
 *   T1  Peg NWC             = AVERAGE(12 mesi storici)
 *   T2  Scostamento dal peg = NWC di closing - Peg (T1)
 *   T3  Aggiustamento prezzo per il venditore = Scostamento (T2)
 *
 * IL SEGNO DI T3 (il punto piu' delicato, ripetuto nel prompt) — se il NWC al
 * closing e' SOPRA il peg (scostamento positivo), il venditore ha lasciato
 * nella societa' PIU' capitale circolante del "normale" concordato: piu'
 * cassa netta a favore del compratore, quindi il prezzo si aggiusta AL
 * RIALZO per il venditore (aggiustamento positivo — e' un compenso). Se il
 * NWC al closing e' SOTTO il peg (scostamento negativo), il venditore ha
 * lasciato MENO capitale circolante del normale: il compratore dovra'
 * reintegrarlo di tasca propria dopo il closing, quindi il prezzo si
 * aggiusta AL RIBASSO (aggiustamento negativo — una penalita'). L'aggiustamento
 * ha percio' LO STESSO SEGNO dello scostamento — non va invertito. E' proprio
 * questo il tranello: l'intuizione "un aggiustamento e' un correttivo, quindi
 * sara' l'opposto" e' quella sbagliata, ed e' il motivo per cui il segno di
 * questo task e' il punto piu' delicato del livello.
 *
 * Geometria fissa: nessuna riga dipende dal seed (nessuno shuffle di voci —
 * i 12 mesi restano sempre nell'ordine del calendario), quindi i riferimenti
 * di cella sono letterali per costruzione, come in M3-01/02/03.
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
  STILE_TOTALE,
  eur,
} from '../../authoring';
import { roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
] as const;

// Forma stagionale deliberata: un'azienda con vendite concentrate a ridosso
// delle feste di fine anno. Il NWC (magazzino + crediti, al netto dei debiti
// verso i fornitori) CRESCE nei mesi che precedono il picco — l'azienda
// costruisce scorte e concede credito in vista della domanda natalizia — e
// TOCCA IL MASSIMO a novembre, appena prima delle spedizioni. A dicembre gli
// incassi delle vendite natalizie cominciano ad arrivare e il NWC comincia a
// scendere (pur restando alto); il minimo e' a febbraio, quando le scorte
// sono ai livelli piu' bassi e gli incassi si sono completati. E' esattamente
// il tipo di pattern che rende "il NWC di un singolo mese" un cattivo proxy
// del livello "normale" dell'azienda.
const FORMA_STAGIONALE = [
  0.78, 0.72, 0.80, 0.85, 0.90, 0.95,
  1.00, 1.08, 1.18, 1.32, 1.48, 1.05,
] as const;

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const ROW_STORICO_START = 5;
const ROW_STORICO_END = ROW_STORICO_START + MESI.length - 1; // 16
const B_NWC_START = `B${ROW_STORICO_START}`; // B5
const B_NWC_END = `B${ROW_STORICO_END}`; // B16

const B_CLOSING = 'B19'; // NWC effettivo al closing (dato, bloccato)

const B_PEG = 'B22'; // T1
const B_SCOSTAMENTO = 'B23'; // T2
const B_AGGIUSTAMENTO = 'B24'; // T3

export default defineTemplate({
  id: 'M3-05-PEGNWC',
  module: 'M3',
  get title() {
    return tx('M3-05-PEGNWC.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 320,
  skills: ['nwc.peg'],
  prerequisites: ['M3-02-DSODIODPO', 'M3-03-NWCEFCF'],
  combo: true,

  generate: (rng) => {
    const rBase = rng.fork('base');
    const rJitter = rng.fork('jitter');
    const rClosing = rng.fork('closing');

    // Scala dell'azienda: il livello "tipico" di NWC attorno a cui oscilla il
    // pattern stagionale. In migliaia, come nei livelli precedenti del modulo.
    const nwcBase = rBase.int(500, 3000) * 1000;

    // I 12 valori storici: forma stagionale fissa (vedi commento sopra) piu'
    // un rumore leggero e indipendente per mese, cosi' il pattern e' visibile
    // ma i numeri non sono un multiplo pulito e prevedibile della forma.
    const nwcStorico = FORMA_STAGIONALE.map((moltiplicatore) => {
      const rumore = 0.94 + rJitter.next() * 0.12; // 0,94x - 1,06x
      return roundTo(nwcBase * moltiplicatore * rumore, 1000);
    });

    // Peg atteso: media aritmetica REALE dei 12 valori effettivamente
    // generati (post-arrotondamento), non della forma teorica — e' il numero
    // che AVERAGE(B5:B16) deve restituire per davvero.
    const pegNWC = nwcStorico.reduce((acc, v) => acc + v, 0) / nwcStorico.length;

    // NWC effettivo al closing: generato con un fattore indipendente sulla
    // scala dell'azienda (non sul peg stesso, per non introdurre una
    // dipendenza circolare nel generatore) che copre un ampio intervallo
    // sopra e sotto il peg — a volte l'aggiustamento e' a favore del
        // venditore, a volte a suo sfavore, come nella realta'.
    const fattoreClosing = 0.70 + rClosing.next() * 0.7; // 0,70x - 1,40x
    const nwcClosing = roundTo(nwcBase * fattoreClosing, 1000);

    // Stessa algebra dei task, usata qui per calcolare i valori attesi in
    // forma chiusa. L'aggiustamento di prezzo per il venditore ha LO STESSO
    // segno dello scostamento (convenzione standard delle completion accounts:
    // prezzo finale = prezzo base + (NWC di closing - peg)) — non e' il suo
    // opposto.
    const scostamento = nwcClosing - pegNWC;
    const aggiustamento = scostamento;

    const t1: Task = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M3-05-PEGNWC.2', { B_PEG, B_NWC_START, B_NWC_END }),
        target: `Model!${B_PEG}`,
        atteso: pegNWC,
        referenzia: [B_NWC_START, B_NWC_END],
        senzaLiteral: [],
        skills: ['nwc.peg'],
        minKeystrokes: 16,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['AVERAGE'] }] };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M3-05-PEGNWC.3', { B_SCOSTAMENTO, B_CLOSING, B_PEG }),
      target: `Model!${B_SCOSTAMENTO}`,
      atteso: scostamento,
      referenzia: [B_CLOSING, B_PEG],
      senzaLiteral: [],
      skills: ['nwc.peg'],
      minKeystrokes: 8,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M3-05-PEGNWC.4', { B_AGGIUSTAMENTO, B_SCOSTAMENTO }),
      target: `Model!${B_AGGIUSTAMENTO}`,
      atteso: aggiustamento,
      referenzia: [B_SCOSTAMENTO],
      senzaLiteral: [],
      skills: ['nwc.peg'],
      minKeystrokes: 4,
    });

    const tasks = [t1, t2, t3];

    const nwcMax = Math.max(...nwcStorico);
    const nwcMin = Math.min(...nwcStorico);
    const meseMax = MESI[nwcStorico.indexOf(nwcMax)];
    const meseMin = MESI[nwcStorico.indexOf(nwcMin)];

    return {
      templateId: 'M3-05-PEGNWC',
      seed: rng.seed,
      brief: [tx('M3-05-PEGNWC.5', { meseMax, p1: eur(nwcMax), meseMin, p3: eur(nwcMin) }), ...MESI.map((mese, i) => `- ${mese}: ${eur(nwcStorico[i])}`), tx('M3-05-PEGNWC.6', { p0: eur(nwcClosing) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M3-05-PEGNWC.7')], { style: STILE_TITOLO }),

            riga('A3', [tx('M3-05-PEGNWC.8')], { style: STILE_TITOLO }),
            riga('A4', [tx('M3-05-PEGNWC.19'), tx('M3-05-PEGNWC.9')], { style: STILE_TITOLO }),
            colonna(`A${ROW_STORICO_START}`, [...MESI], { style: STILE_ETICHETTA }),
            colonna(`B${ROW_STORICO_START}`, nwcStorico, { style: STILE_INPUT }),

            riga('A18', [tx('M3-05-PEGNWC.10')], { style: STILE_TITOLO }),
            colonna('A19', [tx('M3-05-PEGNWC.11')], { style: STILE_ETICHETTA }),
            [{ ref: B_CLOSING, content: nwcClosing, style: STILE_INPUT, locked: true }],

            riga('A21', [tx('M3-05-PEGNWC.12')], { style: STILE_TITOLO }),
            colonna(
              'A22',
              [
                tx('M3-05-PEGNWC.13'),
                tx('M3-05-PEGNWC.14'),
                tx('M3-05-PEGNWC.15'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_PEG, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_SCOSTAMENTO, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_AGGIUSTAMENTO, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 420, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M3-05-PEGNWC.16', { B_NWC_START, B_NWC_END }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M3-05-PEGNWC.17', { B_CLOSING, B_PEG }),
          8,
          'T2',
        ),
        hint(
          'H3',
          tx('M3-05-PEGNWC.18', { B_SCOSTAMENTO }),
          12,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 150 }),
      startAt: `Model!${B_PEG}`,
    };
  },
});
