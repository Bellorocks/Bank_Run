/**
 * M0-F · 08 — Il sanity check: una formula che controlla il modello da sola.
 *
 * Nessun workaround qui: un sanity check non e' una feature del motore che
 * manca, e' una formula come tutte le altre — SUM, sottrazione, un confronto
 * booleano — applicata a un\'idea precisa: "questa proprieta' del modello deve
 * essere vera, e voglio che il foglio me lo dica da solo invece di scoprirlo
 * in comitato".
 *
 * Il caso e' volutamente il piu' classico: le quote di partecipazione di un
 * patto parasociale devono sommare al 100%. Due SPV sullo stesso foglio,
 * stessa struttura:
 *  - "SPV Alfa" ha i dati corretti: lo scarto e' (quasi) zero, il flag e' VERO.
 *  - "SPV Beta" ha un errore deliberato in una sola quota (un dato di input,
 *    non una formula: il tipo di errore che nessuna formula "protegge" da
 *    sola). Lo stesso identico controllo, scritto sullo stesso identico
 *    schema, deve restituire uno scarto diverso da zero e un flag FALSO.
 *
 * Il punto pedagogico e' che il giocatore scrive la STESSA formula due volte
 * su dati diversi: se l\'ha capita, la seconda volta la rottura salta fuori da
 * sola. Non gli si dice mai quale socio ha il numero sbagliato — e' il check,
 * non l\'occhio, che deve trovarlo.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  num,
  pct,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const SOCI = () => ([
  tx('M0F-08-SANITYCHECK.1'),
  tx('M0F-08-SANITYCHECK.2'),
  tx('M0F-08-SANITYCHECK.3'),
  tx('M0F-08-SANITYCHECK.4'),
] as const);

const N_SOCI = SOCI().length;

// SPV Alfa: quote corrette.
const ALFA_TITLE_ROW = 3;
const ALFA_FIRST_ROW = 4;
const ALFA_LAST_ROW = ALFA_FIRST_ROW + N_SOCI - 1; // 7
const ALFA_SCARTO_ROW = 9;
const ALFA_FLAG_ROW = 10;

// SPV Beta: stessa struttura, una quota sbagliata nei dati di input.
const BETA_TITLE_ROW = 13;
const BETA_FIRST_ROW = 14;
const BETA_LAST_ROW = BETA_FIRST_ROW + N_SOCI - 1; // 17
const BETA_SCARTO_ROW = 19;
const BETA_FLAG_ROW = 20;

/** Etichetta del sanity check: bordata sopra, cosi' risalta come una casella a se'. */
const STILE_LABEL_CHECK: CellStyle = {
  bold: true,
  borders: { top: { style: 'thin' } },
};

/** Cella libera dove il giocatore scrive lo scarto: percentuale, colore da formula. */
const STILE_SCARTO: CellStyle = {
  fontColor: MODEL_COLORS.formula,
  bold: true,
  numFmt: '0.00%',
  borders: { top: { style: 'thin' } },
};

/** Cella libera del flag VERO/FALSO: stesso trattamento visivo dello scarto. */
const STILE_FLAG: CellStyle = {
  fontColor: MODEL_COLORS.formula,
  bold: true,
};

/**
 * Quattro quote (in millesimi, cosi' la somma e' un intero esatto e non
 * introduce arrotondamenti) che sommano sempre a 1000: un patto parasociale
 * plausibile, sponsor in maggioranza.
 */
function quotePermille(r: import('../../../rng/SeededRandom').SeededRandom): number[] {
  const sponsor = r.int(400, 600);
  const management = r.int(100, 250);
  const resto = 1000 - sponsor - management; // 150 .. 500
  const coinvestitore = r.int(Math.round(resto * 0.3), Math.round(resto * 0.7));
  const minoranza = resto - coinvestitore;
  return [sponsor, management, coinvestitore, minoranza];
}

export default defineTemplate({
  id: 'M0F-08-SANITYCHECK',
  module: 'M0-F',
  get title() {
    return tx('M0F-08-SANITYCHECK.title');
  },
  rank: 3,
  mode: 'AUDIT',
  estimatedSeconds: 360,
  skills: ['xl.sanity-checks', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const wAlfa = quotePermille(r);
    const quoteAlfa = wAlfa.map((w) => w / 1000);
    const scartoAlfa = wAlfa.reduce((acc, w) => acc + w, 0) / 1000 - 1; // ~0 per costruzione

    const wBetaCorrette = quotePermille(r);
    const indiceErrore = r.int(0, N_SOCI - 1);
    const deltaPermille = r.int(15, 55); // errore fra l'1,5% e il 5,5%
    let segno = r.next() < 0.5 ? 1 : -1;
    // Non lasciare che l'errore porti una quota sotto il 2%: resterebbe un
    // numero implausibile invece che un errore plausibile da patto parasociale.
    if (segno === -1 && wBetaCorrette[indiceErrore] - deltaPermille < 20) segno = 1;

    const wBeta = [...wBetaCorrette];
    wBeta[indiceErrore] = wBetaCorrette[indiceErrore] + segno * deltaPermille;
    const quoteBeta = wBeta.map((w) => w / 1000);
    const scartoBeta = (segno * deltaPermille) / 1000;

    const rangeAlfa = { first: `B${ALFA_FIRST_ROW}`, last: `B${ALFA_LAST_ROW}` };
    const rangeBeta = { first: `B${BETA_FIRST_ROW}`, last: `B${BETA_LAST_ROW}` };

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M0F-08-SANITYCHECK.6', { ALFA_SCARTO_ROW, p1: num(N_SOCI) }),
      target: `Model!B${ALFA_SCARTO_ROW}`,
      atteso: scartoAlfa,
      referenzia: [rangeAlfa.first, rangeAlfa.last],
      senzaLiteral: [1],
      skills: ['xl.sanity-checks', 'xl.aggregates'],
      minKeystrokes: 14,
    });

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0F-08-SANITYCHECK.7', { ALFA_FLAG_ROW, ALFA_SCARTO_ROW }),
      targetCell: `Model!B${ALFA_FLAG_ROW}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'boolean', expected: true },
        { kind: 'mustReference', cells: [`B${ALFA_SCARTO_ROW}`] },
      ],
      skills: ['xl.sanity-checks'],
      minKeystrokes: 16,
    };

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M0F-08-SANITYCHECK.8', { BETA_SCARTO_ROW }),
      target: `Model!B${BETA_SCARTO_ROW}`,
      atteso: scartoBeta,
      referenzia: [rangeBeta.first, rangeBeta.last],
      senzaLiteral: [1],
      skills: ['xl.sanity-checks', 'xl.aggregates'],
      minKeystrokes: 14,
    });

    const t4: Task = {
      id: 'T4',
      prompt:
        tx('M0F-08-SANITYCHECK.9', { BETA_FLAG_ROW }),
      targetCell: `Model!B${BETA_FLAG_ROW}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'boolean', expected: false },
        { kind: 'mustReference', cells: [`B${BETA_SCARTO_ROW}`] },
      ],
      skills: ['xl.sanity-checks'],
      minKeystrokes: 16,
    };

    const tasks = [t1, t2, t3, t4];

    return {
      templateId: 'M0F-08-SANITYCHECK',
      seed: rng.seed,
      brief: [tx('M0F-08-SANITYCHECK.10', { p0: num(N_SOCI), p1: SOCI().map((s, i) => `${s} ${pct(quoteAlfa[i])}`).join(', ') })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0F-08-SANITYCHECK.11')], { style: STILE_TITOLO }),

            riga(`A${ALFA_TITLE_ROW}`, [tx('M0F-08-SANITYCHECK.12')], { style: STILE_TITOLO }),
            blocco(`A${ALFA_FIRST_ROW}`, SOCI().map((s) => [s]), { style: STILE_ETICHETTA }),
            blocco(
              `B${ALFA_FIRST_ROW}`,
              quoteAlfa.map((q) => [q]),
              { style: STILE_INPUT_PCT },
            ),
            blocco(`A${ALFA_SCARTO_ROW}`, [[tx('M0F-08-SANITYCHECK.13')]], { style: STILE_LABEL_CHECK }),
            blocco(`A${ALFA_FLAG_ROW}`, [[tx('M0F-08-SANITYCHECK.14')]], { style: STILE_ETICHETTA }),

            riga(`A${BETA_TITLE_ROW}`, [tx('M0F-08-SANITYCHECK.15')], { style: STILE_TITOLO }),
            blocco(`A${BETA_FIRST_ROW}`, SOCI().map((s) => [s]), { style: STILE_ETICHETTA }),
            blocco(
              `B${BETA_FIRST_ROW}`,
              quoteBeta.map((q) => [q]),
              { style: STILE_INPUT_PCT },
            ),
            blocco(`A${BETA_SCARTO_ROW}`, [[tx('M0F-08-SANITYCHECK.16')]], { style: STILE_LABEL_CHECK }),
            blocco(`A${BETA_FLAG_ROW}`, [[tx('M0F-08-SANITYCHECK.17')]], { style: STILE_ETICHETTA }),

            [{ ref: `B${ALFA_SCARTO_ROW}`, content: null, locked: false, style: STILE_SCARTO }],
            [{ ref: `B${ALFA_FLAG_ROW}`, content: null, locked: false, style: STILE_FLAG }],
            [{ ref: `B${BETA_SCARTO_ROW}`, content: null, locked: false, style: STILE_SCARTO }],
            [{ ref: `B${BETA_FLAG_ROW}`, content: null, locked: false, style: STILE_FLAG }],
          ],
          { colWidths: { A: 320, B: 130 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0F-08-SANITYCHECK.18', { ALFA_FIRST_ROW, ALFA_LAST_ROW }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0F-08-SANITYCHECK.h2', { ALFA_SCARTO_ROW }),
          10,
          'T2',
        ),
        hint(
          'H3',
          tx('M0F-08-SANITYCHECK.19', { BETA_FIRST_ROW, BETA_LAST_ROW }),
          10,
          'T3',
        ),
        hint(
          'H4',
          tx('M0F-08-SANITYCHECK.20', { BETA_SCARTO_ROW, ALFA_SCARTO_ROW }),
          10,
          'T4',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!B${ALFA_SCARTO_ROW}`,
    };
  },
});
