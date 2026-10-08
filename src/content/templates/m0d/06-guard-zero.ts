/**
 * M0-D · 06 — Guard sui denominatori: proteggere una divisione che tocca zero.
 *
 * Il punto didattico non e' "usa IFERROR", quello e' gia' M0B-04-IFERROR. Qui la
 * differenza e' strutturale: la formula non vive in una cella isolata, viaggia
 * copiata su piu' periodi (T1 -> T2), e SOLO uno dei quattro ha il denominatore
 * a zero. Il giocatore lo sa gia' quando scrive la prima cella (T1), quindi il
 * guard va scritto nella formula base fin dall'inizio — non aggiunto dopo, a
 * mano, sulla cella che esplode. E' il rovescio della medaglia di M0B-04: la',
 * IFERROR ovunque era un'abitudine da rompere; qui, se anche un solo periodo
 * della riga puo' avere zero al denominatore, il guard nella riga e' obbligatorio
 * per TUTTE le celle, perche' e' una sola formula copiata, non quattro formule.
 *
 * Il fallback scelto e' un flag testuale ("n.d."), non una stima numerica: a
 * differenza di M0B-04 (dove un prezzo di listino era un proxy difendibile del
 * costo), qui non esiste alcun numero difendibile per "costo per ordine" quando
 * gli ordini evasi sono zero. Il valore corretto in quella cella non e' un
 * numero verosimile, e' l'ammissione che il numero non esiste.
 *
 * Il congelamento dei riquadri e' trattato come argomento affine nel brief
 * (spec: si accostano), ma resta fuori dal grader: non e' osservabile a valore,
 * e la combinazione Alt legacy per "Blocca riquadri" non ha una sequenza propria
 * in `src/keymap/altSequence.ts` (nessun ramo "Visualizza", nessun binding per
 * `structure.freezePanes` — verificato: `bindingsForCommand('structure.freezePanes')`
 * e' vuoto in `bindings.test.ts`). Il foglio di questo livello arriva pero' gia'
 * con riga di intestazione ed etichette bloccate, cosi' l'effetto si vede subito
 * anche senza un task che lo verifichi.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
  num,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

const MAGAZZINI = [
  'Magazzino di Bologna',
  'Magazzino di Padova',
  'Magazzino di Piacenza',
  'Magazzino di Novara',
  'Magazzino di Bergamo',
] as const;

const MOTIVI_CHIUSURA = [
  'trasferimento in un nuovo capannone',
  'allagamento e bonifica degli impianti',
  'revisione dei sistemi antincendio',
  'sciopero del personale logistico',
] as const;

const PERIODI = ['Trim. 1', 'Trim. 2', 'Trim. 3', 'Trim. 4'] as const;
const COLS = ['B', 'C', 'D', 'E'] as const;

export default defineTemplate({
  id: 'M0D-06-GUARDZERO',
  module: 'M0-D',
  title: 'Il denominatore che tocca zero',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.div-guard', 'xl.iferror', 'xl.freeze'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const magazzino = r.pick(MAGAZZINI);
    const motivo = r.pick(MOTIVI_CHIUSURA);
    // Deliberato, non lasciato al caso: UN trimestre a zero ordini, e non il
    // primo — cosi' T1 costruisce la formula su un caso normale, sapendo gia'
    // che dovra' reggere anche quello che non e' normale.
    const idxZero = r.int(1, PERIODI.length - 1);

    const costoGestione = PERIODI.map(() => roundTo(triangular(r, 18_000, 32_000, 70_000), 100));
    const ordini = PERIODI.map((_, i) => (i === idxZero ? 0 : r.int(300, 3200)));
    const costoPerOrdine = PERIODI.map((_, i) => (i === idxZero ? null : costoGestione[i] / ordini[i]));

    const colZero = COLS[idxZero];

    const t1: Task = {
      id: 'T1',
      prompt:
        `In B6 calcola il costo per ordine evaso del primo trimestre: costo di gestione diviso ordini ` +
        `evasi. Scrivi gia' ora la formula che copierai su tutti e quattro i trimestri — sai gia' che uno ` +
        `di essi (il trimestre in cui ${magazzino} era chiuso: ${motivo}) ha zero ordini evasi, e li' la ` +
        `divisione diretta esplode in #DIV/0!. Intercetta l'errore con IFERROR e, quando la divisione ` +
        'fallisce, restituisci il testo "n.d.": non esiste un costo per ordine quando non e\' uscito ' +
        'nessun ordine, e inventare un numero sarebbe peggio di mostrare l\'errore.',
      targetCell: 'Model!B6',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: costoPerOrdine[0] as number,
          message:
            'Il valore non torna: in B4/B5 il denominatore non e\' mai zero, ma la formula deve comunque restituire il costo per ordine reale.',
        },
        { kind: 'mustReference', cells: ['B4', 'B5'] },
        { kind: 'mustUseFunction', functions: ['IFERROR'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.iferror', 'xl.div-guard'],
      minKeystrokes: 22,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        'Riempi tutta la riga B6:E6 copiando quella stessa formula sui quattro trimestri. Nessun ritocco ' +
        'a mano su nessuna cella — nemmeno su quella che sai gia\' essere il trimestre a zero ordini: se il ' +
        'guard e\' scritto bene, la copia lo porta li\' da sola.',
      // Bersaglio sul trimestre a zero ordini, non sull'angolo B6: 'noError' guarda
      // solo la cella di targetCell (non l'intero range), e B6 non ha MAI il
      // denominatore a zero (idxZero parte da 1), quindi punterebbe un check che
      // non potrebbe mai fallire. 'consistentRow' resta esplicitamente sull'intera
      // riga tramite il proprio campo `range`, che e' indipendente da targetCell.
      targetCell: `Model!${colZero}6`,
      check: [
        { kind: 'consistentRow', range: 'Model!B6:E6' },
        {
          kind: 'noError',
          message: 'C\'e\' un errore a vista in riga: il guard non ha retto la copia su tutti i trimestri.',
        },
      ],
      skills: ['xl.copy-shift', 'xl.div-guard'],
      minKeystrokes: 12,
    };

    const t3: Task = {
      id: 'T3',
      prompt:
        `Controlla ${colZero}6, il trimestre in cui ${magazzino} era chiuso: deve mostrare "n.d.", non un ` +
        'numero e non #DIV/0!. Se li\' vedi un errore o uno zero inventato per farlo sparire, il problema ' +
        'e\' nel guard, non nella copia.',
      targetCell: `Model!${colZero}6`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'text',
          expected: 'n.d.',
          message:
            'Quella cella deve restituire il testo "n.d." dal ramo di errore di IFERROR, non un numero ne\' un errore a vista.',
        },
        { kind: 'mustReference', cells: [`${colZero}4`, `${colZero}5`] },
        { kind: 'mustUseFunction', functions: ['IFERROR'] },
      ],
      skills: ['xl.div-guard'],
      minKeystrokes: 0,
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0D-06-GUARDZERO',
      seed: rng.seed,
      brief: [
        '## Un guard, non un cerotto',
        '',
        `**${magazzino}** riporta il costo di gestione e gli ordini evasi degli ultimi quattro trimestri.`,
        `Il primo trimestre e' costato ${eur(costoGestione[0])} per ${num(ordini[0])} ordini evasi — il costo`,
        'per ordine e\' quel rapporto, ed e\' il numero che dice se la logistica regge il volume che passa.',
        '',
        `Nel trimestre **${PERIODI[idxZero]}** pero' il magazzino era fermo (${motivo}): zero ordini evasi,`,
        `ma affitto e personale — ${eur(costoGestione[idxZero])} — sono stati pagati comunque. Dividere quel`,
        'costo per zero ordini produce `#DIV/0!`. Non e\' un errore di battitura: e\' che in quel trimestre',
        'il "costo per ordine" non esiste, punto. Nessun numero, per quanto ragionevole, lo rappresenta.',
        '',
        '**`IFERROR(formula, valore_se_errore)`** intercetta l\'errore e lo sostituisce con qualcosa scelto',
        'da te. In M0-B hai gia\' visto un caso in cui il fallback era una stima numerica difendibile (un',
        'prezzo di listino). Qui non c\'e\' equivalente: il fallback giusto e\' il testo `"n.d."`, che dice la',
        'verita\' — il dato non c\'e\' — invece di uno zero o di un numero inventato che finirebbe comunque',
        'in un totale.',
        '',
        'La parte che conta davvero: **scrivi la formula una volta sola**, su B6, e la copi su tutta la riga',
        'B6:E6. Sai gia\', scrivendola, che uno dei quattro trimestri ha il denominatore a zero — quindi il',
        'guard non e\' un\'aggiunta per il caso raro, e\' parte della formula base fin dal primo trimestre.',
        'In M0-B hai imparato a non mettere IFERROR ovunque per abitudine; qui, se anche un solo trimestre',
        'della riga puo\' avere zero al denominatore, il guard deve stare in TUTTE le celle, perche\' e\' una',
        'formula sola, non quattro formule indipendenti.',
        '',
        'Nota di mestiere, a margine: quando una tabella cresce oltre lo schermo, l\'etichetta di riga e',
        'l\'intestazione dei periodi spariscono scorrendo. In Excel si bloccano da Visualizza -> Blocca',
        'riquadri (sequenza legacy: **Alt, W, F**). Non e\' verificato qui — non si vede a valore — ma il',
        'foglio di questo livello arriva gia\' con la colonna delle etichette e l\'intestazione bloccate,',
        'cosi\' vedi l\'effetto mentre lavori, prima ancora di doverlo impostare tu.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [`${magazzino} — costo per ordine evaso`], { style: STILE_TITOLO }),
            riga('B3', [...PERIODI], { style: STILE_TITOLO }),
            blocco('A4', [['Costo di gestione (€)']], { style: STILE_ETICHETTA }),
            riga('B4', [...costoGestione], { style: STILE_INPUT }),
            blocco('A5', [['Ordini evasi (n.)']], { style: STILE_ETICHETTA }),
            riga('B5', [...ordini], { style: STILE_INPUT }),
            blocco('A6', [['Costo per ordine (€/ordine)']], { style: STILE_ETICHETTA }),
            areaLibera(['B6', 'C6', 'D6', 'E6']),
          ],
          {
            colWidths: { A: 260, B: 110, C: 110, D: 110, E: 110 },
            frozenRows: 3,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          'IFERROR(B4/B5,"n.d."): il primo argomento e\' la divisione che puo\' fallire, il secondo e\' il testo da restituire quando fallisce davvero.',
          10,
          'T1',
        ),
        hint('H2', 'Copia B6, seleziona B6:E6, incolla: e\' la stessa formula che deve viaggiare su tutti e quattro i trimestri, senza eccezioni.', 8, 'T2'),
        hint('H3', `In ${colZero}5 gli ordini evasi sono zero: se il guard e' nella formula base, quella cella mostra "n.d." da sola, senza bisogno di toccarla.`, 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: 'Model!B6',
    };
  },
});
