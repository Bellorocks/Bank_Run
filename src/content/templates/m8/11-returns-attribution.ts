/**
 * M8 · 11 — Returns Attribution: la waterfall completa dei rendimenti LBO. [COMBO]
 *
 * Livello conclusivo del modulo LBO. Integra l'intera cascata distributiva (Waterfall):
 *
 *   1. Exit Enterprise Value = Exit EBITDA × Exit Multiple.
 *   2. Gross Exit Equity Value = Exit Enterprise Value - Ending Net Debt.
 *   3. Mezzanine Equity Kicker (es. 3.0% del Gross Equity).
 *   4. Management Incentive Pool (MIP) (es. 7.0% del Gross Equity).
 *   5. Net Equity allo Sponsor = Gross Exit Equity - Mezzanine Kicker - Management MIP.
 *   6. Sponsor Net MoIC = Sponsor Net Equity / Sponsor Initial Equity.
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
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_EXIT_MULT = 'B5'; // Multiplo di uscita (dato)
const B_EXIT_EV = 'B6'; // Exit EV = B4*B5 (formula)
const B_END_ND = 'B7'; // Debito Netto finale (dato)

const B_GROSS_EQ = 'B9'; // T1: Gross Exit Equity = B6 - B7

const B_MEZZ_KICKER_PCT = 'B11'; // % Mezzanine Kicker (3.0%) (dato)
const B_MGT_MIP_PCT = 'B12'; // % Management MIP (7.0%) (dato)
const C_MEZZ_VAL = 'C11'; // Valore Kicker = B9 * B11 (formula)
const C_MGT_VAL = 'C12'; // Valore MIP = B9 * B12 (formula)

const B_SPONSOR_ENTRY = 'B15'; // Sponsor Entry Equity (dato)
const B_SPONSOR_NET = 'B16'; // T2: Sponsor Net Equity = B9 - C11 - C12
const B_SPONSOR_MOIC = 'B17'; // T3: Sponsor Net MoIC = B16 / B15

export default defineTemplate({
  id: 'M8-11-RETURNSATTRIBUTION',
  module: 'M8',
  title: 'Returns attribution: la waterfall completa dei rendimenti LBO',
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['lbo.attribution'],
  prerequisites: ['M8-05-MIPRATCHET', 'M8-06-RETURNSIRRMOIC', 'M8-07-VALUEBRIDGE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const exitEbitda = roundTo(triangular(r, 18_000_000, 22_000_000, 26_000_000), 500_000);
    const exitMult = 10.0;
    const exitEv = exitEbitda * exitMult;
    const endNd = roundTo(exitEbitda * 1.2, 500_000); // 1.2x net debt rimasto
    const grossEq = exitEv - endNd;

    const mezzKickerPct = 0.03;
    const mgtMipPct = 0.07;
    const mezzVal = grossEq * mezzKickerPct;
    const mgtVal = grossEq * mgtMipPct;

    const sponsorEntry = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 1_000_000);
    const sponsorNet = grossEq - mezzVal - mgtVal;
    const sponsorMoic = sponsorNet / sponsorEntry;

    const brief = [
      `Costruisci la **Returns Waterfall** completa di chiusura dell'operazione LBO.`,
      ``,
      `Dati di uscita (Exit):`,
      `- **EBITDA Exit**: ${eur(exitEbitda)} a multiplo ${multiplo(exitMult)} (Enterprise Value ${eur(exitEv)})`,
      `- **Debito Netto Residuo**: ${eur(endNd)}`,
      `- **Mezzanine Equity Kicker**: ${pct(mezzKickerPct)} dell'Equity lorda`,
      `- **Management Incentive Plan (MIP)**: ${pct(mgtMipPct)} dell'Equity lorda`,
      `- **Sponsor Entry Equity Iniziale**: ${eur(sponsorEntry)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'**Equity Value Lordo di Uscita** in \`${B_GROSS_EQ}\`: \`=${B_EXIT_EV}-${B_END_ND}\`.`,
      `2. Calcola l'**Equity Netta Spettante allo Sponsor** in \`${B_SPONSOR_NET}\` deducendo il Mezzanine Kicker (\`${C_MEZZ_VAL}\`) e il Management MIP (\`${C_MGT_VAL}\`): \`=${B_GROSS_EQ}-${C_MEZZ_VAL}-${C_MGT_VAL}\`.`,
      `3. Calcola il **Net MoIC dello Sponsor** in \`${B_SPONSOR_MOIC}\`: \`=${B_SPONSOR_NET}/${B_SPONSOR_ENTRY}\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['LBO RETURNS WATERFALL [COMBO]'], { style: STILE_TITOLO }),
      riga('A3', ['Valutazione di Uscita', 'Valore (€)'], { style: STILE_TITOLO }),
      colonna('A4', [
        'EBITDA di Uscita',
        'Multiplo EV/EBITDA di Uscita (x)',
        'Enterprise Value di Uscita',
        'Debito Netto Finale Residuo',
        'GROSS EXIT EQUITY VALUE',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [exitEbitda], { style: STILE_INPUT }),
      colonna(B_EXIT_MULT, [exitMult], { style: STILE_INPUT_MULTIPLO }),
      colonna(B_EXIT_EV, ['=B4*B5'], { style: STILE_FORMULA }),
      colonna(B_END_ND, [endNd], { style: STILE_INPUT }),
      colonna(B_GROSS_EQ, [null], { style: STILE_TOTALE, locked: false }),

      riga('A10', ['Ripartizione Waterfall', 'Quota %', 'Valore (€)'], { style: STILE_TITOLO }),
      riga('A11', ['Mezzanine Equity Kicker', mezzKickerPct, `=${B_GROSS_EQ}*${B_MEZZ_KICKER_PCT}`]),
      riga('A12', ['Management MIP Pool', mgtMipPct, `=${B_GROSS_EQ}*${B_MGT_MIP_PCT}`]),

      riga('A14', ['Ritorno Netto Sponsor', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A15', [
        'Sponsor Equity Iniziale (Entry)',
        'Sponsor Net Equity Finale (Exit)',
        'Sponsor Net MoIC (x)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_SPONSOR_ENTRY, [sponsorEntry], { style: STILE_INPUT }),
      colonna(B_SPONSOR_NET, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_SPONSOR_MOIC, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il Gross Exit Equity in ${B_GROSS_EQ}: =${B_EXIT_EV}-${B_END_ND}.`,
        target: `Model!${B_GROSS_EQ}`,
        atteso: grossEq,
        referenzia: [B_EXIT_EV, B_END_ND],
        skills: ['lbo.attribution'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'Equity Netta dello Sponsor in ${B_SPONSOR_NET}: =${B_GROSS_EQ}-${C_MEZZ_VAL}-${C_MGT_VAL}.`,
        target: `Model!${B_SPONSOR_NET}`,
        atteso: sponsorNet,
        referenzia: [B_GROSS_EQ, C_MEZZ_VAL, C_MGT_VAL],
        skills: ['lbo.attribution'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il Net MoIC dello Sponsor in ${B_SPONSOR_MOIC}: =${B_SPONSOR_NET}/${B_SPONSOR_ENTRY}.`,
        target: `Model!${B_SPONSOR_MOIC}`,
        atteso: sponsorMoic,
        referenzia: [B_SPONSOR_NET, B_SPONSOR_ENTRY],
        skills: ['lbo.attribution'],
      }),
    ];

    return {
      templateId: 'M8-11-RETURNSATTRIBUTION',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 25 }),
      hints: [
        hint('H1', 'In B9 sottrai il debito netto dall\'Enterprise Value: =B6-B7.', 10, 'T1'),
        hint('H2', 'In B16 sottrai la quota del mezzanine e del management dall\'equity lorda: =B9-C11-C12.', 15, 'T2'),
        hint('H3', 'In B17 calcola il multiplo netto dividendo l\'equity netta di uscita per quella iniziale: =B16/B15.', 10, 'T3'),
      ],
    };
  },
});
