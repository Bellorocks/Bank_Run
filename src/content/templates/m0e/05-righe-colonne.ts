/**
 * M0-E · 05 — Inserisci ed elimina righe e colonne (Ctrl+"-" / Ctrl+Maiusc+"+").
 *
 * Ultimo drill di velocita' (spec §5, M0-E): mouse disattivato hard (mode
 * SPEEDRUN), niente contenuto finanziario, numeri neutri.
 *
 * Scorciatoie vere (src/keymap/bindings.ts): `Ctrl+-` elimina, `Ctrl+Maiusc+"+"`
 * inserisce. Entrambe agiscono sulla SELEZIONE corrente: per eliminare/inserire
 * una riga o colonna intera va prima selezionata per intero (Maiusc+Spazio per
 * la riga, Ctrl+Spazio per la colonna) — vedi M0E-02-SELEZIONE.
 *
 * GEOMETRIA DEL FOGLIO — il punto delicato di ogni esercizio su inserimento ed
 * eliminazione, verificato con un test dedicato (poi rimosso) che ha scoperto
 * un bug nella prima versione di questo file: eliminare una riga sposta TUTTO
 * cio' che sta sotto di essa, in QUALUNQUE colonna. Un secondo esercizio
 * "piu' in basso" sullo stesso foglio, anche in una colonna diversa, si sposta
 * comunque quando il primo elimina una riga sopra di lui — il target scritto
 * nel prompt smette di coincidere con dove l'etichetta e' finita davvero.
 *
 * La regola che rende i due esercizi indipendenti:
 *  - l'esercizio che elimina una COLONNA sta tutto in poche righe IN ALTO,
 *    e la sua risposta vive in colonna A — a sinistra della colonna eliminata,
 *    quindi mai spostata da un'eliminazione che sposta solo cio' che sta a
 *    destra di lei;
 *  - l'esercizio che elimina una RIGA sta tutto PIU' IN BASSO, dopo la riga
 *    di risposta del primo esercizio, ed E' L'ULTIMO BLOCCO DEL FOGLIO: non
 *    c'e' nient'altro sotto di lui che un'eliminazione di riga potrebbe
 *    spostare. La sua risposta vive SOPRA i suoi stessi dati (mai sotto).
 * Con questo ordine, l'eliminazione di colonna del primo esercizio (in alto,
 * poche righe) non tocca mai la colonna A usata piu' in basso dal secondo, e
 * l'eliminazione di riga del secondo (in basso) non tocca mai nulla sopra di
 * lui, incluso il primo esercizio.
 *
 * Il grader non ha un Check che dica "questa riga/colonna deve essere sparita":
 * puo' verificare solo il valore finale di una cella. La soluzione e' rendere
 * l'operazione verificabile PER VIA INDIRETTA: ogni somma richiesta include
 * DELIBERATAMENTE il refuso nel proprio range di partenza. Se il giocatore non
 * elimina davvero la riga o la colonna prima di sommare, il totale include il
 * refuso ed e' sbagliato per una cifra vistosa — la somma stessa e' la prova
 * che l'eliminazione e' avvenuta.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  riga,
  foglio,
  hint,
  par,
  taskFormula,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  num,
} from '../../authoring';

import { tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0E-05-RIGHECOLONNE',
  module: 'M0-E',
  get title() {
    return tx('M0E-05-RIGHECOLONNE.title');
  },
  rank: 2,
  mode: 'SPEEDRUN',
  estimatedSeconds: 90,
  skills: ['spd.rows-cols', 'spd.selection'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // T1 — serie orizzontale con un refuso da eliminare come COLONNA.
    // Fuori scala apposta: si vede a occhio, e la somma sballa vistosamente
    // se il refuso resta dentro.
    const rigaBuoni = Array.from({ length: 7 }, () => r.int(10, 90));
    const refusoCol = r.int(5000, 9000);
    const posizioneRefusoCol = r.int(2, 5); // mai il primo ne' l'ultimo valore
    const rigaCompleta = [
      ...rigaBuoni.slice(0, posizioneRefusoCol),
      refusoCol,
      ...rigaBuoni.slice(posizioneRefusoCol),
    ];
    const sommaRiga = rigaBuoni.reduce((a, b) => a + b, 0);

    // T2 — colonna verticale con un refuso da eliminare come RIGA.
    const colBuoni = Array.from({ length: 8 }, () => r.int(10, 90));
    const refusoRiga = r.int(5000, 9000);
    const posizioneRefusoRiga = r.int(2, 6);
    const colonnaCompleta = [
      ...colBuoni.slice(0, posizioneRefusoRiga),
      refusoRiga,
      ...colBuoni.slice(posizioneRefusoRiga),
    ];
    const sommaColonna = colBuoni.reduce((a, b) => a + b, 0);

    const colRefusoLettera = String.fromCharCode(66 + posizioneRefusoCol); // la serie parte da B4

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M0E-05-RIGHECOLONNE.2', { p0: num(refusoCol) }),
        target: 'Model!A6',
        atteso: sommaRiga,
        referenzia: ['B4'],
        skills: ['spd.rows-cols'],
        minKeystrokes: 14,
      }),
      taskFormula({
        id: 'T2',
        prompt:
          tx('M0E-05-RIGHECOLONNE.3', { p0: num(refusoRiga) }),
        target: 'Model!B9',
        atteso: sommaColonna,
        referenzia: ['A10'],
        skills: ['spd.rows-cols'],
        minKeystrokes: 14,
      }),
    ];

    return {
      templateId: 'M0E-05-RIGHECOLONNE',
      seed: rng.seed,
      brief: [tx('M0E-05-RIGHECOLONNE.4', { p0: num(refusoCol), p1: num(refusoRiga) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0E-05-RIGHECOLONNE.5')], { style: STILE_TITOLO }),
            blocco('A3', [[tx('M0E-05-RIGHECOLONNE.6')]], { style: STILE_ETICHETTA }),
            riga('B4', rigaCompleta, { style: STILE_INPUT }),
            blocco('A8', [[tx('M0E-05-RIGHECOLONNE.7')]], { style: STILE_ETICHETTA }),
            colonna('A10', colonnaCompleta, { style: STILE_INPUT }),
            areaLibera(['A6', 'B9']),
          ],
          { colWidths: { A: 220, B: 90 }, frozenRows: 0 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0E-05-RIGHECOLONNE.8', { colRefusoLettera }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0E-05-RIGHECOLONNE.9'),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 20 }),
      startAt: 'Model!B4',
    };
  },
});
