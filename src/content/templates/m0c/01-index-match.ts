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

import { tx } from '../../../i18n/content';
const CLIENTI = () => ([
  tx('M0C-01-INDEXMATCH.1'),
  tx('M0C-01-INDEXMATCH.2'),
  tx('M0C-01-INDEXMATCH.3'),
  tx('M0C-01-INDEXMATCH.4'),
  tx('M0C-01-INDEXMATCH.5'),
  tx('M0C-01-INDEXMATCH.6'),
  tx('M0C-01-INDEXMATCH.7'),
  tx('M0C-01-INDEXMATCH.8'),
] as const);

const DATA_START = 4;

export default defineTemplate({
  id: 'M0C-01-INDEXMATCH',
  module: 'M0-C',
  get title() {
    return tx('M0C-01-INDEXMATCH.title');
  },
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
    const clienti = r.shuffle(CLIENTI()).slice(0, n);
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
        tx('M0C-01-INDEXMATCH.10', { celMatch, celQuery, colNomi, dataEnd }),
      targetCell: `Model!${celMatch}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: posizioneAttesa,
          message: tx('M0C-01-INDEXMATCH.11'),
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
        tx('M0C-01-INDEXMATCH.12', { celResult, colValori, dataEnd, celQuery, colNomi }),
      targetCell: `Model!${celResult}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: fatturatoAtteso,
          message: tx('M0C-01-INDEXMATCH.13'),
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
      brief: [tx('M0C-01-INDEXMATCH.14', { p0: num_(n), clienteCercato, celQuery })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0C-01-INDEXMATCH.15')], { style: STILE_TITOLO }),
            riga('A3', [tx('M0C-01-INDEXMATCH.24'), tx('M0C-01-INDEXMATCH.16')], { style: STILE_TITOLO }),
            colonna(colNomi, clienti, { style: STILE_ETICHETTA }),
            colonna(colValori, fatturati, { style: { ...STILE_INPUT, numFmt: '#,##0' } }),
            riga(`A${queryRow}`, [tx('M0C-01-INDEXMATCH.17')], { style: STILE_ETICHETTA }),
            riga(celQuery, [clienteCercato], { style: STILE_INPUT }),
            riga(`A${matchRow}`, [tx('M0C-01-INDEXMATCH.18')], { style: STILE_ETICHETTA }),
            riga(`A${resultRow}`, [tx('M0C-01-INDEXMATCH.19')], { style: STILE_ETICHETTA }),
            areaLibera([celMatch, celResult]),
          ],
          { colWidths: { A: 260, B: 170 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M0C-01-INDEXMATCH.20', { celQuery, colNomi, dataEnd }), 10, 'T1'),
        hint('H2', tx('M0C-01-INDEXMATCH.21'), 8, 'T1'),
        hint('H3', tx('M0C-01-INDEXMATCH.22', { colValori, dataEnd, celQuery, colNomi, celMatch }), 12, 'T2'),
        hint('H4', tx('M0C-01-INDEXMATCH.23'), 8, 'T2'),
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
