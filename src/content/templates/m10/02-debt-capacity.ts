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
const B_VINCOLO = 'B14'; // T4: quale vincolo morde ("LEVERAGE" / "DSCR")

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
    // Parametri estratti in modo che mordano entrambi i vincoli, a seconda del seed,
    // e mai a meno del 3% l'uno dall'altro.
    let cfads = 0;
    let maxLev = 0;
    let minDscr = 0;
    let debtSvcPct = 0;
    let capLev = 0;
    let capDscr = 0;
    for (let i = 0; i < 50; i++) {
      cfads = roundTo(ebitda * triangular(r, 0.5, 0.65, 0.8), 100_000);
      maxLev = roundTo(triangular(r, 3, 3.75, 4.5), 0.25);
      minDscr = roundTo(triangular(r, 1.15, 1.3, 1.5), 0.05);
      debtSvcPct = roundTo(triangular(r, 0.12, 0.17, 0.22), 0.01);
      capLev = ebitda * maxLev;
      capDscr = cfads / minDscr / debtSvcPct;
      if (Math.abs(capLev - capDscr) / capLev > 0.03) break;
    }
    const effCap = Math.min(capLev, capDscr);
    const vincolo = capLev <= capDscr ? 'LEVERAGE' : 'DSCR';

    const brief = [
      `Determina la massima **Debt Capacity (Capacità di Indebitamento)** per finanziare un nuovo piano di investimenti.`,
      ``,
      `Parametri aziendali e vincoli bancari:`,
      `- **EBITDA Annuo**: ${eur(ebitda)}`,
      `- **Flusso di Cassa Operativo (CFADS)**: ${eur(cfads)}/anno`,
      `- **Vincolo 1 (Max Leverage Bancario)**: ${multiplo(maxLev)}`,
      `- **Vincolo 2 (Minimo DSCR Richiesto)**: ${multiplo(minDscr)}`,
      `- **Servizio del debito annuo**: ${pct(debtSvcPct, 0)} del debito (interessi piu' quota capitale)`,
      ``,
      'Le banche applicano due vincoli e prestano il **meno** dei due:',
      '',
      "- il leverage massimo fissa un tetto in multipli di EBITDA;",
      "- il DSCR minimo dice quanto servizio del debito il CFADS puo' sostenere ogni anno; dato il servizio " +
        'annuo per euro di debito, quel servizio massimo si traduce in un debito massimo.',
      '',
      "Calcola le due capacita', quella effettiva e fai dire al foglio quale vincolo morde: \"LEVERAGE\" o \"DSCR\".",
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
        'Vincolo che morde',
      ], { style: STILE_ETICHETTA }),
      colonna(B_CAP_LEV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_CAP_DSCR, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_EFF_CAP, [null], { style: STILE_TOTALE, locked: false }),
      colonna(B_VINCOLO, [null], { style: { ...STILE_FORMULA, numFmt: '@' }, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `In ${B_CAP_LEV} il debito massimo concesso dal vincolo di leverage.`,
        target: `Model!${B_CAP_LEV}`,
        atteso: capLev,
        referenzia: [B_EBITDA, B_MAX_LEV],
        senzaLiteral: [],
        skills: ['cred.capacity'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T2',
        prompt: `In ${B_CAP_DSCR} il debito massimo concesso dal vincolo di DSCR.`,
        target: `Model!${B_CAP_DSCR}`,
        atteso: capDscr,
        referenzia: [B_CFADS, B_MIN_DSCR, B_DEBT_SVC_PCT],
        senzaLiteral: [],
        skills: ['cred.capacity'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T3',
        prompt: `In ${B_EFF_CAP} la debt capacity effettiva.`,
        target: `Model!${B_EFF_CAP}`,
        atteso: effCap,
        referenzia: [B_CAP_LEV, B_CAP_DSCR],
        senzaLiteral: [],
        skills: ['cred.capacity'],
        minKeystrokes: 14,
      }),
      {
        id: 'T4',
        prompt: `In ${B_VINCOLO} il vincolo che morde, scritto da una formula: "LEVERAGE" oppure "DSCR".`,
        targetCell: `Model!${B_VINCOLO}`,
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'text' as const, expected: vincolo },
          { kind: 'mustReference' as const, cells: [B_CAP_LEV, B_CAP_DSCR] },
        ],
        skills: ['cred.capacity', 'xl.if'],
        minKeystrokes: 30,
      },
    ];

    return {
      templateId: 'M10-02-DEBTCAPACITY',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_CAP_LEV}`,
      hints: [
        hint('H1', '=B4*B6', 10, 'T1'),
        hint('H2', '=B5/B7/B8: servizio massimo sostenibile, diviso il servizio per euro di debito.', 15, 'T2'),
        hint('H3', '=MIN(B11,B12)', 10, 'T3'),
        hint('H4', '=IF(B11<=B12,"LEVERAGE","DSCR")', 10, 'T4'),
      ],
    };
  },
});
