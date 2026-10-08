/**
 * M0-A · 03 — SUM e famiglia: aggregare una colonna di numeri.
 *
 * Il punto didattico non e' SUM (quello si intuisce in trenta secondi): e' che
 * COUNT e COUNTA non sono la stessa funzione con un nome diverso. Per farlo
 * vedere serve una tabella con un buco vero — una cella lasciata vuota — e una
 * cella che non e' vuota ma non e' nemmeno un numero, una nota scritta a mano.
 * Solo li' la differenza smette di essere una frase nel brief e diventa un
 * numero diverso in due celle affiancate.
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
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

const CATEGORIE = [
  'Affitto ufficio',
  'Utenze (luce, gas, acqua)',
  'Licenze software',
  'Consulenze legali',
  'Trasferte commerciali',
  'Manutenzione impianti',
  'Formazione del personale',
  'Spese di rappresentanza',
] as const;

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
] as const;

const NOTE = [
  'in attesa di fattura',
  "da confermare con l'amministrazione",
  'verificare con il fornitore',
  'importo non ancora comunicato',
] as const;

const RANGE = 'B4:B11';

/** Task di aggregazione: stessa forma per tutte e sei le funzioni della famiglia. */
function taskAggregato(args: {
  id: string;
  prompt: string;
  target: string;
  atteso: number;
  funzione: string;
  skills: readonly string[];
  minKeystrokes: number;
}): Task {
  return {
    id: args.id,
    prompt: args.prompt,
    targetCell: args.target,
    check: [
      { kind: 'mustBeFormula' as const },
      { kind: 'value' as const, expected: args.atteso },
      { kind: 'mustReference' as const, cells: ['B4', 'B11'] },
      { kind: 'mustUseFunction' as const, functions: [args.funzione] },
    ],
    skills: args.skills,
    minKeystrokes: args.minKeystrokes,
  };
}

export default defineTemplate({
  id: 'M0A-03-AGGREGAZIONI',
  module: 'M0-A',
  title: 'SUM e famiglia',
  rank: 1,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.aggregates', 'xl.datatypes'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');
    const mese = r.pick(MESI);

    // Una voce resta senza importo (cella vuota) e una ha solo una nota (testo,
    // non un numero): sono le due eccezioni che rendono COUNT e COUNTA diversi
    // per davvero, non solo sulla carta.
    const posVuota = r.int(0, CATEGORIE.length - 1);
    let posNota = r.int(0, CATEGORIE.length - 1);
    while (posNota === posVuota) posNota = r.int(0, CATEGORIE.length - 1);
    const nota = r.pick(NOTE);

    const numeri: number[] = [];
    const valori: (number | string | null)[] = CATEGORIE.map((_cat, i) => {
      if (i === posVuota) return null;
      if (i === posNota) return nota;
      const importo = roundTo(triangular(r, 250, 1500, 9200), 5);
      numeri.push(importo);
      return importo;
    });

    const somma = numeri.reduce((a, b) => a + b, 0);
    const media = somma / numeri.length;
    const minimo = Math.min(...numeri);
    const massimo = Math.max(...numeri);
    const conteggioNumeri = numeri.length;
    const conteggioCompilate = numeri.length + 1; // + la voce con solo la nota

    const tasks = [
      taskAggregato({
        id: 'T1',
        prompt:
          `In B13 calcola il totale delle spese di ${mese}: somma tutti gli importi della tabella con un'unica funzione, senza sommarli a mano uno per uno.`,
        target: 'Model!B13',
        atteso: somma,
        funzione: 'SUM',
        skills: ['xl.aggregates'],
        minKeystrokes: 12,
      }),
      taskAggregato({
        id: 'T2',
        prompt: 'In B14 calcola la spesa media per voce: la media delle sole celle che contengono davvero un numero.',
        target: 'Model!B14',
        atteso: media,
        funzione: 'AVERAGE',
        skills: ['xl.aggregates'],
        minKeystrokes: 15,
      }),
      taskAggregato({
        id: 'T3',
        prompt: "In B15 trova l'importo piu' basso fra le voci di spesa.",
        target: 'Model!B15',
        atteso: minimo,
        funzione: 'MIN',
        skills: ['xl.aggregates'],
        minKeystrokes: 11,
      }),
      taskAggregato({
        id: 'T4',
        prompt: "In B16 trova l'importo piu' alto fra le voci di spesa.",
        target: 'Model!B16',
        atteso: massimo,
        funzione: 'MAX',
        skills: ['xl.aggregates'],
        minKeystrokes: 11,
      }),
      taskAggregato({
        id: 'T5',
        prompt:
          'In B17 conta quante voci hanno un importo vero e proprio: una cella con solo una nota scritta, o lasciata vuota, non deve contare.',
        target: 'Model!B17',
        atteso: conteggioNumeri,
        funzione: 'COUNT',
        skills: ['xl.aggregates', 'xl.datatypes'],
        minKeystrokes: 13,
      }),
      taskAggregato({
        id: 'T6',
        prompt:
          "In B18 conta quante voci della tabella sono state compilate in qualche modo: qui la nota scritta a mano conta, la cella lasciata vuota no.",
        target: 'Model!B18',
        atteso: conteggioCompilate,
        funzione: 'COUNTA',
        skills: ['xl.aggregates', 'xl.datatypes'],
        minKeystrokes: 14,
      }),
    ];

    return {
      templateId: 'M0A-03-AGGREGAZIONI',
      seed: rng.seed,
      brief: [
        '## SUM non lavora da sola',
        '',
        `Qui sotto trovi le spese di ${mese}, una riga per voce. Sono otto celle, ma non tutte`,
        "contengono un numero: qualcuno in ufficio non ha ancora caricato tutti gli importi.",
        '',
        `**${RANGE}** e' l'intervallo su cui lavorerai per tutto il livello. Le prime quattro`,
        'richieste sono la famiglia che conosci gia\' di nome: `SUM` per il totale, `AVERAGE` per',
        'la media, `MIN` e `MAX` per gli estremi. Tutte e quattro, da sole, ignorano cio\' che non',
        'e\' un numero: non serve dirglielo, e\' cosi\' che sono fatte.',
        '',
        'Le ultime due sono quelle che sembrano uguali e non lo sono. `COUNT` conta **solo i',
        'numeri**. `COUNTA` conta **tutto cio\' che non e\' vuoto**, numeri e testo insieme. Nella',
        'tabella qui sotto una voce e\' rimasta senza importo — una cella vuota — e un\'altra ha',
        'solo una nota scritta a mano, non una cifra. Sono l\'una l\'eccezione di COUNT, l\'altra',
        'l\'eccezione di COUNTA: se le due formule ti danno lo stesso numero, una delle due e\'',
        'sbagliata.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [`Spese operative — ${mese}`], { style: STILE_TITOLO }),
            riga('A3', ['Voce di spesa', 'Importo (€)'], { style: STILE_TITOLO }),
            colonna('A4', CATEGORIE, { style: STILE_ETICHETTA }),
            blocco(
              'B4',
              valori.map((v) => [v]),
              { style: STILE_INPUT },
            ),
            riga('A12', ['Riepilogo'], { style: STILE_TITOLO }),
            colonna(
              'A13',
              [
                'Totale spese',
                'Spesa media per voce',
                'Voce di importo minimo',
                'Voce di importo massimo',
                'Numero di importi registrati',
                'Numero di voci compilate',
              ],
              { style: STILE_ETICHETTA },
            ),
            areaLibera(['B13', 'B14', 'B15', 'B16', 'B17', 'B18']),
          ],
          { colWidths: { A: 260, B: 130 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', 'SUM(B4:B11): non serve escludere a mano la cella vuota o quella di testo, SUM lo fa da sola.', 8, 'T1'),
        hint('H2', 'AVERAGE(B4:B11): stessa logica di SUM, divide solo per il numero di celle numeriche trovate.', 8, 'T2'),
        hint('H3', 'MIN(B4:B11).', 6, 'T3'),
        hint('H4', 'MAX(B4:B11).', 6, 'T4'),
        hint('H5', 'COUNT(B4:B11): guarda solo i numeri, salta sia la cella vuota sia quella con la nota.', 10, 'T5'),
        hint('H6', 'COUNTA(B4:B11): guarda tutto cio\' che non e\' vuoto. La nota scritta a mano la fa contare, la cella vuota no.', 10, 'T6'),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: 'Model!B13',
    };
  },
});
