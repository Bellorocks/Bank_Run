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

export default defineTemplate({
  id: 'M0B-03-LOGICI',
  module: 'M0-B',
  title: 'AND, OR, NOT: piu\' criteri insieme',
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
          'In B13 scrivi una formula con AND che dia VERO solo se ENTRAMBI i criteri sono ' +
          'soddisfatti: il punteggio (B2) e\' maggiore o uguale alla soglia (B7), E il fatturato ' +
          '(B3) e\' maggiore o uguale alla soglia (B8). Se anche uno solo dei due manca, il target ' +
          'non e\' idoneo.',
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
          'In B14 scrivi una formula con OR che dia VERO se ALMENO UNO dei due allarmi scatta: ' +
          'il margine EBITDA (B4) e\' sotto la soglia minima (B9), OPPURE la leva (B5) e\' sopra la ' +
          'soglia massima (B10). Basta un solo criterio a rischio per finire in rosso.',
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
          'In B15 scrivi una formula con NOT che sia VERO esattamente quando il target NON e\' ' +
          'idoneo. Non ricalcolare i quattro criteri da capo: B13 il verdetto di idoneita\' lo ha ' +
          'gia\', a te serve solo il suo contrario.',
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
      brief: [
        '## Quando un confronto solo non basta',
        '',
        'Un comitato investimenti non decide mai su un numero isolato. I criteri si combinano:',
        '"idoneo se il punteggio regge **e** il fatturato regge", "in allerta se il margine cede',
        '**oppure** la leva sfonda". `AND`, `OR` e `NOT` vivono dentro la condizione, esattamente',
        'come un confronto singolo: restituiscono VERO o FALSO, non cambiano niente altro.',
        '',
        '- `AND(criterio1,criterio2,...)` e\' VERO solo se **ogni** criterio e\' vero.',
        '- `OR(criterio1,criterio2,...)` e\' VERO se **almeno uno** dei criteri e\' vero.',
        '- `NOT(condizione)` inverte cio\' che trova: VERO diventa FALSO, e viceversa.',
        '',
        `Il target di oggi opera nel settore ${settore}. Il comitato gli ha assegnato un punteggio`,
        `qualitativo di **${num(punteggio)}/100** (soglia minima: ${num(sogliaPunteggio)}/100) e ha`,
        `verificato un fatturato di **${eur(fatturato)}** (soglia minima: ${eur(sogliaFatturato)}).`,
        `Il margine EBITDA e\' **${pct(margine)}** (soglia minima: ${pct(sogliaMargine)}), la leva`,
        `Debito/EBITDA e\' **${multiplo(leva)}x** (soglia massima: ${multiplo(sogliaLeva)}x).`,
        '',
        'Da questi otto numeri costruisci tre verdetti: idoneita\' (serve tutto), allerta (basta',
        'poco) ed esclusione (il contrario dell\'idoneita\', senza rifare i conti).',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Test di idoneita\' — criteri combinati'], { style: STILE_TITOLO }),

            blocco(
              'A2',
              [
                ['Punteggio qualitativo (0-100)'],
                ['Fatturato'],
                ['Margine EBITDA'],
                ['Leva (Debito/EBITDA)'],
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[punteggio]], { style: { ...STILE_INPUT, numFmt: '0' } }),
            blocco('B3', [[fatturato]], { style: STILE_INPUT }),
            blocco('B4', [[margine]], { style: STILE_INPUT_PCT }),
            blocco('B5', [[leva]], { style: STILE_INPUT_MULTIPLO }),

            riga('A6', ['Soglie del comitato'], { style: STILE_TITOLO }),
            blocco(
              'A7',
              [
                ['Soglia minima punteggio'],
                ['Soglia minima fatturato'],
                ['Soglia minima margine EBITDA'],
                ['Soglia massima leva'],
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B7', [[sogliaPunteggio]], { style: { ...STILE_INPUT, numFmt: '0' } }),
            blocco('B8', [[sogliaFatturato]], { style: STILE_INPUT }),
            blocco('B9', [[sogliaMargine]], { style: STILE_INPUT_PCT }),
            blocco('B10', [[sogliaLeva]], { style: STILE_INPUT_MULTIPLO }),

            riga('A12', ['Verdetti'], { style: STILE_TITOLO }),
            blocco(
              'A13',
              [
                ['Idoneo (punteggio E fatturato sopra soglia)'],
                ['In rosso (margine O leva fuori soglia)'],
                ['Escluso (il contrario di idoneo)'],
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
          'AND(B2>=B7,B3>=B8): due confronti, separati da una virgola, dentro le parentesi di AND.',
          10,
          'T1',
        ),
        hint(
          'H2',
          'OR(B4<B9,B5>B10): stessa forma di AND, cambia solo il nome della funzione e il fatto che ne basta uno vero.',
          10,
          'T2',
        ),
        hint('H3', 'NOT(B13): B13 e\' gia\' un VERO/FALSO, NOT si limita a girarlo.', 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: 'Model!B13',
    };
  },
});
