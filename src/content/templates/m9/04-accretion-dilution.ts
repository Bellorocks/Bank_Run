/**
 * M9 · 04 — Accretion / Dilution: utile pro-forma e variazione dell'EPS.
 *
 * L'analisi di Accretion/Dilution misura l'effetto dell'operazione di M&A
 * sull'Utile per Azione (EPS) dell'acquirente:
 *
 *   1. Utile Netto Pro-Forma =
 *      Utile Netto Acquirer
 *      + Utile Netto Target
 *      + Sinergie After-Tax
 *      - Oneri Finanziari After-Tax (interessi su nuovo debito / interessi persi su cassa)
 *      - Ammortamenti PPA After-Tax.
 *
 *   2. Azioni Totali Pro-Forma = Azioni Esistenti Acquirer + Nuove Azioni Emesse per il deal.
 *   3. EPS Pro-Forma = Utile Netto Pro-Forma / Azioni Totali Pro-Forma.
 *   4. Accretion / (Dilution) % = (EPS Pro-Forma / Standalone EPS Acquirer) - 1.
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
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_ACQ_NI = 'B4'; // Utile Netto Acquirer (dato)
const B_ACQ_EPS = 'B6'; // Standalone EPS = B4 / B5 (formula)

const B_TGT_NI = 'B8'; // Utile Netto Target (dato)
const B_SYN_AT = 'B9'; // Sinergie After-Tax (dato)
const B_FIN_AT = 'B10'; // Costo Finanziamento After-Tax (dato)
const B_PPA_AT = 'B11'; // Ammortamento PPA After-Tax (dato)

const B_PF_NI = 'B15'; // T1: Pro-Forma Net Income = B4 + B8 + B9 - B10 - B11
const B_PF_SHARES = 'B16'; // Pro-Forma Shares = B5 + B12 (formula)
const B_PF_EPS = 'B17'; // T2: Pro-Forma EPS = B15 / B16
const B_ACCRETION = 'B18'; // T3: Accretion / (Dilution) % = (B17 / B6) - 1

export default defineTemplate({
  id: 'M9-04-ACCRETIONDILUTION',
  module: 'M9',
  title: 'Accretion / dilution: utile pro-forma e impatto su EPS',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['ma.accretion'],
  prerequisites: ['M9-02-SYNERGIES', 'M9-03-PPAGOODWILL'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const acqNi = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 1_000_000);
    const acqShares = 10_000_000;
    const acqEps = acqNi / acqShares;

    const tgtNi = roundTo(triangular(r, 12_000_000, 15_000_000, 18_000_000), 500_000);
    const synAt = roundTo(triangular(r, 3_000_000, 4_500_000, 6_000_000), 250_000);
    const finAt = roundTo(triangular(r, 2_000_000, 3_000_000, 4_000_000), 250_000);
    const ppaAt = roundTo(triangular(r, 1_000_000, 1_500_000, 2_000_000), 250_000);
    const newShares = 1_500_000;

    const pfNi = acqNi + tgtNi + synAt - finAt - ppaAt;
    const pfShares = acqShares + newShares;
    const pfEps = pfNi / pfShares;
    const accretionPct = (pfEps / acqEps) - 1;

    const brief = [
      `Valuta l'impatto economico dell'operazione di fusione sull'**EPS (Utile per Azione)** pro-forma dell'acquirente.`,
      ``,
      `Dati Standalone & Transazione:`,
      `- **Utile Netto Acquirer**: ${eur(acqNi)} su ${acqShares.toLocaleString('it-IT')} azioni (EPS ${eur(acqEps, 2)})`,
      `- **Utile Netto Target**: ${eur(tgtNi)}`,
      `- **Sinergie Nette Post-Tax**: +${eur(synAt)}`,
      `- **Costi Finanziari Nuovo Debito Post-Tax**: -${eur(finAt)}`,
      `- **Ammortamenti PPA Post-Tax**: -${eur(ppaAt)}`,
      `- **Nuove Azioni Emesse per il Deal**: ${newShares.toLocaleString('it-IT')}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'**Utile Netto Pro-Forma Combinato (€)** in \`${B_PF_NI}\`: \`=${B_ACQ_NI}+${B_TGT_NI}+${B_SYN_AT}-${B_FIN_AT}-${B_PPA_AT}\`.`,
      `2. Calcola l'**EPS Pro-Forma (€)** in \`${B_PF_EPS}\`: \`=${B_PF_NI}/${B_PF_SHARES}\`.`,
      `3. Calcola l'**Accretion / (Dilution) %** in \`${B_ACCRETION}\`: \`=(${B_PF_EPS}/${B_ACQ_EPS})-1\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['ANALISI ACCRETION / DILUTION EPS'], { style: STILE_TITOLO }),
      riga('A3', ['Dati Acquirer Standalone', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Utile Netto Acquirer (€)',
        'Azioni Acquirer in Circolazione',
        'EPS Standalone Acquirer (€)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [acqNi, acqShares], { style: STILE_INPUT }),
      colonna(B_ACQ_EPS, ['=B4/B5'], { style: STILE_FORMULA }),

      riga('A7', ['Aggiustamenti Deal M&A (Post-Tax)', 'Importo (€) / Azioni'], { style: STILE_TITOLO }),
      colonna('A8', [
        '(+) Utile Netto Target (€)',
        '(+) Sinergie Post-Tax (€)',
        '(-) Costi Finanziamento Post-Tax (€)',
        '(-) Ammortamenti PPA Post-Tax (€)',
        '(+) Nuove Azioni Emesse (Numero)',
      ], { style: STILE_ETICHETTA }),
      colonna('B8', [tgtNi, synAt, finAt, ppaAt, newShares], { style: STILE_INPUT }),

      riga('A14', ['Risultati Pro-Forma', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A15', [
        'Utile Netto Pro-Forma Combinato (€)',
        'Azioni Totali Pro-Forma (Numero)',
        'EPS Pro-Forma (€)',
        'Accretion / (Dilution) %',
      ], { style: STILE_ETICHETTA }),
      colonna(B_PF_NI, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_PF_SHARES, ['=B5+B12'], { style: STILE_FORMULA }),
      colonna(B_PF_EPS, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_ACCRETION, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola l'Utile Netto Pro-Forma in ${B_PF_NI}: =${B_ACQ_NI}+${B_TGT_NI}+${B_SYN_AT}-${B_FIN_AT}-${B_PPA_AT}.`,
        target: `Model!${B_PF_NI}`,
        atteso: pfNi,
        referenzia: [B_ACQ_NI, B_TGT_NI, B_SYN_AT, B_FIN_AT, B_PPA_AT],
        skills: ['ma.accretion'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'EPS Pro-Forma in ${B_PF_EPS}: =${B_PF_NI}/${B_PF_SHARES}.`,
        target: `Model!${B_PF_EPS}`,
        atteso: pfEps,
        referenzia: [B_PF_NI, B_PF_SHARES],
        skills: ['ma.accretion'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola l'Accretion/Dilution % in ${B_ACCRETION}: =(${B_PF_EPS}/${B_ACQ_EPS})-1.`,
        target: `Model!${B_ACCRETION}`,
        atteso: accretionPct,
        referenzia: [B_PF_EPS, B_ACQ_EPS],
        skills: ['ma.accretion'],
      }),
    ];

    return {
      templateId: 'M9-04-ACCRETIONDILUTION',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B15 somma gli utili e le sinergie e sottrai costi finanziari e PPA: =B4+B8+B9-B10-B11.', 10, 'T1'),
        hint('H2', 'In B17 dividi l\'utile pro-forma per le azioni pro-forma: =B15/B16.', 10, 'T2'),
        hint('H3', 'In B18 calcola la variazione percentuale dell\'EPS: =(B17/B6)-1.', 10, 'T3'),
      ],
    };
  },
});
