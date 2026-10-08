/**
 * M2 · 01 — Normalizzazione dell'EBITDA: la meccanica base del Quality of Earnings.
 *
 * Primo template del modulo M2 (Quality of Earnings): insegna il PATTERN
 * generale che ogni template successivo del modulo riusa senza piu' spiegarlo
 * da capo. Per questo e' GUIDED — celle target evidenziate, hint sempre
 * disponibile — come ogni apertura di modulo.
 *
 * IL PUNTO DIDATTICO (ripetuto nel brief, e' la base di tutto M2):
 *
 *   EBITDA normalizzato = EBITDA riportato + Σ rettifiche
 *
 * dove ogni rettifica ha un segno preciso:
 *   - un COSTO one-off che ha gia' gonfiato i costi (quindi sgonfiato
 *     l'EBITDA riportato) si RIAGGIUNGE: rettifica POSITIVA.
 *   - un RICAVO/PROVENTO one-off che ha gonfiato l'EBITDA riportato si
 *     TOGLIE: rettifica NEGATIVA. (Questo livello non lo mette alla prova —
 *     usa solo un costo — ma il brief lo dichiara esplicitamente perche' i
 *     livelli successivi del modulo lo useranno senza ripeterlo.)
 *
 * Il livello usa un'unica rettifica di esempio (un costo legale straordinario,
 * gia' dentro l'EBITDA riportato) per tenere la meccanica pulita: la somma di
 * piu' rettifiche eterogenee e con segni diversi e' materia dei template
 * successivi del modulo.
 *
 * T2 introduce l'idea — solo narrativa, nessun check costruito sopra — che una
 * rettifica va sempre guardata anche in proporzione: un compratore si
 * insospettisce se le rettifiche totali superano il 15-20% dell'EBITDA
 * riportato.
 *
 * Geometria fissa: nessuna riga dipende dal seed, quindi i riferimenti di
 * cella qui sotto sono letterali per costruzione (non c'e' shuffle da tenere
 * in conto, a differenza di m1/01).
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
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
  pct,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBITDA_RIP = 'B4'; // EBITDA riportato (dato, bloccato)
const B_RETTIFICA = 'B5'; // Rettifica: costo legale one-off (dato, bloccato)

const B_EBITDA_NORM = 'B8'; // T1
const B_IMPATTO_PCT = 'B9'; // T2

export default defineTemplate({
  id: 'M2-01-NORMALIZZAZIONE',
  module: 'M2',
  title: "Normalizzare l'EBITDA: la meccanica base",
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 220,
  skills: ['qoe.normalization'],
  prerequisites: ['M1-02-RICLASSIFICAZIONE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBITDA "come riportato" in bilancio: un numero plausibile a scatti di 1.000.
    const ebitdaRiportato = r.int(800, 4000) * 1000;

    // La rettifica come frazione dell'EBITDA riportato: per lo piu' contenuta,
    // ma puo' avvicinarsi alla soglia del 15-20% di cui parla il brief, cosi'
    // il numero che il giocatore vede a volte tocca davvero quel limite.
    const rettificaFrazione = triangular(r, 0.02, 0.06, 0.15);
    const rettificaLegale = roundTo(rettificaFrazione * ebitdaRiportato, 500);

    const ebitdaNormalizzato = ebitdaRiportato + rettificaLegale;
    const impattoPct = rettificaLegale / ebitdaRiportato;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_EBITDA_NORM} calcola l'EBITDA normalizzato: l'EBITDA riportato (${B_EBITDA_RIP}) piu' la ` +
        `rettifica (${B_RETTIFICA}). La rettifica e' un costo legale straordinario, one-off, gia' incluso ` +
        `nell'EBITDA riportato: e' un costo non ricorrente che ha gonfiato i costi (quindi sgonfiato ` +
        "l'EBITDA riportato), percio' si RIAGGIUNGE con segno positivo.",
      target: `Model!${B_EBITDA_NORM}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, B_RETTIFICA],
      senzaLiteral: [],
      skills: ['qoe.normalization'],
      minKeystrokes: 6,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_IMPATTO_PCT} calcola l'impatto percentuale della rettifica sull'EBITDA riportato: la ` +
        `rettifica (${B_RETTIFICA}) divisa per l'EBITDA riportato (${B_EBITDA_RIP}). Non basta guardare la ` +
        "rettifica in valore assoluto: un compratore la giudica anche in proporzione all'EBITDA di partenza.",
      target: `Model!${B_IMPATTO_PCT}`,
      atteso: impattoPct,
      referenzia: [B_RETTIFICA, B_EBITDA_RIP],
      senzaLiteral: [],
      skills: ['qoe.normalization'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-01-NORMALIZZAZIONE',
      seed: rng.seed,
      brief: [
        "## L'EBITDA che si negozia non e' quasi mai l'EBITDA di bilancio",
        '',
        "L'EBITDA \"come riportato\" in bilancio raramente e' l'EBITDA vero del business: dentro ci " +
          "finiscono costi e proventi che non si ripeteranno piu', o che non riflettono le normali " +
          "condizioni di mercato. Un Quality of Earnings (QoE) li rettifica per arrivare a un EBITDA " +
          '**normalizzato** (o *adjusted*) — quello su cui davvero si negozia un multiplo. La formula ' +
          "generale, che riuserai per tutto questo modulo, e' questa:",
        '',
        '> **EBITDA normalizzato = EBITDA riportato + Σ rettifiche**',
        '',
        "Ogni rettifica ha un segno preciso, e sbagliarlo e' l'errore piu' comune di chi inizia:",
        '',
        "- un **costo** one-off o non di mercato, gia' dentro l'EBITDA riportato, ha GONFIATO i costi " +
          "(quindi SGONFIATO l'EBITDA riportato): si RIAGGIUNGE, rettifica **positiva**.",
        "- un **ricavo/provento** one-off, gia' dentro l'EBITDA riportato, ha GONFIATO l'EBITDA " +
          "riportato: si TOGLIE, rettifica **negativa**.",
        '',
        `Qui hai un solo caso, il piu' semplice: l'EBITDA riportato e' ${eur(ebitdaRiportato)}, e dentro ` +
          `ci sono ${eur(rettificaLegale)} di spese legali straordinarie per un contenzioso concluso — un ` +
          "costo che non si ripetera' negli anni futuri. E' una rettifica da riaggiungere.",
        '',
        "Una volta calcolato l'EBITDA normalizzato, guarda anche quanto pesa la rettifica in " +
          "proporzione: se le rettifiche totali superano il 15-20% dell'EBITDA riportato, un compratore " +
          "comincia a chiedersi quanto sia davvero pulito il business — e quanto, invece, l'EBITDA " +
          '"adjusted" sia gonfiato ad arte.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ["Normalizzazione dell'EBITDA"], { style: STILE_TITOLO }),
            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'EBITDA riportato (da bilancio), €',
                'Rettifica: costo legale straordinario one-off, gia\' incluso sopra, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_RETTIFICA, content: rettificaLegale, style: STILE_INPUT, locked: true },
            ],

            riga('A7', ['Normalizzazione'], { style: STILE_TITOLO }),
            colonna(
              'A8',
              [
                'EBITDA normalizzato, €',
                "Impatto della rettifica sull'EBITDA riportato, %",
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EBITDA_NORM, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_IMPATTO_PCT, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 420, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_EBITDA_RIP}+${B_RETTIFICA}: EBITDA riportato piu' la rettifica. Il costo legale e' ` +
            "one-off e ha gonfiato i costi, quindi si riaggiunge con segno positivo.",
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_RETTIFICA}/${B_EBITDA_RIP}: la rettifica in proporzione all'EBITDA riportato, non in ` +
            `valore assoluto (qui vale ${pct(impattoPct)}).`,
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: `Model!${B_EBITDA_NORM}`,
    };
  },
});
