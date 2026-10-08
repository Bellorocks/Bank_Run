/**
 * M6 · 05 — Ciclo di mercato: un multiplo di transazione invecchia col mercato.
 *
 * IL PUNTO DIDATTICO: un multiplo osservato in un deal passato non e' solo
 * "vecchio" nel senso del calendario (vedi M6-04, announced vs completed) —
 * e' vecchio anche nel senso del CICLO DI MERCATO in cui e' stato pagato. Se
 * quel deal e' stato chiuso in un periodo di mercato "caldo" (multipli
 * generalmente alti, tanta liquidita', molta concorrenza fra compratori) o al
 * contrario in un periodo di crisi (multipli compressi, avversione al
 * rischio), il multiplo osservato porta con se' quella condizione di mercato
 * — e confrontarlo direttamente con un multiplo di oggi, senza aggiustarlo,
 * significa confrontare mele con pere: la differenza osservata potrebbe
 * riflettere solo il ciclo, non le caratteristiche del target.
 *
 * La correzione standard: si prende un indicatore del livello medio dei
 * multipli dello stesso settore nel periodo del deal passato e lo stesso
 * indicatore misurato OGGI. Il loro rapporto (oggi / allora) dice quanto il
 * mercato si e' mosso nel frattempo — sopra 1x se i multipli sono saliti,
 * sotto 1x se sono scesi. Moltiplicando il multiplo osservato per questo
 * rapporto si ottiene un multiplo "aggiustato per il ciclo", comparabile alle
 * condizioni di mercato di oggi.
 *
 * Punto sottile da non perdere: l'aggiustamento NON riscrive la storia del
 * deal. Il prezzo che il compratore ha effettivamente pagato allora resta
 * quello — non e' cambiato nulla nella transazione. Cio' che cambia e' solo
 * la LETTURA che se ne da' oggi: il multiplo aggiustato non e' "quanto e'
 * stato pagato", ma "quanto varrebbe oggi un multiplo equivalente, alle
 * condizioni di mercato attuali" — un numero utile per confrontare quel
 * precedente con i multipli di altre transazioni (o di comps trading) rilevati
 * in periodi diversi.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  multiplo,
  num,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

import { tx } from '../../../i18n/content';
/** Output di una formula che restituisce un multiplo: nero, "x" a una cifra. */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };
/** Output di una formula che restituisce un rapporto/fattore: nero, "x" a due cifre
 * (un decimo solo non basterebbe a distinguere due fattori vicini a 1,00x). */
const STILE_FORMULA_RAPPORTO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.00x' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_MULTIPLO_OSSERVATO = 'B4'; // Multiplo osservato nel deal passato (dato, bloccato)
const B_INDICE_ALLORA = 'B5'; // Indice di mercato del settore, nel periodo del deal (dato, bloccato)
const B_INDICE_OGGI = 'B6'; // Indice di mercato del settore, oggi (dato, bloccato)

const B_RAPPORTO = 'B9'; // T1
const B_MULTIPLO_AGGIUSTATO = 'B10'; // T2

export default defineTemplate({
  id: 'M6-05-CICLODIMERCATO',
  module: 'M6',
  get title() {
    return tx('M6-05-CICLODIMERCATO.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['prec.timing'],
  prerequisites: ['M6-04-ANNOUNCEDCOMPLETED'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Il deal passato: un multiplo di transazione tipico di mid-market,
    // generato direttamente (qui il punto e' il ciclo di mercato, non il
    // settore specifico). ------------------------------------------------
    const multiploOsservato = roundTo(triangular(r, 6, 10, 18), 0.1);

    // --- Indice di mercato del settore nel periodo del deal passato: un
    // multiplo EV/EBITDA medio di settore, generato indipendentemente dal
    // multiplo del deal (un singolo deal puo' benissimo essere stato pagato
    // sopra o sotto la media del proprio momento di mercato). ---------------
    const indiceAllora = roundTo(triangular(r, 6, 9, 14), 0.1);

    // --- Indice di mercato OGGI: si muove rispetto ad allora, sia sopra sia
    // sotto a seconda del seed (mercato "caldo" dopo un periodo compresso, o
    // viceversa). Il minimo del 5% garantisce che il rapporto sia sempre
    // leggibilmente diverso da 1,00x. ----------------------------------------
    const segno = r.bool() ? 1 : -1;
    const magnitudo = triangular(r, 0.05, 0.12, 0.3);
    const indiceOggi = roundTo(indiceAllora * (1 + segno * magnitudo), 0.1);

    // Valori "veri" usati come atteso nei task: ricalcolati dai DATI
    // effettivamente scritti in foglio (dopo tutti gli arrotondamenti).
    const rapporto = indiceOggi / indiceAllora;
    const multiploAggiustato = multiploOsservato * rapporto;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M6-05-CICLODIMERCATO.2', { B_RAPPORTO, B_INDICE_OGGI, B_INDICE_ALLORA }),
      target: `Model!${B_RAPPORTO}`,
      atteso: rapporto,
      referenzia: [B_INDICE_OGGI, B_INDICE_ALLORA],
      senzaLiteral: [],
      skills: ['prec.timing'],
      minKeystrokes: 10,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M6-05-CICLODIMERCATO.3', { B_MULTIPLO_AGGIUSTATO, B_MULTIPLO_OSSERVATO, B_RAPPORTO }),
      target: `Model!${B_MULTIPLO_AGGIUSTATO}`,
      atteso: multiploAggiustato,
      referenzia: [B_MULTIPLO_OSSERVATO, B_RAPPORTO],
      senzaLiteral: [],
      skills: ['prec.timing'],
      minKeystrokes: 10,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M6-05-CICLODIMERCATO',
      seed: rng.seed,
      brief: [tx('M6-05-CICLODIMERCATO.4', { p0: multiplo(multiploOsservato), p1: multiplo(indiceAllora), p2: multiplo(indiceOggi) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M6-05-CICLODIMERCATO.5')], {
              style: STILE_TITOLO,
            }),
            riga('A3', [tx('M6-05-CICLODIMERCATO.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M6-05-CICLODIMERCATO.7'),
                tx('M6-05-CICLODIMERCATO.8'),
                tx('M6-05-CICLODIMERCATO.9'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_MULTIPLO_OSSERVATO, content: multiploOsservato, style: STILE_INPUT_MULTIPLO, locked: true }],
            [{ ref: B_INDICE_ALLORA, content: indiceAllora, style: STILE_INPUT_MULTIPLO, locked: true }],
            [{ ref: B_INDICE_OGGI, content: indiceOggi, style: STILE_INPUT_MULTIPLO, locked: true }],

            riga('A8', [tx('M6-05-CICLODIMERCATO.10')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M6-05-CICLODIMERCATO.11'),
                tx('M6-05-CICLODIMERCATO.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_RAPPORTO, content: null, locked: false, style: STILE_FORMULA_RAPPORTO }],
            [{ ref: B_MULTIPLO_AGGIUSTATO, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
          ],
          { colWidths: { A: 420, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M6-05-CICLODIMERCATO.13', { B_INDICE_OGGI, B_INDICE_ALLORA, p2: num(rapporto, 2) }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M6-05-CICLODIMERCATO.14', { B_MULTIPLO_OSSERVATO, B_RAPPORTO, p2: multiplo(multiploAggiustato) }),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${B_RAPPORTO}`,
    };
  },
});
