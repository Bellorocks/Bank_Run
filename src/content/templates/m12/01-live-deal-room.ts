/**
 * M12 · 01 — Live Deal Room: la transazione LBO integrata. [BOSS]
 *
 * Il livello finale tiene insieme il curriculum in un unico modello che si
 * chiude da solo, dall'EBITDA normalizzato fino alla decisione d'investimento:
 *
 *   1. Quality of Earnings: EBITDA riportato + addback legittimi.
 *   2. Sources & Uses, cash free / debt free: il compratore paga l'equity al
 *      venditore E rifinanzia il debito netto esistente, piu' le fee. Il debito
 *      nuovo copre una parte degli impieghi, lo sponsor mette il resto.
 *   3. Piano di rimborso su cinque anni con cash sweep al 100%: interessi sul
 *      debito di inizio anno (niente circolarita'), cassa disponibile, rimborso
 *      limitato dal debito residuo (MIN), debito di fine anno.
 *   4. Uscita: EV di uscita, equity di uscita, MoIC, IRR e una decisione
 *      INVESTI / PASSA contro l'hurdle del comitato, che dipende dal seed.
 *
 * Nessun prompt detta la formula: il mandato descrive la finanza, i
 * suggerimenti (a pagamento) danno la sintassi.
 *
 * Vincoli per costruzione, verificati nel generatore:
 *   - la cassa disponibile per il rimborso e' positiva ogni anno (la
 *     conversione in cassa supera sempre il costo del debito iniziale);
 *   - il debito non si estingue entro l'anno 5, cosi' non resta cassa
 *     inutilizzata da portare all'uscita (il modello non ha una riga cassa).
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eurM,
  multiplo,
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const ANNI = 5;
const COLONNE = ['C', 'D', 'E', 'F', 'G'] as const;
const ULTIMA = COLONNE[ANNI - 1];

// 1. Quality of Earnings
const B_EBITDA_REP = 'B4';
const B_ADD_SOCIO = 'B5';
const B_ADD_LEGALI = 'B6';
const B_EBITDA_NORM = 'B8';

// 2. Ipotesi
const B_MULT_IN = 'B11';
const B_ND_ESISTENTE = 'B12';
const B_FEE_PCT = 'B13';
const B_LEVA = 'B14';
const B_TASSO = 'B15';
const B_CRESCITA = 'B16';
const B_CONVERSIONE = 'B17';
const B_MULT_OUT = 'B18';
const B_HURDLE = 'B19';
const B_ANNI = 'B20';

// 3. Sources & Uses
const B_EV = 'B23';
const B_PREZZO_EQ = 'B24';
const B_FEE = 'B25';
const B_IMPIEGHI = 'B26';
const B_DEBITO = 'B27';
const B_SPONSOR = 'B28';

// 4. Piano di rimborso
const ROW_INTEST = 30;
const ROW_EBITDA = 31;
const ROW_INTERESSI = 32;
const ROW_CASSA = 33;
const ROW_RIMBORSO = 34;
const ROW_DEBITO = 35;

// 5. Uscita e decisione
const B_EV_OUT = 'B38';
const B_EQ_OUT = 'B39';
const B_MOIC = 'B40';
const B_IRR = 'B41';
const B_DECISIONE = 'B42';

const rowRange = (row: number) => `${COLONNE[0]}${row}:${ULTIMA}${row}`;

export default defineTemplate({
  id: 'M12-01-DEALROOM',
  module: 'M12',
  get title() {
    return tx('M12-01-DEALROOM.title');
  },
  rank: 5,
  mode: 'BOSS',
  estimatedSeconds: 1200,
  skills: ['qoe.normalization', 'lbo.sources-uses', 'lbo.debt-schedule', 'lbo.returns', 'lbo.exit'],
  prerequisites: [
    'M8-11-RETURNSATTRIBUTION',
    'M9-07-PROFORMALEVERAGE',
    'M10-05-REFINANCING',
    'M11-06-RESTATEMENT',
  ],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitdaRep = roundTo(triangular(r, 15_000_000, 20_000_000, 25_000_000), 100_000);
    const addSocio = roundTo(triangular(r, 300_000, 700_000, 1_200_000), 10_000);
    const addLegali = roundTo(triangular(r, 200_000, 600_000, 1_000_000), 10_000);
    const ebitdaNorm = ebitdaRep + addSocio + addLegali;

    const multIn = roundTo(triangular(r, 6.5, 8, 9.5), 0.5);
    const ndEsistente = roundTo(ebitdaNorm * triangular(r, 1, 1.8, 2.5), 100_000);
    const feePct = roundTo(triangular(r, 0.02, 0.025, 0.035), 0.001);
    const leva = roundTo(triangular(r, 4, 4.75, 5.5), 0.25);
    const tasso = roundTo(triangular(r, 0.065, 0.075, 0.09), 0.0025);
    const crescita = roundTo(triangular(r, 0.03, 0.06, 0.09), 0.005);
    // Conversione in cassa sempre sopra il costo del debito iniziale: almeno
    // 10 punti di EBITDA restano per il rimborso gia' nel primo anno.
    const conversione = roundTo(leva * tasso + triangular(r, 0.1, 0.18, 0.25), 0.01);
    const multOut = roundTo(multIn + triangular(r, -1, 0, 1.5), 0.5);
    // L'hurdle si estrae dopo aver calcolato l'IRR (in fondo): cade sempre a
    // 1-4 punti dall'IRR, sopra o sotto, cosi' entrambe le decisioni escono
    // con la stessa frequenza e nessuna e' un pareggio ambiguo.
    const rHurdle = rng.fork('hurdle');

    // --- Sources & Uses ---
    const ev = ebitdaNorm * multIn;
    const prezzoEquity = ev - ndEsistente;
    const fee = ev * feePct;
    const impieghi = prezzoEquity + ndEsistente + fee;
    const debito = ebitdaNorm * leva;
    const sponsor = impieghi - debito;

    // --- Piano di rimborso ---
    const ebitda: number[] = [];
    const interessi: number[] = [];
    const cassa: number[] = [];
    const rimborso: number[] = [];
    const debitoFine: number[] = [];
    let ePrec = ebitdaNorm;
    let dPrec = debito;
    for (let t = 0; t < ANNI; t++) {
      const e = ePrec * (1 + crescita);
      const i = dPrec * tasso;
      const c = e * conversione - i;
      const rim = Math.min(dPrec, c);
      const d = dPrec - rim;
      if (c <= 0) throw new Error('M12-01: cassa per il rimborso non positiva');
      ebitda.push(e);
      interessi.push(i);
      cassa.push(c);
      rimborso.push(rim);
      debitoFine.push(d);
      ePrec = e;
      dPrec = d;
    }
    if (debitoFine[ANNI - 1] <= 0) throw new Error('M12-01: debito estinto prima dell\'uscita');

    // --- Uscita ---
    const evOut = ebitda[ANNI - 1] * multOut;
    const eqOut = evOut - debitoFine[ANNI - 1];
    const moic = eqOut / sponsor;
    const irr = Math.pow(moic, 1 / ANNI) - 1;
    const scarto = (rHurdle.next() < 0.5 ? -1 : 1) * (0.01 + rHurdle.next() * 0.03);
    const hurdle = Math.min(0.3, Math.max(0.1, roundTo(irr + scarto, 0.01)));
    const INVESTI = tx('common.tok.investi');
    const PASSA = tx('common.tok.passa');
    const decisione = irr >= hurdle ? INVESTI : PASSA;

    const c1 = COLONNE[0];
    const tasks: Task[] = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M12-01-DEALROOM.2', { B_EBITDA_NORM }),
        target: `Model!${B_EBITDA_NORM}`,
        atteso: ebitdaNorm,
        referenzia: [B_EBITDA_REP, B_ADD_SOCIO, B_ADD_LEGALI],
        senzaLiteral: [],
        skills: ['qoe.normalization'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M12-01-DEALROOM.3', { B_EV }),
        target: `Model!${B_EV}`,
        atteso: ev,
        referenzia: [B_EBITDA_NORM, B_MULT_IN],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: tx('M12-01-DEALROOM.4', { B_PREZZO_EQ }),
        target: `Model!${B_PREZZO_EQ}`,
        atteso: prezzoEquity,
        referenzia: [B_EV, B_ND_ESISTENTE],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T4',
        prompt: tx('M12-01-DEALROOM.5', { B_FEE }),
        target: `Model!${B_FEE}`,
        atteso: fee,
        referenzia: [B_EV, B_FEE_PCT],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T5',
        prompt:
          tx('M12-01-DEALROOM.6', { B_IMPIEGHI }),
        target: `Model!${B_IMPIEGHI}`,
        atteso: impieghi,
        referenzia: [B_PREZZO_EQ, B_ND_ESISTENTE, B_FEE],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T6',
        prompt: tx('M12-01-DEALROOM.7', { B_DEBITO }),
        target: `Model!${B_DEBITO}`,
        atteso: debito,
        referenzia: [B_EBITDA_NORM, B_LEVA],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T7',
        prompt: tx('M12-01-DEALROOM.8', { B_SPONSOR }),
        target: `Model!${B_SPONSOR}`,
        atteso: sponsor,
        referenzia: [B_IMPIEGHI, B_DEBITO],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
      }),
      rigaPiano(
        'T8',
        ROW_EBITDA,
        tx('M12-01-DEALROOM.9', { ROW_EBITDA, p1: rowRange(ROW_EBITDA) }),
        ebitda[0],
        ebitda[ANNI - 1],
        [`B${ROW_EBITDA}`, B_CRESCITA],
        ['lbo.debt-schedule'],
      ),
      rigaPiano(
        'T9',
        ROW_INTERESSI,
        tx('M12-01-DEALROOM.10', { ROW_INTERESSI }),
        interessi[0],
        interessi[ANNI - 1],
        [`B${ROW_DEBITO}`, B_TASSO],
        ['lbo.debt-schedule'],
      ),
      rigaPiano(
        'T10',
        ROW_CASSA,
        tx('M12-01-DEALROOM.11', { ROW_CASSA }),
        cassa[0],
        cassa[ANNI - 1],
        [`${c1}${ROW_EBITDA}`, B_CONVERSIONE, `${c1}${ROW_INTERESSI}`],
        ['lbo.debt-schedule'],
      ),
      rigaPiano(
        'T11',
        ROW_RIMBORSO,
        tx('M12-01-DEALROOM.12', { ROW_RIMBORSO }),
        rimborso[0],
        rimborso[ANNI - 1],
        [`B${ROW_DEBITO}`, `${c1}${ROW_CASSA}`],
        ['lbo.debt-schedule'],
        ['MIN'],
      ),
      rigaPiano(
        'T12',
        ROW_DEBITO,
        tx('M12-01-DEALROOM.13', { ROW_DEBITO }),
        debitoFine[0],
        debitoFine[ANNI - 1],
        [`B${ROW_DEBITO}`, `${c1}${ROW_RIMBORSO}`],
        ['lbo.debt-schedule'],
      ),
      taskFormula({
        id: 'T13',
        prompt: tx('M12-01-DEALROOM.14', { B_EV_OUT, ANNI }),
        target: `Model!${B_EV_OUT}`,
        atteso: evOut,
        referenzia: [`${ULTIMA}${ROW_EBITDA}`, B_MULT_OUT],
        senzaLiteral: [],
        skills: ['lbo.exit'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T14',
        prompt: tx('M12-01-DEALROOM.15', { B_EQ_OUT }),
        target: `Model!${B_EQ_OUT}`,
        atteso: eqOut,
        referenzia: [B_EV_OUT, `${ULTIMA}${ROW_DEBITO}`],
        senzaLiteral: [],
        skills: ['lbo.exit'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T15',
        prompt: tx('M12-01-DEALROOM.16', { B_MOIC }),
        target: `Model!${B_MOIC}`,
        atteso: moic,
        referenzia: [B_EQ_OUT, B_SPONSOR],
        senzaLiteral: [],
        skills: ['lbo.returns'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T16',
        prompt:
          tx('M12-01-DEALROOM.17', { B_IRR, B_ANNI }),
        target: `Model!${B_IRR}`,
        atteso: irr,
        referenzia: [B_MOIC, B_ANNI],
        senzaLiteral: [1],
        skills: ['lbo.returns'],
        minKeystrokes: 14,
      }),
      {
        id: 'T17',
        prompt:
          tx('M12-01-DEALROOM.18', { B_DECISIONE, B_HURDLE }),
        targetCell: `Model!${B_DECISIONE}`,
        check: [
          { kind: 'mustBeFormula' },
          { kind: 'text', expected: decisione },
          { kind: 'mustReference', cells: [B_IRR, B_HURDLE] },
          { kind: 'mustUseFunction', functions: ['IF'] },
        ],
        skills: ['lbo.returns', 'xl.logical'],
        minKeystrokes: 30,
      },
    ];

    const brief = [tx('M12-01-DEALROOM.19', { p0: multiplo(multIn), p1: multiplo(leva), p2: pct(tasso, 2), p3: pct(crescita), p4: pct(conversione, 0), ANNI, p6: multiplo(multOut), p7: pct(hurdle, 0), p8: eurM(ebitdaRep) })].join('\n');

    const intestazioni = ['Closing', ...COLONNE.map((_, i) => `Anno ${i + 1}`)];

    const sheet = foglio(
      'Model',
      [
        riga('A1', [tx('M12-01-DEALROOM.20')], { style: STILE_TITOLO }),

        riga('A3', [tx('M12-01-DEALROOM.21'), '€'], { style: STILE_TITOLO }),
        colonna(
          'A4',
          [tx('M12-01-DEALROOM.22'), tx('M12-01-DEALROOM.23'), tx('M12-01-DEALROOM.24')],
          { style: STILE_ETICHETTA },
        ),
        colonna(B_EBITDA_REP, [ebitdaRep, addSocio, addLegali], { style: STILE_INPUT }),
        colonna('A8', [tx('M12-01-DEALROOM.25')], { style: STILE_ETICHETTA }),
        [{ ref: B_EBITDA_NORM, content: null, locked: false, style: STILE_TOTALE }],

        riga('A10', [tx('M12-01-DEALROOM.58')], { style: STILE_TITOLO }),
        colonna(
          'A11',
          [
            tx('M12-01-DEALROOM.26'),
            tx('M12-01-DEALROOM.27'),
            tx('M12-01-DEALROOM.28'),
            tx('M12-01-DEALROOM.29'),
            tx('M12-01-DEALROOM.30'),
            tx('M12-01-DEALROOM.31'),
            tx('M12-01-DEALROOM.32'),
            tx('M12-01-DEALROOM.33'),
            tx('M12-01-DEALROOM.34'),
            tx('M12-01-DEALROOM.35'),
          ],
          { style: STILE_ETICHETTA },
        ),
        [{ ref: B_MULT_IN, content: multIn, style: STILE_INPUT_MULTIPLO, locked: true }],
        [{ ref: B_ND_ESISTENTE, content: ndEsistente, style: STILE_INPUT, locked: true }],
        [{ ref: B_FEE_PCT, content: feePct, style: STILE_INPUT_PCT, locked: true }],
        [{ ref: B_LEVA, content: leva, style: STILE_INPUT_MULTIPLO, locked: true }],
        [{ ref: B_TASSO, content: tasso, style: { ...STILE_INPUT_PCT, numFmt: '0.00%' }, locked: true }],
        [{ ref: B_CRESCITA, content: crescita, style: STILE_INPUT_PCT, locked: true }],
        [{ ref: B_CONVERSIONE, content: conversione, style: STILE_INPUT_PCT, locked: true }],
        [{ ref: B_MULT_OUT, content: multOut, style: STILE_INPUT_MULTIPLO, locked: true }],
        [{ ref: B_HURDLE, content: hurdle, style: STILE_INPUT_PCT, locked: true }],
        [{ ref: B_ANNI, content: ANNI, style: { ...STILE_INPUT, numFmt: '0' }, locked: true }],

        riga('A22', [tx('M12-01-DEALROOM.36'), '€'], { style: STILE_TITOLO }),
        colonna(
          'A23',
          [
            tx('M12-01-DEALROOM.37'),
            tx('M12-01-DEALROOM.38'),
            tx('M12-01-DEALROOM.39'),
            tx('M12-01-DEALROOM.40'),
            tx('M12-01-DEALROOM.41'),
            tx('M12-01-DEALROOM.42'),
          ],
          { style: STILE_ETICHETTA },
        ),
        [{ ref: B_EV, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_PREZZO_EQ, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_FEE, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_IMPIEGHI, content: null, locked: false, style: STILE_TOTALE }],
        [{ ref: B_DEBITO, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_SPONSOR, content: null, locked: false, style: STILE_TOTALE }],

        riga(`A${ROW_INTEST}`, [tx('M12-01-DEALROOM.43'), ...intestazioni], { style: STILE_TITOLO }),
        colonna(
          `A${ROW_EBITDA}`,
          [tx('M12-01-DEALROOM.59'), tx('M12-01-DEALROOM.44'), tx('M12-01-DEALROOM.45'), tx('M12-01-DEALROOM.46'), tx('M12-01-DEALROOM.47')],
          { style: STILE_ETICHETTA },
        ),
        [{ ref: `B${ROW_EBITDA}`, content: `=${B_EBITDA_NORM}`, style: STILE_FORMULA, locked: true }],
        [{ ref: `B${ROW_DEBITO}`, content: `=${B_DEBITO}`, style: STILE_FORMULA, locked: true }],
        ...[ROW_EBITDA, ROW_INTERESSI, ROW_CASSA, ROW_RIMBORSO, ROW_DEBITO].map((row) =>
          COLONNE.map((c) => ({
            ref: `${c}${row}`,
            content: null,
            locked: false,
            style: row === ROW_DEBITO ? STILE_TOTALE : STILE_FORMULA,
          })),
        ),

        riga('A37', [tx('M12-01-DEALROOM.48')], { style: STILE_TITOLO }),
        colonna(
          'A38',
          [tx('M12-01-DEALROOM.49'), tx('M12-01-DEALROOM.50'), tx('M12-01-DEALROOM.60'), tx('M12-01-DEALROOM.61'), tx('M12-01-DEALROOM.62')],
          { style: STILE_ETICHETTA },
        ),
        [{ ref: B_EV_OUT, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_EQ_OUT, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_MOIC, content: null, locked: false, style: { ...STILE_FORMULA, numFmt: '0.00x' } }],
        [{ ref: B_IRR, content: null, locked: false, style: STILE_FORMULA_PCT }],
        [{ ref: B_DECISIONE, content: null, locked: false, style: { ...STILE_TOTALE, numFmt: '@' } }],
      ],
      { colWidths: { A: 380, B: 130, C: 120, D: 120, E: 120, F: 120, G: 120 }, frozenCols: 1 },
    );

    return {
      templateId: 'M12-01-DEALROOM',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 120 }),
      startAt: `Model!${B_EBITDA_NORM}`,
      hints: [
        hint('H1', tx('M12-01-DEALROOM.51', { B_EBITDA_REP, B_ADD_LEGALI }), 15, 'T1'),
        hint(
          'H2',
          tx('M12-01-DEALROOM.52', { B_PREZZO_EQ, B_ND_ESISTENTE, B_FEE, B_EV }),
          20,
          'T5',
        ),
        hint('H3', tx('M12-01-DEALROOM.53', { B_IMPIEGHI, B_DEBITO }), 15, 'T7'),
        hint(
          'H4',
          tx('M12-01-DEALROOM.54', { c1, ROW_EBITDA, p2: B_CRESCITA.slice(0, 1), p3: B_CRESCITA.slice(1) }),
          20,
          'T8',
        ),
        hint(
          'H5',
          tx('M12-01-DEALROOM.55', { c1, ROW_INTERESSI, ROW_DEBITO, p3: B_TASSO.slice(1) }),
          20,
          'T9',
        ),
        hint(
          'H6',
          tx('M12-01-DEALROOM.56', { c1, ROW_RIMBORSO, ROW_DEBITO, ROW_CASSA }),
          20,
          'T11',
        ),
        hint('H7', tx('M12-01-DEALROOM.57', { B_MOIC, B_ANNI }), 20, 'T16'),
        hint('H8', `=IF(${B_IRR}>=${B_HURDLE},"${INVESTI}","${PASSA}")`, 15, 'T17'),
      ],
    };
  },
});

/** Una riga del piano: la formula di C copiata fino a G, coerente e senza errori. */
function rigaPiano(
  id: string,
  row: number,
  prompt: string,
  attesoPrimoAnno: number,
  attesoUltimoAnno: number,
  referenzia: readonly string[],
  skills: readonly string[],
  funzioni?: readonly string[],
): Task {
  const range = rowRange(row);
  return {
    id,
    prompt,
    targetCell: `Model!${range}`,
    check: [
      { kind: 'mustBeFormula' },
      { kind: 'value', expected: attesoPrimoAnno },
      { kind: 'value', expected: attesoUltimoAnno, at: `${ULTIMA}${row}` },
      { kind: 'mustReference', cells: referenzia },
      { kind: 'mustNotContainLiteral', except: [0, 1] },
      ...(funzioni ? [{ kind: 'mustUseFunction' as const, functions: funzioni }] : []),
      { kind: 'consistentRow', range: `Model!${range}` },
      { kind: 'noError' },
    ],
    skills,
    minKeystrokes: 20,
  };
}
