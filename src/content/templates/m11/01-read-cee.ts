/**
 * M11 · 01 — Bilancio CEE Reale: riclassificazione con nota integrativa.
 *
 * Nella realtà professionale i bilanci depositati in formato civilistico CEE
 * (IV Direttiva CEE) contengono informazioni essenziali nascoste nella Nota Integrativa:
 *
 *   1. Voce A (Valore della Produzione) e Voce B (Costi della Produzione).
 *   2. In Nota Integrativa si scopre che i Costi per Godimento Beni di Terzi (B.8)
 *      includono canoni di leasing operativo su macchinari core per € 1,2m/anno.
 *   3. Riclassificazione gestionale a Valore Aggiunto / EBITDA Gestionale:
 *      EBITDA Civilistico = Valore Produzione (A) - Costi Esterni e Personale (B6..B9).
 *      EBITDA Gestionale Normalizzato = EBITDA Civilistico + Canoni Leasing Core (da capitalizzare come debito).
 *   4. Capitale Circolante Netto Commerciale = Crediti Commerciali Correnti (esclusi crediti oltre 12 mesi) + Rimanenze - Debiti Fornitori.
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
const B_VAL_PROD = 'B4'; // Valore della Produzione A (dato)
const B_COSTI_PROD = 'B5'; // Costi Operativi B6..B9 esclusi ammortamenti (dato)
const B_LEASING_NOTA = 'B6'; // Canoni leasing core estratti da nota (dato)
const B_CREDITI_COMM = 'B7'; // Crediti commerciali correnti (dato)
const B_RIMANENZE = 'B8'; // Rimanenze di magazzino (dato)
const B_DEBITI_FORN = 'B9'; // Debiti verso fornitori (dato)

const B_EBITDA_CIV = 'B12'; // T1: EBITDA Civilistico = B4 - B5
const B_EBITDA_GEST = 'B13'; // T2: EBITDA Gestionale = B12 + B6
const B_CCN_COMM = 'B14'; // T3: CCN Commerciale = B7 + B8 - B9

export default defineTemplate({
  id: 'M11-01-READCEE',
  module: 'M11',
  title: 'Leggere un bilancio CEE: riclassificazione e nota integrativa',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['real.read-cee'],
  prerequisites: ['M1-01-SCHEMACEE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const valProd = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 1_000_000);
    const costiProd = roundTo(valProd * 0.80, 500_000);
    const leasingNota = roundTo(triangular(r, 800_000, 1_200_000, 1_800_000), 100_000);

    const crediti = roundTo(valProd * 0.20, 500_000);
    const rimanenze = roundTo(valProd * 0.10, 250_000);
    const debitiForn = roundTo(valProd * 0.15, 500_000);

    const ebitdaCiv = valProd - costiProd;
    const ebitdaGest = ebitdaCiv + leasingNota;
    const ccnComm = crediti + rimanenze - debitiForn;

    const brief = [
      `Analizza il bilancio civilistico CEE e integra i dati estratti dalla **Nota Integrativa**.`,
      ``,
      `Dati di bilancio depositato:`,
      `- **Valore della Produzione (Voce A)**: ${eur(valProd)}`,
      `- **Costi della Produzione Operativi (Voce B6..B9)**: ${eur(costiProd)}`,
      `- **Canoni Leasing Operativo Core (da Nota Integrativa)**: ${eur(leasingNota)}`,
      `- **Crediti Commerciali Correnti**: ${eur(crediti)}`,
      `- **Rimanenze di Magazzino**: ${eur(rimanenze)}`,
      `- **Debiti verso Fornitori**: ${eur(debitiForn)}`,
      ``,
      `### I tuoi compiti:`,
      `1. Calcola l'**EBITDA Civilistico (€)** in \`${B_EBITDA_CIV}\`: \`=${B_VAL_PROD}-${B_COSTI_PROD}\`.`,
      `2. Calcola l'**EBITDA Gestionale Normalizzato (€)** in \`${B_EBITDA_GEST}\` sommando i canoni leasing estratti dalla nota: \`=${B_EBITDA_CIV}+${B_LEASING_NOTA}\`.`,
      `3. Calcola il **Capitale Circolante Netto Commerciale (€)** in \`${B_CCN_COMM}\`: \`=${B_CREDITI_COMM}+${B_RIMANENZE}-${B_DEBITI_FORN}\`.`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['RICLASSIFICAZIONE BILANCIO CEE & NOTA INTEGRATIVA'], { style: STILE_TITOLO }),
      riga('A3', ['Voci di Bilancio CEE & Dati Nota', 'Importo (€)'], { style: STILE_TITOLO }),
      colonna('A4', [
        'Valore della Produzione (Voce A)',
        'Costi della Produzione Operativi (Voci B6..B9)',
        'Canoni Leasing Macchinari Core (da Nota)',
        'Crediti Commerciali Correnti a Breve',
        'Rimanenze di Magazzino',
        'Debiti Commerciali verso Fornitori',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [valProd, costiProd, leasingNota, crediti, rimanenze, debitiForn], { style: STILE_INPUT }),

      riga('A11', ['Aggregati Riclassificati Gestionali', 'Risultato (€)'], { style: STILE_TITOLO }),
      colonna('A12', [
        'EBITDA Civilistico (€)',
        'EBITDA Gestionale Normalizzato (€)',
        'Capitale Circolante Netto Commerciale (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_EBITDA_CIV, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_EBITDA_GEST, [null], { style: STILE_FORMULA, locked: false }),
      colonna(B_CCN_COMM, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola l'EBITDA Civilistico in ${B_EBITDA_CIV}: =${B_VAL_PROD}-${B_COSTI_PROD}.`,
        target: `Model!${B_EBITDA_CIV}`,
        atteso: ebitdaCiv,
        referenzia: [B_VAL_PROD, B_COSTI_PROD],
        skills: ['real.read-cee'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'EBITDA Gestionale in ${B_EBITDA_GEST}: =${B_EBITDA_CIV}+${B_LEASING_NOTA}.`,
        target: `Model!${B_EBITDA_GEST}`,
        atteso: ebitdaGest,
        referenzia: [B_EBITDA_CIV, B_LEASING_NOTA],
        skills: ['real.read-cee'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il CCN Commerciale in ${B_CCN_COMM}: =${B_CREDITI_COMM}+${B_RIMANENZE}-${B_DEBITI_FORN}.`,
        target: `Model!${B_CCN_COMM}`,
        atteso: ccnComm,
        referenzia: [B_CREDITI_COMM, B_RIMANENZE, B_DEBITI_FORN],
        skills: ['real.read-cee'],
      }),
    ];

    return {
      templateId: 'M11-01-READCEE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 20 }),
      hints: [
        hint('H1', 'In B12 sottrai i costi dal valore della produzione: =B4-B5.', 10, 'T1'),
        hint('H2', 'In B13 aggiungi i canoni di leasing all\'EBITDA civilistico: =B12+B6.', 10, 'T2'),
        hint('H3', 'In B14 somma crediti e rimanenze e sottrai i debiti verso fornitori: =B7+B8-B9.', 10, 'T3'),
      ],
    };
  },
});
