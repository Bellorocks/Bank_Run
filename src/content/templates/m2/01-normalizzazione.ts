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

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBITDA_RIP = 'B4'; // EBITDA riportato (dato, bloccato)
const B_RETTIFICA = 'B5'; // Rettifica: costo legale one-off (dato, bloccato)

const B_EBITDA_NORM = 'B8'; // T1
const B_IMPATTO_PCT = 'B9'; // T2

export default defineTemplate({
  id: 'M2-01-NORMALIZZAZIONE',
  module: 'M2',
  get title() {
    return tx('M2-01-NORMALIZZAZIONE.title');
  },
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
        tx('M2-01-NORMALIZZAZIONE.2', { B_EBITDA_NORM, B_EBITDA_RIP, B_RETTIFICA }),
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
        tx('M2-01-NORMALIZZAZIONE.3', { B_IMPATTO_PCT, B_RETTIFICA, B_EBITDA_RIP }),
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
      brief: [tx('M2-01-NORMALIZZAZIONE.4', { p0: eur(ebitdaRiportato), p1: eur(rettificaLegale) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M2-01-NORMALIZZAZIONE.5')], { style: STILE_TITOLO }),
            riga('A3', [tx('M2-01-NORMALIZZAZIONE.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M2-01-NORMALIZZAZIONE.7'),
                tx('M2-01-NORMALIZZAZIONE.8'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_RETTIFICA, content: rettificaLegale, style: STILE_INPUT, locked: true },
            ],

            riga('A7', [tx('M2-01-NORMALIZZAZIONE.13')], { style: STILE_TITOLO }),
            colonna(
              'A8',
              [
                tx('M2-01-NORMALIZZAZIONE.9'),
                tx('M2-01-NORMALIZZAZIONE.10'),
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
          tx('M2-01-NORMALIZZAZIONE.11', { B_EBITDA_RIP, B_RETTIFICA }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M2-01-NORMALIZZAZIONE.12', { B_RETTIFICA, B_EBITDA_RIP, p2: pct(impattoPct) }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: `Model!${B_EBITDA_NORM}`,
    };
  },
});
