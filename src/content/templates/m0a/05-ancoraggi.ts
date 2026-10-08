/**
 * M0-A · 05 — Riferimento relativo, assoluto, misto (e F4).
 *
 * Struttura scelta apposta: una tabella che si riempie con UNA formula copiata
 * in DUE direzioni. E' l'unica forma in cui la differenza fra `$C$2`, `$B7` e
 * `C$6` diventa evidente invece che teorica — su una riga sola ci si arriva per
 * caso e non si impara niente.
 *
 * La formula corretta usa tutte e tre le forme di ancoraggio insieme:
 *   =$C$2 * $B7 * C$6
 *      ^^^^^ base: ferma sempre
 *            ^^^^ fattore di scenario: scende con le righe, non scivola a destra
 *                   ^^^^ moltiplicatore d'anno: scorre a destra, non scende
 * Sbagliarne uno solo produce zeri o numeri plausibili ma falsi: entrambi i modi
 * in cui questo errore si presenta nella vita vera.
 */


import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  num,
  pct,
} from '../../authoring';

const ANNI = 4;

const SCENARI = [
  { nome: 'Prudente', fattore: 0.9 },
  { nome: 'Base', fattore: 1.0 },
  { nome: 'Ambizioso', fattore: 1.15 },
] as const;

export default defineTemplate({
  id: 'M0A-05-ANCORAGGI',
  module: 'M0-A',
  title: 'Il dollaro che tiene ferma la cella',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['xl.references', 'xl.anchoring', 'xl.copy-shift'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');
    const base = r.int(80, 260) * 1000;
    const inflazione = Math.round((0.015 + r.next() * 0.035) * 1000) / 1000;

    const moltiplicatori = Array.from({ length: ANNI }, (_, i) =>
      Math.round(Math.pow(1 + inflazione, i) * 1e6) / 1e6,
    );
    const valore = (scenario: number, anno: number): number =>
      base * SCENARI[scenario].fattore * moltiplicatori[anno];

    const totaleAmbizioso = moltiplicatori.reduce((acc, _m, a) => acc + valore(2, a), 0);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          'In C7 costruisci il valore del primo anno per lo scenario Prudente: base × fattore di scenario × moltiplicatore d\'anno. Scrivila in modo che si possa copiare su tutta C7:F9 senza toccarla piu\'.',
        target: 'Model!C7',
        atteso: valore(0, 0),
        referenzia: ['C2', 'B7', 'C6'],
        ancoraggio: '$C$2',
        senzaLiteral: [],
        skills: ['xl.anchoring'],
        minKeystrokes: 18,
      }),
      {
        id: 'T2',
        prompt:
          'Riempi tutta la tabella C7:F9 copiando quella formula. Ogni cella deve essere la stessa formula traslata: nessuna eccezione, nessun ritocco a mano.',
        targetCell: 'Model!C7:F9',
        check: [
          { kind: 'consistentRow' as const, range: 'Model!C7:F9' },
          { kind: 'noError' as const },
        ],
        skills: ['xl.copy-shift'],
        minKeystrokes: 12,
      },
      {
        // Task a se' stante, non un check dentro T2: l'angolo in basso a destra
        // e' il punto in cui un ancoraggio sbagliato smette di nascondersi, e
        // merita un feedback tutto suo.
        id: 'T3',
        prompt:
          'Controlla F9, l\'angolo in basso a destra: scenario Ambizioso, ultimo anno. Se quel numero e\' sbagliato, il problema e\' negli ancoraggi, non nella copia.',
        targetCell: 'Model!F9',
        check: [
          { kind: 'mustBeFormula' as const },
          {
            kind: 'value' as const,
            expected: valore(2, ANNI - 1),
            message:
              'L\'angolo in basso a destra non torna: e\' li\' che gli ancoraggi mancanti si vedono. Al centro della tabella producono numeri plausibili, qui no.',
          },
        ],
        skills: ['xl.anchoring'],
        minKeystrokes: 0,
      },
      taskFormula({
        id: 'T4',
        prompt: 'In C11 il totale dello scenario Ambizioso lungo i quattro anni.',
        target: 'Model!C11',
        atteso: totaleAmbizioso,
        referenzia: ['C9', 'F9'],
        skills: ['xl.aggregates'],
        minKeystrokes: 12,
      }),
    ];

    const intestazioniAnno = Array.from({ length: ANNI }, (_, i) => `Anno ${i + 1}`);

    return {
      templateId: 'M0A-05-ANCORAGGI',
      seed: rng.seed,
      brief: [
        '## Perche\' esiste il simbolo `$`',
        '',
        'Quando copi una formula, Excel **sposta i riferimenti insieme a lei**. Se in C7 scrivi',
        '`=C2*B7` e la copi in D7, diventa `=D2*C7`: tutto scivolato di una colonna. Quasi sempre',
        'e\' quello che vuoi. Qualche volta e\' un disastro.',
        '',
        `Qui la base sta in **una cella sola** (C2) e vale ${num(base)}. L'inflazione e\' ${pct(inflazione)},`,
        'e i moltiplicatori d\'anno che ne derivano sono gia\' pronti nella riga 6. I fattori di',
        'scenario stanno nella colonna B.',
        '',
        'Ti serve **una formula sola** che riempia tutte e dodici le celle. Il che vuol dire che',
        'dentro quella formula ci sono tre riferimenti che si devono comportare in tre modi diversi:',
        '',
        '- la base non si deve muovere mai',
        '- il fattore di scenario deve scendere con le righe ma non scivolare a destra',
        '- il moltiplicatore d\'anno deve scorrere a destra ma non scendere',
        '',
        '`$` blocca: `$C$2` blocca tutto, `C$2` solo la riga, `$C2` solo la colonna.',
        '**F4 in modifica cicla fra le quattro forme.** Imparalo adesso: lo userai diecimila volte.',
        '',
        'Attenzione all\'angolo in basso a destra: e\' li\' che un ancoraggio sbagliato si vede.',
        'Al centro della tabella spesso produce un numero plausibile, ed e\' il motivo per cui',
        'questo errore sopravvive fino alla riunione.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Proiezione per scenario'], { style: STILE_TITOLO }),
            blocco('A2', [['Base di partenza']], { style: STILE_ETICHETTA }),
            blocco('C2', [[base]], { style: STILE_INPUT }),
            blocco('A3', [['Inflazione annua']], { style: STILE_ETICHETTA }),
            blocco('C3', [[inflazione]], { style: STILE_INPUT_PCT }),

            riga('A5', ['Scenario', 'Fattore'], { style: STILE_TITOLO }),
            riga('C5', intestazioniAnno, { style: STILE_TITOLO }),
            blocco('A6', [['Moltiplicatore d\'anno']], { style: STILE_ETICHETTA }),
            riga('C6', moltiplicatori, { style: { ...STILE_FORMULA, numFmt: '0.000' } }),

            blocco('A7', SCENARI.map((s) => [s.nome, s.fattore]), { style: STILE_ETICHETTA }),
            blocco('A11', [['Totale Ambizioso']], { style: STILE_ETICHETTA }),

            areaLibera([
              'C7', 'D7', 'E7', 'F7',
              'C8', 'D8', 'E8', 'F8',
              'C9', 'D9', 'E9', 'F9',
              'C11',
            ]),
          ],
          {
            colWidths: { A: 190, B: 90, C: 110, D: 110, E: 110, F: 110 },
            frozenRows: 6,
            frozenCols: 2,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          'Tre riferimenti, tre ancoraggi diversi. Scrivi la formula senza $, poi torna su ciascun riferimento con F2 e premi F4 finche\' non ha la forma giusta.',
          15,
          'T1',
        ),
        hint('H2', 'Copia C7, seleziona C7:F9, incolla. Se qualche cella da\' zero hai bloccato di troppo; se i numeri crescono dove non dovrebbero, hai bloccato di meno.', 12, 'T2'),
        hint('H3', 'SUM su un intervallo orizzontale.', 8, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 75 }),
      startAt: 'Model!C7',
    };
  },
});
