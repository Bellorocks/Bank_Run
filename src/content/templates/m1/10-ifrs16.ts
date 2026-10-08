/**
 * M1 · 10 — IFRS 16: il leasing operativo entra in bilancio.
 *
 * Prima del principio, un leasing operativo (l'affitto di un capannone, di un
 * ufficio) era fuori bilancio: il canone annuo era semplicemente un costo
 * operativo a Conto Economico, sopra la riga EBITDA. Con IFRS 16 quel
 * contratto genera un'attivita' (il "right-of-use", il diritto d'uso
 * dell'immobile) e una passivita' finanziaria di pari importo: il canone
 * sparisce dai costi operativi e viene sostituito da due voci che stanno
 * ENTRAMBE sotto la riga EBITDA — l'ammortamento del right-of-use e gli
 * interessi sulla passivita' leasing. E' la "trappola" classica di IFRS 16:
 * l'EBITDA riportato migliora, non perche' l'azienda genera piu' cassa
 * operativa, ma solo perche' un costo che prima stava sopra la riga ora sta
 * sotto. Il terzo task, come in M1-06, non ricostruisce due EBITDA per poi
 * sottrarli: isola la distorsione in UN numero solo, che risulta essere
 * esattamente il canone annuo — indipendentemente da come quel canone si
 * spacchi fra ammortamento e interessi.
 *
 * SEMPLIFICAZIONE DICHIARATA: niente attualizzazione/valore attuale dei
 * canoni futuri (introdurrebbe un tasso di sconto e una meccanica da livello
 * DCF, fuori scopo qui). La passivita' leasing iniziale e' calcolata
 * linearmente come canone annuo × durata residua in anni, e la sua quota
 * capitale si ammortizza in modo lineare sulla stessa durata — per questo la
 * quota capitale annua torna, per costruzione, identica al canone annuo
 * originale: non e' un errore, e' la conseguenza diretta di aver tolto lo
 * sconto finanziario dal modello.
 *
 * Layout fisso (nessuno shuffle di righe o colonne): i riferimenti di riga
 * qui sotto sono letterali di proposito, perche' la posizione non dipende
 * MAI dal seed.
 */

import {
  defineTemplate,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
} from '../../authoring';

// --- Geometria fissa del foglio. -------------------------------------------
const RIGA_CANONE = 4;
const RIGA_DURATA = 5;
const RIGA_PASSIVITA = 9; // T1
const RIGA_QUOTACAP = 10; // T2
const RIGA_EFFETTO = 11; // T3

const B_CANONE = `B${RIGA_CANONE}`;
const B_DURATA = `B${RIGA_DURATA}`;
const B_PASSIVITA = `B${RIGA_PASSIVITA}`;
const B_QUOTACAP = `B${RIGA_QUOTACAP}`;
const B_EFFETTO = `B${RIGA_EFFETTO}`;

export default defineTemplate({
  id: 'M1-10-IFRS16',
  module: 'M1',
  title: 'IFRS 16: il leasing entra in bilancio',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['acc.ifrs16'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const canoneAnnuo = r.int(30, 200) * 1000; // 30.000 - 200.000, a scatti di 1.000
    const durataResidua = r.int(4, 8); // anni

    const valoreInizialePassivita = canoneAnnuo * durataResidua;
    const quotaCapitaleAnnua = valoreInizialePassivita / durataResidua; // = canoneAnnuo, per costruzione
    // La distorsione sull'EBITDA riportato coincide, per costruzione, con il
    // canone annuo: e' esattamente il costo che sparisce dai costi operativi
    // (ammortamento e interessi vivono entrambi sotto la riga EBITDA).
    const effettoEbitda = canoneAnnuo;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_PASSIVITA} calcola il valore iniziale della passivita' leasing, cioe' del diritto d'uso ` +
        `(right-of-use) iscritto in attivo: il canone annuo del contratto (${eur(canoneAnnuo)}, in ${B_CANONE}) ` +
        `moltiplicato per la durata residua del contratto in anni (${durataResidua}, in ${B_DURATA}). Nessuna ` +
        "attualizzazione qui: e' una semplificazione lineare, riferisciti alle due celle e non scrivere i numeri a mano.",
      target: `Model!${B_PASSIVITA}`,
      atteso: valoreInizialePassivita,
      referenzia: [B_CANONE, B_DURATA],
      senzaLiteral: [],
      skills: ['acc.ifrs16'],
      minKeystrokes: 6,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_QUOTACAP} calcola la quota capitale annua della passivita' leasing: l'ammortamento lineare del ` +
        `right-of-use, cioe' il valore iniziale appena calcolato in ${B_PASSIVITA} diviso per la durata residua ` +
        `del contratto (${B_DURATA}). Riferisciti alla passivita' gia' calcolata, non ricalcolarla moltiplicando ` +
        'di nuovo canone per durata. Nota: con questa semplificazione lineare questa quota torna identica al ' +
        "canone annuo originale — e' voluto, non un errore: e' quello che succede quando si toglie lo sconto " +
        'finanziario dal modello.',
      target: `Model!${B_QUOTACAP}`,
      atteso: quotaCapitaleAnnua,
      referenzia: [B_PASSIVITA, B_DURATA],
      senzaLiteral: [],
      skills: ['acc.ifrs16'],
      minKeystrokes: 6,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In ${B_EFFETTO} calcola di quanto l'EBITDA riportato secondo IFRS 16 risulta piu' alto rispetto ` +
        "all'EBITDA che l'azienda avrebbe riportato trattando il leasing come un affitto operativo pieno, con il " +
        "canone come costo operativo sopra la riga EBITDA. Con IFRS 16 il canone sparisce dai costi operativi ed " +
        "e' sostituito da ammortamento del right-of-use e interessi sulla passivita' leasing, ENTRAMBI sotto la " +
        "riga EBITDA: l'intero canone, quindi, torna a far parte dell'EBITDA. Non ricostruire due EBITDA in due " +
        "celle separate per poi sottrarli: la differenza e' un numero solo, ed e' esattamente il canone annuo " +
        `(${B_CANONE}) — riferisciti solo a quella.`,
      target: `Model!${B_EFFETTO}`,
      atteso: effettoEbitda,
      referenzia: [B_CANONE],
      senzaLiteral: [],
      skills: ['acc.ifrs16'],
      minKeystrokes: 3,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-10-IFRS16',
      seed: rng.seed,
      brief: [
        "## Il leasing operativo entra in bilancio, e l'EBITDA ne beneficia",
        '',
        "Un'azienda ha in essere un contratto di leasing operativo su un immobile (un capannone, un " +
          "ufficio): prima di IFRS 16 il canone annuo era semplicemente un costo a Conto Economico, sopra " +
          "la riga EBITDA. Con IFRS 16 quasi tutti i leasing — anche quelli operativi — generano invece " +
          "un'attivita' (il diritto d'uso dell'immobile, il \"right-of-use\") e una passivita' finanziaria " +
          "di pari importo: il canone smette di essere un costo operativo e viene sostituito da " +
          "ammortamento del right-of-use e interessi sulla passivita', entrambi sotto la riga EBITDA.",
        '',
        `Qui sotto trovi il canone annuo del contratto (${eur(canoneAnnuo)}) e la sua durata residua ` +
          `(${durataResidua} anni). **Semplificazione dichiarata**: nessuna attualizzazione dei canoni ` +
          "futuri — la passivita' leasing iniziale si calcola linearmente come canone annuo moltiplicato " +
          'per la durata residua, e si ammortizza in modo lineare sulla stessa durata.',
        '',
        "**Il punto delicato** e' l'ultimo task, la trappola classica di IFRS 16: siccome ammortamento e " +
          "interessi vivono ENTRAMBI sotto la riga EBITDA, spostare il canone dai costi operativi a " +
          "quelle due voci fa migliorare l'EBITDA riportato — non perche' l'azienda generi piu' cassa " +
          "operativa, ma solo perche' un costo che prima stava sopra la riga ora sta sotto. Non serve " +
          "ricostruire due EBITDA da confrontare: un solo numero isola la distorsione, ed e' " +
          "esattamente il canone annuo.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['IFRS 16: il leasing entra in bilancio'], { style: STILE_TITOLO }),
            riga('A3', ['Voce', 'Valore'], { style: STILE_TITOLO }),
            [{ ref: 'A4', content: 'Canone di leasing annuo, €', locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_CANONE, content: canoneAnnuo, locked: true, style: STILE_INPUT }],
            [{ ref: 'A5', content: 'Durata residua del contratto, anni', locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_DURATA, content: durataResidua, locked: true, style: STILE_INPUT }],
            riga('A8', ['Riepilogo'], { style: STILE_TITOLO }),
            [
              {
                ref: 'A9',
                content: "Valore iniziale della passivita' leasing (right-of-use), €",
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_PASSIVITA, content: null, locked: false, style: STILE_FORMULA },
              {
                ref: 'A10',
                content: "Quota capitale annua della passivita' (ammortamento lineare del right-of-use), €",
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_QUOTACAP, content: null, locked: false, style: STILE_FORMULA },
              {
                ref: 'A11',
                content: "Effetto sull'EBITDA riportato rispetto a un trattamento come costo operativo pieno, €",
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_EFFETTO, content: null, locked: false, style: STILE_FORMULA },
            ],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `=${B_CANONE}*${B_DURATA}: il canone annuo per la durata residua del contratto, in anni.`, 8, 'T1'),
        hint('H2', `=${B_PASSIVITA}/${B_DURATA}: la passivita' iniziale divisa per gli anni di durata residua.`, 8, 'T2'),
        hint(
          'H3',
          `=${B_CANONE}: sotto IFRS 16 il canone non e' piu' un costo operativo, e' sostituito da ` +
            "ammortamento e interessi che stanno entrambi sotto la riga EBITDA. L'EBITDA riportato e' " +
            "piu' alto esattamente del canone che non compare piu' sopra la riga.",
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 65 }),
      startAt: `Model!${B_PASSIVITA}`,
    };
  },
});
