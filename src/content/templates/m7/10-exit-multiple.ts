/**
 * M7 · 10 — Terminal value: il metodo exit multiple, e il cross-check con Gordon.
 *
 * Secondo (e ultimo) metodo per stimare il terminal value di un DCF, dopo
 * Gordon growth (M7-09). Il metodo EXIT MULTIPLE non proietta una perpetuita':
 * assume semplicemente che, alla fine dell'orizzonte esplicito, l'azienda
 * venga "venduta" a un multiplo di mercato osservabile OGGI sull'EBITDA
 * dell'ultimo anno esplicito — lo stesso multiplo a cui negozieresti una
 * transazione comparabile in quel momento:
 *
 *   Terminal Value (exit multiple) = EBITDA(ultimo anno esplicito) × multiplo di uscita
 *
 * IL PUNTO DIDATTICO CENTRALE DI QUESTO LIVELLO — il cross-check
 *
 * Gordon growth e exit multiple sono due strade diverse verso lo STESSO
 * numero concettuale (quanto vale l'azienda oltre l'orizzonte esplicito), e
 * quindi dovrebbero raccontare storie compatibili. Il modo standard per
 * verificarlo non e' confrontare direttamente i due Terminal Value in euro
 * (le scale possono differire per mille motivi), ma tradurre il TV di Gordon
 * in un MULTIPLO IMPLICITO di EBITDA — la stessa unita' di misura del metodo
 * exit multiple — e confrontare quel multiplo implicito con quello di mercato
 * usato in T1:
 *
 *   Multiplo implicito (Gordon) = TV(Gordon growth) / EBITDA(ultimo anno esplicito)
 *
 * Se il multiplo implicito che Gordon produce e' ragionevole rispetto al
 * multiplo di mercato osservato (differenze piccole, un decimo di punto),
 * i due metodi si confermano a vicenda. Se lo scostamento e' grande — la
 * soglia di allerta convenzionale e' 20%-30% — e' un segnale che le assunzioni
 * di WACC e g usate in Gordon vanno riviste: un multiplo implicito troppo
 * alto rispetto al mercato di solito nasce da un g troppo ottimistico o un
 * WACC troppo compresso, non da un errore nel metodo exit multiple in se'.
 *
 * Il TV di Gordon growth arriva qui come DATO bloccato diretto (il risultato
 * concettuale di M7-09): come da regola di progetto ogni LevelInstance e'
 * autosufficiente, non esiste cella condivisa fra template diversi.
 *
 * TRE TASK, IN CASCATA:
 *   T1 — Terminal Value col metodo exit multiple: EBITDA × multiplo di uscita.
 *   T2 — multiplo implicito nel TV di Gordon: TV(Gordon, dato) / EBITDA.
 *   T3 — scostamento % fra il multiplo implicito (T2) e il multiplo di
 *        mercato usato in T1: (T2 − multiplo di mercato) / multiplo di
 *        mercato. Costruito a mano (non con taskFormula) per stringere la
 *        tolleranza — il risultato e' su scala percentuale, dove la
 *        tolleranza di default (pavimento assoluto 0,01, cioe' un punto
 *        percentuale intero) lascerebbe passare una formula con i due
 *        termini scambiati quando lo scostamento vero e' piccolo — e per
 *        obbligare esplicitamente il riferimento a T2 (mustReference): la
 *        domanda del livello e' "quanto diverge l'implicito di Gordon da
 *        quello di mercato", non un ricalcolo diretto da TV(Gordon) ed EBITDA
 *        che bypassa la cella di T2 appena costruita.
 *
 * Geometria fissa: nessuna riga dipende dal seed, i riferimenti di cella sono
 * letterali per costruzione, come negli altri livelli di M7. Nessun guard-rail
 * di generazione serve qui: sia l'EBITDA (minimo 4m per costruzione) sia il
 * multiplo di mercato (minimo 6x per costruzione) restano sempre ben lontani
 * da zero, quindi nessuna delle due divisioni (T2, T3) rischia mai un
 * denominatore che collassa.
 */

import {
  defineTemplate,
  colonna,
  eurM,
  foglio,
  hint,
  multiplo,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };
const STILE_FORMULA_PCT: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0%' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBITDA = 'B4'; // EBITDA dell'ultimo anno esplicito della proiezione (dato, bloccato)
const B_MULT_MKT = 'B5'; // Multiplo di uscita di mercato, plausibile 6x-9x (dato, bloccato)
const B_TV_GORDON = 'B6'; // TV col metodo Gordon growth (dato, bloccato — risultato concettuale di M7-09)

const B_TV_EXIT = 'B9'; // T1: Terminal value col metodo exit multiple
const B_MULT_IMPLICITO = 'B10'; // T2: multiplo implicito nel TV di Gordon
const B_SCOSTAMENTO = 'B11'; // T3: scostamento % fra implicito e multiplo di mercato

export default defineTemplate({
  id: 'M7-10-EXITMULTIPLE',
  module: 'M7',
  get title() {
    return tx('M7-10-EXITMULTIPLE.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 340,
  skills: ['dcf.terminal-value'],
  prerequisites: ['M7-09-GORDONGROWTH'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBITDA dell'ultimo anno esplicito: 4m-12m, moda 7m — stessa scala del
    // FCF usato in M7-09, una mid-cap tipica, arrotondato a 50.000 € per
    // evitare code decimali innaturali.
    const ebitdaUltimoAnno = roundTo(triangular(r, 4_000_000, 7_000_000, 12_000_000), 50_000);

    // Multiplo di uscita di mercato: 6x-9x, moda 7,5x — un range plausibile
    // per un multiplo EV/EBITDA di uscita in un mid-market M&A.
    const multiploMercato = roundTo(triangular(r, 6, 7.5, 9), 0.1);

    // Multiplo implicito "bersaglio" usato SOLO per costruire un TV di Gordon
    // plausibile: range volutamente piu' ampio (4,5x-11x) di quello del
    // multiplo di mercato, cosi' che lo scostamento del cross-check (T3)
    // vari genuinamente da seed a seed — a volte piccolo (i due metodi si
    // confermano), a volte grande (il segnale di allerta che il brief spiega).
    // NON e' il valore che il player scrive da nessuna parte: e' solo servito
    // a fabbricare il dato TV(Gordon) qui sotto.
    const multiploImplicitoGenerato = roundTo(triangular(r, 4.5, 7.5, 11), 0.1);
    const tvGordon = roundTo(ebitdaUltimoAnno * multiploImplicitoGenerato, 50_000);

    // Valori "veri" usati come atteso nei task: ricalcolati dai DATI
    // effettivamente scritti in foglio (dopo l'arrotondamento), non dai
    // parametri intermedi di generazione.
    const terminalValueExit = ebitdaUltimoAnno * multiploMercato;
    const multiploImplicito = tvGordon / ebitdaUltimoAnno;
    const scostamento = (multiploImplicito - multiploMercato) / multiploMercato;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M7-10-EXITMULTIPLE.2', { B_TV_EXIT, B_EBITDA, B_MULT_MKT }),
      target: `Model!${B_TV_EXIT}`,
      atteso: terminalValueExit,
      referenzia: [B_EBITDA, B_MULT_MKT],
      senzaLiteral: [],
      skills: ['dcf.terminal-value'],
      minKeystrokes: 12,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M7-10-EXITMULTIPLE.3', { B_MULT_IMPLICITO, B_TV_GORDON, B_EBITDA }),
      target: `Model!${B_MULT_IMPLICITO}`,
      atteso: multiploImplicito,
      referenzia: [B_TV_GORDON, B_EBITDA],
      senzaLiteral: [],
      skills: ['dcf.terminal-value'],
      minKeystrokes: 12,
    });

    // NB: costruito a mano (non con taskFormula) per due motivi. Primo: la
    // tolleranza di default (pavimento assoluto 0,01, un punto percentuale
    // intero) e' troppo larga su un risultato a scala percentuale come questo
    // — lascerebbe passare (T2-mercato)/T2 al posto di (T2-mercato)/mercato
    // quando lo scostamento vero e' piccolo, invertendo il denominatore senza
    // che il check se ne accorga. Secondo: il mustReference obbliga
    // esplicitamente il riferimento a T2 (${B_MULT_IMPLICITO}) — il livello
    // chiede "quanto diverge l'implicito di Gordon dal mercato", non un
    // ricalcolo diretto da TV(Gordon) ed EBITDA che bypassa la cella di T2
    // appena costruita.
    const t3: Task = {
      id: 'T3',
      prompt:
        tx('M7-10-EXITMULTIPLE.4', { B_SCOSTAMENTO, B_MULT_IMPLICITO, B_MULT_MKT }),
      targetCell: `Model!${B_SCOSTAMENTO}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: scostamento,
          tolerance: 0.0005,
          toleranceMode: 'absolute',
          message:
            tx('M7-10-EXITMULTIPLE.5', { B_MULT_IMPLICITO, B_MULT_MKT }),
        },
        { kind: 'mustReference', cells: [B_MULT_IMPLICITO, B_MULT_MKT] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['dcf.terminal-value'],
      minKeystrokes: 18,
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M7-10-EXITMULTIPLE',
      seed: rng.seed,
      brief: [tx('M7-10-EXITMULTIPLE.6', { p0: eurM(ebitdaUltimoAnno), p1: multiplo(multiploMercato), p2: eurM(tvGordon) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-10-EXITMULTIPLE.7')], { style: STILE_TITOLO }),
            riga('A3', [tx('M7-10-EXITMULTIPLE.17')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M7-10-EXITMULTIPLE.8'),
                tx('M7-10-EXITMULTIPLE.9'),
                tx('M7-10-EXITMULTIPLE.10'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA, content: ebitdaUltimoAnno, style: STILE_INPUT, locked: true },
              { ref: B_MULT_MKT, content: multiploMercato, style: STILE_INPUT_MULTIPLO, locked: true },
              { ref: B_TV_GORDON, content: tvGordon, style: STILE_INPUT, locked: true },
            ],

            riga('A8', [tx('M7-10-EXITMULTIPLE.11')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M7-10-EXITMULTIPLE.12'),
                tx('M7-10-EXITMULTIPLE.13'),
                tx('M7-10-EXITMULTIPLE.14'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_TV_EXIT, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_MULT_IMPLICITO, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_SCOSTAMENTO, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 420, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M7-10-EXITMULTIPLE.h1', { B_EBITDA, B_MULT_MKT }), 10, 'T1'),
        hint('H2', tx('M7-10-EXITMULTIPLE.15', { B_TV_GORDON, B_EBITDA }), 10, 'T2'),
        hint(
          'H3',
          tx('M7-10-EXITMULTIPLE.16', { B_MULT_IMPLICITO, B_MULT_MKT }),
          14,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 130 }),
      startAt: `Model!${B_TV_EXIT}`,
    };
  },
});
