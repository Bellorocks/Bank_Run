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

/** Prezzi unitari: servono due decimali, non gli interi di STILE_INPUT/STILE_FORMULA. */
const STILE_INPUT_PREZZO: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: DEFAULT_FORMATS.numero2dec };
const STILE_FORMULA_PREZZO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: DEFAULT_FORMATS.numero2dec };

export default defineTemplate({
  id: 'M1-05-RIMANENZE',
  module: 'M1',
  title: 'Rimanenze: costo medio ponderato',
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
    const lottoLabels = lotti.map((_l, i) => `Lotto ${i + 1}`);

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
          `In B${R_CMP} calcola il costo medio ponderato unitario dei lotti acquistati: pesa ogni prezzo per la ` +
          `quantita' del proprio lotto (non basta la media semplice dei prezzi, un lotto piu' grande deve contare di piu'), ` +
          `poi dividi per la quantita' totale acquistata. Una sola funzione fa il lavoro di pesatura in un colpo solo: SUMPRODUCT.`,
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
        `In B${R_VAL} calcola il valore delle rimanenze finali: moltiplica il costo medio ponderato unitario ` +
        `che hai appena calcolato per la quantita' rimasta in giacenza a fine periodo (B${GIACENZA_ROW}).`,
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
        `In B${R_VAR} calcola la variazione delle rimanenze che finisce nel Conto Economico: rimanenze finali ` +
        `meno rimanenze iniziali. Se il magazzino e' cresciuto nel periodo il risultato e' positivo (si e' prodotto ` +
        "piu' di quanto si e' venduto), se e' calato il risultato e' negativo: il segno non va corretto a mano, viene dai due numeri.",
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
      brief: [
        '## Rimanenze: quanto vale cio\' che e\' rimasto in magazzino',
        '',
        'Nel periodo hai acquistato la stessa merce in piu\' lotti, a prezzi diversi. A fine periodo',
        `ne restano ${num(giacenzaFinale)} kg in magazzino, su un totale acquistato di ${num(quantitaTotale)} kg: il resto e\' gia\' stato`,
        "venduto o consumato. Quanto valgono, in euro, i kg rimasti?",
        '',
        "Non puoi usare il prezzo di un solo lotto: ognuno pesa per la propria quantita'. Il metodo e'",
        "il **costo medio ponderato**: la media dei prezzi, pesata sulle quantita' di ciascun lotto",
        "invece che sul numero di lotti. (Esistono anche FIFO e LIFO, ma richiedono di tracciare quale",
        "lotto specifico e' stato consumato per primo — un livello per un'altra volta.)",
        '',
        "Ultimo passo: le rimanenze non stanno solo nello Stato Patrimoniale. La loro **variazione**",
        "— quanto sono cresciute o calate rispetto a inizio periodo — e' una voce del Conto Economico",
        "(la stessa \"Variazione delle rimanenze\" che hai gia' incontrato in classe A). Qui il segno",
        "conta davvero: magazzino cresciuto vuol dire piu' produzione di quanta ne sia stata venduta.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Registro di magazzino — acquisti del periodo'], { style: STILE_TITOLO }),
            riga(`A${HEADER_ROW}`, ['Lotto di acquisto', 'Quantita\' (kg)', 'Prezzo unitario (€/kg)'], { style: STILE_TITOLO }),
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
            riga(`A${GIACENZA_ROW}`, ['Giacenza a magazzino a fine periodo (kg)'], { style: STILE_ETICHETTA }),
            blocco(`B${GIACENZA_ROW}`, [[giacenzaFinale]], { style: STILE_INPUT }),
            riga(`A${RIEP_TITLE_ROW}`, ['Riepilogo'], { style: STILE_TITOLO }),
            colonna(
              `A${R_CMP}`,
              [
                'Costo medio ponderato unitario (€/kg)',
                'Valore delle rimanenze finali (€)',
                'Rimanenze iniziali (€)',
                'Variazione delle rimanenze (finali - iniziali) (€)',
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
          `SUMPRODUCT(${rangeQty},${rangePrezzo})/SUM(${rangeQty}): il numeratore pesa ogni prezzo per la sua quantita', il denominatore e' la quantita' totale.`,
          10,
          'T1',
        ),
        hint('H2', `=B${R_CMP}*B${GIACENZA_ROW}: il costo medio ponderato per i kg rimasti in giacenza.`, 6, 'T2'),
        hint(
          'H3',
          `=B${R_VAL}-B${R_INIZ}: rimanenze finali meno rimanenze iniziali, cosi' come sono in cella. Il segno viene da solo.`,
          8,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 65 }),
      startAt: `Model!B${R_CMP}`,
    };
  },
});
