/**
 * M10 · 03 — Piani di Ammortamento: quota capitale costante, bullet e balloon.
 *
 * Confronto tra i tre profili di rimborso del debito bancario e obbligazionario:
 *
 *   1. Ammortamento a Quota Capitale Costante (Italiano / Linear):
 *      Quota Capitale Annua = Debito Iniziale / Anni (es. € 50m / 5 = € 10m/anno).
 *
 *   2. Struttura Bullet (Eurobond / Term Loan B):
 *      Nessun rimborso di capitale durante la vita del prestito (Quota Capitale Y1..Y4 = € 0),
 *      rimborso integrale del 100% all'Anno 5.
 *
 *   3. Struttura Balloon:
 *      Ammortamento ridotto durante la vita del prestito (es. 5% all'anno per gli anni 1..4),
 *      con maxirata finale (Balloon Payment) all'Anno 5 pari al residuo (80%).
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
const B_PRINCIPAL = 'B4'; // Debito Iniziale (dato)
const B_YEARS = 'B5'; // Anni (5) (dato)
const B_BALLOON_PCT = 'B6'; // Quota annua Balloon (5.0%) (dato)

const B_AMORT_Y1 = 'B9'; // T1: Quota Ammortizing Y1 = B4 / B5
const B_BULLET_Y5 = 'B10'; // T2: Rimborso Bullet Y5 = B4
const B_BALLOON_Y5 = 'B11'; // T3: Maxirata Balloon Y5 = B4 - (B4 * B6 * 4)

export default defineTemplate({
  id: 'M10-03-AMORTIZATION',
  module: 'M10',
  title: 'Piani di ammortamento: lineare, bullet e balloon',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['cred.amortization'],
  prerequisites: ['M10-02-DEBTCAPACITY'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const principal = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 5_000_000);
    const years = 5;
    const balloonAnnualPct = 0.05; // 5% per 4 anni = 20% rimborsato

    const amortY1 = principal / years;
    const bulletY5 = principal;
    const balloonY5 = principal - (principal * balloonAnnualPct * 4);

    const brief = [
      `Costruisci e confronta le quote di rimborso capitale per tre strutture di debito a **5 anni**.`,
      ``,
      `Parametri del prestito:`,
      `- **Capitale Finanziato Iniziale**: ${eur(principal)}`,
      `- **Durata del Prestito**: ${years} anni`,
      `- **Quota Annua Rimborso Piano Balloon**: ${pct(balloonAnnualPct)}/anno (per gli Anni 1, 2, 3, 4)`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola la **Quota Capitale Annua Costante (Linear Amortizing)** in \`${B_AMORT_Y1}\`: \`=${B_PRINCIPAL}/${B_YEARS}\`.`,
      `2. Calcola il **Rimborso Finale del Prestito Bullet all'Anno 5** in \`${B_BULLET_Y5}\`: \`=${B_PRINCIPAL}\`.`,
      `3. Calcola la **Maxirata Finale (Balloon Payment) all'Anno 5** in \`${B_BALLOON_Y5}\` (dopo 4 rate del 5% ciascuna): \`=${B_PRINCIPAL}-(${B_PRINCIPAL}*${B_BALLOON_PCT}*4)\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['PIANI DI AMMORTAMENTO DEL DEBITO'], { style: STILE_TITOLO }),
      riga('A3', ['Parametri Finanziamento', 'Valore'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Capitale Iniziale Finanziato (€)',
        'Durata Finanziamento (Anni)',
        'Ammortamento Annuo Struttura Balloon (%)',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [principal, years], { style: STILE_INPUT }),
      colonna(B_BALLOON_PCT, [balloonAnnualPct], { style: STILE_INPUT_PCT }),

      riga('A8', ['Profili di Rimborso Capitale', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A9', [
        '1. Quota Capitale Annua Costante (Amortizing, €)',
        '2. Rimborso Finale all\'Anno 5 (Bullet, €)',
        '3. Maxirata Finale all\'Anno 5 (Balloon, €)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_AMORT_Y1, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_BULLET_Y5, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_BALLOON_Y5, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola la quota annua costante in ${B_AMORT_Y1}: =${B_PRINCIPAL}/${B_YEARS}.`,
        target: `Model!${B_AMORT_Y1}`,
        atteso: amortY1,
        referenzia: [B_PRINCIPAL, B_YEARS],
        skills: ['cred.amortization'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola il rimborso bullet in ${B_BULLET_Y5}: =${B_PRINCIPAL}.`,
        target: `Model!${B_BULLET_Y5}`,
        atteso: bulletY5,
        referenzia: [B_PRINCIPAL],
        skills: ['cred.amortization'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola la maxirata balloon in ${B_BALLOON_Y5}: =${B_PRINCIPAL}-(${B_PRINCIPAL}*${B_BALLOON_PCT}*4).`,
        target: `Model!${B_BALLOON_Y5}`,
        atteso: balloonY5,
        referenzia: [B_PRINCIPAL, B_BALLOON_PCT],
        skills: ['cred.amortization'],
      }),
    ];

    return {
      templateId: 'M10-03-AMORTIZATION',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B9 dividi il capitale iniziale per gli anni di durata: =B4/B5.', 10, 'T1'),
        hint('H2', 'In B10 il prestito bullet rimborsa il 100% all\'ultimo anno: =B4.', 10, 'T2'),
        hint('H3', 'In B11 calcola il debito residuo dopo 4 anni: =B4-(B4*B6*4).', 10, 'T3'),
      ],
    };
  },
});
