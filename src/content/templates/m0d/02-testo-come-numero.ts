/**
 * M0-D · 02 — Numeri importati come testo.
 *
 * Il punto didattico: una cifra che "sembra" un numero non lo e' per forza. Un
 * export dal gestionale porta dentro Excel valori con una virgola delle migliaia
 * che il foglio non riconosce, o con uno spazio invisibile in coda — e in
 * entrambi i casi la cella resta TESTO, allineata a sinistra invece che a
 * destra. SUM e COUNT la saltano senza mostrare nessun errore: il totale
 * torna un numero plausibile, solo sbagliato. E' l'errore silenzioso piu'
 * pericoloso del modulo, perche' non lascia traccia rossa in nessuna cella.
 *
 * T1 fa toccare con mano il sintomo: la somma "vera" e' quella che SUM produce
 * davvero sui dati sporchi, non quella che sommerebbe una calcolatrice.
 * T2 rende visibile la causa: COUNT conta solo i numeri veri, COUNTA (gia'
 * calcolata accanto, per confronto diretto) conta tutto cio' che non e' vuoto.
 * La differenza fra le due e' la prova che manca qualcosa nel totale.
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
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const FORNITORI = () => ([
  tx('M0D-02-TESTOCOMENUMERO.1'),
  tx('M0D-02-TESTOCOMENUMERO.2'),
  tx('M0D-02-TESTOCOMENUMERO.3'),
  tx('M0D-02-TESTOCOMENUMERO.4'),
  tx('M0D-02-TESTOCOMENUMERO.5'),
  tx('M0D-02-TESTOCOMENUMERO.6'),
  tx('M0D-02-TESTOCOMENUMERO.7'),
  tx('M0D-02-TESTOCOMENUMERO.8'),
  tx('M0D-02-TESTOCOMENUMERO.9'),
  tx('M0D-02-TESTOCOMENUMERO.10'),
] as const);

const RIGHE = 7;

/** Formatta un intero con la virgola delle migliaia, come lo scriverebbe un gestionale anglosassone. */
function conVirgole(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default defineTemplate({
  id: 'M0D-02-TESTOCOMENUMERO',
  module: 'M0-D',
  get title() {
    return tx('M0D-02-TESTOCOMENUMERO.title');
  },
  rank: 2,
  mode: 'AUDIT',
  estimatedSeconds: 210,
  skills: ['xl.text-numbers', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const fornitori = r.shuffle([...FORNITORI()]).slice(0, RIGHE);

    const importi: number[] = [];
    for (let i = 0; i < RIGHE; i++) {
      importi.push(roundTo(triangular(r, 1200, 5000, 45000), 10));
    }

    // Esattamente 3 righe su 7 arrivano sporche dal gestionale: abbastanza per
    // rompere il totale in modo evidente, non cosi' tante da rendere il foglio
    // illeggibile.
    const indiciSporchi = new Set(r.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 3));

    // Per ogni riga sporca: o la virgola delle migliaia (il foglio usa il punto
    // come separatore decimale, quindi la virgola non e' un carattere numerico
    // valido) o uno spazio finale invisibile. Entrambi bastano a far restare la
    // cella testo.
    const tipoSporco = new Map<number, 'virgola' | 'spazio'>();
    for (const i of indiciSporchi) {
      tipoSporco.set(i, r.bool() ? 'virgola' : 'spazio');
    }

    // Zero-width space (U+200B): invisibile a schermo, ma resta un carattere
    // testuale a tutti gli effetti. Un trailing space vero (o tab, o
    // non-breaking space) NON basta a rompere il riconoscimento: HyperFormula
    // lo scarta durante il parsing numerico e la cella torna un numero vero,
    // il che vanificherebbe l'intero esercizio (verificato empiricamente: uno
    // spazio, anche non-breaking, in coda a "23400" viene convertito comunque
    // in 23400 numerico). Lo zero-width space e' l'unico "spazio invisibile"
    // che il motore non digerisce.
    const ZWSP = String.fromCharCode(0x200b);

    const colonnaB: (string | number)[] = importi.map((v, i) => {
      const tipo = tipoSporco.get(i);
      if (tipo === 'virgola') return conVirgole(v);
      if (tipo === 'spazio') return `${Math.round(v)}${ZWSP}`;
      return v;
    });

    const sommaVera = importi.reduce((acc, v, i) => (indiciSporchi.has(i) ? acc : acc + v), 0);
    const numeriVeri = RIGHE - indiciSporchi.size;

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0D-02-TESTOCOMENUMERO.12'),
      targetCell: 'Model!B12',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: sommaVera,
          message:
            tx('M0D-02-TESTOCOMENUMERO.13'),
        },
        {
          kind: 'mustReference',
          cells: ['B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10'],
        },
        { kind: 'mustUseFunction', functions: ['SUM'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.text-numbers', 'xl.aggregates'],
      minKeystrokes: 13,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0D-02-TESTOCOMENUMERO.14'),
      targetCell: 'Model!B14',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: numeriVeri,
          message:
            tx('M0D-02-TESTOCOMENUMERO.15'),
        },
        {
          kind: 'mustReference',
          cells: ['B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10'],
        },
        { kind: 'mustUseFunction', functions: ['COUNT'] },
        { kind: 'mustNotUseFunction', functions: ['COUNTA'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.text-numbers', 'xl.aggregates'],
      minKeystrokes: 15,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0D-02-TESTOCOMENUMERO',
      seed: rng.seed,
      brief: [tx('M0D-02-TESTOCOMENUMERO.16', { p0: eur(Math.min(...importi)), p1: eur(Math.max(...importi)) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0D-02-TESTOCOMENUMERO.17')], { style: STILE_TITOLO }),
            riga('A3', [tx('M0D-02-TESTOCOMENUMERO.25'), tx('M0D-02-TESTOCOMENUMERO.18')], { style: STILE_TITOLO }),
            colonna('A4', fornitori, { style: STILE_ETICHETTA }),
            colonna('B4', colonnaB, { style: { ...STILE_INPUT, numFmt: '#,##0' } }),
            blocco('A12', [[tx('M0D-02-TESTOCOMENUMERO.19')]], { style: STILE_ETICHETTA }),
            blocco('A13', [[tx('M0D-02-TESTOCOMENUMERO.20')]], { style: STILE_ETICHETTA }),
            blocco('B13', [['=COUNTA(B4:B10)']], { style: STILE_FORMULA }),
            blocco('A14', [[tx('M0D-02-TESTOCOMENUMERO.21')]], { style: STILE_ETICHETTA }),
            areaLibera(['B12', 'B14']),
          ],
          { colWidths: { A: 260, B: 150 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0D-02-TESTOCOMENUMERO.22'),
          8,
        ),
        hint('H2', tx('M0D-02-TESTOCOMENUMERO.23'), 10, 'T1'),
        hint(
          'H3',
          tx('M0D-02-TESTOCOMENUMERO.24'),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: 'Model!B12',
    };
  },
});
