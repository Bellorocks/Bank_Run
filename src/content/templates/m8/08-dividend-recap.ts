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
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_EBITDA_Y3 = 'B4'; // EBITDA Anno 3 (dato)
const B_EXIST_DEBT = 'B5'; // Debito Esistente pre-recap Anno 3 (dato)
const B_MAX_LEV = 'B6'; // Max Leverage Ratio consentito (4.0x) (dato)
const B_ENTRY_EQ = 'B7'; // Sponsor Equity iniziale Anno 0 (dato)

const B_MAX_DEBT = 'B10'; // T1: Max Nuovo Debito = EBITDA_Y3 * Max_Lev
const B_DIVIDEND = 'B11'; // T2: Dividendo Distribuibile = Max_Debt - Exist_Debt
const B_CUMUL_RET = 'B12'; // T3: % Capitale Iniziale già Recuperato ad Anno 3 = Dividend / Entry_Eq

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
    const existDebt = roundTo(ebitdaY3 * 1.8, 500_000); // l'azienda ha deleveraggiato fino a 1.8x
    const maxLev = 4.0; // covenant max leverage
    const entryEq = roundTo(triangular(r, 30_000_000, 40_000_000, 50_000_000), 1_000_000);

    const maxDebt = ebitdaY3 * maxLev;
    const dividend = maxDebt - existDebt;
    const cumulRecovery = dividend / entryEq;

    const brief = [
      `All'**Anno 3** dell'LBO, l'azienda ha aumentato l'EBITDA e rimborsato gran parte del debito. Lo Sponsor decide di effettuare una **Dividend Recapitalization**.`,
      ``,
      `Dati all'Anno 3:`,
      `- **EBITDA Anno 3**: ${eur(ebitdaY3)}`,
      `- **Debito Finanziario Esistente**: ${eur(existDebt)}`,
      `- **Massimo Leverage Consentito dalle Banche**: ${multiplo(maxLev)}`,
      `- **Equity Inizialmente Investita dallo Sponsor (Anno 0)**: ${eur(entryEq)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola il **Massimo Nuovo Debito Raccoglibile** in \`${B_MAX_DEBT}\`: \`=${B_EBITDA_Y3}*${B_MAX_LEV}\`.`,
      `2. Calcola il **Dividendo Straordinario Distribuibile** in \`${B_DIVIDEND}\` (Nuovo Debito meno Debito Esistente estinto): \`=${B_MAX_DEBT}-${B_EXIST_DEBT}\`.`,
      `3. Calcola la quota di **Capitale Iniziale già Recuperato all'Anno 3** in \`${B_CUMUL_RET}\`: \`=${B_DIVIDEND}/${B_ENTRY_EQ}\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['DIVIDEND RECAPITALIZATION (ANNO 3)'], { style: STILE_TITOLO }),
      riga('A3', ['Dati Finanziari Anno 3', 'Valore (€)'], { style: STILE_TITOLO }),
      colonna('A4', [
        'EBITDA Anno 3',
        'Debito Finanziario Esistente Pre-Recap',
        'Max Leverage Consentito (x)',
        'Equity Iniziale Sponsor (Anno 0)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [ebitdaY3, existDebt], { style: STILE_INPUT }),
      colonna(B_MAX_LEV, [maxLev], { style: STILE_INPUT_MULTIPLO }),
      colonna(B_ENTRY_EQ, [entryEq], { style: STILE_INPUT }),

      riga('A9', ['Risultati della Recapitalization', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A10', [
        'Massimo Nuovo Debito Raccoglibile (€)',
        'Dividendo Straordinario Estratto (€)',
        'Quota Equity Iniziale Recuperata (%)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_MAX_DEBT, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_DIVIDEND, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_CUMUL_RET, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il Massimo Nuovo Debito in ${B_MAX_DEBT}: =${B_EBITDA_Y3}*${B_MAX_LEV}.`,
        target: `Model!${B_MAX_DEBT}`,
        atteso: maxDebt,
        referenzia: [B_EBITDA_Y3, B_MAX_LEV],
        skills: ['lbo.dividend-recap'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola il Dividendo Straordinario in ${B_DIVIDEND}: =${B_MAX_DEBT}-${B_EXIST_DEBT}.`,
        target: `Model!${B_DIVIDEND}`,
        atteso: dividend,
        referenzia: [B_MAX_DEBT, B_EXIST_DEBT],
        skills: ['lbo.dividend-recap'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola la percentuale di capitale iniziale recuperata in ${B_CUMUL_RET}: =${B_DIVIDEND}/${B_ENTRY_EQ}.`,
        target: `Model!${B_CUMUL_RET}`,
        atteso: cumulRecovery,
        referenzia: [B_DIVIDEND, B_ENTRY_EQ],
        skills: ['lbo.dividend-recap'],
      }),
    ];

    return {
      templateId: 'M8-08-DIVIDENDRECAP',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B10 moltiplica l\'EBITDA per il leverage massimo: =B4*B6.', 10, 'T1'),
        hint('H2', 'In B11 sottrai il vecchio debito dal nuovo: =B10-B5.', 10, 'T2'),
        hint('H3', 'In B12 dividi il dividendo per l\'equity investita all\'inizio: =B11-B7.', 10, 'T3'),
      ],
    };
  },
});
