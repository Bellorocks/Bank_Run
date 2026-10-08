/**
 * M0-F · 01 — La tabella a una variabile, senza il comando che manca.
 *
 * NOTA DI IMPLEMENTAZIONE: la vera Data Table di Excel (Dati > Analisi di
 * simulazione > Struttura) non e' implementata nel motore — nessun comando in
 * `GridSession` la produce, e non esiste un modo per una `LevelTemplate` di
 * registrare la formula `{=TABLE(,cella)}` che Excel scrive da solo su tutto
 * il corpo della tabella. Aggiungerla era fuori dal perimetro di questo file
 * (avrebbe voluto dire costruire in `workbook.ts` un supporto per formule
 * array multi-cella che oggi non c'e').
 *
 * Il livello insegna quindi il concetto per via indiretta, seguendo lo stesso
 * pattern di `m0b/06-named-ranges.ts`: quello che una vera Data Table fa in
 * automatico — sostituire, riga per riga, un valore diverso nella cella di
 * input e ricalcolare la stessa formula — qui lo si fa a mano, scrivendo UNA
 * formula con gli ancoraggi giusti e riempiendola in basso. E' esattamente
 * l'operazione che Excel esegue dietro le quinte quando la Data Table gira;
 * il brief spiega il comando vero, come si userebbe, e perche' qui si ottiene
 * lo stesso risultato senza di lui.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  taskFormula,
  eur,
  multiplo,
  num,
} from '../../authoring';
import { roundTo } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

const RIGHE_TABELLA = 6;
const RIGA_PRIMO_MULTIPLO = 8;
const RIGA_ULTIMO_MULTIPLO = RIGA_PRIMO_MULTIPLO + RIGHE_TABELLA - 1; // 13
const RIGA_ESCURSIONE = 15;

/** Colonna di output: prezzo per azione, due decimali. Nero come ogni formula. */
const STILE_LIBERA_PREZZO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0.00' };

export default defineTemplate({
  id: 'M0F-01-DATATABLE1',
  module: 'M0-F',
  title: 'La tabella a una variabile, riga per riga',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['xl.data-table', 'xl.anchoring', 'xl.row-consistency', 'xl.fill', 'xl.aggregates'],
  prerequisites: ['M0A-05-ANCORAGGI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitda = r.int(15, 45) * 1_000_000;
    const multiploBase = roundTo(4.5 + r.next() * 2, 0.5); // 4,5x – 6,5x: il piu' basso della colonna
    const fraction = 0.3 + r.next() * 0.35; // frazione del deal value al multiplo piu' basso
    const debitoNetto = roundTo(ebitda * multiploBase * fraction, 100_000);
    const azioni = r.int(4, 12) * 1_000_000;

    const multipli = Array.from({ length: RIGHE_TABELLA }, (_, i) =>
      roundTo(multiploBase + i * 0.5, 0.5),
    );
    const prezzi = multipli.map((m) => (m * ebitda - debitoNetto) / azioni);
    const escursione = prezzi[RIGHE_TABELLA - 1] - prezzi[0];

    const t1: Task = {
      id: 'T1',
      prompt:
        `In B${RIGA_PRIMO_MULTIPLO} calcola il prezzo per azione al primo multiplo della colonna: ` +
        '(multiplo × EBITDA − debito netto) / azioni in circolazione. EBITDA, debito netto e azioni ' +
        'stanno nelle tre caselle in alto: sono i tre punti che OGNI riga della tabella deve guardare, ' +
        `mai un valore ribattuto a mano. Il multiplo invece cambia riga per riga: referenzia A${RIGA_PRIMO_MULTIPLO} ` +
        'senza bloccarlo, cosi\' scorre con la copia.',
      targetCell: `Model!B${RIGA_PRIMO_MULTIPLO}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: prezzi[0] },
        {
          kind: 'mustReference',
          cells: [`A${RIGA_PRIMO_MULTIPLO}`, 'B3', 'B4', 'B5'],
        },
        { kind: 'mustNotContainLiteral', except: [] },
        { kind: 'anchoring', pattern: '$B$3' },
        { kind: 'anchoring', pattern: '$B$4' },
        { kind: 'anchoring', pattern: '$B$5' },
      ],
      skills: ['xl.data-table', 'xl.anchoring'],
      minKeystrokes: 34,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        `Riempi B${RIGA_PRIMO_MULTIPLO}:B${RIGA_ULTIMO_MULTIPLO} copiando quella formula su tutta la colonna. ` +
        'Stessa formula, stesso ancoraggio: e\' cosi\' che una Data Table vera calcola ogni riga, ' +
        'e qui lo fai a mano una volta sola.',
      targetCell: `Model!B${RIGA_PRIMO_MULTIPLO}:B${RIGA_ULTIMO_MULTIPLO}`,
      check: [
        { kind: 'consistentRow', range: `Model!B${RIGA_PRIMO_MULTIPLO}:B${RIGA_ULTIMO_MULTIPLO}` },
        { kind: 'noError' },
      ],
      skills: ['xl.row-consistency', 'xl.fill'],
      minKeystrokes: 8,
    };

    const t3: Task = {
      // Task a se' stante, come in M0A-05-ANCORAGGI T3: l'ultima riga e' dove un
      // ancoraggio dimenticato smette di dare un numero plausibile per caso.
      id: 'T3',
      prompt:
        `Controlla B${RIGA_ULTIMO_MULTIPLO}, l'ultima riga della tabella: il multiplo piu' alto. ` +
        'Se quel numero non torna, il problema e\' negli ancoraggi di EBITDA, debito o azioni — non nella copia.',
      targetCell: `Model!B${RIGA_ULTIMO_MULTIPLO}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: prezzi[RIGHE_TABELLA - 1],
          message:
            'L\'ultima riga non torna: e\' li\' che un riferimento rimasto relativo si vede, perche\' nel mezzo della tabella spesso produce comunque un numero plausibile.',
        },
      ],
      skills: ['xl.anchoring'],
      minKeystrokes: 0,
    };

    const t4 = taskFormula({
      id: 'T4',
      prompt:
        `In B${RIGA_ESCURSIONE} calcola l'escursione della tabella: il prezzo per azione piu' alto meno ` +
        'il piu\' basso, con MAX e MIN sull\'intera colonna dei risultati. E\' il primo numero che si guarda ' +
        'in comitato quando si legge una sensitivity: quanto si muove l\'output nel range testato.',
      target: `Model!B${RIGA_ESCURSIONE}`,
      atteso: escursione,
      referenzia: [`B${RIGA_PRIMO_MULTIPLO}`, `B${RIGA_ULTIMO_MULTIPLO}`],
      skills: ['xl.aggregates'],
      minKeystrokes: 20,
    });

    const tasks = [t1, t2, t3, t4];

    return {
      templateId: 'M0F-01-DATATABLE1',
      seed: rng.seed,
      brief: [
        '## La Data Table vera, e perche\' qui la costruisci a mano',
        '',
        'In Excel vero esiste un comando apposta per "cosa succede all\'output se faccio variare',
        'un input su una serie di valori": **Dati > Analisi di simulazione > Struttura** (in',
        'inglese, *Data > What-If Analysis > Data Table*). Si usa cosi\': scrivi la formula UNA',
        'volta sola, in un angolo, referenziando la cella di assunzione che vuoi far variare;',
        'sotto o accanto a quella cella metti la colonna (o la riga) dei valori da testare;',
        'selezioni tutto il rettangolo — colonna dei valori inclusa, formula inclusa — e lanci',
        'il comando indicando come **cella di input colonna** proprio l\'assunzione che la',
        'formula referenzia. Excel scrive da solo, su ogni cella del corpo, una formula array',
        '`{=TABLE(,cella)}`: sostituisce mentalmente ogni valore della colonna dentro quella',
        'cella di input, ricalcola la formula, e mette il risultato nella riga corrispondente.',
        'Tutto resta collegato — se cambi la formula in alto, l\'intera tabella si aggiorna da sola.',
        '',
        '*(Questo trainer non genera ancora la formula array `TABLE()` — e\' un comando che',
        'richiederebbe un supporto per formule multi-cella che il motore di gioco non ha ancora.',
        'L\'esercizio allena pero\' esattamente il meccanismo che quel comando esegue dietro le',
        'quinte: sostituire un valore diverso riga per riga e ricalcolare la stessa formula.',
        'Qui lo fai esplicitamente, una volta, con gli ancoraggi giusti, e lo riempi in basso —',
        'lo stesso risultato numerico di una vera Data Table, scritto a mano invece che generato.)*',
        '',
        '## Il caso',
        '',
        `L'EBITDA del target vale **${eur(ebitda)}**, il debito netto **${eur(debitoNetto)}** e le azioni`,
        `in circolazione sono **${num(azioni)}**. Il comitato non si accontenta di un solo multiplo:`,
        `vuole vedere il prezzo per azione a ogni multiplo EV/EBITDA da **${multiplo(multipli[0])}** a`,
        `**${multiplo(multipli[RIGHE_TABELLA - 1])}**, passo ${multiplo(0.5)}.`,
        '',
        'La colonna dei multipli e\' gia\' pronta: sono i valori che una vera Data Table avrebbe',
        'chiesto come intervallo di test. Il tuo compito e\' scrivere la formula del prezzo per',
        'azione una volta sola nella prima riga, con EBITDA, debito netto e azioni bloccati con',
        'il dollaro — sono le tre caselle che OGNI riga guarda, mai un\'altra — e riempirla su',
        'tutta la colonna.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Sensitivity: prezzo per azione al variare del multiplo EV/EBITDA'], {
              style: STILE_TITOLO,
            }),
            blocco('A3', [['EBITDA (€)'], ['Debito netto (€)'], ['Azioni in circolazione']], {
              style: STILE_ETICHETTA,
            }),
            blocco('B3', [[ebitda], [debitoNetto], [azioni]], { style: STILE_INPUT }),

            riga('A7', ['Multiplo EV/EBITDA', 'Prezzo per azione (€)'], { style: STILE_TITOLO }),
            blocco(
              `A${RIGA_PRIMO_MULTIPLO}`,
              multipli.map((m) => [m]),
              { style: STILE_INPUT_MULTIPLO },
            ),

            blocco(`A${RIGA_ESCURSIONE}`, [['Escursione (max − min)']], { style: STILE_ETICHETTA }),

            ...Array.from({ length: RIGHE_TABELLA }, (_, i) => [
              {
                ref: `B${RIGA_PRIMO_MULTIPLO + i}`,
                content: null,
                locked: false,
                style: STILE_LIBERA_PREZZO,
              },
            ]),
            [{ ref: `B${RIGA_ESCURSIONE}`, content: null, locked: false, style: STILE_LIBERA_PREZZO }],
          ],
          {
            colWidths: { A: 240, B: 160 },
            frozenRows: 7,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `Scrivi =A${RIGA_PRIMO_MULTIPLO}*$B$3-$B$4, dividi tutto per $B$5. Metti l'ancoraggio col dollaro sulle tre assunzioni, non sul multiplo.`,
          14,
          'T1',
        ),
        hint('H2', `Copia B${RIGA_PRIMO_MULTIPLO}, seleziona B${RIGA_PRIMO_MULTIPLO}:B${RIGA_ULTIMO_MULTIPLO}, incolla (o Ctrl+D).`, 8, 'T2'),
        hint(
          'H3',
          'Se l\'ultima riga non torna, riapri la formula con F2: uno dei tre riferimenti e\' rimasto senza dollaro.',
          10,
          'T3',
        ),
        hint('H4', `=MAX(B${RIGA_PRIMO_MULTIPLO}:B${RIGA_ULTIMO_MULTIPLO})-MIN(B${RIGA_PRIMO_MULTIPLO}:B${RIGA_ULTIMO_MULTIPLO})`, 10, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 85 }),
      startAt: `Model!B${RIGA_PRIMO_MULTIPLO}`,
    };
  },
});
