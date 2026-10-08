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
  title: 'Ciclo di mercato: un multiplo di transazione invecchia col mercato',
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
        `In ${B_RAPPORTO} calcola il rapporto di aggiustamento per il ciclo di mercato: indice di ` +
        `mercato del settore OGGI (${B_INDICE_OGGI}) diviso l'indice dello stesso settore NEL PERIODO ` +
        `del deal passato (${B_INDICE_ALLORA}). Un rapporto sopra 1,00x dice che i multipli del settore ` +
        "sono saliti da allora a oggi (il mercato si e' \"scaldato\"); sotto 1,00x dice che sono scesi " +
        "(il mercato si e' compresso). E' il fattore che serve per riportare un multiplo osservato in " +
        "quel periodo alle condizioni di mercato attuali.",
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
        `In ${B_MULTIPLO_AGGIUSTATO} calcola il multiplo del deal passato AGGIUSTATO per il ciclo di ` +
        `mercato: multiplo osservato nel deal (${B_MULTIPLO_OSSERVATO}) moltiplicato per il rapporto di ` +
        `aggiustamento calcolato al task precedente (${B_RAPPORTO}). Attenzione: questo aggiustamento NON ` +
        "cambia i fatti del deal — il prezzo che il compratore ha effettivamente pagato allora resta " +
        "quello, punto. Cio' che cambia e' come quel multiplo va LETTO oggi: il multiplo aggiustato non " +
        "rappresenta \"quanto e' stato pagato\", ma \"quanto varrebbe un multiplo equivalente alle " +
        "condizioni di mercato di oggi\" — il numero che va confrontato con comps e altri precedenti, " +
        "non il multiplo storico grezzo.",
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
      brief: [
        '## Ciclo di mercato: un multiplo di transazione invecchia col mercato',
        '',
        "Un multiplo osservato in un deal passato non e' solo \"vecchio\" nel senso del calendario " +
          "(quello e' il problema di announced vs completed). E' vecchio anche nel senso del CICLO DI " +
          "MERCATO in cui e' stato pagato. Se quel deal si e' chiuso in un periodo di mercato \"caldo\" " +
          "(molta liquidita', molta concorrenza fra compratori, multipli generalmente alti) o al " +
          "contrario in un periodo di crisi (avversione al rischio, multipli compressi), il multiplo " +
          "osservato porta con se' quella condizione di mercato. Confrontarlo direttamente con un " +
          "multiplo di oggi, senza aggiustarlo, rischia di confrontare mele con pere: la differenza che " +
          "vedi potrebbe riflettere solo il ciclo, non le caratteristiche del target.",
        '',
        "La correzione standard: si prende un indicatore del livello medio dei multipli dello stesso " +
          "settore nel periodo del deal passato, e lo stesso indicatore misurato oggi. Il loro rapporto " +
          "dice quanto il mercato si e' mosso nel frattempo. Moltiplicando il multiplo osservato per " +
          "questo rapporto si ottiene un multiplo \"aggiustato per il ciclo\", comparabile alle " +
          "condizioni di mercato di oggi.",
        '',
        `**Il deal.** Un deal passato in questo settore e' stato chiuso a un multiplo di ` +
          `${multiplo(multiploOsservato)}. Nel periodo in cui quel deal si e' chiuso, l'indice di ` +
          `mercato del settore (multiplo EV/EBITDA medio delle transazioni comparabili di allora) era ` +
          `${multiplo(indiceAllora)}. Lo stesso indice, misurato oggi, e' ${multiplo(indiceOggi)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Ciclo di mercato: un multiplo di transazione invecchia col mercato'], {
              style: STILE_TITOLO,
            }),
            riga('A3', ['Dati del deal e del ciclo di mercato'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Multiplo di transazione osservato nel deal passato, x',
                'Indice di mercato del settore, nel periodo del deal passato, x',
                'Indice di mercato del settore, oggi, x',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_MULTIPLO_OSSERVATO, content: multiploOsservato, style: STILE_INPUT_MULTIPLO, locked: true }],
            [{ ref: B_INDICE_ALLORA, content: indiceAllora, style: STILE_INPUT_MULTIPLO, locked: true }],
            [{ ref: B_INDICE_OGGI, content: indiceOggi, style: STILE_INPUT_MULTIPLO, locked: true }],

            riga('A8', ['Aggiustamento per il ciclo di mercato'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'Rapporto di aggiustamento (indice oggi / indice allora), x',
                'Multiplo del deal, aggiustato per il ciclo di mercato, comparabile a oggi, x',
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
          `=${B_INDICE_OGGI}/${B_INDICE_ALLORA}: indice di oggi diviso indice di allora (qui vale ` +
            `${num(rapporto, 2)}x).`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_MULTIPLO_OSSERVATO}*${B_RAPPORTO}: multiplo osservato moltiplicato per il rapporto di ` +
            `aggiustamento (qui vale ${multiplo(multiploAggiustato)}).`,
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${B_RAPPORTO}`,
    };
  },
});
