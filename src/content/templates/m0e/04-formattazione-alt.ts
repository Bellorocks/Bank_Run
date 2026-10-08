/**
 * M0-E · 04 — Sequenze Alt legacy per la formattazione.
 *
 * Drill puro di velocita', senza nessun dato finanziario: tre caselle, tre
 * gesti da tastiera. Il punto didattico non e' calcolare niente, e' abituare
 * la mano a un CAMMINO invece che a un accordo — `Alt` apre la barra dei
 * menu, poi `H`, poi `O`, poi `I`: quattro tasti in sequenza, mai premuti
 * insieme (vedi `src/keymap/altSequence.ts`).
 *
 * Onesta' sul grading, come richiesto dal compito: in `types.ts` non esiste
 * nessun Check per grassetto o colore di riempimento, quindi Alt,H,H (colore)
 * e Alt,H,O,I (autofit) non hanno NIENTE da verificare a parte il valore
 * scritto nella cella e il tempo impiegato — il brief lo dice chiaro invece
 * di far finta che il gioco stia guardando il colore. Il terzo gesto,
 * Ctrl+Maiusc+4 (valuta), e' l'unico dei tre che produce un `numFmt`
 * ispezionabile: qui il check `numberFormat` c'e' davvero ed e' bloccante,
 * come in M0A-08-FORMATI.
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
  STILE_INPUT,
  STILE_TITOLO,
  num,
} from '../../authoring';
import { DEFAULT_FORMATS } from '../../../engine/numberFormat';
import type { Task } from '../../types';

export default defineTemplate({
  id: 'M0E-04-FORMATALT',
  module: 'M0-E',
  title: 'Alt, H, poi la lettera giusta',
  rank: 2,
  mode: 'SPEEDRUN',
  estimatedSeconds: 75,
  skills: ['spd.alt-format', 'xl.numfmt'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Numeri tondi, senza nessun significato economico: qui si allena il
    // gesto, non la lettura di un bilancio.
    const valore1 = r.int(100, 999);
    const valore2 = r.int(1000, 9999);
    const valoreA = r.int(10, 500);
    const valoreB = r.int(10, 500);
    const totale = valoreA + valoreB;

    const t1: Task = {
      id: 'T1',
      prompt:
        `In B3 scrivi ${num(valore1)}. Poi, senza toccare il mouse, apri la barra dei menu con ` +
        `Alt e percorri il cammino H, O, I (Home > Formato > Adatta larghezza colonna) sulla ` +
        "colonna A: l'etichetta qui a fianco non ci sta dentro. Occhio: fra un tasto e l'altro " +
        "non si tiene premuto nulla, e' uno stato dell'interfaccia, non un accordo. Il gioco " +
        "verifica il numero scritto e il tempo che ci hai messo — l'autofit non ha ancora un " +
        'check dedicato, ma il gesto e\' lo stesso che userai su un modello vero.',
      targetCell: 'Model!B3',
      check: [{ kind: 'value' as const, expected: valore1 }],
      skills: ['spd.alt-format'],
      minKeystrokes: 8,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        `In B5 scrivi ${num(valore2)}. Poi esegui Alt, H, H: e' una foglia, non un ramo — la ` +
        "barra si chiude subito e apre il selettore del colore di riempimento. Scegline uno " +
        'qualsiasi per B5. Stessa onesta\' del task precedente: in questo livello non esiste un ' +
        "check che guarda il colore della cella, quindi non e' quello a farti passare il task — " +
        "e' il valore scritto, cronometrato. Il colore lo alleni comunque, perche' in ufficio " +
        'nessuno cronometra ma tutti si accorgono se ci metti trenta secondi di menu.',
      targetCell: 'Model!B5',
      check: [{ kind: 'value' as const, expected: valore2 }],
      skills: ['spd.alt-format'],
      minKeystrokes: 9,
    };

    const t3Base = taskFormula({
      id: 'T3',
      prompt:
        `In B9 somma Valore A (${num(valoreA)}) e Valore B (${num(valoreB)}). Poi formattala in ` +
        'valuta con Ctrl+Maiusc+4 — non e\' un cammino Alt, e\' un accordo diretto, ma appartiene ' +
        "alla stessa famiglia di scorciatoie legacy e va premuto senza guardare la tastiera. " +
        'Qui il grader vede DAVVERO il formato: e\' l\'unico dei tre gesti di questo livello che ' +
        'lascia una traccia ispezionabile oltre al valore.',
      target: 'Model!B9',
      atteso: totale,
      referenzia: ['B7', 'B8'],
      skills: ['xl.numfmt'],
      minKeystrokes: 10,
    });

    const t3: Task = {
      ...t3Base,
      check: [
        ...t3Base.check,
        {
          kind: 'numberFormat' as const,
          expected: DEFAULT_FORMATS.valuta,
          message:
            "Il numero e' giusto ma manca il vestito: Ctrl+Maiusc+4 applica valuta con due decimali e simbolo €.",
        },
      ],
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0E-04-FORMATALT',
      seed: rng.seed,
      brief: [
        '## Alt non e\' una scorciatoia: e\' un cammino',
        '',
        'Nessuna azienda, nessun bilancio: questo livello e\' un drill puro di velocita\' sulle',
        '**sequenze Alt legacy**, quelle che chi lavora su Excel da anni usa senza pensarci.',
        '',
        'La differenza da tenere a mente: `Ctrl+C` e\' un accordo, si preme tutto insieme. `Alt`',
        'invece apre la barra dei menu e resta li\' ad aspettare — premi `H`, poi `O`, poi `I`, uno',
        'via l\'altro, senza tenere giu\' nessun tasto fra mezzo. Sbagli lettera e Excel non aspetta:',
        'suona un beep e chiude tutto. La barra di stato mostra il cammino percorso finora',
        '("Alt, H, O") esattamente per questo.',
        '',
        'Tre caselle, tre gesti:',
        '',
        '- **Alt, H, O, I** — Home > Formato > Adatta larghezza colonna',
        '- **Alt, H, H** — colore di riempimento (foglia diretta sotto Home, da non confondere',
        '  con Alt, H, O, H che e\' un\'altra cosa)',
        '- **Ctrl+Maiusc+4** — formato valuta, l\'accordo diretto della stessa famiglia',
        '',
        'Onesta\' sul punteggio: solo il terzo gesto lascia un formato che il gioco puo\' controllare',
        'davvero. Sui primi due il grader guarda il numero che hai scritto e il cronometro, non il',
        'colore o la larghezza della colonna — ma il gesto e\' lo stesso che ti serve su un modello',
        'vero, quindi eseguilo comunque.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Drill: sequenze Alt legacy'], { style: STILE_TITOLO }),
            blocco('A3', [["Etichetta lunga che non entra nella colonna cosi' com'e'"]], {
              style: STILE_ETICHETTA,
            }),
            blocco('A5', [['Seconda casella: qui pratichi il colore di riempimento']], {
              style: STILE_ETICHETTA,
            }),
            blocco('A7', [['Valore A'], ['Valore B'], ['Totale (Ctrl+Maiusc+4)']], {
              style: STILE_ETICHETTA,
            }),
            blocco('B7', [[valoreA], [valoreB]], { style: STILE_INPUT }),
            areaLibera(['B3', 'B5', 'B9']),
          ],
          { colWidths: { A: 90, B: 130 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', "Scrivi il numero, Invio. Poi Alt (si apre la barra), H, O, I: quattro tasti, uno alla volta.", 6, 'T1'),
        hint('H2', "Alt, poi H, poi H di nuovo: la seconda H e' gia' una foglia, si chiude subito col selettore colore aperto.", 6, 'T2'),
        hint('H3', "B7+B8, poi Ctrl+Maiusc+4 sulla stessa cella: e' un accordo, si preme tutto insieme.", 6, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 20, ritmo: 4 }),
      startAt: 'Model!B3',
    };
  },
});
