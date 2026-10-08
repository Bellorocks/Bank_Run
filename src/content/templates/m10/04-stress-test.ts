/**
 * M10 · 04 — Stress Test di Credito: shock su ricavi, margini e tassi.
 *
 * Le banche sottopongono i modelli a stress test per valutare la tenuta in scenari avversi:
 *
 *   1. Shock sui Ricavi: contrazione del 15% (Ricavi Stressati = Ricavi Base × 85%).
 *   2. Shock sui Margini: contrazione di 300 bps (Margine EBITDA Stressato = Margine Base - 3.0%).
 *   3. EBITDA Stressato = Ricavi Stressati × Margine EBITDA Stressato.
 *   4. Shock sui Tassi: aumento di +200 bps sul costo del debito (Interessi Stressati = Debito × Tasso Stressato).
 *   5. DSCR Stressato = (EBITDA Stressato × 60% CFADS Conversion) / (Interessi Stressati + Ammortamento Capitale).
 *   6. Covenant Breach Flag: se DSCR Stressato < 1.05x -> "BREACH", altrimenti "OK".
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

// Geometria fissa
const B_REV_BASE = 'B4'; // Ricavi Base (dato)
const B_MRG_BASE = 'B5'; // Margine EBITDA Base (dato)
const B_DEBT = 'B6'; // Debito Totale (dato)
const B_MAND_AMORT = 'B7'; // Ammortamento annuo capitale (dato)

const B_REV_SHOCK = 'B10'; // Shock Ricavi (-15%) (dato)
const B_MRG_SHOCK = 'B11'; // Shock Margine (-3.0%) (dato)
const B_RATE_STRESS = 'B12'; // Tasso Debito Stressato (8.0%) (dato)

const B_EBITDA_STRESS = 'B15'; // T1: EBITDA Stressato = (B4 * (1 + B10)) * (B5 + B11)
const B_INT_STRESS = 'B16'; // T2: Interessi Stressati = B6 * B12
const B_DSCR_STRESS = 'B17'; // T3: DSCR Stressato = (B15 * 0.60) / (B16 + B7)

export default defineTemplate({
  id: 'M10-04-STRESSTEST',
  module: 'M10',
  title: 'Stress test di credito: shock su ricavi, margini e tassi',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['cred.stress'],
  prerequisites: ['M10-03-AMORTIZATION', 'M8-04-COVENANTS'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const revBase = roundTo(triangular(r, 80_000_000, 100_000_000, 120_000_000), 5_000_000);
    const mrgBase = 0.20; // 20.0%
    const debt = roundTo(revBase * 0.35, 1_000_000);
    const mandAmort = roundTo(debt * 0.10, 500_000);

    const revShock = -0.15; // -15%
    const mrgShock = -0.03; // -3.0% (margine scende al 17%)
    const rateStress = 0.08; // 8.0% tasso debito stressato

    const revStress = revBase * (1 + revShock);
    const mrgStress = mrgBase + mrgShock;
    const ebitdaStress = revStress * mrgStress;
    const intStress = debt * rateStress;
    const cfadsStress = ebitdaStress * 0.60;
    const dscrStress = cfadsStress / (intStress + mandAmort);

    const brief = [
      `Esegui lo **Stress Test di Credito** bancario per verificare la tenuta della società in uno scenario di recessione.`,
      ``,
      `Scenario Base vs Ipotesi di Shock:`,
      `- **Ricavi Base**: ${eur(revBase)} con **Margine EBITDA Base**: ${pct(mrgBase)}`,
      `- **Debito Totale**: ${eur(debt)} (Ammortamento Capitale Annuo: ${eur(mandAmort)})`,
      `- **Shock sui Ricavi**: ${pct(revShock)}`,
      `- **Shock sui Margini EBITDA**: ${pct(mrgShock)} (-300 bps)`,
      `- **Tasso Debito Stressato**: ${pct(rateStress)}/anno`,
      `- **Conversione EBITDA in Cassa Operativa (CFADS)**: 60%`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'**EBITDA Stressato (€)** in \`${B_EBITDA_STRESS}\`: \`=(${B_REV_BASE}*(1+${B_REV_SHOCK}))*(${B_MRG_BASE}+${B_MRG_SHOCK})\`.`,
      `2. Calcola gli **Interessi Passivi Stressati (€)** in \`${B_INT_STRESS}\`: \`=${B_DEBT}*${B_RATE_STRESS}\`.`,
      `3. Calcola il **DSCR Stressato (x)** in \`${B_DSCR_STRESS}\` assumendo CFADS pari al 60% dell'EBITDA stressato: \`=(${B_EBITDA_STRESS}*0.60)/(${B_INT_STRESS}+${B_MAND_AMORT})\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['STRESS TEST DI CREDITO (RECESSION SCENARIO)'], { style: STILE_TITOLO }),
      riga('A3', ['Dati di Bilancio Baseline', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Ricavi Baseline (€)',
        'Margine EBITDA Baseline (%)',
        'Debito Totale (€)',
        'Ammortamento Capitale Annuo (€)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [revBase], { style: STILE_INPUT }),
      colonna(B_MRG_BASE, [mrgBase], { style: STILE_INPUT_PCT }),
      colonna(B_DEBT, [debt, mandAmort], { style: STILE_INPUT }),

      riga('A9', ['Parametri dello Stress Test', 'Valore Shock'], { style: STILE_TITOLO }),
      colonna('A10', [
        'Shock Ricavi (%)',
        'Shock Margine EBITDA (p.p.)',
        'Tasso di Interesse Stressato (%)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_REV_SHOCK, [revShock, mrgShock, rateStress], { style: STILE_INPUT_PCT }),

      riga('A14', ['Metriche Ricalcolate sotto Stress', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A15', [
        'EBITDA Stressato (€)',
        'Interessi Passivi Stressati (€)',
        'DSCR Stressato (x)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_EBITDA_STRESS, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_INT_STRESS, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_DSCR_STRESS, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola l'EBITDA stressato in ${B_EBITDA_STRESS}: =(${B_REV_BASE}*(1+${B_REV_SHOCK}))*(${B_MRG_BASE}+${B_MRG_SHOCK}).`,
        target: `Model!${B_EBITDA_STRESS}`,
        atteso: ebitdaStress,
        referenzia: [B_REV_BASE, B_REV_SHOCK, B_MRG_BASE, B_MRG_SHOCK],
        skills: ['cred.stress'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola gli interessi stressati in ${B_INT_STRESS}: =${B_DEBT}*${B_RATE_STRESS}.`,
        target: `Model!${B_INT_STRESS}`,
        atteso: intStress,
        referenzia: [B_DEBT, B_RATE_STRESS],
        skills: ['cred.stress'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il DSCR stressato in ${B_DSCR_STRESS}: =(${B_EBITDA_STRESS}*0.60)/(${B_INT_STRESS}+${B_MAND_AMORT}).`,
        target: `Model!${B_DSCR_STRESS}`,
        atteso: dscrStress,
        referenzia: [B_EBITDA_STRESS, B_INT_STRESS, B_MAND_AMORT],
        skills: ['cred.stress'],
      }),
    ];

    return {
      templateId: 'M10-04-STRESSTEST',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B15 moltiplica i ricavi ridotti per il nuovo margine: =(B4*(1+B10))*(B5+B11).', 15, 'T1'),
        hint('H2', 'In B16 moltiplica il debito per il tasso stressato: =B6*B12.', 10, 'T2'),
        hint('H3', 'In B17 calcola il rapporto tra il 60% dell\'EBITDA stressato e il servizio del debito: =(B15*0.6)/(B16+B7).', 15, 'T3'),
      ],
    };
  },
});
