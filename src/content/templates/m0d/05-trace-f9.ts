/**
 * M0-D · 05 — Trace precedents/dependents (Ctrl+[ / Ctrl+]) e F9 su frammento.
 *
 * Il modello di questo livello e' gia' costruito: B4 e B6 sono formule VERE,
 * bloccate, che il giocatore non deve scrivere ma solo attraversare. E' apposta:
 * la lezione non e' "sai scrivere una catena di formule" (gia' vista in M0-A),
 * e' "sai risalire una catena che ha scritto qualcun altro senza ricalcolare
 * tutto a mente". Ctrl+[ sposta la selezione sui precedenti diretti della cella
 * attiva; Ctrl+] fa il percorso inverso sui dipendenti. Nessuno dei due e'
 * osservabile dal grader (sono movimenti di selezione, non producono un valore
 * in cella), quindi il livello non prova a verificarli — li spiega nel brief e
 * basta, come dice il compito.
 *
 * T1 chiede il risultato finale della catena: una formula nuova, scritta dal
 * giocatore, che chiude la catena (equity value = EV − debito). T2 e' il punto
 * vero del livello: chiede un valore che vive DENTRO quella formula (EV, cioe'
 * EBITDA × multiplo) ma che non ha una cella propria. Ricalcolarlo a mano vuol
 * dire rifare la moltiplicazione; il modo rapido e' entrare in modifica su B9
 * (F2), selezionare il frammento `B6*B8` nella barra della formula e premere
 * F9 — Excel lo sostituisce li' per li' col suo valore. La trappola da
 * segnalare nel brief: dopo aver letto il numero si esce con ESC, non con
 * INVIO, altrimenti quel valore letterale sostituisce la formula per sempre.
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
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  eur,
  eurM,
  pct,
  multiplo,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';

export default defineTemplate({
  id: 'M0D-05-TRACEF9',
  module: 'M0-D',
  title: 'Risalire la catena senza ricalcolare',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.trace', 'xl.f9'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Numeri "sporchi" quanto basta da rendere il calcolo a mente scomodo:
    // e' proprio il motivo per cui F9 conviene, non un dettaglio estetico.
    const ricavi = roundTo(triangular(r, 4_000_000, 8_000_000, 15_000_000), 50_000);
    const crescita = roundTo(triangular(r, 0.02, 0.05, 0.09), 0.001);
    const margine = roundTo(triangular(r, 0.14, 0.19, 0.26), 0.001);
    const debito = roundTo(triangular(r, 1_500_000, 3_000_000, 6_000_000), 50_000);
    const mult = roundTo(triangular(r, 5.5, 7.0, 9.0), 0.1);

    // Stessa aritmetica delle formule che il motore calcolera' davvero: il
    // valore atteso deve nascere dagli stessi passaggi, non da una scorciatoia.
    const ricaviProiettati = ricavi * (1 + crescita);
    const ebitdaProiettato = ricaviProiettati * margine;
    const enterpriseValue = ebitdaProiettato * mult;
    const equityValue = enterpriseValue - debito;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          "In B9 chiudi la catena: l'equity value e' l'enterprise value (EBITDA proiettato per il " +
          'multiplo di riferimento) meno la posizione debitoria netta. B4 e B6 sono gia\' formule: ' +
          "non ricalcolare ricavi o EBITDA a mano, referenziale e basta.",
        target: 'Model!B9',
        atteso: equityValue,
        referenzia: ['B6', 'B7', 'B8'],
        senzaLiteral: [],
        skills: ['xl.trace'],
        minKeystrokes: 14,
      }),
      {
        id: 'T2',
        prompt:
          "In B11 scrivi l'enterprise value implicito nella formula di B9: la parte EBITDA × multiplo, " +
          "prima che tolga il debito. Non serve una nuova formula da zero e non serve rifare la " +
          "moltiplicazione sulla calcolatrice: apri B9 in modifica (F2), seleziona il pezzo B6*B8 " +
          'dentro la barra della formula e premi F9. Poi esci con ESC — se premi Invio quel numero ' +
          "sostituisce la formula per sempre.",
        targetCell: 'Model!B11',
        check: [
          {
            kind: 'value' as const,
            expected: enterpriseValue,
            message:
              "Non torna l'enterprise value implicito. E' EBITDA proiettato (B6) per il multiplo (B8): " +
              'il frammento che vedi evidenziato in B9 quando selezioni B6*B8 e premi F9.',
          },
        ],
        skills: ['xl.f9'],
        // Non e' un riferimento breve come "A9": qui la risposta e' il valore letto
        // (7-11 cifre a seconda del seed, es. "9004616" o "12656923,92"). Il minimo
        // teorico deve contare quelle cifre piu' la discesa da B9 a B11 e l'Invio,
        // non un valore fisso indipendente dal seed.
        minKeystrokes: 10,
      },
    ];

    return {
      templateId: 'M0D-05-TRACEF9',
      seed: rng.seed,
      brief: [
        '## Risalire la catena senza ricalcolare',
        '',
        `Un modello di valutazione rapida, gia' costruito da qualcun altro. Ricavi ${eurM(ricavi)},`,
        `crescita attesa ${pct(crescita)}, margine EBITDA ${pct(margine)}: da questi tre numeri`,
        "il foglio deriva gia' i ricavi proiettati (B4) e l'EBITDA proiettato (B6). Sono formule",
        "vere, bloccate: il tuo compito non e' riscriverle, e' capire cosa contengono senza",
        'ricalcolare tutto a mente.',
        '',
        '**Ctrl+[** (Trace precedents), premuto su una cella, sposta la selezione sulle celle da',
        'cui quella formula dipende DIRETTAMENTE. Sali su B6 e premi Ctrl+[: la selezione salta su',
        'B4 e B5, i due ingredienti dell\'EBITDA. Premilo di nuovo su B4 e salti su B2 e B3. E\' cosi\'',
        "che si risale una catena in pochi secondi invece di indovinare. **Ctrl+]** (Trace dependents)",
        'fa il percorso inverso: da un input, mostra tutto cio\' che lo usa.',
        '',
        `La posizione debitoria netta e' ${eur(debito)} (B7), il multiplo di riferimento e' ${multiplo(mult)}`,
        '(B8). In B9 costruisci il numero finale: enterprise value meno debito.',
        '',
        "Poi arriva la parte utile davvero: in B11 ti chiediamo l'enterprise value da solo, cioe'",
        "un pezzo DENTRO la formula di B9 che non ha una cella tutta sua. Rifare la moltiplicazione",
        "e' un modo per trovarlo. Il modo da professionista e' un altro: entra in modifica su B9 con",
        '**F2**, seleziona con il mouse (o Shift+frecce) il pezzo `B6*B8` dentro la barra della',
        'formula, e premi **F9**. Excel lo sostituisce li\', al posto della selezione, con il suo',
        "valore calcolato — senza uscire dalla cella, senza toccare nient'altro. Leggi il numero e",
        'premi **ESC**, non Invio: Invio incollerebbe quel valore al posto del frammento e la',
        "formula smetterebbe di essere una formula.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Valutazione rapida'], { style: STILE_TITOLO }),
            blocco(
              'A2',
              [
                ['Ricavi base (anno corrente)'],
                ["Crescita di ricavi prevista"],
                ["Ricavi proiettati (anno + 1)"],
                ['Margine EBITDA atteso'],
                ['EBITDA proiettato'],
                ['Posizione debitoria netta'],
                ['Multiplo EV/EBITDA di riferimento'],
                ['Equity value stimato'],
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[ricavi]], { style: STILE_INPUT }),
            blocco('B3', [[crescita]], { style: STILE_INPUT_PCT }),
            // Formule VERE, bloccate: sono il modello dato, non il compito.
            blocco('B4', [['=B2*(1+B3)']], { style: STILE_FORMULA }),
            blocco('B5', [[margine]], { style: STILE_INPUT_PCT }),
            blocco('B6', [['=B4*B5']], { style: STILE_FORMULA }),
            blocco('B7', [[debito]], { style: STILE_INPUT }),
            blocco('B8', [[mult]], { style: STILE_INPUT_MULTIPLO }),
            blocco('A11', [['Enterprise value implicito (EBITDA × multiplo)']], { style: STILE_ETICHETTA }),
            areaLibera(['B9', 'B11']),
          ],
          { colWidths: { A: 300, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          "B9 = B6*B8-B7: EBITDA proiettato per il multiplo, meno il debito. Non serve toccare B2:B6, sono gia' pronte.",
          10,
          'T1',
        ),
        hint(
          'H2',
          "Su B6 premi Ctrl+[ per vedere da cosa dipende (B4, B5); su B4 premilo ancora per arrivare a B2, B3.",
          6,
          'T1',
        ),
        hint(
          'H3',
          "F2 su B9, seleziona il testo B6*B8 nella barra della formula, premi F9: il valore appare al posto della selezione. ESC per uscire senza modificare nulla.",
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: 'Model!B9',
    };
  },
});
