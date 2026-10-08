/**
 * M2 · 08 — Utili su cambi non ricorrenti dentro il costo delle materie prime.
 *
 * Quarto e ultimo template "one-off" del modulo (dopo M2-01, M2-05, M2-06):
 * consolida definitivamente la disciplina di segno per una rettifica negativa
 * (un provento one-off da TOGLIERE) prima del template successivo del modulo,
 * che presume questa disciplina gia' acquisita e non la rispiega piu' da capo.
 *
 * SCENARIO E SCELTA DI CLASSIFICAZIONE (va spiegata nel brief per non generare
 * confusione con la convenzione contabile generale):
 * questa azienda specifica importa materie prime in valuta estera e
 * contabilizza gli utili/perdite su cambi REALIZZATI sui debiti commerciali
 * direttamente dentro il costo delle materie prime. E' una scelta di
 * classificazione di QUESTA azienda, non lo standard contabile generale — di
 * norma gli effetti cambio stanno nella gestione finanziaria, sotto l'EBITDA,
 * e non lo toccherebbero affatto. Qui invece, per come questa azienda tiene i
 * conti, un utile su cambi finisce dentro l'EBITDA riportato, e va rettificato
 * come un qualunque provento non ricorrente.
 *
 * Quest'anno un forte movimento del cambio ha generato un UTILE su cambi non
 * ricorrente (dato, bloccato) dentro quei costi, gonfiando l'EBITDA riportato.
 * A differenza di M2-06 (plus/minusvalenza, doppia direzione seed-dipendente),
 * qui la rettifica e' SEMPRE negativa: non c'e' ramo "utile vs perdita" perche'
 * il punto di questo livello e' consolidare un singolo segno, non ripetere la
 * scelta fra i due.
 *
 * Geometria fissa: nessuna riga dipende dal seed, quindi i riferimenti di
 * cella qui sotto sono letterali per costruzione.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBITDA_RIP = 'B4'; // EBITDA riportato (dato, bloccato)
const B_UTILE_CAMBI = 'B5'; // Utile su cambi non ricorrente, importo assoluto (dato, bloccato)

const B_RETTIFICA = 'B8'; // T1: rettifica QoE, sempre negativa in questo livello
const B_EBITDA_NORM = 'B9'; // T2

export default defineTemplate({
  id: 'M2-08-EFFETTICAMBIO',
  module: 'M2',
  get title() {
    return tx('M2-08-EFFETTICAMBIO.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 220,
  skills: ['qoe.one-off'],
  prerequisites: ['M2-01-NORMALIZZAZIONE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitdaRiportato = r.int(800, 4000) * 1000;

    // L'utile su cambi come frazione dell'EBITDA riportato: abbastanza grande
    // da essere visibile, senza dominare il conto.
    const frazione = triangular(r, 0.02, 0.05, 0.12);
    const utileCambi = roundTo(frazione * ebitdaRiportato, 500);

    // Il punto del livello: sempre negativa, nessun ramo di segno.
    const rettifica = -utileCambi;
    const ebitdaNormalizzato = ebitdaRiportato + rettifica;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M2-08-EFFETTICAMBIO.2', { B_RETTIFICA, B_UTILE_CAMBI }),
      target: `Model!${B_RETTIFICA}`,
      atteso: rettifica,
      referenzia: [B_UTILE_CAMBI],
      senzaLiteral: [],
      skills: ['qoe.one-off'],
      minKeystrokes: 4,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M2-08-EFFETTICAMBIO.3', { B_EBITDA_NORM, B_EBITDA_RIP, B_RETTIFICA }),
      target: `Model!${B_EBITDA_NORM}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, B_RETTIFICA],
      senzaLiteral: [],
      skills: ['qoe.one-off'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-08-EFFETTICAMBIO',
      seed: rng.seed,
      brief: [tx('M2-08-EFFETTICAMBIO.4', { p0: eur(utileCambi), p1: eur(ebitdaRiportato) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M2-08-EFFETTICAMBIO.5')], { style: STILE_TITOLO }),
            riga('A3', [tx('M2-08-EFFETTICAMBIO.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M2-08-EFFETTICAMBIO.7'),
                tx('M2-08-EFFETTICAMBIO.8'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_UTILE_CAMBI, content: utileCambi, style: STILE_INPUT, locked: true },
            ],

            riga('A7', [tx('M2-08-EFFETTICAMBIO.13')], { style: STILE_TITOLO }),
            colonna('A8', [tx('M2-08-EFFETTICAMBIO.9'), tx('M2-08-EFFETTICAMBIO.10')], { style: STILE_ETICHETTA }),
            [{ ref: B_RETTIFICA, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_EBITDA_NORM, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M2-08-EFFETTICAMBIO.11', { B_UTILE_CAMBI }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M2-08-EFFETTICAMBIO.12', { B_EBITDA_RIP, B_RETTIFICA }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: `Model!${B_RETTIFICA}`,
    };
  },
});
