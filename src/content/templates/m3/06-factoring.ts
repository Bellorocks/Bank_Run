/**
 * M3 · 06 — Factoring: il debito mascherato da circolante.
 *
 * Prosegue da M3-05 (il peg del NWC): dopo aver imparato COME si normalizza il
 * NWC per un confronto omogeneo (media su un ciclo stagionale completo), qui
 * si impara CHE COSA altro va normalizzato — non solo la stagionalita', ma
 * anche una scelta di finanziamento che si traveste da miglioramento
 * operativo.
 *
 * COS'E' IL FACTORING — l'azienda cede una parte dei propri crediti
 * commerciali a uno specialista (il "factor") dietro una commissione, e
 * incassa subito invece di aspettare la scadenza naturale del credito. I
 * crediti ceduti spariscono dall'attivo di bilancio: il NWC riportato si
 * riduce, il DSO riportato si accorcia, il cash conversion cycle riportato
 * migliora. Tutto questo pero' senza che il ciclo operativo VERO
 * dell'azienda sia cambiato di una virgola — i clienti pagano esattamente
 * quando pagavano prima, l'azienda ha solo trovato un modo per farsi
 * anticipare cassa da un terzo, pagando una commissione per il servizio.
 *
 * IL PUNTO DIDATTICO CENTRALE: il factoring e' economicamente un
 * FINANZIAMENTO (un prestito garantito dai crediti, con un costo esplicito,
 * la commissione), non una vera riduzione del ciclo operativo. Un analista
 * che confronta due aziende — una che fa factoring e una che non lo fa — sui
 * loro NWC/CCC riportati le confronterebbe su basi disomogenee: quella che fa
 * factoring sembrerebbe strutturalmente piu' efficiente, quando in realta' ha
 * solo spostato un pezzo di debito fuori dalla vista, nei crediti ceduti.
 * Per questo, in due diligence, si "riaggiungono" i crediti ceduti al factor
 * per ricostruire il NWC come se il factoring non ci fosse mai stato — esattamente
 * come M3-05 normalizzava la stagionalita', qui si normalizza una scelta di
 * finanziamento.
 *
 * SEMPLIFICAZIONE DICHIARATA (stessa di tutto il modulo): NWC = crediti
 * commerciali + rimanenze - debiti commerciali, la definizione OPERATIVA/
 * commerciale, non quella contabile completa.
 *
 * DUE TASK IN CASCATA:
 *   T1  Crediti commerciali "veri" (come se non ci fosse stato factoring)
 *       = crediti riportati in bilancio (GIA' netti dei crediti ceduti) +
 *         crediti ceduti al factor durante l'anno.
 *   T2  NWC normalizzato (senza l'effetto del factoring)
 *       = T1 + rimanenze - debiti commerciali.
 *
 * La commissione di factoring annua e' un dato generato e mostrato nel foglio
 * (e usato nel brief per calcolare un tasso implicito), ma NON entra in
 * nessuna delle due formule: e' li' per fare vedere che il "miglioramento"
 * del NWC riportato non e' gratis, e' proprio il costo che tradisce la vera
 * natura — finanziaria, non operativa — dell'operazione.
 *
 * Geometria fissa: nessuna riga dipende dal seed (nessuno shuffle di voci),
 * quindi i riferimenti di cella sono letterali per costruzione, come nel
 * resto del modulo.
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
  pct,
} from '../../authoring';
import { roundTo } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_CREDITI_RIPORTATI = 'B4'; // Crediti commerciali riportati, GIA' netti dal factoring (dato, bloccato)
const B_RIMANENZE = 'B5'; // Rimanenze (dato, bloccato)
const B_DEBITI = 'B6'; // Debiti commerciali (dato, bloccato)

const B_CREDITI_CEDUTI = 'B9'; // Crediti ceduti al factor durante l'anno (dato, bloccato)
const B_COMMISSIONE = 'B10'; // Commissione di factoring annua (dato, bloccato, un costo)

const B_CREDITI_VERI = 'B13'; // T1
const B_NWC_NORM = 'B14'; // T2

export default defineTemplate({
  id: 'M3-06-FACTORING',
  module: 'M3',
  get title() {
    return tx('M3-06-FACTORING.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 280,
  skills: ['nwc.factoring'],
  prerequisites: ['M3-05-PEGNWC'],

  generate: (rng) => {
    const rBase = rng.fork('base');
    const rCeduti = rng.fork('ceduti');
    const rAltro = rng.fork('altro');
    const rCommissione = rng.fork('commissione');

    // Crediti commerciali "veri": quelli che l'azienda avrebbe in bilancio se
    // non avesse mai fatto factoring. E' la grandezza economica di partenza,
    // non un dato che il giocatore vede direttamente: cio' che vede e' il
    // dato di bilancio GIA' netto dei crediti ceduti (vedi sotto).
    const creditiVeri = roundTo(rBase.int(600, 3500) * 1000, 1000);

    // Quota dei crediti veri ceduta al factor durante l'anno: tra il 30% e il
    // 70%, un intervallo che rappresenta bene un uso "sostanziale" del
    // factoring (non un caso limite marginale, ne' una cessione totale).
    const fattoreCeduti = 0.3 + rCeduti.next() * 0.4;
    const creditiCeduti = roundTo(creditiVeri * fattoreCeduti, 1000);

    // Il dato che il giocatore vede in bilancio e' GIA' netto dei crediti
    // ceduti: sottrazione esatta fra due multipli di 1.000, nessun ulteriore
    // arrotondamento necessario, quindi creditiRiportati + creditiCeduti
    // torna a fare ESATTAMENTE creditiVeri, senza scarti di arrotondamento.
    const creditiRiportati = creditiVeri - creditiCeduti;

    // Rimanenze e debiti commerciali: stessa scala e stesso intervallo degli
    // altri livelli del modulo (M3-01), scorrelati dai crediti.
    const rimanenze = roundTo(rAltro.int(150, 1800) * 1000, 1000);
    const debiti = roundTo(rAltro.int(300, 2200) * 1000, 1000);

    // Commissione di factoring annua: tipicamente una piccola percentuale dei
    // crediti ceduti (1%-3%), il costo esplicito del servizio. Non entra in
    // nessuna formula dei task: serve solo a rendere concreto, nel brief, che
    // questo "miglioramento" del NWC riportato non e' gratuito.
    const tassoCommissione = 0.01 + rCommissione.next() * 0.02;
    const commissioneFactoring = roundTo(creditiCeduti * tassoCommissione, 1000);
    const tassoImplicito = commissioneFactoring / creditiCeduti;

    // Stessa algebra dei task, per calcolare i valori attesi in forma chiusa.
    const creditiVeriAtteso = creditiRiportati + creditiCeduti; // === creditiVeri
    const nwcNormalizzato = creditiVeriAtteso + rimanenze - debiti;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M3-06-FACTORING.2', { B_CREDITI_VERI, B_CREDITI_RIPORTATI, B_CREDITI_CEDUTI }),
      target: `Model!${B_CREDITI_VERI}`,
      atteso: creditiVeriAtteso,
      referenzia: [B_CREDITI_RIPORTATI, B_CREDITI_CEDUTI],
      senzaLiteral: [],
      skills: ['nwc.factoring'],
      minKeystrokes: 6,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M3-06-FACTORING.3', { B_NWC_NORM, B_CREDITI_VERI, B_RIMANENZE, B_DEBITI }),
      target: `Model!${B_NWC_NORM}`,
      atteso: nwcNormalizzato,
      referenzia: [B_CREDITI_VERI, B_RIMANENZE, B_DEBITI],
      senzaLiteral: [],
      skills: ['nwc.factoring'],
      minKeystrokes: 9,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M3-06-FACTORING',
      seed: rng.seed,
      brief: [tx('M3-06-FACTORING.4', { p0: eur(creditiRiportati), p1: eur(rimanenze), p2: eur(debiti), p3: eur(creditiCeduti), p4: eur(commissioneFactoring), p5: eur(commissioneFactoring), p6: eur(creditiCeduti), p7: pct(tassoImplicito) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M3-06-FACTORING.5')], { style: STILE_TITOLO }),

            riga('A3', [tx('M3-06-FACTORING.6')], {
              style: STILE_TITOLO,
            }),
            colonna(
              'A4',
              [tx('M3-06-FACTORING.7'), tx('M3-06-FACTORING.17'), tx('M3-06-FACTORING.8')],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_CREDITI_RIPORTATI, content: creditiRiportati, style: STILE_INPUT, locked: true },
              { ref: B_RIMANENZE, content: rimanenze, style: STILE_INPUT, locked: true },
              { ref: B_DEBITI, content: debiti, style: STILE_INPUT, locked: true },
            ],

            riga('A8', [tx('M3-06-FACTORING.9')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [tx('M3-06-FACTORING.10'), tx('M3-06-FACTORING.11')],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_CREDITI_CEDUTI, content: creditiCeduti, style: STILE_INPUT, locked: true },
              { ref: B_COMMISSIONE, content: commissioneFactoring, style: STILE_INPUT, locked: true },
            ],

            riga('A12', [tx('M3-06-FACTORING.12')], { style: STILE_TITOLO }),
            [{ ref: 'A13', content: tx('M3-06-FACTORING.13'), locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_CREDITI_VERI, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: 'A14', content: tx('M3-06-FACTORING.14'), locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_NWC_NORM, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 460, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M3-06-FACTORING.15', { B_CREDITI_RIPORTATI, B_CREDITI_CEDUTI }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M3-06-FACTORING.16', { B_CREDITI_VERI, B_RIMANENZE, B_DEBITI }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 130 }),
      startAt: `Model!${B_CREDITI_VERI}`,
    };
  },
});
