/**
 * M0-C · 01 — INDEX/MATCH: perche' non si usa VLOOKUP.
 *
 * Il punto didattico e' T2, e non e' "impara un'altra funzione di ricerca":
 * VLOOKUP punta alla colonna dei risultati con un INDICE NUMERICO fisso
 * ("prendi la seconda colonna del range"). Se qualcuno inserisce una colonna
 * in mezzo alla tabella — capita in ogni modello vero, che cresce riga dopo
 * riga di revisione — quell'indice smette di indicare cio' che indicava senza
 * che Excel segnali niente: nessun #REF!, nessun errore a video, solo un
 * numero sbagliato che sembra plausibile. INDEX/MATCH non ha questo problema
 * perche' non conta le colonne: MATCH trova la posizione del nome dentro il
 * suo elenco, INDEX preleva da quella stessa posizione dentro il range dei
 * valori. Se una colonna si inserisce in mezzo, entrambi i range si spostano
 * insieme a lei, e la formula resta corretta.
 *
 * T1 isola MATCH da solo (la posizione e' un numero che si puo' verificare a
 * occhio contando le righe): senza questo passaggio T2 sarebbe una formula
 * imparata a memoria, non capita pezzo per pezzo.
 */

import {
  defineTemplate,
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

const CLIENTI = [
  'Meccanica Bolognese Srl',
  'Ferramenta Adriatica Spa',
  'Tessile Comasca Srl',
  'Chimica Vicentina Spa',
  'Packaging Lombardo Srl',
  'Elettronica Piemontese Spa',
  'Logistica Pugliese Srl',
  'Agroalimentare Siciliana Srl',
] as const;

const DATA_START = 4;

export default defineTemplate({
  id: 'M0C-01-INDEXMATCH',
  module: 'M0-C',
  title: 'Cercare per nome, non per indice',
  rank: 2,
  mode: 'GUIDED',
  estimatedSeconds: 240,
  skills: ['xl.index-match', 'xl.match-exact'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // 6-8 clienti distinti, ordine mescolato: la posizione nell'elenco non
    // deve essere prevedibile dal nome.
    const n = r.int(6, 8);
    const clienti = r.shuffle(CLIENTI).slice(0, n);
    const fatturati = clienti.map(() => roundTo(triangular(r, 180_000, 650_000, 2_400_000), 5_000));

    const dataEnd = DATA_START + n - 1;
    const queryRow = dataEnd + 2;
    const matchRow = queryRow + 1;
    const resultRow = queryRow + 2;

    const targetIdx = r.int(0, n - 1);
    const clienteCercato = clienti[targetIdx];
    const posizioneAttesa = targetIdx + 1; // MATCH e' 1-based
    const fatturatoAtteso = fatturati[targetIdx];

    const colNomi = `A${DATA_START}`;
    const colValori = `B${DATA_START}`;
    const celQuery = `B${queryRow}`;
    const celMatch = `B${matchRow}`;
    const celResult = `B${resultRow}`;

    const t1: Task = {
      id: 'T1',
      prompt:
        `In ${celMatch} usa MATCH per trovare a che riga della tabella si trova il cliente scritto in ${celQuery}, ` +
        `cercandolo nell'elenco ${colNomi}:A${dataEnd}. Il risultato e' un numero di posizione (1 = prima riga della ` +
        "tabella, non riga 1 del foglio): usa 0 come terzo argomento per pretendere una corrispondenza esatta.",
      targetCell: `Model!${celMatch}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: posizioneAttesa,
          message: 'La posizione non torna: conta le righe della tabella a partire dalla prima, non dalla riga del foglio.',
        },
        { kind: 'mustReference', cells: [celQuery, colNomi] },
        { kind: 'mustUseFunction', functions: ['MATCH'] },
        { kind: 'mustNotUseFunction', functions: ['VLOOKUP'] },
      ],
      skills: ['xl.match-exact'],
      minKeystrokes: 20,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        `In ${celResult} recupera il fatturato del cliente cercato, in un'unica formula: INDEX sul range dei ` +
        `fatturati (${colValori}:B${dataEnd}), con dentro il MATCH che restituisce la posizione del nome in ${celQuery} ` +
        `dentro l'elenco dei clienti (${colNomi}:A${dataEnd}). Niente VLOOKUP: qui l'indice di colonna non serve.`,
      targetCell: `Model!${celResult}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: fatturatoAtteso,
          message: "Il fatturato non corrisponde a quello del cliente cercato: controlla che INDEX legga dal range dei fatturati e MATCH dal range dei nomi, nello stesso ordine.",
        },
        { kind: 'mustReference', cells: [colValori, colNomi, celQuery] },
        { kind: 'mustUseFunction', functions: ['INDEX', 'MATCH'], quantifier: 'all' },
        { kind: 'mustNotUseFunction', functions: ['VLOOKUP'] },
      ],
      skills: ['xl.index-match'],
      minKeystrokes: 30,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0C-01-INDEXMATCH',
      seed: rng.seed,
      brief: [
        '## Perche\' non si usa VLOOKUP',
        '',
        `Sotto c'e' l'elenco fatturato dei ${num_(n)} clienti di quest'anno, con il fatturato annuo di ciascuno.`,
        `Ti serve il fatturato di un cliente preciso: **${clienteCercato}**, scritto in ${celQuery}.`,
        '',
        '`VLOOKUP(valore_cercato, tabella, indice_colonna, 0)` funziona cercando il nome nella prima',
        "colonna e prendendo il valore dalla colonna numero `indice_colonna` — un numero fisso, contato a mano.",
        "Il problema arriva il giorno in cui qualcuno inserisce una colonna in mezzo alla tabella (`Settore`,",
        "`Regione`, qualunque cosa): la tabella slitta, ma quell'indice resta lo stesso numero. VLOOKUP continua",
        "a prendere la colonna sbagliata, senza nessun errore a video — il foglio sembra funzionare e mente.",
        "E' cosi' che un modello produce il numero sbagliato in riunione, con tutti convinti che sia quello giusto.",
        '',
        '`MATCH(valore_cercato, elenco, 0)` risolve solo meta\' del problema: trova **la posizione** del nome',
        "dentro il suo elenco (il terzo argomento a 0 pretende una corrispondenza esatta, non approssimata).",
        '`INDEX(range, posizione)` preleva il valore che sta a quella posizione dentro **un altro range**.',
        '',
        "Messi insieme, `INDEX(range_valori, MATCH(nome_cercato, range_nomi, 0))` non contano mai colonne:",
        "se una colonna si inserisce in mezzo, sia il range dei nomi sia il range dei valori si spostano",
        "insieme a lei, e la formula resta corretta senza che tu la debba toccare.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Fatturato clienti'], { style: STILE_TITOLO }),
            riga('A3', ['Cliente', 'Fatturato annuo (€)'], { style: STILE_TITOLO }),
            colonna(colNomi, clienti, { style: STILE_ETICHETTA }),
            colonna(colValori, fatturati, { style: { ...STILE_INPUT, numFmt: '#,##0' } }),
            riga(`A${queryRow}`, ['Cliente da cercare'], { style: STILE_ETICHETTA }),
            riga(celQuery, [clienteCercato], { style: STILE_INPUT }),
            riga(`A${matchRow}`, ["Posizione nell'elenco (MATCH)"], { style: STILE_ETICHETTA }),
            riga(`A${resultRow}`, ['Fatturato trovato (INDEX + MATCH)'], { style: STILE_ETICHETTA }),
            areaLibera([celMatch, celResult]),
          ],
          { colWidths: { A: 260, B: 170 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `MATCH(${celQuery}, ${colNomi}:A${dataEnd}, 0). Lo zero finale vuol dire "solo corrispondenza esatta".`, 10, 'T1'),
        hint('H2', "Il risultato di MATCH e' la posizione DENTRO l'elenco, non la riga del foglio: se il cliente e' il terzo della tabella, MATCH restituisce 3 anche se quella riga e' la numero 6.", 8, 'T1'),
        hint('H3', `INDEX(${colValori}:B${dataEnd}, MATCH(${celQuery}, ${colNomi}:A${dataEnd}, 0)): incolla dentro INDEX lo stesso MATCH che hai gia' scritto in ${celMatch}.`, 12, 'T2'),
        hint('H4', "Se il risultato e' #N/A, il nome cercato non e' scritto esattamente come in tabella: maiuscole e spazi non contano, ma un carattere diverso si'.", 8, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!${celMatch}`,
    };
  },
});

/** Numero di clienti come parola, per non far leggere "6 clienti" con la cifra dentro `num()`. */
function num_(n: number): string {
  const parole: Record<number, string> = { 6: 'sei', 7: 'sette', 8: 'otto' };
  return parole[n] ?? String(n);
}
