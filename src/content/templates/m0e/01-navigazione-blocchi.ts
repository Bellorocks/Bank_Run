/**
 * M0-E · 01 — Navigazione a blocchi con Ctrl+Freccia.
 *
 * Primo livello del sotto-modulo Velocita' (spec §5, M0-E): "solo drill di
 * scorciatoie, mouse disabilitato hard, a tempo, senza contenuto finanziario.
 * Sono i livelli da rifare ogni sera per 5 minuti: rendili corti e
 * ri-giocabili all'infinito." Il mouse disabilitato hard non richiede nulla
 * qui: e' `mode: 'SPEEDRUN'` da solo ad attivarlo, dentro GridSession/PlayScreen.
 *
 * Niente numeri di bilancio: solo una griglia neutra, cosi' l'unica cosa che
 * si allena e' il riflesso della scorciatoia, non la lettura di un dato.
 *
 * Il foglio ha tre blocchi di dati separati da righe/colonne vuote:
 *   - blocco 1, verticale, A1:A9 (numeri a due cifre)
 *   - blocco 2, verticale, A15:A22 (numeri a tre cifre), staccato dal
 *     blocco 1 da un vuoto A10:A14
 *   - blocco 3, orizzontale, C1:H1 (numeri a una cifra), staccato dalla
 *     colonna A dalla colonna B vuota
 *
 * Ctrl+Freccia in Excel ha due comportamenti distinti, e questo livello li fa
 * incontrare entrambi apposta:
 *  - da una cella piena con la cella successiva anch'essa piena, salta
 *    all'ULTIMA cella piena prima del vuoto (T1, T3, T4);
 *  - da una cella piena con la cella successiva vuota, scavalca il vuoto e
 *    salta alla PROSSIMA cella piena, cioe' l'inizio del blocco dopo (T2).
 * Chi ha imparato Ctrl+Freccia a meta' conosce solo il primo caso: il secondo
 * e' quello che davvero fa risparmiare tempo su un foglio vero, pieno di
 * sezioni separate da righe vuote.
 *
 * I task non chiedono una formula: chiedono di leggere un valore dopo il
 * salto e scriverlo altrove come numero. Il check e' un semplice `value`,
 * senza `mustBeFormula` — esattamente come il task di lettura in
 * M0D-05-TRACEF9.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  riga,
  foglio,
  hint,
  par,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
} from '../../authoring';

export default defineTemplate({
  id: 'M0E-01-NAVBLOCCHI',
  module: 'M0-E',
  title: 'Il salto al bordo del blocco',
  rank: 1,
  mode: 'SPEEDRUN',
  estimatedSeconds: 75,
  skills: ['spd.navigation'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Le fasce sono fisse (non dipendono dal seed) apposta: il numero di
    // cifre della risposta resta costante, cosi' il minKeystrokes teorico
    // di ogni task non varia da una partita all'altra.
    const blocco1 = Array.from({ length: 9 }, () => r.int(10, 99)); // A1:A9
    const blocco2 = Array.from({ length: 8 }, () => r.int(100, 999)); // A15:A22
    const blocco3 = Array.from({ length: 6 }, () => r.int(1, 9)); // C1:H1

    const finaleBlocco1 = blocco1[blocco1.length - 1]; // A9
    const inizioBlocco2 = blocco2[0]; // A15
    const finaleBlocco2 = blocco2[blocco2.length - 1]; // A22
    const finaleBlocco3 = blocco3[blocco3.length - 1]; // H1

    const tasks = [
      {
        id: 'T1',
        prompt:
          'Vai in A1 e premi Ctrl+Freccia giu\': atterri sull\'ultima cella piena del primo blocco, prima del vuoto. Scrivi quel valore in L1.',
        targetCell: 'Model!L1',
        check: [
          {
            kind: 'value' as const,
            expected: finaleBlocco1,
            message: 'Non e\' l\'ultima cella del primo blocco: da A1, Ctrl+Freccia giu\' deve fermarti sull\'ultima cella piena prima del vuoto.',
          },
        ],
        skills: ['spd.navigation'],
        minKeystrokes: 8,
      },
      {
        id: 'T2',
        prompt:
          'Da li\' (l\'ultima cella del primo blocco) premi ancora Ctrl+Freccia giu\': sotto e\' vuoto, quindi il salto scavalca il vuoto e ti porta sulla prossima cella piena, l\'inizio del blocco successivo. Scrivi quel valore in L2.',
        targetCell: 'Model!L2',
        check: [
          {
            kind: 'value' as const,
            expected: inizioBlocco2,
            message: 'Quando la cella sotto e\' vuota, Ctrl+Freccia giu\' non si ferma li\': scavalca il vuoto e atterra sulla prossima cella piena.',
          },
        ],
        skills: ['spd.navigation'],
        minKeystrokes: 9,
      },
      {
        id: 'T3',
        prompt:
          'Sei gia\' dentro il secondo blocco: premi ancora Ctrl+Freccia giu\' e arrivi alla sua ultima cella piena. Scrivi quel valore in L3.',
        targetCell: 'Model!L3',
        check: [
          {
            kind: 'value' as const,
            expected: finaleBlocco2,
            message: 'Non e\' l\'ultima cella del secondo blocco: la cella sotto e\' ancora piena finche\' non arrivi al fondo del blocco.',
          },
        ],
        skills: ['spd.navigation'],
        minKeystrokes: 9,
      },
      {
        id: 'T4',
        prompt:
          'Vai in C1 e premi Ctrl+Freccia destra: stessa meccanica, in orizzontale. Scrivi il valore su cui atterri in L4.',
        targetCell: 'Model!L4',
        check: [
          {
            kind: 'value' as const,
            expected: finaleBlocco3,
            message: 'Da C1, Ctrl+Freccia destra deve fermarti sull\'ultima cella piena della riga, prima del vuoto.',
          },
        ],
        skills: ['spd.navigation'],
        minKeystrokes: 7,
      },
    ];

    return {
      templateId: 'M0E-01-NAVBLOCCHI',
      seed: rng.seed,
      brief: [
        '## Il salto al bordo del blocco',
        '',
        'Drill puro, senza contenuto finanziario. Il mouse e\' disattivato: si gioca solo di tastiera.',
        '',
        '**Ctrl+Freccia** (in qualunque direzione) salta al bordo del blocco di dati contiguo:',
        '',
        '- se la cella nella direzione del salto e\' piena, ti fermi sull\'ULTIMA cella piena prima del vuoto;',
        '- se invece e\' vuota, scavalchi tutto il vuoto e atterri sulla PROSSIMA cella piena.',
        '',
        'Sul foglio ci sono tre blocchi di numeri separati da righe o colonne vuote. Ogni task ti chiede',
        'di saltare da un punto di partenza e scrivere il valore su cui atterri in una cella libera a destra.',
        'Niente da calcolare: solo leggere e trascrivere, il piu\' in fretta possibile.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            colonna('A1', blocco1, { style: STILE_INPUT }),
            colonna('A15', blocco2, { style: STILE_INPUT }),
            riga('C1', blocco3, { style: STILE_INPUT }),
            blocco(
              'K1',
              [['Risposta T1'], ['Risposta T2'], ['Risposta T3'], ['Risposta T4']],
              { style: STILE_ETICHETTA },
            ),
            areaLibera(['L1', 'L2', 'L3', 'L4']),
          ],
          { colWidths: { A: 70, B: 40, C: 60, D: 60, E: 60, F: 60, G: 60, H: 60, I: 40, J: 40, K: 130, L: 100 } },
        ),
      ],
      tasks,
      hints: [
        hint('H1', 'Da A1 tieni Ctrl e premi Freccia giu\' una volta sola: ti fermi sull\'ultima cella piena prima del vuoto (A9).', 5, 'T1'),
        hint('H2', 'Stessa scorciatoia, stessa direzione, ma partendo da A9: sotto e\' vuoto, quindi salti dritto al prossimo blocco (A15).', 5, 'T2'),
        hint('H3', 'Da A15, Ctrl+Freccia giu\' ti porta in fondo al secondo blocco (A22): la cella sotto e\' ancora piena finche\' non arrivi li\'.', 5, 'T3'),
        hint('H4', 'Da C1, Ctrl+Freccia destra invece di giu\': stesso identico meccanismo, in orizzontale (arrivi a H1).', 5, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 12 }),
      startAt: 'Model!A1',
    };
  },
});
