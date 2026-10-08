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

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBITDA_RIP = 'B4'; // EBITDA riportato (dato, bloccato)
const B_IMPORTO = 'B5'; // Plus/minusvalenza da cessione, importo assoluto (dato, bloccato)

const B_RETTIFICA = 'B8'; // T1: rettifica QoE, con il segno giusto
const B_EBITDA_NORM = 'B9'; // T2

export default defineTemplate({
  id: 'M2-06-PLUSMINUSVALENZE',
  module: 'M2',
  title: 'Plusvalenze e minusvalenze: quando il segno si ribalta',
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
      ? "Plusvalenza da cessione di un cespite, one-off, gia' inclusa nell'EBITDA riportato sopra, €"
      : "Minusvalenza da cessione di un cespite, one-off, gia' inclusa nell'EBITDA riportato sopra, €";

    const t1Prompt = isPlusvalenza
      ? `In ${B_RETTIFICA} calcola la rettifica QoE dovuta alla plusvalenza da cessione (${B_IMPORTO}). ` +
        "Attenzione al segno: questo NON e' un costo da riaggiungere, e' un guadagno da TOGLIERE — la " +
        "formula ha un segno meno. La plusvalenza e' un provento one-off che ha gia' GONFIATO l'EBITDA " +
        'riportato, esattamente come farebbe un qualunque ricavo non ricorrente: va rimossa, non aggiunta.'
      : `In ${B_RETTIFICA} calcola la rettifica QoE dovuta alla minusvalenza da cessione (${B_IMPORTO}). ` +
        "E' il caso \"normale\" gia' visto nei livelli precedenti: una perdita one-off ha GONFIATO i costi " +
        "(quindi SGONFIATO l'EBITDA riportato), percio' si RIAGGIUNGE con segno positivo.";

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
        `In ${B_EBITDA_NORM} calcola l'EBITDA normalizzato: l'EBITDA riportato (${B_EBITDA_RIP}) piu' la ` +
        `rettifica (${B_RETTIFICA}). La rettifica in ${B_RETTIFICA} porta gia' il segno corretto — qui e' ` +
        'sempre una somma, in entrambi gli scenari possibili di questo livello.',
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
          `In questo livello l'azienda ha venduto un cespite durante l'anno, realizzando una ` +
            `**plusvalenza** di ${eur(importo)} che e' finita dentro l'EBITDA riportato di ` +
            `${eur(ebitdaRiportato)}.`,
          '',
          "Attenzione, perche' e' il punto in cui quasi tutti sbagliano: una plusvalenza NON e' un " +
            "costo da riaggiungere. E' un GUADAGNO una tantum che non si ripetera' — un provento " +
            "straordinario che ha gonfiato l'EBITDA riportato esattamente come farebbe un ricavo non " +
            'ricorrente qualsiasi. Va TOLTO: la rettifica e\' **negativa**.',
        ]
      : [
          `In questo livello l'azienda ha invece registrato una **minusvalenza** di ${eur(importo)} dalla ` +
            `cessione di un cespite, gia' dentro l'EBITDA riportato di ${eur(ebitdaRiportato)}.`,
          '',
          "E' il caso \"normale\" che hai gia' incontrato: una perdita one-off ha gonfiato i costi " +
            "(quindi sgonfiato l'EBITDA riportato) e va RIAGGIUNTA — rettifica **positiva**. Lo trovi qui " +
            "per completezza, cosi' non impari \"cessione di cespite = sempre segno meno\": il vero punto " +
            "di questo livello e' l'altro scenario, quello della plusvalenza da togliere. Guarda sempre " +
            "se e' un guadagno o una perdita, non il tipo di operazione.",
        ];

    return {
      templateId: 'M2-06-PLUSMINUSVALENZE',
      seed: rng.seed,
      brief: [
        '## Cessione di un cespite: il segno dipende da guadagno o perdita, non dal fatto in se',
        '',
        "Finora in questo modulo hai sempre incontrato rettifiche **positive**: un costo one-off gia' " +
          "dentro l'EBITDA riportato si riaggiunge. Qui incontri l'altra faccia della stessa regola:",
        '',
        '> **EBITDA normalizzato = EBITDA riportato + Σ rettifiche**',
        '',
        "- un **costo** one-off che ha gonfiato i costi (sgonfiato l'EBITDA riportato) si RIAGGIUNGE: " +
          'rettifica **positiva**.',
        "- un **ricavo/provento** one-off che ha gonfiato l'EBITDA riportato si TOGLIE: rettifica " +
          '**negativa**.',
        '',
        ...scenarioBrief,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Plusvalenze e minusvalenze da cessione'], { style: STILE_TITOLO }),
            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna('A4', ['EBITDA riportato (da bilancio), €', labelImporto], { style: STILE_ETICHETTA }),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_IMPORTO, content: importo, style: STILE_INPUT, locked: true },
            ],

            riga('A7', ['Normalizzazione'], { style: STILE_TITOLO }),
            colonna('A8', ['Rettifica QoE, €', 'EBITDA normalizzato, €'], { style: STILE_ETICHETTA }),
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
            ? `=-${B_IMPORTO}: la plusvalenza e' un guadagno one-off da togliere, non un costo da ` +
              'riaggiungere. Segno meno davanti al riferimento.'
            : `=${B_IMPORTO}: la minusvalenza e' una perdita one-off da riaggiungere, come i costi gia' ` +
              'visti prima. Nessun segno meno.',
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_EBITDA_RIP}+${B_RETTIFICA}: EBITDA riportato piu' la rettifica, che porta gia' il segno ` +
            'corretto qualunque sia lo scenario.',
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: `Model!${B_RETTIFICA}`,
    };
  },
});
