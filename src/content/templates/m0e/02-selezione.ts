/**
 * M0-E · 02 — Selezionare in fretta: Ctrl+Spazio, Maiusc+Spazio, Ctrl+Maiusc+Freccia, Ctrl+A.
 *
 * Drill puro, niente finanza: una tabellina di numeri neutri, quattro somme.
 * Il punto non e' il calcolo (SUM di cinque numeri non insegna niente da solo),
 * e' arrivarci senza trascinare il mouse:
 *  - T1/T2: Ctrl+Barra spaziatrice seleziona una colonna intera in un colpo.
 *  - T3: Maiusc+Barra spaziatrice fa lo stesso per la riga.
 *  - T4: Ctrl+A dentro a un blocco di dati seleziona la "current region", il
 *    rettangolo di dati che ti circonda — non l'intero foglio.
 * Ctrl+Maiusc+Freccia (estendere la selezione fino al bordo dei dati) e' la
 * tecnica jolly che funziona su tutti e quattro i task, ed e' spiegata nel brief
 * per chi preferisce quella.
 *
 * Il check e' SEMPRE sul valore e su cosa la formula referenzia, mai su come la
 * cella e' stata selezionata: la selezione non e' osservabile dal grader, e va
 * bene cosi'. E' il giocatore a scegliere se essere lento o veloce.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';

const ETICHETTE_RIGA = ['Riga 1', 'Riga 2', 'Riga 3', 'Riga 4', 'Riga 5'] as const;

export default defineTemplate({
  id: 'M0E-02-SELEZIONE',
  module: 'M0-E',
  title: 'Selezionare senza il mouse',
  rank: 1,
  mode: 'SPEEDRUN',
  estimatedSeconds: 75,
  skills: ['spd.selection', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Numeri neutri: qui non c'e' niente da capire, solo da selezionare in fretta.
    const dati: number[][] = Array.from({ length: 5 }, () => [
      r.int(10, 95),
      r.int(10, 95),
      r.int(10, 95),
    ]);
    const colB = dati.map((row) => row[0]);
    const colD = dati.map((row) => row[2]);
    const sumB = colB.reduce((a, b) => a + b, 0);
    const sumD = colD.reduce((a, b) => a + b, 0);

    const rigaIdx = r.int(0, 4);
    const rigaNum = 4 + rigaIdx; // le righe dati partono da riga 4
    const rigaLabel = ETICHETTE_RIGA[rigaIdx];
    const rowSum = dati[rigaIdx][0] + dati[rigaIdx][1] + dati[rigaIdx][2];

    const grandTotal = dati.reduce((acc, row) => acc + row[0] + row[1] + row[2], 0);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          'In B9 somma tutta la colonna B della tabella (Serie A, righe 4-8). ' +
          'Selezionala in un colpo con Ctrl+Barra spaziatrice, poi scrivi la somma.',
        target: 'Model!B9',
        atteso: sumB,
        referenzia: ['B4', 'B5', 'B6', 'B7', 'B8'],
        skills: ['spd.selection', 'xl.aggregates'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt:
          'Ora la colonna D (Serie C), in D9. Stessa scorciatoia: Ctrl+Barra spaziatrice ' +
          'sulla colonna, poi la formula.',
        target: 'Model!D9',
        atteso: sumD,
        referenzia: ['D4', 'D5', 'D6', 'D7', 'D8'],
        skills: ['spd.selection', 'xl.aggregates'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T3',
        prompt:
          `In E${rigaNum} somma orizzontalmente i tre valori di "${rigaLabel}" (colonne B, C, D ` +
          "di quella riga sola). Qui la scorciatoia e' Maiusc+Barra spaziatrice: seleziona l'intera " +
          'riga della tabella in un colpo.',
        target: `Model!E${rigaNum}`,
        atteso: rowSum,
        referenzia: [`B${rigaNum}`, `C${rigaNum}`, `D${rigaNum}`],
        skills: ['spd.selection', 'xl.aggregates'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T4',
        prompt:
          'In B11 somma tutti i 15 numeri della tabella in una sola formula. Mettiti dentro alla ' +
          'tabella e premi Ctrl+A: selezioni la "current region", il blocco di dati che ti circonda, ' +
          "senza le etichette intorno. Poi scrivi la somma.",
        target: 'Model!B11',
        atteso: grandTotal,
        referenzia: ['B4', 'D4', 'B8', 'D8'],
        skills: ['spd.selection', 'xl.aggregates'],
        minKeystrokes: 14,
      }),
    ];

    return {
      templateId: 'M0E-02-SELEZIONE',
      seed: rng.seed,
      brief: [
        '## Selezionare senza trascinare il mouse',
        '',
        'Niente finanza in questo livello: solo una tabellina di numeri e quattro somme. Il punto',
        "non e' calcolarle, e' arrivarci in fretta. Quattro scorciatoie, tutte sulla stessa idea:",
        '',
        '- **Ctrl+Barra spaziatrice** seleziona la colonna intera della cella attiva.',
        "- **Maiusc+Barra spaziatrice** fa lo stesso per la riga.",
        "- **Ctrl+A**, dentro a un blocco di dati, seleziona la \"current region\": il rettangolo",
        "  di celle piene che ti circonda, non l'intero foglio.",
        "- **Ctrl+Maiusc+Freccia** estende la selezione dalla cella attiva fino al bordo dei dati",
        "  in quella direzione: funziona su tutti e quattro i task qui sotto, se la preferisci.",
        '',
        "Il risultato conta, non come ci sei arrivato: puoi scrivere `=SUM(...)` selezionando",
        "il range con una scorciatoia o battendolo a mano, il grader guarda solo la cella finale.",
        "Ma con quindici numeri da sommare in quattro modi diversi, il mouse ti costera' tempo vero.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Selezione rapida'], { style: STILE_TITOLO }),
            riga('A3', ['Voce', 'Serie A', 'Serie B', 'Serie C', 'Totale riga'], {
              style: STILE_TITOLO,
            }),
            colonna('A4', [...ETICHETTE_RIGA], { style: STILE_ETICHETTA }),
            blocco('B4', dati, { style: STILE_INPUT }),
            blocco('A9', [['Totale colonna']], { style: STILE_ETICHETTA }),
            blocco('A11', [['Totale generale (15 numeri)']], { style: STILE_ETICHETTA }),
            areaLibera(['B9', 'D9', `E${rigaNum}`, 'B11']),
          ],
          { colWidths: { A: 220, B: 100, C: 100, D: 100, E: 110 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', 'Ctrl+Barra spaziatrice sulla colonna, poi `=SUM(` e Invio dopo aver scritto il range.', 6, 'T1'),
        hint('H2', 'Identica a T1 ma sulla colonna D.', 5, 'T2'),
        hint('H3', 'Maiusc+Barra spaziatrice sulla riga della tabella, non su tutta la riga del foglio.', 6, 'T3'),
        hint('H4', "Ctrl+A dentro alla tabella prende solo il blocco B4:D8, non l'intero foglio.", 8, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 20 }),
      startAt: 'Model!B9',
    };
  },
});
