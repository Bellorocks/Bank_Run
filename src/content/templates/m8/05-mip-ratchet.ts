/**
 * M8 · 05 — Management Incentive Plan (MIP) e Ratchet: allineamento e sweet equity.
 *
 * Nei deal di Private Equity il management team riceve "sweet equity" e un
 * meccanismo di Ratchet (incentivo a scaglioni legato alle performance):
 *
 *   1. Quota Base (Base Sweet Equity): es. 5.0% dell'equity finale all'uscita.
 *   2. Soglia Hurdle (Performance Target): se il MoIC complessivo raggiunge o
 *      supera 2.5x, scatta il Ratchet.
 *   3. Quota con Ratchet: la quota del management sale al 10.0%.
 *   4. Equity Netta dello Sponsor = Exit Equity Lorda × (1 - Quota Management).
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
  multiplo,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_ENTRY_EQ = 'B4'; // Equity investita all'ingresso (dato)
const B_EXIT_EQ = 'B5'; // Equity lorda realizzata all'uscita (dato)

const B_HURDLE = 'B8'; // Soglia Hurdle MoIC (es. 2.5x) (dato)
const C_BASE_PCT = 'C8'; // Quota Base (5.0%) (dato)
const C_RATCHET_PCT = 'C9'; // Quota Ratchet (10.0%) (dato)

const B_ACT_MOIC = 'B12'; // T1: MoIC Lordo = Exit Equity / Entry Equity
const B_MGT_PCT = 'B13'; // T2: Quota % Management = IF(B12>=B8, C9, C8)
const B_SPONSOR_NET = 'B14'; // T3: Net Equity Sponsor = B5 * (1 - B13)

export default defineTemplate({
  id: 'M8-05-MIPRATCHET',
  module: 'M8',
  title: 'Management incentive plan: sweet equity e ratchet',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['lbo.mip'],
  prerequisites: ['M8-01-SOURCESUSES'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const entryEq = roundTo(triangular(r, 20_000_000, 30_000_000, 40_000_000), 1_000_000);
    // Moltiplicatore realizzato: tra 2.6x e 3.2x (supera l'hurdle di 2.5x)
    const realizedMoic = roundTo(triangular(r, 2.6, 2.8, 3.2), 0.05);
    const exitEq = roundTo(entryEq * realizedMoic, 100_000);

    const hurdleMoic = 2.5;
    const basePct = 0.05;
    const ratchetPct = 0.10;

    const actualMoic = exitEq / entryEq;
    const mgtPct = actualMoic >= hurdleMoic ? ratchetPct : basePct;
    const sponsorNet = exitEq * (1 - mgtPct);

    const brief = [
      `Struttura la ripartizione dell'equity di uscita con il piano di incentivazione manageriale (**MIP Ratchet**).`,
      ``,
      `Dati dell'investimento:`,
      `- **Sponsor Equity Entry**: ${eur(entryEq)}`,
      `- **Gross Equity Exit**: ${eur(exitEq)}`,
      ``,
      `Regole del MIP Ratchet:`,
      `- **Hurdle MoIC Target**: ${multiplo(hurdleMoic)}`,
      `- Se MoIC < ${multiplo(hurdleMoic)}: il Management riceve la quota base del **${pct(basePct)}** (\`${C_BASE_PCT}\`)`,
      `- Se MoIC >= ${multiplo(hurdleMoic)}: il Management sblocca il Ratchet e riceve il **${pct(ratchetPct)}** (\`${C_RATCHET_PCT}\`)`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola il **MoIC Lordo Realizzato** in \`${B_ACT_MOIC}\`: \`=${B_EXIT_EQ}/${B_ENTRY_EQ}\`.`,
      `2. Determina la **Quota % Management** in \`${B_MGT_PCT}\` tramite funzione logica \`IF\`: \`=IF(${B_ACT_MOIC}>=${B_HURDLE}, ${C_RATCHET_PCT}, ${C_BASE_PCT})\`.`,
      `3. Calcola l'**Equity Netta Spettante allo Sponsor (€)** in \`${B_SPONSOR_NET}\`: \`=${B_EXIT_EQ}*(1-${B_MGT_PCT})\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['MANAGEMENT INCENTIVE PLAN (MIP)'], { style: STILE_TITOLO }),
      riga('A3', ['Investimento Equity (€)', 'Valore'], { style: STILE_TITOLO }),
      riga('A4', ['Equity Iniziale (Entry)', entryEq], { style: STILE_INPUT }),
      riga('A5', ['Equity Lorda Finale (Exit)', exitEq], { style: STILE_INPUT }),

      riga('A7', ['Regole Ratchet', 'Soglia Hurdle', 'Quota Mgt'], { style: STILE_TITOLO }),
      riga('A8', ['Base (sotto hurdle)', hurdleMoic, basePct]),
      riga('A9', ['Ratchet (pari o sopra hurdle)', null, ratchetPct]),

      riga('A11', ['Ripartizione Finale', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A12', [
        'MoIC Lordo (x)',
        'Quota % Spettante al Management',
        'Equity Netta Sponsor (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_ACT_MOIC, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_MGT_PCT, [null], { style: STILE_FORMULA_PCT, locked: false }),
      colonna(B_SPONSOR_NET, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola il MoIC Lordo in ${B_ACT_MOIC}: =${B_EXIT_EQ}/${B_ENTRY_EQ}.`,
        target: `Model!${B_ACT_MOIC}`,
        atteso: actualMoic,
        referenzia: [B_EXIT_EQ, B_ENTRY_EQ],
        skills: ['lbo.mip'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Determina la quota % spettante al Management in ${B_MGT_PCT} con =IF(${B_ACT_MOIC}>=${B_HURDLE}, ${C_RATCHET_PCT}, ${C_BASE_PCT}).`,
        target: `Model!${B_MGT_PCT}`,
        atteso: mgtPct,
        referenzia: [B_ACT_MOIC, B_HURDLE, C_RATCHET_PCT, C_BASE_PCT],
        skills: ['lbo.mip'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola l'Equity Netta per lo Sponsor in ${B_SPONSOR_NET}: =${B_EXIT_EQ}*(1-${B_MGT_PCT}).`,
        target: `Model!${B_SPONSOR_NET}`,
        atteso: sponsorNet,
        referenzia: [B_EXIT_EQ, B_MGT_PCT],
        skills: ['lbo.mip'],
      }),
    ];

    return {
      templateId: 'M8-05-MIPRATCHET',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B12 dividi l\'equity di uscita per quella iniziale: =B5/B4.', 10, 'T1'),
        hint('H2', 'In B13 usa la condizione: =IF(B12>=B8, C9, C8).', 15, 'T2'),
        hint('H3', 'In B14 calcola la fetta rimanente per lo sponsor: =B5*(1-B13).', 10, 'T3'),
      ],
    };
  },
});
