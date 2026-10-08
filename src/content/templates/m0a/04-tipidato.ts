/**
 * M0-A · 04 — Numero, testo, data, booleano: quattro cose diverse.
 *
 * Il punto didattico non e' il colore (blu = "l'ha scritto una persona", e qui
 * infatti E' blu su tutte e quattro le celle di testa, apposta: il colore non
 * distingue il tipo). Il punto e' l'ALLINEAMENTO PREDEFINITO, che Excel applica
 * da solo e non si puo' spegnere per sbaglio: numeri e date a destra, testo a
 * sinistra, booleani al centro (la logica vera e' in `src/grid/cellDisplay.ts`).
 *
 * Il codice cliente e' l'esempio piu' onesto di "numero che deve restare testo":
 * se lo si battesse come numero, lo zero iniziale sparirebbe. La quantita'
 * forzata a testo e' l'altro caso classico, quello che nessuno pianta apposta —
 * arriva cosi' da un gestionale o da un file importato. In entrambi i casi SUM
 * non segnala nulla: salta la cella e continua, silenziosamente. E' un assaggio
 * di M0-D (data cleaning), non ancora la lezione intera.
 *
 * Nota tecnica per chi tocca questo file: il motore (HyperFormula) converte in
 * NUMERO ogni stringa che assomiglia a un numero, spazi iniziali/finali inclusi
 * (li toglie con `.trim()` prima di provare a interpretarla). L'unico modo per
 * ottenere davvero una cella di testo che sembra un numero e' lo stesso di
 * Excel: un apice `'` iniziale, che il motore riconosce e toglie mantenendo il
 * resto come testo. Vedi `CellContentParser.parse` in HyperFormula.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  num,
} from '../../authoring';
import type { CellStyle } from '../../../engine/types';
import { MODEL_COLORS } from '../../../styles/palette';

import { tx } from '../../../i18n/content';
/** Stesso blu di STILE_INPUT: cambia solo il formato, per un numero a una cifra decimale. */
const STILE_PESO: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0.0' };
/** Ancora blu: e' proprio quello il punto. Cambia solo il formato data. */
const STILE_DATA: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: 'gg/mm/aaaa' };

const ARTICOLI_POOL = () => ([
  tx('M0A-04-TIPIDATO.1'),
  tx('M0A-04-TIPIDATO.2'),
  tx('M0A-04-TIPIDATO.3'),
  tx('M0A-04-TIPIDATO.4'),
  tx('M0A-04-TIPIDATO.5'),
  tx('M0A-04-TIPIDATO.6'),
  tx('M0A-04-TIPIDATO.7'),
] as const);

/** Seriale Excel di una data, con la stessa epoca usata da `serialToDate` per n >= 60. */
function excelSerial(year: number, month: number, day: number): number {
  const ms = Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30);
  return Math.round(ms / 86_400_000);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export default defineTemplate({
  id: 'M0A-04-TIPIDATO',
  module: 'M0-A',
  get title() {
    return tx('M0A-04-TIPIDATO.title');
  },
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 180,
  skills: ['xl.datatypes', 'xl.dates-serial', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Codice cliente: comincia con uno zero apposta. Se fosse un vero numero lo
    // zero sparirebbe (04821 -> 4821): e' il motivo vero per cui in un modello
    // reale un codice cosi' si scrive sempre come testo, mai come numero.
    // L'apice iniziale e' la stessa convenzione di Excel per forzare il testo:
    // il motore lo toglie e tiene lo zero, esattamente come farebbe Excel.
    const codiceCliente = `'0${r.int(1000, 9899)}`;

    // Vero numero: un peso, a una cifra decimale, mai tondo per costruzione.
    const pesoKg = Math.round((8 + r.next() * 34) * 10) / 10;

    // Data ordine, negli ultimi due anni. E' un numero sotto la formattazione:
    // per questo si allinea a destra come pesoKg, non a sinistra come il codice.
    const anno = 2025 + r.int(0, 1);
    const mese = r.int(1, 12);
    const giorno = r.int(1, 28);
    const dataOrdineSerial = excelSerial(anno, mese, giorno);
    const dataText = `${pad2(giorno)}/${pad2(mese)}/${anno}`;

    const consegnato = r.bool();

    // Cinque articoli, ordine diverso a ogni seed.
    const articoli = r.shuffle(ARTICOLI_POOL()).slice(0, 5);
    const quantitaVere = Array.from({ length: 5 }, () => r.int(24, 380));
    // Una delle cinque quantita' diventa testo: stesso numero, ma forzato a testo
    // con l'apice iniziale, come capita quando una colonna arriva gia' formattata
    // come testo da un gestionale o da un file importato.
    const indiceTesto = r.int(0, 4);
    const colonnaQuantita: (number | string)[] = quantitaVere.map((q, i) =>
      i === indiceTesto ? `'${q}` : q,
    );
    const totaleQuantitaVere = quantitaVere.reduce((acc, q, i) => (i === indiceTesto ? acc : acc + q), 0);

    // Versione senza l'apice, solo per il testo del brief: l'apice e' una
    // convenzione di digitazione, non fa parte del valore che l'utente legge.
    const codiceClienteVisibile = codiceCliente.slice(1);

    const tasks = [
      {
        id: 'T1',
        prompt:
          tx('M0A-04-TIPIDATO.9'),
        targetCell: 'Model!B8',
        check: [{ kind: 'text' as const, expected: 'B3' }],
        skills: ['xl.datatypes'],
        minKeystrokes: 3,
      },
      {
        id: 'T2',
        prompt:
          tx('M0A-04-TIPIDATO.10'),
        targetCell: 'Model!B9',
        check: [{ kind: 'text' as const, expected: 'B4' }],
        skills: ['xl.datatypes'],
        minKeystrokes: 3,
      },
      {
        id: 'T3',
        prompt:
          tx('M0A-04-TIPIDATO.11'),
        targetCell: 'Model!B10',
        check: [{ kind: 'text' as const, expected: 'B5' }],
        skills: ['xl.datatypes', 'xl.dates-serial'],
        minKeystrokes: 3,
      },
      taskFormula({
        id: 'T4',
        prompt:
          tx('M0A-04-TIPIDATO.12'),
        target: 'Model!B19',
        atteso: totaleQuantitaVere,
        referenzia: ['B13', 'B14', 'B15', 'B16', 'B17'],
        senzaLiteral: [],
        skills: ['xl.aggregates', 'xl.datatypes'],
        minKeystrokes: 13,
      }),
    ];

    return {
      templateId: 'M0A-04-TIPIDATO',
      seed: rng.seed,
      brief: [tx('M0A-04-TIPIDATO.13', { codiceClienteVisibile, p1: num(pesoKg, 1), dataText, p3: consegnato ? 'si\'' : 'no' })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0A-04-TIPIDATO.14')], { style: STILE_TITOLO }),

            blocco('A3', [[tx('M0A-04-TIPIDATO.15')], [tx('M0A-04-TIPIDATO.16')], [tx('M0A-04-TIPIDATO.17')], [tx('M0A-04-TIPIDATO.26')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('B3', [[codiceCliente]], { style: STILE_INPUT }),
            blocco('B4', [[pesoKg]], { style: STILE_PESO }),
            blocco('B5', [[dataOrdineSerial]], { style: STILE_DATA }),
            blocco('B6', [[consegnato]], { style: STILE_INPUT }),

            blocco(
              'A8',
              [
                [tx('M0A-04-TIPIDATO.18')],
                [tx('M0A-04-TIPIDATO.19')],
                [tx('M0A-04-TIPIDATO.20')],
              ],
              { style: STILE_ETICHETTA },
            ),

            riga('A12', [tx('M0A-04-TIPIDATO.27'), tx('M0A-04-TIPIDATO.28')], { style: STILE_TITOLO }),
            colonna('A13', articoli, { style: STILE_ETICHETTA }),
            colonna('B13', colonnaQuantita, { style: STILE_INPUT }),

            blocco('A19', [[tx('M0A-04-TIPIDATO.21')]], { style: STILE_ETICHETTA }),

            areaLibera(['B8', 'B9', 'B10', 'B19']),
          ],
          { colWidths: { A: 280, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0A-04-TIPIDATO.22'),
          8,
          'T1',
        ),
        hint('H2', tx('M0A-04-TIPIDATO.23'), 8, 'T2'),
        hint('H3', tx('M0A-04-TIPIDATO.24'), 8, 'T3'),
        hint('H4', tx('M0A-04-TIPIDATO.25'), 10, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: 'Model!B8',
    };
  },
});
