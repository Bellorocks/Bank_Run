/**
 * M0-B · 07 — Coerenza di riga: fill down/right e l'errore che non si vede.
 *
 * Il punto didattico non e' "come si copia una formula" (quello lo insegna gia'
 * M0A-05-ANCORAGGI): e' che su un ORIZZONTE DI PROIEZIONE — una riga di anni che
 * si legge da sinistra a destra — la stessa formula deve stare, identica, in
 * ogni cella. Non "quasi identica": IDENTICA a meno della traslazione che Excel
 * fa da solo.
 *
 * La ragione per cui questo conta piu' di quanto sembri: in un modello vero
 * nessuno pianta un errore scrivendo una formula sbagliata dappertutto — si
 * vedrebbe subito. Lo pianta ritoccando A MANO una cella in mezzo alla riga,
 * magari per "correggere" un numero che sembrava strano, magari incollando un
 * valore al posto di una formula durante un aggiustamento dell'ultimo minuto.
 * Il risultato calcola, non da' errore, sembra plausibile — ed e' silenziosamente
 * sbagliato per sempre, perche' nessuno ricontrolla una riga che "funziona gia'".
 * E' l'errore silenzioso piu' comune dei modelli reali, ed e' quasi invisibile a
 * chi guarda solo i NUMERI: si vede solo confrontando le FORMULE cella per
 * cella, che e' esattamente cio' che il check consistentRow fa al posto tuo.
 *
 * T1 costruisce la prima formula della proiezione con l'ancoraggio giusto sul
 * tasso di crescita (l'unica cella che l'intera riga deve condividere). T2 non
 * chiede una formula nuova: chiede di riempire il resto della riga — con
 * fill right (maniglione, Ctrl+R, o copia/incolla) o con Ctrl+Invio su tutta la
 * selezione — e verifica che sia rimasta, letteralmente, la stessa formula.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  eurM,
  pct,
} from '../../authoring';
import { revenue } from '../../../rng/finance';
import { roundTo, triangular } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';

/** L'unica cella che tutta la riga di proiezione deve guardare: riquadrata di proposito. */
const STILE_TASSO_UNICO: CellStyle = {
  ...STILE_INPUT_PCT,
  borders: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

const ANNI_PROIEZIONE = 5;
const RIGA_RICAVI = 6;
const COLONNE_PROIEZIONE = ['C', 'D', 'E', 'F', 'G'] as const; // Anno 1..Anno 5

export default defineTemplate({
  id: 'M0B-07-CONSISTENZARIGA',
  module: 'M0-B',
  title: 'La stessa formula, riga per riga',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.anchoring', 'xl.fill', 'xl.row-consistency'],
  prerequisites: ['M0A-05-ANCORAGGI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ricaviAnno0 = revenue(r);
    const tasso = roundTo(triangular(r, 0.02, 0.06, 0.14), 0.001);

    // Stessa operazione che l'utente scrive: ogni anno e' il precedente per
    // (1 + tasso), non il base elevato a potenza — e' cosi' che si traduce
    // "stessa formula copiata a destra", non con un'altra via di calcolo.
    const ricavi: number[] = [];
    let corrente = ricaviAnno0;
    for (let i = 0; i < ANNI_PROIEZIONE; i++) {
      corrente = corrente * (1 + tasso);
      ricavi.push(corrente);
    }

    const rangeRiga = `Model!C${RIGA_RICAVI}:G${RIGA_RICAVI}`;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          `In C${RIGA_RICAVI} calcola il ricavo dell'Anno 1: il ricavo dell'anno precedente moltiplicato ` +
          `per (1 + il tasso di crescita). Il tasso sta nell'unica casella riquadrata, C3 — e' quella ` +
          "cella, e nessun'altra, che TUTTO l'orizzonte di proiezione deve guardare. Scrivi la formula " +
          'in modo che tu possa trascinarla fino a G6 senza mai piu\' doverla ritoccare.',
        target: `Model!C${RIGA_RICAVI}`,
        atteso: ricavi[0],
        referenzia: [`B${RIGA_RICAVI}`, 'C3'],
        ancoraggio: '$C$3',
        senzaLiteral: [1],
        skills: ['xl.anchoring'],
        minKeystrokes: 16,
      }),
      {
        id: 'T2',
        prompt:
          `Riempi tutto l'orizzonte, da C${RIGA_RICAVI} a G${RIGA_RICAVI}: fill right (maniglione o ` +
          'Ctrl+R), oppure seleziona tutto l\'intervallo e chiudi con Ctrl+Invio. In ogni cella deve ' +
          "restare la STESSA formula, solo traslata di colonna: se anche una sola casella e' stata " +
          "ritoccata a mano o incollata come valore, e' li' che si nasconde l'errore che nessuno vede " +
          'finche\' non e\' troppo tardi.',
        targetCell: rangeRiga,
        check: [
          { kind: 'consistentRow' as const, range: rangeRiga },
          { kind: 'noError' as const },
        ],
        skills: ['xl.fill', 'xl.row-consistency'],
        minKeystrokes: 8,
      },
    ];

    const intestazioniAnno = ['Anno 0', 'Anno 1', 'Anno 2', 'Anno 3', 'Anno 4', 'Anno 5'];

    return {
      templateId: 'M0B-07-CONSISTENZARIGA',
      seed: rng.seed,
      brief: [
        "## Una riga, una formula, nessuna eccezione",
        '',
        'Una proiezione di ricavi non e\' cinque numeri indipendenti: e\' **una formula sola**, scritta',
        'una volta e trascinata lungo tutto l\'orizzonte. Se l\'hai scritta bene, ogni cella della riga',
        'racconta la stessa storia — "l\'anno prima, cresciuto del tasso" — solo spostata di una colonna.',
        '',
        `Qui i ricavi dell'Anno 0 valgono **${eurM(ricaviAnno0)}** e crescono a un tasso fisso del`,
        `**${pct(tasso)}** l'anno, per ${ANNI_PROIEZIONE} anni. Il tasso sta in **una sola casella**,`,
        'riquadrata in C3: e\' quella, e non un\'altra, che ogni colonna della riga deve referenziare',
        'con lo stesso ancoraggio assoluto.',
        '',
        '**Fill down** (Ctrl+D) copia verso il basso, **fill right** (Ctrl+R) copia verso destra, e se',
        'selezioni prima l\'intera area e poi scrivi la formula nella prima cella, **Ctrl+Invio** la',
        'incolla in tutta la selezione in un colpo solo. Tre scorciatoie per lo stesso gesto: prendi una',
        'formula corretta e falla scorrere.',
        '',
        "Perche' importa cosi' tanto che resti IDENTICA: nessuno pianta un errore in un modello scrivendo",
        'una formula sbagliata su tutta la riga — si vedrebbe al primo sguardo. Lo pianta **ritoccando',
        "una cella sola in mezzo**, magari per aggiustare un numero che sembrava strano, magari",
        'incollando un valore al posto della formula durante una modifica dell\'ultimo minuto. Il totale',
        'continua a calcolare, non compare nessun cancelletto rosso, e il numero sembra plausibile: e\'',
        "l'errore silenzioso piu' comune nei modelli veri, perche' si vede solo confrontando le FORMULE",
        'cella per cella — mai guardando solo i numeri che restituiscono.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Proiezione ricavi a tasso di crescita fisso'], { style: STILE_TITOLO }),
            colonna('A3', ['Tasso di crescita annuo (fisso)'], { style: STILE_ETICHETTA }),
            [{ ref: 'C3', content: tasso, style: STILE_TASSO_UNICO, locked: true }],

            riga('B5', intestazioniAnno, { style: STILE_TITOLO }),
            colonna('A6', ['Ricavi (€)'], { style: STILE_ETICHETTA }),
            [{ ref: `B${RIGA_RICAVI}`, content: ricaviAnno0, style: STILE_INPUT, locked: true }],

            areaLibera(COLONNE_PROIEZIONE.map((col) => `${col}${RIGA_RICAVI}`)),
          ],
          {
            colWidths: { A: 240, B: 110, C: 110, D: 110, E: 110, F: 110, G: 110 },
            frozenRows: 5,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=B${RIGA_RICAVI}*(1+$C$3): il tasso e' bloccato con $ su riga e colonna, cosi' non scivola quando trascini a destra.`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `Seleziona C${RIGA_RICAVI}, prendi il maniglione in basso a destra e trascinalo fino a G${RIGA_RICAVI} — oppure copia e incolla su C${RIGA_RICAVI}:G${RIGA_RICAVI}.`,
          8,
          'T2',
        ),
        hint(
          'H3',
          "Se una cella nel mezzo mostra un numero diverso da quello che ti aspetti, controllane la formula con F2: e' li' che si nasconde il ritocco a mano.",
          6,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 65 }),
      startAt: `Model!C${RIGA_RICAVI}`,
    };
  },
});
