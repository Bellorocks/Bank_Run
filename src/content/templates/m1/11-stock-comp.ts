/**
 * M1 · 11 — Stock comp: il costo dei compensi in azioni e la diluizione dell'EPS.
 *
 * Due idee, non una: primo, un piano di stock option ha un COSTO che finisce
 * a Conto Economico anche se non e' mai uscita cassa (competenza, non
 * manifestazione finanziaria — lo stesso principio gia' visto in M1-03 per
 * ratei e risconti, qui applicato a una posta non monetaria). Secondo, quel
 * piano crea azioni potenziali che, se esercitate, DILUISCONO l'utile per
 * azione: piu' azioni allo stesso numeratore, EPS piu' basso.
 *
 * SEMPLIFICAZIONE DICHIARATA — il calcolo vero delle azioni diluite passa dal
 * treasury stock method (le opzioni "in the money" liberano cassa quando
 * esercitate, e quella cassa ricompra azioni sul mercato, riducendo la
 * diluizione netta). Qui le azioni potenziali sono date GIA' come numero
 * netto di azioni aggiuntive: il livello insegna il MECCANISMO della
 * diluizione (piu' azioni, stesso utile, EPS piu' basso), non il treasury
 * stock method, che e' materia di un modulo successivo.
 *
 * Tre task, in ordine di dipendenza:
 *   T1  Costo annuo di competenza = fair value totale / anni di vesting
 *       (quota lineare, coerente con la logica IFRS2/OIC semplificata: il
 *       costo di un piano pluriennale si spalma sugli anni in cui matura).
 *   T2  EPS base = utile netto / azioni ordinarie in circolazione.
 *   T3  EPS diluito = utile netto / (azioni ordinarie + azioni potenziali).
 *       Stesso numeratore di T2, denominatore piu' grande: il prompt rende
 *       esplicito che il risultato NON PUO' essere maggiore dell'EPS base.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  num,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { DEFAULT_FORMATS } from '../../../engine/numberFormat';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

import { tx } from '../../../i18n/content';
/** L'EPS si legge in euro per azione, a due decimali: ne serve uno stile locale. */
const STILE_FORMULA_EUR2DEC: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: DEFAULT_FORMATS.numero2dec };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_FV = 'B4'; // Fair value totale del piano, €
const B_VEST = 'B5'; // Anni di vesting
const B_UN = 'B6'; // Utile netto dell'esercizio, €
const B_AZBASE = 'B7'; // Azioni ordinarie in circolazione
const B_AZPOT = 'B8'; // Azioni potenziali da opzioni

const B_COSTO = 'B11'; // T1
const B_EPSBASE = 'B12'; // T2
const B_EPSDIL = 'B13'; // T3

export default defineTemplate({
  id: 'M1-11-STOCKCOMP',
  module: 'M1',
  get title() {
    return tx('M1-11-STOCKCOMP.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['acc.stock-comp'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    const rPiano = rng.fork('piano');
    const rEps = rng.fork('eps');

    // Il fair value totale nasce da un costo annuo "pulito", non viceversa:
    // cosi' T1 ha sempre un risultato leggibile, non una divisione a caso.
    const costoAnnuo = rPiano.int(100, 400) * 1_000;
    const anniVesting = rPiano.pick([3, 4]);
    const fairValueTotale = costoAnnuo * anniVesting;

    const utileNetto = rEps.int(200, 1500) * 10_000; // 2M - 15M €, a scatti di 10.000
    const azioniBase = rEps.int(500, 2_000) * 10_000; // 5M - 20M azioni, a scatti di 10.000
    // Azioni potenziali: una frazione piccola ma non trascurabile della base,
    // cosi' l'effetto diluitivo si vede ma non stravolge l'EPS.
    const quotaDiluizione = 0.02 + rEps.next() * 0.06; // 2% - 8%
    const azioniPotenziali = Math.max(10_000, Math.round((azioniBase * quotaDiluizione) / 10_000) * 10_000);

    const epsBase = utileNetto / azioniBase;
    const epsDiluito = utileNetto / (azioniBase + azioniPotenziali);

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M1-11-STOCKCOMP.2', { B_COSTO, B_FV, B_VEST }),
      target: `Model!${B_COSTO}`,
      atteso: costoAnnuo,
      referenzia: [B_FV, B_VEST],
      senzaLiteral: [],
      skills: ['acc.stock-comp'],
      minKeystrokes: 6,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M1-11-STOCKCOMP.3', { B_EPSBASE, B_UN, B_AZBASE }),
      target: `Model!${B_EPSBASE}`,
      atteso: epsBase,
      referenzia: [B_UN, B_AZBASE],
      senzaLiteral: [],
      skills: ['acc.stock-comp'],
      minKeystrokes: 6,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M1-11-STOCKCOMP.4', { B_EPSDIL, B_UN, B_AZBASE, B_AZPOT }),
      target: `Model!${B_EPSDIL}`,
      atteso: epsDiluito,
      referenzia: [B_UN, B_AZBASE, B_AZPOT],
      senzaLiteral: [],
      skills: ['acc.stock-comp'],
      minKeystrokes: 10,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-11-STOCKCOMP',
      seed: rng.seed,
      brief: [tx('M1-11-STOCKCOMP.5', { p0: eur(fairValueTotale), p1: num(anniVesting), p2: eur(utileNetto), p3: num(azioniBase), p4: num(azioniPotenziali) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M1-11-STOCKCOMP.6')], { style: STILE_TITOLO }),
            riga('A3', [tx('M1-11-STOCKCOMP.7')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M1-11-STOCKCOMP.8'),
                tx('M1-11-STOCKCOMP.9'),
                tx('M1-11-STOCKCOMP.10'),
                tx('M1-11-STOCKCOMP.11'),
                tx('M1-11-STOCKCOMP.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_FV, content: fairValueTotale, style: STILE_INPUT, locked: true },
              { ref: B_VEST, content: anniVesting, style: STILE_INPUT, locked: true },
              { ref: B_UN, content: utileNetto, style: STILE_INPUT, locked: true },
              { ref: B_AZBASE, content: azioniBase, style: STILE_INPUT, locked: true },
              { ref: B_AZPOT, content: azioniPotenziali, style: STILE_INPUT, locked: true },
            ],

            riga('A10', [tx('M1-11-STOCKCOMP.19')], { style: STILE_TITOLO }),
            colonna(
              'A11',
              [
                tx('M1-11-STOCKCOMP.13'),
                tx('M1-11-STOCKCOMP.14'),
                tx('M1-11-STOCKCOMP.15'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_COSTO, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_EPSBASE, content: null, locked: false, style: STILE_FORMULA_EUR2DEC }],
            [{ ref: B_EPSDIL, content: null, locked: false, style: STILE_FORMULA_EUR2DEC }],
          ],
          { colWidths: { A: 400, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M1-11-STOCKCOMP.16', { B_FV, B_VEST }), 8, 'T1'),
        hint('H2', tx('M1-11-STOCKCOMP.17', { B_UN, B_AZBASE }), 8, 'T2'),
        hint(
          'H3',
          tx('M1-11-STOCKCOMP.18', { B_UN, B_AZBASE, B_AZPOT, B_EPSBASE }),
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_COSTO}`,
    };
  },
});
