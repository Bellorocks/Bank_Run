/**
 * M1 · 05 — Valutazione delle rimanenze: costo medio ponderato.
 *
 * Scelta deliberata, non una scorciatoia: l'unico metodo di valutazione delle
 * rimanenze realisticamente testabile con una formula Excel diretta e' il
 * costo medio ponderato. FIFO e LIFO richiederebbero un layer di tracciamento
 * lotto-per-lotto (quale lotto e' "consumato" per primo, quanto ne resta di
 * ciascuno) che non e' il punto di un livello introduttivo: qui l'obiettivo e'
 * capire CHE COSA significa pesare un costo per la quantita' a cui si
 * riferisce, non costruire un motore di magazzino.
 *
 * Il giocatore vede un piccolo registro di lotti di acquisto (quantita' e
 * prezzo unitario per lotto) piu' una quantita' separata rimasta in giacenza
 * a fine periodo. Da li' calcola: il costo medio ponderato unitario, il
 * valore delle rimanenze finali, e — terzo task — la variazione di
 * rimanenze che finisce nel Conto Economico (gia' incontrata come voce di
 * classe A in M1-01, qui ne costruisce davvero il segno).
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  num,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { DEFAULT_FORMATS } from '../../../engine/numberFormat';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
/** Prezzi unitari: servono due decimali, non gli interi di STILE_INPUT/STILE_FORMULA. */
const STILE_INPUT_PREZZO: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: DEFAULT_FORMATS.numero2dec };
const STILE_FORMULA_PREZZO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: DEFAULT_FORMATS.numero2dec };

export default defineTemplate({
  id: 'M1-05-RIMANENZE',
  module: 'M1',
  get title() {
    return tx('M1-05-RIMANENZE.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 280,
  skills: ['acc.inventory'],
  prerequisites: ['M1-01-SCHEMACEE'],

  generate: (rng) => {
    // Tre stream indipendenti: i lotti, la giacenza finale e le rimanenze
    // iniziali non devono spostarsi a vicenda se domani si tocca uno dei tre.
    const rLotti = rng.fork('lotti');
    const rGiacenza = rng.fork('giacenza');
    const rIniziali = rng.fork('iniziali');

    // --- Lotti di acquisto: 3 o 4, mai mescolati (l'ordine e' cronologico). --
    const nLotti = rLotti.int(3, 4);
    const lotti = Array.from({ length: nLotti }, () => ({
      quantita: roundTo(triangular(rLotti, 200, 700, 2500), 50),
      prezzo: roundTo(triangular(rLotti, 4, 12, 45), 0.05),
    }));
    const lottoLabels = lotti.map((_l, i) => tx('common.lotto', { n: i + 1 }));

    const quantitaTotale = lotti.reduce((a, l) => a + l.quantita, 0);
    const sommaProdotti = lotti.reduce((a, l) => a + l.quantita * l.prezzo, 0);
    const costoMedioPonderato = sommaProdotti / quantitaTotale;

    // --- Giacenza a fine periodo: sempre minore di quanto acquistato. -------
    const frazioneGiacenza = triangular(rGiacenza, 0.2, 0.45, 0.7);
    let giacenzaFinale = roundTo(quantitaTotale * frazioneGiacenza, 50);
    if (giacenzaFinale <= 0) giacenzaFinale = 50;
    if (giacenzaFinale >= quantitaTotale) giacenzaFinale = quantitaTotale - 50;

    const valoreRimanenzeFinali = costoMedioPonderato * giacenzaFinale;

    // --- Rimanenze iniziali: dato di partenza, stesso ordine di grandezza. --
    const rimanenzeIniziali = roundTo(
      triangular(rIniziali, valoreRimanenzeFinali * 0.5, valoreRimanenzeFinali * 0.9, valoreRimanenzeFinali * 1.4),
      100,
    );
    const variazioneRimanenze = valoreRimanenzeFinali - rimanenzeIniziali;

    // --- Geometria: tutto calcolato dal numero di lotti, mai un letterale. --
    const HEADER_ROW = 3;
    const LOT_ROW_FIRST = HEADER_ROW + 1;
    const LOT_ROW_LAST = LOT_ROW_FIRST + nLotti - 1;
    const GIACENZA_ROW = LOT_ROW_LAST + 2;
    const RIEP_TITLE_ROW = GIACENZA_ROW + 2;
    const R_CMP = RIEP_TITLE_ROW + 1;
    const R_VAL = RIEP_TITLE_ROW + 2;
    const R_INIZ = RIEP_TITLE_ROW + 3;
    const R_VAR = RIEP_TITLE_ROW + 4;

    const rangeQty = `B${LOT_ROW_FIRST}:B${LOT_ROW_LAST}`;
    const rangePrezzo = `C${LOT_ROW_FIRST}:C${LOT_ROW_LAST}`;

    const t1 = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M1-05-RIMANENZE.2', { R_CMP }),
        target: `Model!B${R_CMP}`,
        atteso: costoMedioPonderato,
        referenzia: [`B${LOT_ROW_FIRST}`, `B${LOT_ROW_LAST}`, `C${LOT_ROW_FIRST}`, `C${LOT_ROW_LAST}`],
        senzaLiteral: [],
        skills: ['acc.inventory'],
        minKeystrokes: 32,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUMPRODUCT'] }] };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M1-05-RIMANENZE.3', { R_VAL, GIACENZA_ROW }),
      target: `Model!B${R_VAL}`,
      atteso: valoreRimanenzeFinali,
      referenzia: [`B${R_CMP}`, `B${GIACENZA_ROW}`],
      senzaLiteral: [],
      skills: ['acc.inventory'],
      minKeystrokes: 8,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M1-05-RIMANENZE.4', { R_VAR }),
      target: `Model!B${R_VAR}`,
      atteso: variazioneRimanenze,
      referenzia: [`B${R_VAL}`, `B${R_INIZ}`],
      senzaLiteral: [],
      skills: ['acc.inventory'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-05-RIMANENZE',
      seed: rng.seed,
      brief: [tx('M1-05-RIMANENZE.5', { p0: num(giacenzaFinale), p1: num(quantitaTotale) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M1-05-RIMANENZE.6')], { style: STILE_TITOLO }),
            riga(`A${HEADER_ROW}`, [tx('M1-05-RIMANENZE.7'), tx('M1-05-RIMANENZE.8'), tx('M1-05-RIMANENZE.9')], { style: STILE_TITOLO }),
            colonna(`A${LOT_ROW_FIRST}`, lottoLabels, { style: STILE_ETICHETTA }),
            blocco(
              `B${LOT_ROW_FIRST}`,
              lotti.map((l) => [l.quantita]),
              { style: STILE_INPUT },
            ),
            blocco(
              `C${LOT_ROW_FIRST}`,
              lotti.map((l) => [l.prezzo]),
              { style: STILE_INPUT_PREZZO },
            ),
            riga(`A${GIACENZA_ROW}`, [tx('M1-05-RIMANENZE.10')], { style: STILE_ETICHETTA }),
            blocco(`B${GIACENZA_ROW}`, [[giacenzaFinale]], { style: STILE_INPUT }),
            riga(`A${RIEP_TITLE_ROW}`, [tx('M1-05-RIMANENZE.18')], { style: STILE_TITOLO }),
            colonna(
              `A${R_CMP}`,
              [
                tx('M1-05-RIMANENZE.11'),
                tx('M1-05-RIMANENZE.12'),
                tx('M1-05-RIMANENZE.13'),
                tx('M1-05-RIMANENZE.14'),
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco(`B${R_INIZ}`, [[rimanenzeIniziali]], { style: STILE_INPUT }),
            // Celle di lavoro del giocatore: libere ma con il formato a due decimali
            // gia' applicato, perche' sono tutte cifre in euro/kg. `areaLibera` non fa
            // al caso — scarterebbe lo style insieme al content null — quindi CellSpec a mano.
            [{ ref: `B${R_CMP}`, content: null, locked: false, style: STILE_FORMULA_PREZZO }],
            [{ ref: `B${R_VAL}`, content: null, locked: false, style: STILE_FORMULA_PREZZO }],
            [{ ref: `B${R_VAR}`, content: null, locked: false, style: STILE_FORMULA_PREZZO }],
          ],
          { colWidths: { A: 340, B: 130, C: 150 }, frozenRows: HEADER_ROW },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M1-05-RIMANENZE.15', { rangeQty, rangePrezzo }),
          10,
          'T1',
        ),
        hint('H2', tx('M1-05-RIMANENZE.16', { R_CMP, GIACENZA_ROW }), 6, 'T2'),
        hint(
          'H3',
          tx('M1-05-RIMANENZE.17', { R_VAL, R_INIZ }),
          8,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 65 }),
      startAt: `Model!B${R_CMP}`,
    };
  },
});
