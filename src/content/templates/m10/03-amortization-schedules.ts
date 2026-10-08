/**
 * M10 · 03 — Piani di Ammortamento: quota capitale costante, balloon e bullet.
 *
 * Tre profili di rimborso dello stesso prestito a 5 anni:
 *
 *   - lineare (all'italiana): quota capitale costante = capitale / durata,
 *     interessi sul debito di inizio anno, quindi decrescenti;
 *   - balloon: piccola quota capitale costante negli anni 1-4, maxirata
 *     finale pari al debito residuo;
 *   - bullet: nessun rimborso fino alla scadenza, interessi pieni ogni anno.
 *
 * Il punto didattico e' il costo: piu' il capitale resta in essere, piu'
 * interessi si pagano. L'ultimo task quantifica quanto costa in piu' il
 * bullet rispetto al lineare. Le righe di debito iniziale/finale sono gia'
 * collegate; il giocatore costruisce quote capitale e interessi.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

const ANNI = 5;
const COLONNE = ['C', 'D', 'E', 'F', 'G'] as const;

const B_PRINCIPAL = 'B4';
const B_YEARS = 'B5';
const B_RATE = 'B6';
const B_BALLOON_PCT = 'B7';

// Lineare
const ROW_L_INIZ = 10;
const ROW_L_QUOTA = 11;
const ROW_L_INT = 12;
const ROW_L_FINE = 13;
// Balloon
const ROW_B_INIZ = 16;
const ROW_B_QUOTA = 17;
const ROW_B_FINE = 18;
// Confronto
const B_BULLET_INT = 'B21';
const B_EXTRA = 'B22';

export default defineTemplate({
  id: 'M10-03-AMORTIZATION',
  module: 'M10',
  title: 'Piani di ammortamento: lineare, bullet e balloon',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 420,
  skills: ['cred.amortization'],
  prerequisites: ['M10-02-DEBTCAPACITY'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const principal = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 1_000_000);
    const rate = roundTo(triangular(r, 0.04, 0.06, 0.08), 0.0025);
    const balloonPct = roundTo(triangular(r, 0.03, 0.06, 0.1), 0.01);

    const quotaL = principal / ANNI;
    const iniziL = Array.from({ length: ANNI }, (_, t) => principal - quotaL * t);
    const intL = iniziL.map((d) => d * rate);
    const quotaB = principal * balloonPct;
    const balloon = principal - quotaB * (ANNI - 1);
    const bulletInt = principal * rate * ANNI;
    const extra = bulletInt - intL.reduce((a, b) => a + b, 0);

    const ultima = COLONNE[ANNI - 1];
    const penultima = COLONNE[ANNI - 2];
    const tasks: Task[] = [
      rigaTask('T1', `${COLONNE[0]}${ROW_L_QUOTA}:${ultima}${ROW_L_QUOTA}`, 'la quota capitale costante del piano lineare', quotaL, quotaL, [B_PRINCIPAL, B_YEARS]),
      rigaTask(
        'T2',
        `${COLONNE[0]}${ROW_L_INT}:${ultima}${ROW_L_INT}`,
        "gli interessi del piano lineare, sul debito di inizio anno",
        intL[0],
        intL[ANNI - 1],
        [`${COLONNE[0]}${ROW_L_INIZ}`, B_RATE],
      ),
      rigaTask(
        'T3',
        `${COLONNE[0]}${ROW_B_QUOTA}:${penultima}${ROW_B_QUOTA}`,
        'la piccola quota capitale costante del balloon negli anni 1-4',
        quotaB,
        quotaB,
        [B_PRINCIPAL, B_BALLOON_PCT],
      ),
      taskFormula({
        id: 'T4',
        prompt: `In ${ultima}${ROW_B_QUOTA} la maxirata finale del balloon: tutto il debito ancora in essere all'inizio dell'anno 5.`,
        target: `Model!${ultima}${ROW_B_QUOTA}`,
        atteso: balloon,
        referenzia: [`${ultima}${ROW_B_INIZ}`],
        senzaLiteral: [],
        skills: ['cred.amortization'],
        minKeystrokes: 5,
      }),
      taskFormula({
        id: 'T5',
        prompt: `In ${B_BULLET_INT} gli interessi totali del bullet sui cinque anni: il capitale resta tutto in essere fino alla scadenza.`,
        target: `Model!${B_BULLET_INT}`,
        atteso: bulletInt,
        referenzia: [B_PRINCIPAL, B_RATE, B_YEARS],
        senzaLiteral: [],
        skills: ['cred.amortization'],
        minKeystrokes: 10,
      }),
      taskFormula({
        id: 'T6',
        prompt: `In ${B_EXTRA} quanti interessi in piu' costa il bullet rispetto al piano lineare.`,
        target: `Model!${B_EXTRA}`,
        atteso: extra,
        referenzia: [B_BULLET_INT, `${COLONNE[0]}${ROW_L_INT}`, `${ultima}${ROW_L_INT}`],
        senzaLiteral: [],
        skills: ['cred.amortization'],
        minKeystrokes: 14,
      }),
    ];

    const brief = [
      'Lo stesso prestito, tre modi di restituirlo. Confrontali.',
      '',
      `- **Capitale**: ${eur(principal)}, durata ${ANNI} anni, tasso ${pct(rate, 2)}`,
      `- **Lineare**: quota capitale costante ogni anno`,
      `- **Balloon**: ${pct(balloonPct, 0)} del capitale l'anno negli anni 1-4, poi una maxirata con tutto il resto`,
      `- **Bullet**: tutto il capitale alla scadenza, solo interessi nel frattempo`,
      '',
      "Bullet e balloon alleggeriscono il servizio del debito dei primi anni (per questo piacciono negli LBO), " +
        "ma il capitale resta piu' a lungo in essere e si paga di piu'. E alla scadenza serve rifinanziare.",
      '',
      'Le righe di debito iniziale e finale sono gia\' collegate: costruisci quote capitale e interessi, poi il confronto.',
    ].join('\n');

    const intest = ['', ...COLONNE.map((_, i) => `Anno ${i + 1}`)];
    const iniz = (row: number, rowFine: number) =>
      riga(`${COLONNE[0]}${row}`, COLONNE.map((_, i) => (i === 0 ? `=${B_PRINCIPAL}` : `=${COLONNE[i - 1]}${rowFine}`)), {
        style: STILE_FORMULA,
      });
    const fine = (row: number, rowIniz: number, rowQuota: number) =>
      riga(`${COLONNE[0]}${row}`, COLONNE.map((c) => `=${c}${rowIniz}-${c}${rowQuota}`), { style: STILE_FORMULA });
    const libere = (row: number, cols: readonly string[]) =>
      cols.map((c) => ({ ref: `${c}${row}`, content: null, locked: false, style: STILE_FORMULA }));

    const sheet = foglio('Model', [
      riga('A1', ['PIANI DI AMMORTAMENTO DEL DEBITO'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', ['Capitale (€)', 'Durata (anni)', "Tasso d'interesse", 'Quota annua balloon, anni 1-4'], {
        style: STILE_ETICHETTA,
      }),
      [{ ref: B_PRINCIPAL, content: principal, style: STILE_INPUT, locked: true }],
      [{ ref: B_YEARS, content: ANNI, style: { ...STILE_INPUT, numFmt: '0' }, locked: true }],
      [{ ref: B_RATE, content: rate, style: { ...STILE_INPUT_PCT, numFmt: '0.00%' }, locked: true }],
      [{ ref: B_BALLOON_PCT, content: balloonPct, style: { ...STILE_INPUT_PCT, numFmt: '0%' }, locked: true }],

      riga('A9', ['Lineare (€)', ...intest.slice(1)], { style: STILE_TITOLO }),
      colonna(`A${ROW_L_INIZ}`, ['Debito di inizio anno', 'Quota capitale', 'Interessi', 'Debito di fine anno'], {
        style: STILE_ETICHETTA,
      }),
      iniz(ROW_L_INIZ, ROW_L_FINE),
      libere(ROW_L_QUOTA, COLONNE),
      libere(ROW_L_INT, COLONNE),
      fine(ROW_L_FINE, ROW_L_INIZ, ROW_L_QUOTA),

      riga('A15', ['Balloon (€)', ...intest.slice(1)], { style: STILE_TITOLO }),
      colonna(`A${ROW_B_INIZ}`, ['Debito di inizio anno', 'Quota capitale', 'Debito di fine anno'], {
        style: STILE_ETICHETTA,
      }),
      iniz(ROW_B_INIZ, ROW_B_FINE),
      libere(ROW_B_QUOTA, COLONNE),
      fine(ROW_B_FINE, ROW_B_INIZ, ROW_B_QUOTA),

      riga('A20', ['Confronto', '€'], { style: STILE_TITOLO }),
      colonna('A21', ['Interessi totali bullet', 'Interessi in piu\' del bullet rispetto al lineare'], {
        style: STILE_ETICHETTA,
      }),
      [{ ref: B_BULLET_INT, content: null, locked: false, style: STILE_FORMULA }],
      [{ ref: B_EXTRA, content: null, locked: false, style: STILE_TOTALE }],
    ]);

    return {
      templateId: 'M10-03-AMORTIZATION',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${COLONNE[0]}${ROW_L_QUOTA}`,
      hints: [
        hint('H1', `In C${ROW_L_QUOTA}: =$B$4/$B$5, copiata a destra.`, 10, 'T1'),
        hint('H2', `In C${ROW_L_INT}: =C${ROW_L_INIZ}*$B$6.`, 10, 'T2'),
        hint('H3', `In C${ROW_B_QUOTA}: =$B$4*$B$7, fino a F${ROW_B_QUOTA}; in G${ROW_B_QUOTA}: =G${ROW_B_INIZ}.`, 10, 'T3'),
        hint('H4', `=B4*B6*B5; poi =B21-SUM(C${ROW_L_INT}:G${ROW_L_INT}).`, 10, 'T6'),
      ],
    };
  },
});

function rigaTask(
  id: string,
  rg: string,
  cosa: string,
  primo: number,
  ultimo: number,
  referenzia: readonly string[],
): Task {
  const [da, a] = rg.split(':');
  return {
    id,
    prompt: `${da}:${a}: ${cosa}. Una formula in ${da}, copiata fino a ${a}.`,
    targetCell: `Model!${rg}`,
    check: [
      { kind: 'mustBeFormula' },
      { kind: 'value', expected: primo },
      { kind: 'value', expected: ultimo, at: a },
      { kind: 'mustReference', cells: referenzia },
      { kind: 'mustNotContainLiteral', except: [] },
      { kind: 'consistentRow', range: `Model!${rg}` },
      { kind: 'noError' },
    ],
    skills: ['cred.amortization'],
    minKeystrokes: 16,
  };
}
