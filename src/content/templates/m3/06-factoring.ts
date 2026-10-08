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
  title: 'Factoring: il debito mascherato da circolante',
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
        `In ${B_CREDITI_VERI} calcola i crediti commerciali "veri": quelli che l'azienda avrebbe in ` +
        "bilancio se durante l'anno NON avesse ceduto nulla al factor. Il dato che vedi in " +
        `${B_CREDITI_RIPORTATI} e' GIA' quello riportato in bilancio, cioe' GIA' netto dei crediti ` +
        "ceduti (spariscono dall'attivo appena ceduti al factor, e incassati subito). Per confrontare " +
        "il NWC di quest'azienda su basi omogenee con una che non fa factoring, un analista li " +
        `RIAGGIUNGE: somma ai crediti riportati (${B_CREDITI_RIPORTATI}) i crediti ceduti al factor ` +
        `durante l'anno (${B_CREDITI_CEDUTI}).`,
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
        `In ${B_NWC_NORM} calcola il NWC normalizzato, cioe' SENZA l'effetto del factoring: e' lo ` +
        "stesso identico calcolo che conosci da M3-01 (crediti + rimanenze - debiti), applicato pero' " +
        `ai crediti "veri" appena riaggiunti (${B_CREDITI_VERI}), non a quelli riportati in bilancio. ` +
        `Somma le rimanenze (${B_RIMANENZE}) e sottrai i debiti commerciali (${B_DEBITI}).`,
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
      brief: [
        '## Factoring: quando il NWC migliora perche\' l\'azienda si e\' solo indebitata altrove',
        '',
        "Il factoring e' la cessione di una parte dei crediti commerciali a uno specialista (il " +
          "\"factor\"), dietro una commissione, per incassare subito invece di aspettare la scadenza " +
          "naturale del credito. Appena ceduti, quei crediti spariscono dall'attivo di bilancio: il NWC " +
          "riportato si riduce, il DSO riportato si accorcia, il cash conversion cycle riportato " +
          "migliora — tutti indicatori che, guardati senza fare domande, raccontano un'azienda piu' " +
          "efficiente.",
        '',
        "**Il punto e' che non lo e' diventata affatto.** I clienti pagano esattamente quando pagavano " +
          "prima; il ciclo operativo VERO dell'azienda non e' cambiato di una virgola. Cio' che e' " +
          "cambiato e' solo CHI anticipa la cassa: prima l'azienda aspettava il cliente, ora si fa " +
          "anticipare da un factor, pagando una commissione per il servizio. E' economicamente un " +
          "FINANZIAMENTO — un prestito garantito dai crediti — travestito da miglioramento operativo. " +
          "Per questo il factoring si descrive spesso come **debito mascherato da circolante**: un " +
          "analista che confrontasse due aziende sui loro NWC/CCC riportati, senza sapere che una fa " +
          "factoring e l'altra no, concluderebbe che la prima ha un ciclo operativo strutturalmente " +
          "migliore — quando in realta' ha solo spostato un pezzo di debito fuori dalla vista.",
        '',
        "Ecco i dati di quest'azienda a fine periodo. Il bilancio riporta gia', per costruzione, i " +
          "crediti NETTI dai crediti ceduti al factor:",
        '',
        `- Crediti commerciali riportati in bilancio (gia' netti dal factoring), ${eur(creditiRiportati)}`,
        `- Rimanenze, ${eur(rimanenze)}`,
        `- Debiti commerciali, ${eur(debiti)}`,
        '',
        "Durante l'anno l'azienda ha ceduto al factor crediti commerciali per " +
          `${eur(creditiCeduti)}, pagando una commissione annua di ${eur(commissioneFactoring)}. In ` +
          `termini economici, una commissione di ${eur(commissioneFactoring)} su ${eur(creditiCeduti)} ` +
          `di crediti ceduti equivale a un costo implicito di circa ${pct(tassoImplicito)} l'anno su ` +
          "quell'importo — non troppo lontano, concettualmente, da un tasso di interesse. E' esattamente " +
          "questo costo esplicito a tradire la vera natura finanziaria dell'operazione: una vera " +
          "riduzione del ciclo operativo (clienti che pagano prima, magazzino che gira piu' in fretta) " +
          "non costerebbe nulla ogni anno.",
        '',
        "Per confrontare il NWC di quest'azienda su basi omogenee con una che non fa factoring, un " +
          "analista in due diligence RIAGGIUNGE i crediti ceduti — esattamente come M3-05 normalizzava " +
          "la stagionalita' con una media su 12 mesi, qui si normalizza una scelta di finanziamento. " +
          "Calcola prima i crediti commerciali \"veri\" (task 1), poi il NWC normalizzato che ne deriva " +
          "(task 2).",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Factoring: il debito mascherato da circolante'], { style: STILE_TITOLO }),

            riga('A3', ['Dati di bilancio riportati (a fine periodo, gia\' netti dal factoring)'], {
              style: STILE_TITOLO,
            }),
            colonna(
              'A4',
              ['Crediti commerciali riportati, €', 'Rimanenze, €', 'Debiti commerciali, €'],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_CREDITI_RIPORTATI, content: creditiRiportati, style: STILE_INPUT, locked: true },
              { ref: B_RIMANENZE, content: rimanenze, style: STILE_INPUT, locked: true },
              { ref: B_DEBITI, content: debiti, style: STILE_INPUT, locked: true },
            ],

            riga('A8', ['Effetto del factoring durante l\'anno'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              ['Crediti ceduti al factor, €', 'Commissione di factoring annua, €'],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_CREDITI_CEDUTI, content: creditiCeduti, style: STILE_INPUT, locked: true },
              { ref: B_COMMISSIONE, content: commissioneFactoring, style: STILE_INPUT, locked: true },
            ],

            riga('A12', ['Normalizzazione: il NWC senza l\'effetto del factoring'], { style: STILE_TITOLO }),
            [{ ref: 'A13', content: 'Crediti commerciali "veri" (riaggiunti), €', locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_CREDITI_VERI, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: 'A14', content: 'NWC normalizzato (senza factoring), €', locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_NWC_NORM, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 460, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_CREDITI_RIPORTATI}+${B_CREDITI_CEDUTI}: crediti riportati (gia' netti) piu' crediti ` +
            "ceduti al factor, per ricostruire il totale come se il factoring non ci fosse mai stato.",
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_CREDITI_VERI}+${B_RIMANENZE}-${B_DEBITI}: stesso calcolo NWC = crediti + rimanenze - ` +
            "debiti di M3-01, applicato ai crediti riaggiunti.",
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 130 }),
      startAt: `Model!${B_CREDITI_VERI}`,
    };
  },
});
