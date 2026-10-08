/**
 * M0-C · 04 — SUMPRODUCT: la somma di prodotti, e il suo secondo mestiere.
 *
 * Due punti didattici, entrambi con la stessa funzione:
 *  - T1 e' il mestiere ovvio: fatturato = quantita' per prezzo, riga per riga,
 *    sommato in un colpo solo. Il punto non e' che SUMPRODUCT sappia farlo —
 *    e' che lo fa SENZA una colonna di supporto con i prodotti gia' calcolati.
 *    Chi arriva da un foglio con quella colonna E in piu' non ha sbagliato
 *    aritmetica: ha aggiunto un pezzo di modello che nessuno chiedera' mai
 *    di vedere in un report.
 *  - T2 e' il mestiere meno ovvio: (range="X")*1 trasforma un confronto
 *    VERO/FALSO in un array di 1 e 0, e SUMPRODUCT di quell'array conta le
 *    righe che soddisfano la condizione — lo stesso risultato di COUNTIF,
 *    costruito pero' con gli stessi due mattoni (array, prodotto, somma) del
 *    task precedente. Per questo T2 vieta esplicitamente COUNTIF: la lezione
 *    non e' "conta quelle righe", e' "SUMPRODUCT sa anche contare".
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
  eur,
  num,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const PRODOTTI = () => ([
  tx('M0C-04-SUMPRODUCT.1'),
  tx('M0C-04-SUMPRODUCT.2'),
  tx('M0C-04-SUMPRODUCT.3'),
  tx('M0C-04-SUMPRODUCT.4'),
  tx('M0C-04-SUMPRODUCT.5'),
  tx('M0C-04-SUMPRODUCT.motoriduttori'),
  tx('M0C-04-SUMPRODUCT.6'),
  tx('M0C-04-SUMPRODUCT.7'),
  tx('M0C-04-SUMPRODUCT.8'),
  tx('M0C-04-SUMPRODUCT.9'),
  tx('M0C-04-SUMPRODUCT.10'),
  tx('M0C-04-SUMPRODUCT.11'),
] as const);

const CANALI = () => ([tx('M0C-04-SUMPRODUCT.retail'), tx('M0C-04-SUMPRODUCT.grossisti'), tx('M0C-04-SUMPRODUCT.export')] as const);

export default defineTemplate({
  id: 'M0C-04-SUMPRODUCT',
  module: 'M0-C',
  get title() {
    return tx('M0C-04-SUMPRODUCT.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['xl.sumproduct', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const n = r.int(6, 10);
    const prodotti = r.shuffle(PRODOTTI()).slice(0, n);
    const canali = prodotti.map(() => r.pick(CANALI()));
    const quantita = prodotti.map(() => r.int(20, 480));
    const prezzi = prodotti.map(() => roundTo(triangular(r, 15, 60, 250), 0.5));

    // Il canale bersaglio del task 2: deve comparire ma non deve coprire tutte
    // le righe, altrimenti il conteggio condizionale collassa nel banale "tutte".
    let canaleTarget: (ReturnType<typeof CANALI>)[number] = canali[0];
    let conteggioTarget = canali.filter((c) => c === canaleTarget).length;
    if (conteggioTarget === n) {
      const altri = CANALI().filter((c) => c !== canaleTarget);
      canali[n - 1] = r.pick(altri);
      canaleTarget = canali[0];
      conteggioTarget = canali.filter((c) => c === canaleTarget).length;
    }

    const fatturatoTotale = quantita.reduce((acc, q, i) => acc + q * prezzi[i], 0);

    const HEADER_ROW = 3;
    const DATA_START = 4;
    const dataEnd = DATA_START + n - 1;
    const riepilogoRow = dataEnd + 2;
    const t1Row = riepilogoRow + 1;
    const t2Row = t1Row + 1;

    const rangeQuantita = `C${DATA_START}:C${dataEnd}`;
    const rangePrezzi = `D${DATA_START}:D${dataEnd}`;
    const rangeCanali = `B${DATA_START}:B${dataEnd}`;

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0C-04-SUMPRODUCT.13', { t1Row, p1: num(n) }),
      targetCell: `Model!B${t1Row}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: fatturatoTotale },
        { kind: 'mustReference', cells: [`C${DATA_START}`, `C${dataEnd}`, `D${DATA_START}`, `D${dataEnd}`] },
        { kind: 'mustNotContainLiteral', except: [] },
        { kind: 'mustUseFunction', functions: ['SUMPRODUCT'] },
      ],
      skills: ['xl.sumproduct'],
      minKeystrokes: 24,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0C-04-SUMPRODUCT.14', { t2Row, canaleTarget }),
      targetCell: `Model!B${t2Row}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: conteggioTarget,
          message:
            tx('M0C-04-SUMPRODUCT.15', { rangeCanali, canaleTarget }),
        },
        { kind: 'mustReference', cells: [`B${DATA_START}`, `B${dataEnd}`] },
        { kind: 'mustUseFunction', functions: ['SUMPRODUCT'] },
        { kind: 'mustNotUseFunction', functions: ['COUNTIF'] },
      ],
      skills: ['xl.sumproduct'],
      minKeystrokes: 30,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0C-04-SUMPRODUCT',
      seed: rng.seed,
      brief: [tx('M0C-04-SUMPRODUCT.16', { p0: num(n) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0C-04-SUMPRODUCT.17')], { style: STILE_TITOLO }),
            riga(
              `A${HEADER_ROW}`,
              [tx('M0C-04-SUMPRODUCT.18'), tx('M0C-04-SUMPRODUCT.26'), tx('M0C-04-SUMPRODUCT.19'), tx('M0C-04-SUMPRODUCT.20')],
              { style: STILE_TITOLO },
            ),
            colonna(`A${DATA_START}`, prodotti, { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, canali, { style: STILE_ETICHETTA }),
            colonna(`C${DATA_START}`, quantita, { style: STILE_INPUT }),
            colonna(`D${DATA_START}`, prezzi, { style: { ...STILE_INPUT, numFmt: '#,##0.0' } }),

            riga(`A${riepilogoRow}`, [tx('M0C-04-SUMPRODUCT.27')], { style: STILE_TITOLO }),
            blocco(`A${t1Row}`, [[tx('M0C-04-SUMPRODUCT.21')]], { style: STILE_ETICHETTA }),
            blocco(`A${t2Row}`, [[tx('M0C-04-SUMPRODUCT.22', { canaleTarget })]], { style: STILE_ETICHETTA }),

            areaLibera([`B${t1Row}`, `B${t2Row}`]),
          ],
          { colWidths: { A: 250, B: 150, C: 130, D: 170 }, frozenRows: HEADER_ROW },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0C-04-SUMPRODUCT.23', { rangeQuantita, rangePrezzi }),
          12,
          'T1',
        ),
        hint(
          'H2',
          tx('M0C-04-SUMPRODUCT.24', { rangeCanali, canaleTarget }),
          14,
          'T2',
        ),
        hint('H3', tx('M0C-04-SUMPRODUCT.25', { p0: eur(fatturatoTotale), p1: num(n) }), 8, 'T1'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!B${t1Row}`,
    };
  },
});
