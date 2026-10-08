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
    const intExp = roundTo(netDebt * 0.06, 50_000);

    const maxLevCov = 4.25;
    const minIcrCov = 3.0;

    const actLev = netDebt / ebitda;
    const actIcr = ebitda / intExp;
    const minEbitdaAllowed = netDebt / maxLevCov;
    const headroomEur = ebitda - minEbitdaAllowed;

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
      `### I tuoi compiti:`,
      `1. Calcola il **Leverage Ratio Effettivo** in \`${B_ACT_LEV}\` come rapporto tra Debito Netto ed EBITDA: \`=${B_NET_DEBT}/${B_EBITDA}\`.`,
      `2. Calcola l'**ICR Effettivo** in \`${B_ACT_ICR}\` come rapporto tra EBITDA e Interessi Passivi: \`=${B_EBITDA}/${B_INT_EXP}\`.`,
      `3. Calcola l'**Headroom di EBITDA (€)** in \`${B_HEADROOM}\` (il cuscinetto di sicurezza prima del breach): \`=${B_EBITDA}-(${B_NET_DEBT}/${B_COV_LEV})\`.`,
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
      ], { style: STILE_ETICHETTA }),
      colonna(B_ACT_LEV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_ACT_ICR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_HEADROOM, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il Leverage effettivo in ${B_ACT_LEV}: =${B_NET_DEBT}/${B_EBITDA}.`,
        target: `Model!${B_ACT_LEV}`,
        atteso: actLev,
        referenzia: [B_NET_DEBT, B_EBITDA],
        skills: ['lbo.covenants'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'ICR effettivo in ${B_ACT_ICR}: =${B_EBITDA}/${B_INT_EXP}.`,
        target: `Model!${B_ACT_ICR}`,
        atteso: actIcr,
        referenzia: [B_EBITDA, B_INT_EXP],
        skills: ['lbo.covenants'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola l'Headroom di EBITDA (€) in ${B_HEADROOM}: =${B_EBITDA}-(${B_NET_DEBT}/${B_COV_LEV}).`,
        target: `Model!${B_HEADROOM}`,
        atteso: headroomEur,
        referenzia: [B_EBITDA, B_NET_DEBT, B_COV_LEV],
        skills: ['lbo.covenants'],
      }),
    ];

    return {
      templateId: 'M8-04-COVENANTS',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B13 dividi il debito netto per l\'EBITDA: =B5/B4.', 10, 'T1'),
        hint('H2', 'In B14 dividi l\'EBITDA per gli interessi: =B4/B6.', 10, 'T2'),
        hint('H3', 'In B15 calcola quanto EBITDA resta sopra la soglia minima: =B4-(B5/B9).', 15, 'T3'),
      ],
    };
  },
});
