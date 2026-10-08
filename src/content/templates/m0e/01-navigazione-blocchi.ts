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

import { tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0E-01-NAVBLOCCHI',
  module: 'M0-E',
  get title() {
    return tx('M0E-01-NAVBLOCCHI.title');
  },
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
          tx('M0E-01-NAVBLOCCHI.2'),
        targetCell: 'Model!L1',
        check: [
          {
            kind: 'value' as const,
            expected: finaleBlocco1,
            message: tx('M0E-01-NAVBLOCCHI.3'),
          },
        ],
        skills: ['spd.navigation'],
        minKeystrokes: 8,
      },
      {
        id: 'T2',
        prompt:
          tx('M0E-01-NAVBLOCCHI.4'),
        targetCell: 'Model!L2',
        check: [
          {
            kind: 'value' as const,
            expected: inizioBlocco2,
            message: tx('M0E-01-NAVBLOCCHI.5'),
          },
        ],
        skills: ['spd.navigation'],
        minKeystrokes: 9,
      },
      {
        id: 'T3',
        prompt:
          tx('M0E-01-NAVBLOCCHI.6'),
        targetCell: 'Model!L3',
        check: [
          {
            kind: 'value' as const,
            expected: finaleBlocco2,
            message: tx('M0E-01-NAVBLOCCHI.7'),
          },
        ],
        skills: ['spd.navigation'],
        minKeystrokes: 9,
      },
      {
        id: 'T4',
        prompt:
          tx('M0E-01-NAVBLOCCHI.8'),
        targetCell: 'Model!L4',
        check: [
          {
            kind: 'value' as const,
            expected: finaleBlocco3,
            message: tx('M0E-01-NAVBLOCCHI.9'),
          },
        ],
        skills: ['spd.navigation'],
        minKeystrokes: 7,
      },
    ];

    return {
      templateId: 'M0E-01-NAVBLOCCHI',
      seed: rng.seed,
      brief: [tx('M0E-01-NAVBLOCCHI.10')].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            colonna('A1', blocco1, { style: STILE_INPUT }),
            colonna('A15', blocco2, { style: STILE_INPUT }),
            riga('C1', blocco3, { style: STILE_INPUT }),
            blocco(
              'K1',
              [[tx('M0E-01-NAVBLOCCHI.11')], [tx('M0E-01-NAVBLOCCHI.12')], [tx('M0E-01-NAVBLOCCHI.13')], [tx('M0E-01-NAVBLOCCHI.14')]],
              { style: STILE_ETICHETTA },
            ),
            areaLibera(['L1', 'L2', 'L3', 'L4']),
          ],
          { colWidths: { A: 70, B: 40, C: 60, D: 60, E: 60, F: 60, G: 60, H: 60, I: 40, J: 40, K: 130, L: 100 } },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M0E-01-NAVBLOCCHI.15'), 5, 'T1'),
        hint('H2', tx('M0E-01-NAVBLOCCHI.16'), 5, 'T2'),
        hint('H3', tx('M0E-01-NAVBLOCCHI.17'), 5, 'T3'),
        hint('H4', tx('M0E-01-NAVBLOCCHI.18'), 5, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 12 }),
      startAt: 'Model!A1',
    };
  },
});
