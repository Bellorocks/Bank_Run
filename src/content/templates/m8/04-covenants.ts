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
  title: 'Covenant e headroom: leverage ratio e interest coverage',
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

    const brief = [
      `Verifica il rispetto dei covenant bancari dell'operazione LBO.`,
      ``,
      `Dati di bilancio correnti:`,
      `- **EBITDA LTM**: ${eur(ebitda)}`,
      `- **PFN (Debito Netto)**: ${eur(netDebt)}`,
      `- **Interessi Passivi Annui**: ${eur(intExp)}`,
      ``,
      `Soglie contrattuali (Covenants):`,
      `- **Massimo Leverage Consentito**: ${multiplo(maxLevCov)}`,
      `- **Minimo Interest Coverage Ratio (ICR)**: ${multiplo(minIcrCov)}`,
      ``,
      `Il comitato non vuole sapere solo se oggi i covenant sono rispettati, ma **quanto margine c'e'**: ` +
        "di quanto puo' scendere l'EBITDA, a parita' di debito, prima che il leverage sfondi la soglia " +
        '(headroom). E\' il numero che decide se un anno storto diventa una rinegoziazione con le banche.',
      ``,
      `Calcola leverage e ICR effettivi, poi l'headroom sul leverage in euro di EBITDA e in percentuale.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['MONITORAGGIO COVENANTS LBO'], { style: STILE_TITOLO }),
      riga('A3', ['Dati Operativi & Debito', 'Valore (€)'], { style: STILE_TITOLO }),
      colonna('A4', ['EBITDA', 'Debito Netto (PFN)', 'Interessi Passivi Annui'], { style: STILE_ETICHETTA }),
      colonna('B4', [ebitda, netDebt, intExp], { style: STILE_INPUT }),

      riga('A8', ['Soglie Contrattuali (Covenants)', 'Soglia'], { style: STILE_TITOLO }),
      colonna('A9', ['Max Leverage (Net Debt / EBITDA)', 'Min ICR (EBITDA / Interessi)'], { style: STILE_ETICHETTA }),
      colonna('B9', [maxLevCov, minIcrCov], { style: STILE_INPUT_MULTIPLO }),

      riga('A12', ['Metriche Effettive & Headroom', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A13', [
        'Leverage Effettivo (x)',
        'ICR Effettivo (x)',
        'Headroom EBITDA (€)',
        'Headroom EBITDA (%)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_ACT_LEV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_ACT_ICR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_HEADROOM, [null], { style: STILE_TOTALE, locked: false }),
      colonna(B_HEADROOM_PCT, [null], { style: { ...STILE_FORMULA, numFmt: '0.0%' }, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `In ${B_ACT_LEV} il leverage effettivo, misurato come lo misura il covenant.`,
        target: `Model!${B_ACT_LEV}`,
        atteso: actLev,
        referenzia: [B_NET_DEBT, B_EBITDA],
        senzaLiteral: [],
        skills: ['lbo.covenants'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: `In ${B_ACT_ICR} l'interest coverage effettivo: quante volte l'EBITDA copre gli interessi.`,
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
          `In ${B_HEADROOM} l'headroom in euro: quanto EBITDA si puo' perdere, a parita' di debito netto, ` +
          'prima che il leverage arrivi esattamente alla soglia massima.',
        target: `Model!${B_HEADROOM}`,
        atteso: headroomEur,
        referenzia: [B_EBITDA, B_NET_DEBT, B_COV_LEV],
        senzaLiteral: [],
        skills: ['lbo.covenants'],
        minKeystrokes: 14,
      }),
      taskFormula({
        id: 'T4',
        prompt: `In ${B_HEADROOM_PCT} lo stesso headroom in percentuale dell'EBITDA attuale.`,
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
        hint('H1', 'Leverage = debito netto / EBITDA: =B5/B4.', 10, 'T1'),
        hint('H2', 'ICR = EBITDA / interessi: =B4/B6.', 10, 'T2'),
        hint('H3', "L'EBITDA minimo che rispetta il covenant e' B5/B9: =B4-B5/B9.", 15, 'T3'),
        hint('H4', '=B15/B4', 10, 'T4'),
      ],
    };
  },
});
