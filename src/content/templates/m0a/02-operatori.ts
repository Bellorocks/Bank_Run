/**
 * M0-A · 02 — Operatori aritmetici, ordine delle operazioni, parentesi.
 *
 * Il punto didattico non e' "sapere che * viene prima di +": quello lo sanno
 * tutti da scuola. Il punto e' che in una formula di modello finanziario le
 * parentesi non sono un vezzo estetico — spostano quale numero moltiplica quale,
 * e un errore di questo tipo produce un numero PLAUSIBILE, non un errore visibile.
 *
 * T1 e' il caso in cui l'ordine naturale delle operazioni basta da solo: si
 * scrive la formula cosi' com'e' descritta a parole e Excel fa gia' la cosa
 * giusta, moltiplicazione prima di somma.
 *
 * T2 e' il caso in cui NON basta: la formula del margine netto ha bisogno di
 * DUE gruppi di parentesi, e togliendole (come mostra il brief con i numeri
 * veri del livello) il risultato cambia di molto, non di poco — perche' una
 * percentuale sottratta come se fosse un numero intero non e' un arrotondamento,
 * e' un errore concettuale.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  eur,
  num,
  pct,
} from '../../authoring';
import { roundTo } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0A-02-OPERATORI',
  module: 'M0-A',
  get title() {
    return tx('M0A-02-OPERATORI.title');
  },
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 150,
  skills: ['xl.arithmetic'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Scenario: piccola produzione e vendita di gadget personalizzati.
    const u = r.int(6, 19); // costo di produzione per pezzo, euro
    const q = r.int(80, 340); // quantita' prodotta
    const F = r.int(900, 3100); // costo fisso mensile (affitto, utenze)
    const R = r.int(3200, 9800); // ricavi del mese
    // Commissione trattenuta dalla piattaforma di vendita online, 4%-18%.
    const c = roundTo(0.04 + r.next() * 0.14, 0.001);

    const costoTotaleProduzione = u * q + F;
    const margineNetto = (R - F) * (1 - c);
    // La formula sbagliata del brief, presa alla lettera: si tolgono le
    // parentesi e si legge da sinistra a destra con le normali precedenze.
    // R - F*1 - c: la commissione, che e' una frazione, viene sottratta come
    // se fosse un numero intero di euro.
    const risultatoSenzaParentesi = R - F * 1 - c;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M0A-02-OPERATORI.2'),
        target: 'Model!B5',
        atteso: costoTotaleProduzione,
        referenzia: ['B2', 'B3', 'B4'],
        senzaLiteral: [],
        skills: ['xl.arithmetic'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt:
          tx('M0A-02-OPERATORI.3'),
        target: 'Model!B10',
        atteso: margineNetto,
        referenzia: ['B7', 'B4', 'B9'],
        senzaLiteral: [1],
        skills: ['xl.arithmetic'],
        minKeystrokes: 20,
      }),
    ];

    return {
      templateId: 'M0A-02-OPERATORI',
      seed: rng.seed,
      brief: [tx('M0A-02-OPERATORI.4', { p0: num(2 + 3 * 4), p1: num((2 + 3) * 4), p2: num((2 + 3) * 4), p3: eur(u), p4: num(q), p5: eur(F), p6: eur(R), p7: pct(c), p8: pct(c), p9: eur(risultatoSenzaParentesi, 2), p10: eur(margineNetto, 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0A-02-OPERATORI.5')], { style: STILE_TITOLO }),
            blocco('A2', [
              [tx('M0A-02-OPERATORI.6')],
              [tx('M0A-02-OPERATORI.7')],
              [tx('M0A-02-OPERATORI.8')],
              [tx('M0A-02-OPERATORI.9')],
            ], { style: STILE_ETICHETTA }),
            blocco('B2', [[u], [q], [F]], { style: STILE_INPUT }),

            blocco('A7', [
              [tx('M0A-02-OPERATORI.10')],
            ], { style: STILE_ETICHETTA }),
            blocco('B7', [[R]], { style: STILE_INPUT }),
            blocco('A9', [
              [tx('M0A-02-OPERATORI.11')],
              [tx('M0A-02-OPERATORI.12')],
            ], { style: STILE_ETICHETTA }),
            blocco('B9', [[c]], { style: STILE_INPUT_PCT }),

            areaLibera(['B5', 'B10']),
          ],
          { colWidths: { A: 260, B: 130 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0A-02-OPERATORI.13'),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M0A-02-OPERATORI.14'),
          12,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: 'Model!B5',
    };
  },
});
