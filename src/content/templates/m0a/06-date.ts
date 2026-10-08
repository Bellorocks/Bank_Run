/**
 * M0-A · 06 — Le date sono numeri.
 *
 * Il punto didattico e' che una data in Excel non e' un tipo speciale: e' un
 * numero seriale che conta i giorni dal 1 gennaio 1900 (che vale 1). Il
 * formato (`gg/mm/aaaa`) e' solo un vestito che Excel mette sopra quel numero
 * per disegnarlo — sotto c'e' sempre un intero, e per questo le date si
 * sommano e si sottraggono come qualsiasi altro numero.
 *
 * Due task, due direzioni dell'operazione:
 *  - T1 SOMMA una data e una durata -> ottiene un'altra data (la scadenza).
 *  - T2 SOTTRAE due date -> ottiene un numero puro di giorni (il ritardo).
 * Confonderle e' l'errore da rompere: chi non ha capito il seriale prova a
 * "concatenare" le date invece di sommarle, o si aspetta una data quando la
 * sottrazione da' un numero di giorni.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { DEFAULT_FORMATS, serialToDate } from '../../../engine/numberFormat';

import { tx } from '../../../i18n/content';
const MS_PER_DAY = 86_400_000;

/**
 * Costruisce a mano il seriale Excel di una data, per calcolare i valori
 * attesi con la stessa aritmetica che il giocatore dovrebbe riprodurre.
 *
 * Il seriale conta i giorni dal 30/12/1899 (l'epoca di Excel, che rende il
 * 01/01/1900 il giorno 1). Qui sotto e' irrilevante il bug del bisestile 1900
 * fittizio: le date generate cadono sempre dopo il 1900, quindi il conteggio
 * coincide con quello reale — vedi il commento su `serialToDate` in
 * `src/engine/numberFormat.ts` per il dettaglio del bug.
 */
function serialeData(anno: number, mese: number, giorno: number): number {
  return Math.round((Date.UTC(anno, mese - 1, giorno) - Date.UTC(1899, 11, 30)) / MS_PER_DAY);
}

/** Data in formato italiano `gg/mm/aaaa`, per scriverla dentro il brief. */
function formattaData(anno: number, mese: number, giorno: number): string {
  const gg = String(giorno).padStart(2, '0');
  const mm = String(mese).padStart(2, '0');
  return `${gg}/${mm}/${anno}`;
}

const STILE_INPUT_DATA = { ...STILE_INPUT, numFmt: DEFAULT_FORMATS.data };
const STILE_FORMULA_DATA = { ...STILE_FORMULA, numFmt: DEFAULT_FORMATS.data };

export default defineTemplate({
  id: 'M0A-06-DATE',
  module: 'M0-A',
  get title() {
    return tx('M0A-06-DATE.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.dates-serial'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Contratto: data di inizio + durata in giorni -> data di scadenza.
    const annoInizio = r.int(2023, 2026);
    const meseInizio = r.int(1, 12);
    const giornoInizio = r.int(1, 28); // niente problemi di fine mese
    const serialeInizio = serialeData(annoInizio, meseInizio, giornoInizio);
    const durataGiorni = r.int(60, 730);
    const serialeScadenza = serialeInizio + durataGiorni;

    // Consegna: scadenza pattuita vs consegna effettiva -> giorni di ritardo.
    const annoPattuita = r.int(2023, 2026);
    const mesePattuita = r.int(1, 12);
    const giornoPattuita = r.int(1, 28);
    const serialePattuita = serialeData(annoPattuita, mesePattuita, giornoPattuita);
    const giorniRitardo = r.int(3, 47);
    const serialeEffettiva = serialePattuita + giorniRitardo;
    const effettiva = serialToDate(serialeEffettiva);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M0A-06-DATE.2'),
        target: 'Model!B4',
        atteso: serialeScadenza,
        referenzia: ['B2', 'B3'],
        senzaLiteral: [],
        skills: ['xl.dates-serial'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt:
          tx('M0A-06-DATE.3'),
        target: 'Model!B8',
        atteso: giorniRitardo,
        referenzia: ['B6', 'B7'],
        senzaLiteral: [],
        skills: ['xl.dates-serial'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M0A-06-DATE',
      seed: rng.seed,
      brief: [tx('M0A-06-DATE.4', { p0: formattaData(annoInizio, meseInizio, giornoInizio), durataGiorni, p2: formattaData(annoPattuita, mesePattuita, giornoPattuita), p3: formattaData(effettiva.year, effettiva.month, effettiva.day) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0A-06-DATE.5')], { style: STILE_TITOLO }),
            blocco(
              'A2',
              [[tx('M0A-06-DATE.6')], [tx('M0A-06-DATE.7')], [tx('M0A-06-DATE.8')]],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[serialeInizio]], { style: STILE_INPUT_DATA }),
            blocco('B3', [[durataGiorni]], { style: STILE_INPUT }),
            [{ ref: 'B4', content: null, locked: false, style: STILE_FORMULA_DATA }],

            blocco(
              'A6',
              [[tx('M0A-06-DATE.9')], [tx('M0A-06-DATE.10')], [tx('M0A-06-DATE.11')]],
              { style: STILE_ETICHETTA },
            ),
            blocco('B6', [[serialePattuita]], { style: STILE_INPUT_DATA }),
            blocco('B7', [[serialeEffettiva]], { style: STILE_INPUT_DATA }),
            [{ ref: 'B8', content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 240, B: 130 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M0A-06-DATE.12'), 8, 'T1'),
        hint('H2', tx('M0A-06-DATE.13'), 8, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: 'Model!B4',
    };
  },
});
