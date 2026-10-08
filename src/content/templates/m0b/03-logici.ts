/**
 * M0-B · 03 — AND, OR, NOT dentro una condizione.
 *
 * Il punto didattico non e' IF (quello e' il prerequisito): e' che un criterio
 * vero raramente dipende da un numero solo. Un comitato investimenti scrive
 * "idoneo se il punteggio supera la soglia E il fatturato supera la soglia",
 * non "idoneo se il punteggio supera la soglia" e basta. AND, OR, NOT vivono
 * dentro la condizione, non al posto suo: restituiscono VERO/FALSO esattamente
 * come un confronto singolo, e per questo si combinano con IF senza frizioni.
 *
 * Tre task, tre funzioni, tre forme dell'errore:
 *  - AND: idoneo solo se OGNI criterio regge (T1).
 *  - OR: in allerta se ANCHE UN SOLO criterio scatta (T2).
 *  - NOT: capovolgere un risultato gia' calcolato invece di rifare il lavoro
 *    da capo — l'abitudine che distingue chi ha capito i riferimenti da chi
 *    conosce solo la sintassi (T3).
 *
 * I numeri vengono da due estrazioni indipendenti per ogni criterio (il dato e
 * la sua soglia), cosi' l'esito logico non e' mai scontato: al variare del seed
 * capitano tutte e quattro le combinazioni di vero/falso.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  eur,
  multiplo,
  num,
  pct,
} from '../../authoring';
import { revenue, ebitdaMargin, leverage, SECTORS } from '../../../rng/finance';
import type { Task } from '../../types';

import { sectorName, tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0B-03-LOGICI',
  module: 'M0-B',
  get title() {
    return tx('M0B-03-LOGICI.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['xl.logical'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');
    const settore = r.pick(SECTORS);

    // Punteggio qualitativo del comitato: 0-100, non e' un dato di finance.ts
    // perche' non ha un'unita' di misura reale, e' un voto interno.
    const punteggio = r.int(35, 92);
    const sogliaPunteggio = r.int(45, 85);

    // Due estrazioni indipendenti per fatturato e soglia: non e' il fatturato
    // confrontato con una sua frazione, sono due aziende diverse messe a
    // paragone, esattamente come in un vero screening di deal flow.
    const fatturato = revenue(r.fork('fatturato'));
    const sogliaFatturato = revenue(r.fork('soglia-fatturato'));

    const margine = ebitdaMargin(r.fork('margine'), settore);
    const sogliaMargine = ebitdaMargin(r.fork('soglia-margine'), settore);

    const leva = leverage(r.fork('leva'));
    const sogliaLeva = leverage(r.fork('soglia-leva'));

    const idoneo = punteggio >= sogliaPunteggio && fatturato >= sogliaFatturato;
    const inRosso = margine < sogliaMargine || leva > sogliaLeva;
    const escluso = !idoneo;

    const tasks: Task[] = [
      {
        id: 'T1',
        prompt:
          tx('M0B-03-LOGICI.2'),
        targetCell: 'Model!B13',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'boolean' as const, expected: idoneo },
          { kind: 'mustReference' as const, cells: ['B2', 'B7', 'B3', 'B8'] },
          { kind: 'mustUseFunction' as const, functions: ['AND'] },
        ],
        skills: ['xl.logical'],
        minKeystrokes: 28,
      },
      {
        id: 'T2',
        prompt:
          tx('M0B-03-LOGICI.3'),
        targetCell: 'Model!B14',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'boolean' as const, expected: inRosso },
          { kind: 'mustReference' as const, cells: ['B4', 'B9', 'B5', 'B10'] },
          { kind: 'mustUseFunction' as const, functions: ['OR'] },
        ],
        skills: ['xl.logical'],
        minKeystrokes: 24,
      },
      {
        id: 'T3',
        prompt:
          tx('M0B-03-LOGICI.4'),
        targetCell: 'Model!B15',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'boolean' as const, expected: escluso },
          { kind: 'mustReference' as const, cells: ['B13'] },
          { kind: 'mustUseFunction' as const, functions: ['NOT'] },
        ],
        skills: ['xl.logical'],
        minKeystrokes: 8,
      },
    ];

    return {
      templateId: 'M0B-03-LOGICI',
      seed: rng.seed,
      brief: [tx('M0B-03-LOGICI.5', { settore: sectorName(settore), p1: num(punteggio), p2: num(sogliaPunteggio), p3: eur(fatturato), p4: eur(sogliaFatturato), p5: pct(margine), p6: pct(sogliaMargine), p7: multiplo(leva), p8: multiplo(sogliaLeva) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0B-03-LOGICI.6')], { style: STILE_TITOLO }),

            blocco(
              'A2',
              [
                [tx('M0B-03-LOGICI.7')],
                [tx('M0B-03-LOGICI.21')],
                [tx('M0B-03-LOGICI.8')],
                [tx('M0B-03-LOGICI.9')],
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[punteggio]], { style: { ...STILE_INPUT, numFmt: '0' } }),
            blocco('B3', [[fatturato]], { style: STILE_INPUT }),
            blocco('B4', [[margine]], { style: STILE_INPUT_PCT }),
            blocco('B5', [[leva]], { style: STILE_INPUT_MULTIPLO }),

            riga('A6', [tx('M0B-03-LOGICI.10')], { style: STILE_TITOLO }),
            blocco(
              'A7',
              [
                [tx('M0B-03-LOGICI.11')],
                [tx('M0B-03-LOGICI.12')],
                [tx('M0B-03-LOGICI.13')],
                [tx('M0B-03-LOGICI.14')],
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B7', [[sogliaPunteggio]], { style: { ...STILE_INPUT, numFmt: '0' } }),
            blocco('B8', [[sogliaFatturato]], { style: STILE_INPUT }),
            blocco('B9', [[sogliaMargine]], { style: STILE_INPUT_PCT }),
            blocco('B10', [[sogliaLeva]], { style: STILE_INPUT_MULTIPLO }),

            riga('A12', [tx('M0B-03-LOGICI.22')], { style: STILE_TITOLO }),
            blocco(
              'A13',
              [
                [tx('M0B-03-LOGICI.15')],
                [tx('M0B-03-LOGICI.16')],
                [tx('M0B-03-LOGICI.17')],
              ],
              { style: STILE_ETICHETTA },
            ),
            areaLibera(['B13', 'B14', 'B15']),
          ],
          { colWidths: { A: 300, B: 120 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0B-03-LOGICI.18'),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0B-03-LOGICI.19'),
          10,
          'T2',
        ),
        hint('H3', tx('M0B-03-LOGICI.20'), 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: 'Model!B13',
    };
  },
});
