/**
 * M5 · 10 — Il football field: dal comp set al range di valutazione.
 *
 * QUESTO E' IL LIVELLO [COMBO] DEL MODULO M5. Lo spec del modulo chiede
 * "costruire un comp set da 12 societa' con dati grezzi disallineati e
 * produrre il range di valutazione". SCELTA DICHIARATA: qui il comp set ha
 * 8 societa', non 12 — il compromesso gia' visto in M4-05 fra la ricchezza
 * voluta dallo spec e la leggibilita' di un esercizio Excel giocabile. Oltre
 * le 8-10 righe la tabella comincia a scorrere fuori da una schermata comoda
 * senza aggiungere nulla al punto didattico, che non dipende dal NUMERO di
 * peer ma dal PROCEDIMENTO applicato a ciascuno.
 *
 * "DISALLINEATI" — precisazione sul significato, per non confonderlo con
 * M5-03: qui vuol dire che il multiplo EV/EBITDA di ciascun peer va
 * CALCOLATO dal giocatore (i due input, EV ed EBITDA, sono dati ma NON
 * ancora rapportati fra loro), non che serva rifare la calendarizzazione o
 * l'allineamento valutario da zero — quella disciplina e' gia' materia
 * verificata di M5-03, e qui l'EV e l'EBITDA di ogni comparable arrivano
 * GIA' calendarizzati sullo stesso periodo del target (dato di ingresso,
 * bloccato: nessuna cella condivisa fra template).
 *
 * QUATTRO TASK, IN CASCATA — ricapitolano l'intero percorso del modulo:
 *
 *   T1 — il multiplo EV/EBITDA di ciascun peer (colonna D, EV/EBITDA riga
 *        per riga). Target = l'intera colonna, check `consistentRow`: la
 *        stessa formula, solo traslata di riga, su tutte le 8 righe — lo
 *        stesso identico check di M1-08-DASCHEDULE, qui riapplicato a un
 *        comp set invece che a un registro cespiti. La correttezza
 *        NUMERICA di ogni riga non e' verificata qui una per una: lo e'
 *        indirettamente da T2, che incatena una MEDIAN su questa colonna.
 *
 *   T2 — il multiplo MEDIANO del comp set (MEDIAN sull'intera colonna di
 *        T1): la sintesi robusta agli outlier, esattamente la lezione di
 *        M5-06, qui riapplicata come passo intermedio invece che come
 *        oggetto di studio a se stante.
 *
 *   T3 — l'EV implicito del target al multiplo mediano: mediana (T2) per
 *        l'EBITDA del target (dato, bloccato). Il punto centrale di tutto
 *        il modulo — un multiplo osservato su comparable si applica alla
 *        metrica del target per ottenere un valore implicito — condensato
 *        in una riga sola.
 *
 *   T4 — il football field, come AMPIEZZA in euro. Un vero football field
 *        mostrerebbe l'INTERO intervallo [EV basso; EV alto], tipicamente
 *        come una barra orizzontale — non solo la sua larghezza. Qui,
 *        perche' il livello resti un solo task con un solo valore
 *        verificabile con un check `value` (invece di due celle separate
 *        da gestire con due task), si chiede di calcolare SOLO l'ampiezza
 *        del range: EV al multiplo MASSIMO del comp set meno EV al
 *        multiplo MINIMO, entrambi applicati alla stessa metrica del
 *        target (MIN/MAX sulla colonna di T1). E' un proxy verificabile
 *        della stessa idea — quanto e' LARGO il range di valutazione
 *        implicito dal comp set — non il football field vero e proprio,
 *        che nella pratica si presenta e si legge come un intervallo, non
 *        come un numero solo.
 *
 * Geometria: interamente funzione di N_PEER (fissato a 8, non dal seed —
 * la scelta di 8 e' deliberata come sopra, non randomizzata), mai un
 * letterale fisso.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  eur,
  eurM,
  foglio,
  hint,
  multiplo,
  num,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo } from '../../../rng/distributions';
import { SECTORS, ebitdaMargin, evEbitdaMultiple, growthRate, revenue } from '../../../rng/finance';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { CellSpec, Task } from '../../types';

import { tx } from '../../../i18n/content';
/** Output di una formula che restituisce un multiplo: nero, "x". */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };

/** Mediana aritmetica: valore centrale se n dispari, media dei due centrali se pari. */
function mediana(valori: readonly number[]): number {
  const ordinati = [...valori].sort((a, b) => a - b);
  const mid = Math.floor(ordinati.length / 2);
  return ordinati.length % 2 !== 0 ? ordinati[mid] : (ordinati[mid - 1] + ordinati[mid]) / 2;
}

// N_PEER e' fissato a 8, deliberatamente: non dipende dal seed (vedi commento
// di testa). La geometria sotto resta comunque funzione di N_PEER, non un
// letterale fisso, per lo stesso motivo di disciplina degli altri COMBO.
const N_PEER = 8;

// --- Geometria: tutta funzione di N_PEER. -----------------------------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3; // "Comp set: 8 società quotate, EV ed EBITDA già calendarizzati"
const ROW_HEADER = 4; // Peer | EV, € | EBITDA, € | EV/EBITDA, x
const DATA_START = 5;
const DATA_END = DATA_START + N_PEER - 1;

const ROW_SEZ2 = DATA_END + 2; // "Target"
const ROW_TARGET = ROW_SEZ2 + 1;

const ROW_SEZ3 = ROW_TARGET + 2; // "Sintesi: dal comp set al range di valutazione"
const ROW_MEDIANA = ROW_SEZ3 + 1; // T2
const ROW_EVIMPLICITO = ROW_MEDIANA + 1; // T3
const ROW_AMPIEZZA = ROW_EVIMPLICITO + 1; // T4

const B_TARGET = `B${ROW_TARGET}`;
const B_MEDIANA = `B${ROW_MEDIANA}`;
const B_EVIMPLICITO = `B${ROW_EVIMPLICITO}`;
const B_AMPIEZZA = `B${ROW_AMPIEZZA}`;

const rangeMultipli = `D${DATA_START}:D${DATA_END}`;

export default defineTemplate({
  id: 'M5-10-FOOTBALLFIELD',
  module: 'M5',
  get title() {
    return tx('M5-10-FOOTBALLFIELD.title');
  },
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 380,
  skills: ['comps.football-field'],
  prerequisites: ['M5-03-CALENDARIZZAZIONE', 'M5-09-SCONTOILLIQUIDITA'],
  combo: true,

  generate: (rng) => {
    const rPeer = rng.fork('peer');
    const rTarget = rng.fork('target');
    // Un solo settore per target e comp set: un peer di un altro settore non
    // e' un comparabile (la lezione di M5-01).
    const settore = rng.fork('settore').pick(SECTORS);

    // --- Il comp set: 8 comparable, ciascuna con un profilo settoriale
    // proprio (stesso meccanismo generativo di rng/finance.ts gia' usato
    // altrove nel modulo). EV ed EBITDA sono GIA' calendarizzati sullo
    // stesso periodo del target: quella disciplina e' materia di M5-03, non
    // di questo livello — qui il lavoro e' calcolare il rapporto fra i due,
    // non allinearli. -----------------------------------------------------
    interface Peer {
      readonly label: string;
      readonly ev: number;
      readonly ebitda: number;
    }

    const peers: Peer[] = Array.from({ length: N_PEER }, (_, i) => {
      const sector = settore;
      const ricavi = revenue(rPeer);
      const margin = ebitdaMargin(rPeer, sector);
      const ebitda = roundTo(ricavi * margin, 1000);
      const growth = growthRate(rPeer, sector);
      const evEbitda = evEbitdaMultiple(rPeer, sector, growth, margin);
      const ev = roundTo(ebitda * evEbitda, 1000);
      return { label: tx('M5-10-FOOTBALLFIELD.2', { p0: i + 1 }), ev, ebitda };
    });

    // --- EBITDA del target: stesso meccanismo generativo dei peer (cosi'
    // resta su una scala plausibile e comparabile), ma da un fork
    // indipendente — non e' un peer del comp set, e' il DATO bloccato che
    // il comp set serve a valutare. ----------------------------------------
    const sectorTarget = settore;
    const ricaviTarget = revenue(rTarget);
    const marginTarget = ebitdaMargin(rTarget, sectorTarget);
    const ebitdaTarget = roundTo(ricaviTarget * marginTarget, 1000);

    // --- I multipli EFFETTIVI (EV/EBITDA riga per riga, con precisione
    // piena): sono quelli che la formula del giocatore produce davvero, non
    // il multiplo di settore "teorico" usato per generare l'EV — i due
    // divergono leggermente per via degli arrotondamenti a mille di EV ed
    // EBITDA, esattamente come accadrebbe con dati di bilancio reali. -------
    const multipliEffettivi = peers.map((p) => p.ev / p.ebitda);
    const multiploMediano = mediana(multipliEffettivi);
    const multiploMinimo = Math.min(...multipliEffettivi);
    const multiploMassimo = Math.max(...multipliEffettivi);

    const evImplicito = multiploMediano * ebitdaTarget;
    const evBasso = multiploMinimo * ebitdaTarget;
    const evAlto = multiploMassimo * ebitdaTarget;
    const ampiezza = evAlto - evBasso;

    // T1 — coerenza di riga sull'intera colonna dei multipli: scritto a
    // mano (non taskFormula) perche' il target e' un range, non una cella
    // sola, e l'unico check che ha senso qui e' la coerenza strutturale (la
    // correttezza numerica la verifica indirettamente T2, che incatena una
    // MEDIAN su questa colonna) — stesso pattern di M1-08-DASCHEDULE.
    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M5-10-FOOTBALLFIELD.3', { p0: num(N_PEER), DATA_START, DATA_END }),
      targetCell: `Model!${rangeMultipli}`,
      check: [
        { kind: 'consistentRow', range: `Model!${rangeMultipli}` },
        { kind: 'noError' },
      ],
      skills: ['comps.football-field'],
      minKeystrokes: 8,
    };

    const t2 = (() => {
      const base = taskFormula({
        id: 'T2',
        prompt:
          tx('M5-10-FOOTBALLFIELD.4', { B_MEDIANA, rangeMultipli }),
        target: `Model!${B_MEDIANA}`,
        atteso: multiploMediano,
        referenzia: [`D${DATA_START}`, `D${DATA_END}`],
        senzaLiteral: [],
        skills: ['comps.football-field'],
        minKeystrokes: 18,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['MEDIAN'] }] };
    })();

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M5-10-FOOTBALLFIELD.5', { B_EVIMPLICITO, B_MEDIANA, B_TARGET }),
      target: `Model!${B_EVIMPLICITO}`,
      atteso: evImplicito,
      referenzia: [B_MEDIANA, B_TARGET],
      senzaLiteral: [],
      skills: ['comps.football-field'],
      minKeystrokes: 12,
    });

    const t4 = (() => {
      const base = taskFormula({
        id: 'T4',
        prompt:
          tx('M5-10-FOOTBALLFIELD.6', { B_AMPIEZZA, B_TARGET, rangeMultipli }),
        target: `Model!${B_AMPIEZZA}`,
        atteso: ampiezza,
        referenzia: [`D${DATA_START}`, `D${DATA_END}`, B_TARGET],
        senzaLiteral: [],
        skills: ['comps.football-field'],
        minKeystrokes: 28,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['MIN', 'MAX'], quantifier: 'all' as const }],
      };
    })();

    const tasks = [t1, t2, t3, t4];

    const peerCellsSpec: CellSpec[] = blocco(
      `B${DATA_START}`,
      peers.map((p) => [p.ev, p.ebitda]),
      { style: STILE_INPUT },
    );
    const multiploCellsSpec: CellSpec[] = Array.from({ length: N_PEER }, (_, i) => ({
      ref: `D${DATA_START + i}`,
      content: null,
      locked: false,
      style: STILE_FORMULA_MULTIPLO,
    }));

    return {
      templateId: 'M5-10-FOOTBALLFIELD',
      seed: rng.seed,
      brief: [tx('M5-10-FOOTBALLFIELD.7', { p0: num(N_PEER), p1: eurM(ebitdaTarget) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M5-10-FOOTBALLFIELD.8')], {
              style: STILE_TITOLO,
            }),

            riga(`A${ROW_SEZ1}`, [tx('M5-10-FOOTBALLFIELD.9', { p0: num(N_PEER) })], {
              style: STILE_TITOLO,
            }),
            riga(`A${ROW_HEADER}`, [tx('M5-10-FOOTBALLFIELD.18'), 'EV, €', tx('M5-10-FOOTBALLFIELD.19'), tx('M5-10-FOOTBALLFIELD.20')], { style: STILE_TITOLO }),
            colonna(
              `A${DATA_START}`,
              peers.map((p) => p.label),
              { style: STILE_ETICHETTA },
            ),
            peerCellsSpec,
            multiploCellsSpec,

            riga(`A${ROW_SEZ2}`, [tx('M5-10-FOOTBALLFIELD.21')], { style: STILE_TITOLO }),
            colonna(`A${ROW_TARGET}`, [tx('M5-10-FOOTBALLFIELD.10')], { style: STILE_ETICHETTA }),
            [{ ref: B_TARGET, content: ebitdaTarget, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ3}`, [tx('M5-10-FOOTBALLFIELD.11')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_MEDIANA}`,
              [
                tx('M5-10-FOOTBALLFIELD.12'),
                tx('M5-10-FOOTBALLFIELD.13'),
                tx('M5-10-FOOTBALLFIELD.14'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_MEDIANA, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_EVIMPLICITO, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_AMPIEZZA, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 260, B: 150, C: 150, D: 140 }, frozenRows: ROW_HEADER },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M5-10-FOOTBALLFIELD.15', { DATA_START, DATA_END }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M5-10-FOOTBALLFIELD.h2', { rangeMultipli, p0: multiplo(multiploMediano) }),
          10,
          'T2',
        ),
        hint(
          'H3',
          tx('M5-10-FOOTBALLFIELD.16', { B_MEDIANA, B_TARGET, p2: eur(evImplicito) }),
          10,
          'T3',
        ),
        hint(
          'H4',
          tx('M5-10-FOOTBALLFIELD.17', { rangeMultipli, B_TARGET, p2: eur(ampiezza), p3: multiplo(multiploMassimo), p4: eur(evAlto), p5: multiplo(multiploMinimo), p6: eur(evBasso) }),
          14,
          'T4',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 180 }),
      startAt: `Model!D${DATA_START}`,
    };
  },
});
