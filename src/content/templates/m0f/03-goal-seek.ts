/**
 * M0-F · 03 — Risolvere all'indietro (Goal Seek, in attesa del motore).
 *
 * NOTA DI IMPLEMENTAZIONE: `GridSession` (src/game/session.ts) non ha nessun comando
 * di Ricerca obiettivo — ne' un dialogo "Imposta cella / A valore / Cambiando cella",
 * ne' un solver che ci lavori dietro. Verificato con grep prima di scrivere questo
 * file: la funzionalita' e' assente dal motore, non solo dall'interfaccia. Aggiungerla
 * era fuori dal perimetro di questo compito (avrebbe voluto dire un solver dentro
 * `session.ts`, assegnato altrove).
 *
 * Il livello insegna quindi il CONCETTO — dato un risultato desiderato, trovare
 * l'input che lo produce — con lo strumento che il giocatore ha gia' in mano:
 * l'algebra. La relazione fra prezzo e margine e' lineare (margine = (prezzo-costo)/
 * prezzo), quindi si risolve isolando il prezzo in un passaggio, invece di iterare
 * come farebbe un solver. Il brief spiega cosa farebbe Ricerca obiettivo vero e
 * perche' qui conviene la scorciatoia algebrica. Quando il motore avra' un comando
 * di goal seek vero, questo e' il livello naturale da riscrivere per usarlo davvero:
 * pattern preso da `m0b/06-named-ranges.ts`, che affronta lo stesso tipo di lacuna.
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
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_FORMULA_PCT,
  STILE_TITOLO,
  eur,
  pct,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import { roundTo, triangular } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';

import { tx } from '../../../i18n/content';
/** Il prezzo risolto: due decimali, colore da formula. Non c'e' un formato standard pronto in authoring.ts. */
const STILE_FORMULA_PREZZO: CellStyle = {
  fontColor: MODEL_COLORS.formula,
  numFmt: '#,##0.00',
};

const CANALI = () => ([tx('M0F-03-GOALSEEK.1'), tx('M0F-03-GOALSEEK.2'), tx('M0F-03-GOALSEEK.3')] as const);

export default defineTemplate({
  id: 'M0F-03-GOALSEEK',
  module: 'M0-F',
  get title() {
    return tx('M0F-03-GOALSEEK.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['xl.goal-seek', 'xl.fill', 'xl.row-consistency'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const costi = CANALI().map(() => roundTo(triangular(r, 15, 45, 150), 1));
    const margini = CANALI().map(() => roundTo(triangular(r, 0.12, 0.22, 0.38), 0.001));
    // Stessa aritmetica che scrivera' il giocatore: prezzo = costo / (1 - margine).
    const prezzi = costi.map((c, i) => c / (1 - margini[i]));

    const RIGA_HEADER = 3;
    const RIGA_PRIMO = 4;
    const RIGA_ULTIMO = RIGA_PRIMO + CANALI().length - 1; // 6

    const rangePrezzo = `Model!D${RIGA_PRIMO}:D${RIGA_ULTIMO}`;
    const rangeVerifica = `Model!E${RIGA_PRIMO}:E${RIGA_ULTIMO}`;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M0F-03-GOALSEEK.5', { RIGA_PRIMO, p1: CANALI()[0] }),
        target: `Model!D${RIGA_PRIMO}`,
        atteso: prezzi[0],
        referenzia: [`B${RIGA_PRIMO}`, `C${RIGA_PRIMO}`],
        senzaLiteral: [1],
        skills: ['xl.goal-seek'],
        minKeystrokes: 12,
      }),
      {
        id: 'T2',
        prompt:
          tx('M0F-03-GOALSEEK.6', { RIGA_PRIMO, RIGA_ULTIMO }),
        targetCell: rangePrezzo,
        check: [
          { kind: 'consistentRow' as const, range: rangePrezzo },
          { kind: 'noError' as const },
        ],
        skills: ['xl.fill', 'xl.row-consistency'],
        minKeystrokes: 8,
      },
      taskFormula({
        id: 'T3',
        prompt:
          tx('M0F-03-GOALSEEK.7', { RIGA_PRIMO }),
        target: `Model!E${RIGA_PRIMO}`,
        atteso: margini[0],
        referenzia: [`D${RIGA_PRIMO}`, `B${RIGA_PRIMO}`],
        senzaLiteral: [],
        skills: ['xl.goal-seek'],
        minKeystrokes: 10,
      }),
      {
        id: 'T4',
        prompt: tx('M0F-03-GOALSEEK.8', { RIGA_PRIMO, RIGA_ULTIMO }),
        targetCell: rangeVerifica,
        check: [
          { kind: 'consistentRow' as const, range: rangeVerifica },
          { kind: 'noError' as const },
        ],
        skills: ['xl.fill', 'xl.row-consistency'],
        minKeystrokes: 8,
      },
    ];

    const elencoCanali = CANALI().map(
      (nome, i) => tx('M0F-03-GOALSEEK.9', { nome, p1: eur(costi[i]), p2: pct(margini[i]) }),
    ).join('\n');

    return {
      templateId: 'M0F-03-GOALSEEK',
      seed: rng.seed,
      brief: [tx('M0F-03-GOALSEEK.10', { elencoCanali })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0F-03-GOALSEEK.11')], { style: STILE_TITOLO }),
            riga(
              `A${RIGA_HEADER}`,
              [tx('M0F-03-GOALSEEK.20'), tx('M0F-03-GOALSEEK.12'), tx('M0F-03-GOALSEEK.13'), tx('M0F-03-GOALSEEK.14'), tx('M0F-03-GOALSEEK.15')],
              { style: STILE_TITOLO },
            ),
            colonna(`A${RIGA_PRIMO}`, [...CANALI()], { style: STILE_ETICHETTA }),
            colonna(`B${RIGA_PRIMO}`, costi, { style: STILE_INPUT }),
            colonna(`C${RIGA_PRIMO}`, margini, { style: STILE_INPUT_PCT }),
            CANALI().map((_, i) => ({
              ref: `D${RIGA_PRIMO + i}`,
              content: null,
              locked: false,
              style: STILE_FORMULA_PREZZO,
            })),
            CANALI().map((_, i) => ({
              ref: `E${RIGA_PRIMO + i}`,
              content: null,
              locked: false,
              style: STILE_FORMULA_PCT,
            })),
          ],
          {
            colWidths: { A: 220, B: 150, C: 150, D: 150, E: 160 },
            frozenRows: RIGA_HEADER,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0F-03-GOALSEEK.16', { RIGA_PRIMO }),
          12,
          'T1',
        ),
        hint('H2', tx('M0F-03-GOALSEEK.17', { RIGA_PRIMO, p1: rangePrezzo.replace('Model!', '') }), 8, 'T2'),
        hint(
          'H3',
          tx('M0F-03-GOALSEEK.18', { RIGA_PRIMO }),
          10,
          'T3',
        ),
        hint('H4', tx('M0F-03-GOALSEEK.19', { RIGA_PRIMO, p1: rangeVerifica.replace('Model!', '') }), 8, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!D${RIGA_PRIMO}`,
    };
  },
});
