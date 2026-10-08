/**
 * M2 · 06 — Plus/minusvalenze da cessione: quando la rettifica cambia segno.
 *
 * Secondo template "one-off" del modulo (dopo M2-01, che ha introdotto il
 * pattern generale con un solo caso positivo). Qui il punto didattico e' il
 * piu' controintuitivo di tutto M2: finora le rettifiche viste erano sempre
 * costi one-off da RIAGGIUNGERE (segno positivo). Una PLUSVALENZA da cessione
 * di un cespite e' l'esatto contrario — un GUADAGNO one-off gia' dentro
 * l'EBITDA riportato, che va TOLTO (segno negativo), esattamente come un
 * qualunque ricavo non ricorrente.
 *
 * Per seed viene generato UNO dei due scenari (50/50 via rng.bool):
 *  - plusvalenza da cessione: rettifica NEGATIVA. E' il caso nuovo, quello
 *    che rompe l'abitudine costruita nei livelli precedenti — il brief e il
 *    prompt di T1 lo dichiarano senza ambiguita'.
 *  - minusvalenza da cessione: rettifica POSITIVA. E' il caso "normale" gia'
 *    visto (una perdita one-off gonfia i costi, quindi si riaggiunge) —
 *    incluso per completezza, cosi' il giocatore non impara "cessione di
 *    cespite = sempre segno meno" ma guarda davvero se e' un guadagno o una
 *    perdita.
 *
 * Geometria fissa: nessuna riga dipende dal seed (lo scenario cambia solo
 * un'etichetta e il segno di un numero, non la posizione delle celle), quindi
 * i riferimenti qui sotto sono letterali per costruzione.
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
const B_IMPORTO = 'B5'; // Plus/minusvalenza da cessione, importo assoluto (dato, bloccato)

const B_RETTIFICA = 'B8'; // T1: rettifica QoE, con il segno giusto
const B_EBITDA_NORM = 'B9'; // T2

export default defineTemplate({
  id: 'M2-06-PLUSMINUSVALENZE',
  module: 'M2',
  get title() {
    return tx('M2-06-PLUSMINUSVALENZE.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 220,
  skills: ['qoe.one-off'],
  prerequisites: ['M2-01-NORMALIZZAZIONE'],

  generate: (rng) => {
    // Stream separato per la scelta dello scenario: indipendente dai numeri,
    // cosi' aggiungere/togliere estrazioni numeriche non cambia mai quale
    // scenario esce per un dato seed.
    const rScenario = rng.fork('scenario');
    const isPlusvalenza = rScenario.bool();

    const r = rng.fork('dati');
    const ebitdaRiportato = r.int(800, 4000) * 1000;

    // L'importo della plus/minusvalenza come frazione dell'EBITDA riportato:
    // abbastanza grande da essere visibile, ma senza dominare il conto.
    const frazione = triangular(r, 0.03, 0.08, 0.18);
    const importo = roundTo(frazione * ebitdaRiportato, 500);

    // Il cuore della lezione: stesso importo assoluto, segno opposto a
    // seconda che sia un guadagno (da togliere) o una perdita (da riaggiungere).
    const rettifica = isPlusvalenza ? -importo : importo;
    const ebitdaNormalizzato = ebitdaRiportato + rettifica;

    const labelImporto = isPlusvalenza
      ? tx('M2-06-PLUSMINUSVALENZE.2')
      : tx('M2-06-PLUSMINUSVALENZE.3');

    const t1Prompt = isPlusvalenza
      ? tx('M2-06-PLUSMINUSVALENZE.4', { B_RETTIFICA, B_IMPORTO })
      : tx('M2-06-PLUSMINUSVALENZE.5', { B_RETTIFICA, B_IMPORTO });

    const t1 = taskFormula({
      id: 'T1',
      prompt: t1Prompt,
      target: `Model!${B_RETTIFICA}`,
      atteso: rettifica,
      referenzia: [B_IMPORTO],
      senzaLiteral: [],
      skills: ['qoe.one-off'],
      minKeystrokes: isPlusvalenza ? 4 : 3,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M2-06-PLUSMINUSVALENZE.6', { B_EBITDA_NORM, B_EBITDA_RIP, B_RETTIFICA }),
      target: `Model!${B_EBITDA_NORM}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, B_RETTIFICA],
      senzaLiteral: [],
      skills: ['qoe.one-off'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    const scenarioBrief = isPlusvalenza
      ? [
          tx('M2-06-PLUSMINUSVALENZE.7', { p0: eur(importo), p1: eur(ebitdaRiportato) }),
          '',
          tx('M2-06-PLUSMINUSVALENZE.8'),
        ]
      : [
          tx('M2-06-PLUSMINUSVALENZE.9', { p0: eur(importo), p1: eur(ebitdaRiportato) }),
          '',
          tx('M2-06-PLUSMINUSVALENZE.10'),
        ];

    return {
      templateId: 'M2-06-PLUSMINUSVALENZE',
      seed: rng.seed,
      brief: [tx('M2-06-PLUSMINUSVALENZE.11'), ...scenarioBrief].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M2-06-PLUSMINUSVALENZE.12')], { style: STILE_TITOLO }),
            riga('A3', [tx('M2-06-PLUSMINUSVALENZE.13')], { style: STILE_TITOLO }),
            colonna('A4', [tx('M2-06-PLUSMINUSVALENZE.14'), labelImporto], { style: STILE_ETICHETTA }),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_IMPORTO, content: importo, style: STILE_INPUT, locked: true },
            ],

            riga('A7', [tx('M2-06-PLUSMINUSVALENZE.20')], { style: STILE_TITOLO }),
            colonna('A8', [tx('M2-06-PLUSMINUSVALENZE.15'), tx('M2-06-PLUSMINUSVALENZE.16')], { style: STILE_ETICHETTA }),
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
          isPlusvalenza
            ? tx('M2-06-PLUSMINUSVALENZE.17', { B_IMPORTO })
            : tx('M2-06-PLUSMINUSVALENZE.18', { B_IMPORTO }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M2-06-PLUSMINUSVALENZE.19', { B_EBITDA_RIP, B_RETTIFICA }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: `Model!${B_RETTIFICA}`,
    };
  },
});
