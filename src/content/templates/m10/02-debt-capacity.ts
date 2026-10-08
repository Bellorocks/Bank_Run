/**
 * M10 · 02 — Debt Capacity: dimensionare il massimo debito sostenibile.
 *
 * La massima capacità di indebitamento (Debt Capacity) di un'impresa è limitata
 * dal vincolo più restrittivo (il minimo) imposto dalle banche:
 *
 *   1. Vincolo di Leverage (Max Net Debt / EBITDA):
 *      Capacità da Leverage = EBITDA × Max Leverage Ratio Consentito (es. 3.50x).
 *
 *   2. Vincolo di Flusso di Cassa / DSCR (Min CFADS / Servizio Totale Debito):
 *      Max Servizio Debito Annuo Sostenibile = CFADS / Min DSCR Richiesto (es. 1.25x).
 *      Capacità da DSCR = Max Servizio Debito Annuo / Costo di Servizio Annuo % (es. 20% = 5 anni ammortamento a quota costante).
 *
 *   3. Debt Capacity Effettiva = MIN(Capacità da Leverage, Capacità da DSCR).
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
const B_EBITDA = 'B4'; // EBITDA (dato)
const B_CFADS = 'B5'; // CFADS Annuo (dato)
const B_MAX_LEV = 'B6'; // Max Leverage (3.5x) (dato)
const B_MIN_DSCR = 'B7'; // Min DSCR (1.25x) (dato)
const B_DEBT_SVC_PCT = 'B8'; // Costo Annuo Servizio Debito % (20%) (dato)

const B_CAP_LEV = 'B11'; // T1: Capacità da Leverage = B4 * B6
const B_CAP_DSCR = 'B12'; // T2: Capacità da DSCR = (B5 / B7) / B8
const B_EFF_CAP = 'B13'; // T3: Debt Capacity Effettiva = MIN(B11, B12)

export default defineTemplate({
  id: 'M10-02-DEBTCAPACITY',
  module: 'M10',
  title: 'Debt capacity: calcolo del massimo debito sostenibile',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['cred.capacity'],
  prerequisites: ['M10-01-CREDITRATIOS'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitda = roundTo(triangular(r, 16_000_000, 20_000_000, 24_000_000), 1_000_000);
    const cfads = roundTo(ebitda * 0.60, 500_000);
    const maxLev = 3.50;
    const minDscr = 1.25;
    const debtSvcPct = 0.20; // 20% annuo (es. 5 anni di durata)

    const capLev = ebitda * maxLev;
    const capDscr = (cfads / minDscr) / debtSvcPct;
    const effCap = Math.min(capLev, capDscr);

    const brief = [
      `Determina la massima **Debt Capacity (Capacità di Indebitamento)** per finanziare un nuovo piano di investimenti.`,
      ``,
      `Parametri aziendali e vincoli bancari:`,
      `- **EBITDA Annuo**: ${eur(ebitda)}`,
      `- **Flusso di Cassa Operativo (CFADS)**: ${eur(cfads)}/anno`,
      `- **Vincolo 1 (Max Leverage Bancario)**: ${multiplo(maxLev)}`,
      `- **Vincolo 2 (Minimo DSCR Richiesto)**: ${multiplo(minDscr)}`,
      `- **Coefficiente Annuo Servizio Debito**: ${pct(debtSvcPct)}/anno (piano di ammortamento quinquennale)`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola la **Capacità di Debito da Vincolo Leverage (€)** in \`${B_CAP_LEV}\`: \`=${B_EBITDA}*${B_MAX_LEV}\`.`,
      `2. Calcola la **Capacità di Debito da Vincolo DSCR (€)** in \`${B_CAP_DSCR}\`: \`=(${B_CFADS}/${B_MIN_DSCR})/${B_DEBT_SVC_PCT}\`.`,
      `3. Determina la **Debt Capacity Effettiva (€)** in \`${B_EFF_CAP}\` prendendo il valore più prudenziale (il minimo tra i due vincoli): \`=MIN(${B_CAP_LEV}, ${B_CAP_DSCR})\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['CALCOLO DELLA DEBT CAPACITY'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Aziendali & Vincoli di Fido', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'EBITDA Annuo (€)',
        'CFADS Operativo Annuo (€)',
        'Max Leverage Consentito (x)',
        'Minimo DSCR Richiesto (x)',
        'Costo Annuo Servizio Debito (%)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [ebitda, cfads], { style: STILE_INPUT }),
      colonna(B_MAX_LEV, [maxLev, minDscr], { style: STILE_INPUT_MULTIPLO }),
      colonna(B_DEBT_SVC_PCT, [debtSvcPct], { style: STILE_INPUT_PCT }),

      riga('A10', ['Stima Debt Capacity', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A11', [
        'Capacità da Vincolo di Leverage (€)',
        'Capacità da Vincolo di Flusso (DSCR, €)',
        'DEBT CAPACITY EFFETTIVA SOSTENIBILE (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_CAP_LEV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_CAP_DSCR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_EFF_CAP, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola la capacità da leverage in ${B_CAP_LEV}: =${B_EBITDA}*${B_MAX_LEV}.`,
        target: `Model!${B_CAP_LEV}`,
        atteso: capLev,
        referenzia: [B_EBITDA, B_MAX_LEV],
        skills: ['cred.capacity'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola la capacità da DSCR in ${B_CAP_DSCR}: =(${B_CFADS}/${B_MIN_DSCR})/${B_DEBT_SVC_PCT}.`,
        target: `Model!${B_CAP_DSCR}`,
        atteso: capDscr,
        referenzia: [B_CFADS, B_MIN_DSCR, B_DEBT_SVC_PCT],
        skills: ['cred.capacity'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Determina la Debt Capacity effettiva in ${B_EFF_CAP}: =MIN(${B_CAP_LEV}, ${B_CAP_DSCR}).`,
        target: `Model!${B_EFF_CAP}`,
        atteso: effCap,
        referenzia: [B_CAP_LEV, B_CAP_DSCR],
        skills: ['cred.capacity'],
      }),
    ];

    return {
      templateId: 'M10-02-DEBTCAPACITY',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B11 moltiplica l\'EBITDA per il leverage massimo: =B4*B6.', 10, 'T1'),
        hint('H2', 'In B12 dividi il CFADS per il minimo DSCR e poi dividi per il tasso di servizio del debito: =(B5/B7)/B8.', 15, 'T2'),
        hint('H3', 'In B13 usa la funzione MIN: =MIN(B11, B12).', 10, 'T3'),
      ],
    };
  },
});
