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

export default defineTemplate({
  id: 'M0E-05-RIGHECOLONNE',
  module: 'M0-E',
  title: 'Inserisci ed elimina senza il mouse',
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
          `In riga 4 c'e' una serie di numeri con un refuso, ${num(refusoCol)}, palesemente fuori scala. ` +
          `Selezionalo, seleziona l'intera colonna con Ctrl+Spazio, elimina con Ctrl+-. Solo dopo, in A6, ` +
          `somma quello che resta della serie. Se la somma non torna, il refuso e' ancora dentro.`,
        target: 'Model!A6',
        atteso: sommaRiga,
        referenzia: ['B4'],
        skills: ['spd.rows-cols'],
        minKeystrokes: 14,
      }),
      taskFormula({
        id: 'T2',
        prompt:
          `Stesso problema in verticale, colonna A a partire da riga 10: ${num(refusoRiga)} e' un refuso in ` +
          `mezzo alla serie. Selezionalo, seleziona l'intera riga con Maiusc+Spazio, elimina con Ctrl+-, e ` +
          `in B9 somma quello che resta.`,
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
      brief: [
        '## Inserisci ed elimina senza il mouse',
        '',
        "Drill puro, senza contenuto finanziario. Due refusi da eliminare, come intere righe o colonne,",
        'non come singole celle vuotate.',
        '',
        '**Ctrl+-** elimina la selezione corrente. **Ctrl+Maiusc+"+"** inserisce. Entrambe agiscono su',
        "cio' che hai selezionato: per colpire una riga o una colonna INTERA, selezionala prima con",
        '**Maiusc+Spazio** (riga) o **Ctrl+Spazio** (colonna) — non basta selezionare la cella del refuso',
        "da sola, o Excel elimina solo quella.",
        '',
        `In riga 4 c'e una serie orizzontale con un intruso, ${num(refusoCol)}. Eliminalo come colonna`,
        "intera, poi somma quello che resta in A6. La somma stessa e' la prova: se il refuso e' ancora",
        'dentro, il totale sballa di migliaia.',
        '',
        `Piu' in basso, a partire da riga 10, la stessa cosa in verticale: ${num(refusoRiga)} va eliminato`,
        'come riga intera, poi la somma della serie ripulita va in B9.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Elimina il refuso'], { style: STILE_TITOLO }),
            blocco('A3', [['Serie orizzontale con un refuso']], { style: STILE_ETICHETTA }),
            riga('B4', rigaCompleta, { style: STILE_INPUT }),
            blocco('A8', [['Serie verticale con un refuso, qui sotto']], { style: STILE_ETICHETTA }),
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
          `Il refuso e' in ${colRefusoLettera}4. Selezionalo, Ctrl+Spazio per tutta la colonna, Ctrl+- per eliminarla. Poi A6 = somma di quello che resta della serie.`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `Il refuso e' qualche riga sotto A10. Selezionalo, Maiusc+Spazio per tutta la riga, Ctrl+- per eliminarla. Poi B9 = SUM sui dati rimasti in colonna A.`,
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 20 }),
      startAt: 'Model!B4',
    };
  },
});
