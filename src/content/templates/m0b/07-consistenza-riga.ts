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

import { tx } from '../../../i18n/content';
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
  get title() {
    return tx('M0B-07-CONSISTENZARIGA.title');
  },
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
          tx('M0B-07-CONSISTENZARIGA.2', { RIGA_RICAVI }),
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
          tx('M0B-07-CONSISTENZARIGA.3', { RIGA_RICAVI }),
        targetCell: rangeRiga,
        check: [
          { kind: 'consistentRow' as const, range: rangeRiga },
          { kind: 'noError' as const },
        ],
        skills: ['xl.fill', 'xl.row-consistency'],
        minKeystrokes: 8,
      },
    ];

    const intestazioniAnno = [tx('M0B-07-CONSISTENZARIGA.4'), tx('M0B-07-CONSISTENZARIGA.5'), tx('M0B-07-CONSISTENZARIGA.6'), tx('M0B-07-CONSISTENZARIGA.7'), tx('M0B-07-CONSISTENZARIGA.8'), tx('M0B-07-CONSISTENZARIGA.9')];

    return {
      templateId: 'M0B-07-CONSISTENZARIGA',
      seed: rng.seed,
      brief: [tx('M0B-07-CONSISTENZARIGA.10', { p0: eurM(ricaviAnno0), p1: pct(tasso), ANNI_PROIEZIONE })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0B-07-CONSISTENZARIGA.11')], { style: STILE_TITOLO }),
            colonna('A3', [tx('M0B-07-CONSISTENZARIGA.12')], { style: STILE_ETICHETTA }),
            [{ ref: 'C3', content: tasso, style: STILE_TASSO_UNICO, locked: true }],

            riga('B5', intestazioniAnno, { style: STILE_TITOLO }),
            colonna('A6', [tx('M0B-07-CONSISTENZARIGA.13')], { style: STILE_ETICHETTA }),
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
          tx('M0B-07-CONSISTENZARIGA.14', { RIGA_RICAVI }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0B-07-CONSISTENZARIGA.15', { RIGA_RICAVI }),
          8,
          'T2',
        ),
        hint(
          'H3',
          tx('M0B-07-CONSISTENZARIGA.16'),
          6,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 65 }),
      startAt: `Model!C${RIGA_RICAVI}`,
    };
  },
});
