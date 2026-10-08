/**
 * M8 · 08 — Dividend Recap: anticipare i ritorni senza vendere l'azienda.
 *
 * Una Dividend Recapitalization (Dividend Recap) consiste nell'emettere nuovo
 * debito a metà del ciclo di holding (es. Anno 3) per distribuire un dividendo
 * straordinario allo Sponsor di Private Equity:
 *
 *   1. Max Debito Sostenibile Anno 3 = EBITDA Anno 3 × Max Leverage Covenant.
 *   2. Dividendo Distribuibile (Recap Dividend) = Max Debito Sostenibile - Debito Esistente.
 *   3. Effetto sull'IRR: incassare cassa in anticipo (all'Anno 3 invece che all'Anno 5)
 *      aumenta drasticamente il tasso di rendimento annuo (IRR) e abbatte il rischio (de-risking).
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
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_EBITDA_Y3 = 'B4'; // EBITDA Anno 3 (dato)
const B_EXIST_DEBT = 'B5'; // Debito Esistente pre-recap Anno 3 (dato)
const B_MAX_LEV = 'B6'; // Max Leverage Ratio consentito (4.0x) (dato)
const B_ENTRY_EQ = 'B7'; // Sponsor Equity iniziale Anno 0 (dato)
const B_FEE_PCT = 'B8'; // Fee di rifinanziamento, % del nuovo debito (dato)

const B_MAX_DEBT = 'B11'; // T1: Max Nuovo Debito = EBITDA_Y3 * Max_Lev
const B_DIVIDEND = 'B12'; // T2: Dividendo = nuovo debito - debito esistente - fee
const B_CUMUL_RET = 'B13'; // T3: % Capitale Iniziale già Recuperato ad Anno 3 = Dividend / Entry_Eq

export default defineTemplate({
  id: 'M8-08-DIVIDENDRECAP',
  module: 'M8',
  title: 'Dividend recap: rifinanziamento ed estrazione di cassa intermedia',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.dividend-recap'],
  prerequisites: ['M8-06-RETURNSIRRMOIC'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitdaY3 = roundTo(triangular(r, 15_000_000, 20_000_000, 25_000_000), 500_000);
    const existDebt = roundTo(ebitdaY3 * triangular(r, 1.2, 1.8, 2.5), 500_000);
    const maxLev = roundTo(triangular(r, 3.5, 4.25, 5), 0.25);
    const entryEq = roundTo(triangular(r, 30_000_000, 40_000_000, 50_000_000), 1_000_000);
    const feePct = roundTo(triangular(r, 0.015, 0.02, 0.03), 0.0025);

    const maxDebt = ebitdaY3 * maxLev;
    const dividend = maxDebt - existDebt - maxDebt * feePct;
    const cumulRecovery = dividend / entryEq;

    const brief = [
      `All'**Anno 3** dell'LBO, l'azienda ha aumentato l'EBITDA e rimborsato gran parte del debito. Lo Sponsor decide di effettuare una **Dividend Recapitalization**.`,
      ``,
      `Dati all'Anno 3:`,
      `- **EBITDA Anno 3**: ${eur(ebitdaY3)}`,
      `- **Debito Finanziario Esistente**: ${eur(existDebt)}`,
      `- **Massimo Leverage Consentito dalle Banche**: ${multiplo(maxLev)}`,
      `- **Equity Inizialmente Investita dallo Sponsor (Anno 0)**: ${eur(entryEq)}`,
      `- **Fee di rifinanziamento**: ${pct(feePct, 2)} del nuovo debito`,
      ``,
      "Il nuovo finanziamento, al massimo della leva concessa, serve prima a rimborsare il debito esistente " +
        'e a pagare le fee; quel che resta esce come dividendo straordinario allo sponsor. Lo sponsor recupera ' +
        "parte del capitale prima dell'uscita, e l'IRR sale; in cambio l'azienda torna a essere molto indebitata.",
      '',
      'Calcola il nuovo debito massimo, il dividendo distribuibile e la quota di capitale iniziale gia\' recuperata.',
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['DIVIDEND RECAPITALIZATION (ANNO 3)'], { style: STILE_TITOLO }),
      riga('A3', ['Dati Finanziari Anno 3', 'Valore (€)'], { style: STILE_TITOLO }),
      colonna('A4', [
        'EBITDA Anno 3',
        'Debito Finanziario Esistente Pre-Recap',
        'Max Leverage Consentito (x)',
        'Equity Iniziale Sponsor (Anno 0)',
        'Fee di rifinanziamento, % del nuovo debito',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [ebitdaY3, existDebt], { style: STILE_INPUT }),
      colonna(B_MAX_LEV, [maxLev], { style: STILE_INPUT_MULTIPLO }),
      colonna(B_ENTRY_EQ, [entryEq], { style: STILE_INPUT }),
      [{ ref: B_FEE_PCT, content: feePct, style: { ...STILE_INPUT_PCT, numFmt: '0.00%' }, locked: true }],

      riga('A10', ['Risultati della Recapitalization', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A11', [
        'Massimo Nuovo Debito Raccoglibile (€)',
        'Dividendo Straordinario Estratto (€)',
        'Quota Equity Iniziale Recuperata (%)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_MAX_DEBT, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_DIVIDEND, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_CUMUL_RET, [null], { style: { ...STILE_TOTALE, numFmt: '0.0%' }, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `In ${B_MAX_DEBT} il nuovo debito massimo che le banche concedono.`,
        target: `Model!${B_MAX_DEBT}`,
        atteso: maxDebt,
        referenzia: [B_EBITDA_Y3, B_MAX_LEV],
        senzaLiteral: [],
        skills: ['lbo.dividend-recap'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: `In ${B_DIVIDEND} il dividendo straordinario che resta da distribuire dopo aver rimborsato il debito esistente e pagato le fee.`,
        target: `Model!${B_DIVIDEND}`,
        atteso: dividend,
        referenzia: [B_MAX_DEBT, B_EXIST_DEBT, B_FEE_PCT],
        senzaLiteral: [],
        skills: ['lbo.dividend-recap'],
        minKeystrokes: 16,
      }),
      taskFormula({
        id: 'T3',
        prompt: `In ${B_CUMUL_RET} quale quota dell'equity investita lo sponsor si e' gia' ripreso con il dividendo.`,
        target: `Model!${B_CUMUL_RET}`,
        atteso: cumulRecovery,
        referenzia: [B_DIVIDEND, B_ENTRY_EQ],
        senzaLiteral: [],
        skills: ['lbo.dividend-recap'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M8-08-DIVIDENDRECAP',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!${B_MAX_DEBT}`,
      hints: [
        hint('H1', '=B4*B6', 10, 'T1'),
        hint('H2', '=B11-B5-B11*B8: nuovo debito, meno quello rimborsato, meno le fee.', 10, 'T2'),
        hint('H3', '=B12/B7', 10, 'T3'),
      ],
    };
  },
});
