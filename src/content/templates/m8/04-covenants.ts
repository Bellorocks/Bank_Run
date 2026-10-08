/**
 * M8 · 04 — Covenant e Headroom: monitorare la tenuta finanziaria del deal.
 *
 * Le banche finanziatrici impongono covenant finanziari stringenti per
 * prevenire il rischio di default durante la vita dell'LBO:
 *
 *   1. Leverage Covenant: Net Debt / EBITDA <= Max Consentito (es. 4.00x).
 *   2. Interest Coverage Ratio (ICR): EBITDA / Interessi Passivi >= Min Consentito (es. 3.50x).
 *
 * L'HEADROOM (cuscinetto di sicurezza):
 * Misura di quanto l'EBITDA può scendere prima che scatti una violazione contrattuale (covenant breach):
 *   EBITDA minimo consentito = Net Debt / Max Leverage Covenant
 *   Headroom EBITDA (€) = EBITDA effettivo - EBITDA minimo consentito
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
  multiplo,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// Geometria fissa
const B_EBITDA = 'B4'; // EBITDA effettivo (dato)
const B_NET_DEBT = 'B5'; // Posizione Finanziaria Netta (debito netto) (dato)
const B_INT_EXP = 'B6'; // Interessi passivi annui (dato)

const B_COV_LEV = 'B9'; // Covenant Max Leverage (dato, es. 4.0x)

const B_ACT_LEV = 'B13'; // T1: Actual Leverage = Net Debt / EBITDA
const B_ACT_ICR = 'B14'; // T2: Actual ICR = EBITDA / Interessi
const B_HEADROOM = 'B15'; // T3: Headroom EBITDA (€) = EBITDA - (Net Debt / Max Leverage)
const B_HEADROOM_PCT = 'B16'; // T4: di quanto puo' scendere l'EBITDA prima del breach, in %

export default defineTemplate({
  id: 'M8-04-COVENANTS',
  module: 'M8',
  get title() {
    return tx('M8-04-COVENANTS.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.covenants'],
  prerequisites: ['M8-03-DEBTSCHEDULE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitda = roundTo(triangular(r, 10_000_000, 15_000_000, 20_000_000), 500_000);
    const netDebt = roundTo(ebitda * triangular(r, 3.0, 3.3, 3.6), 100_000);
    const intExp = roundTo(netDebt * triangular(r, 0.05, 0.065, 0.08), 50_000);

    const maxLevCov = roundTo(triangular(r, 3.75, 4.25, 4.75), 0.25);
    const minIcrCov = roundTo(triangular(r, 2.5, 3, 3.5), 0.25);

    const actLev = netDebt / ebitda;
    const actIcr = ebitda / intExp;
    const minEbitdaAllowed = netDebt / maxLevCov;
    const headroomEur = ebitda - minEbitdaAllowed;
    const headroomPct = headroomEur / ebitda;

    const brief = [tx('M8-04-COVENANTS.2', { p0: eur(ebitda), p1: eur(netDebt), p2: eur(intExp), p3: multiplo(maxLevCov), p4: multiplo(minIcrCov) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M8-04-COVENANTS.3')], { style: STILE_TITOLO }),
      riga('A3', [tx('M8-04-COVENANTS.4'), tx('M8-04-COVENANTS.5')], { style: STILE_TITOLO }),
      colonna('A4', [tx('M8-04-COVENANTS.23'), tx('M8-04-COVENANTS.6'), tx('M8-04-COVENANTS.7')], { style: STILE_ETICHETTA }),
      colonna('B4', [ebitda, netDebt, intExp], { style: STILE_INPUT }),

      riga('A8', [tx('M8-04-COVENANTS.8'), tx('M8-04-COVENANTS.24')], { style: STILE_TITOLO }),
      colonna('A9', [tx('M8-04-COVENANTS.9'), tx('M8-04-COVENANTS.10')], { style: STILE_ETICHETTA }),
      colonna('B9', [maxLevCov, minIcrCov], { style: STILE_INPUT_MULTIPLO }),

      riga('A12', [tx('M8-04-COVENANTS.11'), tx('M8-04-COVENANTS.25')], { style: STILE_TITOLO }),
      colonna('A13', [
        tx('M8-04-COVENANTS.12'),
        tx('M8-04-COVENANTS.13'),
        tx('M8-04-COVENANTS.14'),
        tx('M8-04-COVENANTS.15'),
      ], { style: STILE_ETICHETTA }),
      colonna(B_ACT_LEV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_ACT_ICR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_HEADROOM, [null], { style: STILE_TOTALE, locked: false }),
      colonna(B_HEADROOM_PCT, [null], { style: { ...STILE_FORMULA, numFmt: '0.0%' }, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: tx('M8-04-COVENANTS.16', { B_ACT_LEV }),
        target: `Model!${B_ACT_LEV}`,
        atteso: actLev,
        referenzia: [B_NET_DEBT, B_EBITDA],
        senzaLiteral: [],
        skills: ['lbo.covenants'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: tx('M8-04-COVENANTS.17', { B_ACT_ICR }),
        target: `Model!${B_ACT_ICR}`,
        atteso: actIcr,
        referenzia: [B_EBITDA, B_INT_EXP],
        senzaLiteral: [],
        skills: ['lbo.covenants'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt:
          tx('M8-04-COVENANTS.18', { B_HEADROOM }),
        target: `Model!${B_HEADROOM}`,
        atteso: headroomEur,
        referenzia: [B_EBITDA, B_NET_DEBT, B_COV_LEV],
        senzaLiteral: [],
        skills: ['lbo.covenants'],
        minKeystrokes: 14,
      }),
      taskFormula({
        id: 'T4',
        prompt: tx('M8-04-COVENANTS.19', { B_HEADROOM_PCT }),
        target: `Model!${B_HEADROOM_PCT}`,
        atteso: headroomPct,
        referenzia: [B_HEADROOM, B_EBITDA],
        senzaLiteral: [],
        skills: ['lbo.covenants'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M8-04-COVENANTS',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!${B_ACT_LEV}`,
      hints: [
        hint('H1', tx('M8-04-COVENANTS.20'), 10, 'T1'),
        hint('H2', tx('M8-04-COVENANTS.21'), 10, 'T2'),
        hint('H3', tx('M8-04-COVENANTS.22'), 15, 'T3'),
        hint('H4', '=B15/B4', 10, 'T4'),
      ],
    };
  },
});
