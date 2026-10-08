/**
 * M5 · 09 — Premio di controllo e sconto di illiquidita'.
 *
 * IL PUNTO DIDATTICO: i multipli dei comp set (e il multiplo gia' aggiustato
 * per size/crescita in M5-08) riflettono transazioni di MINORANZA su titoli
 * LIQUIDI — un investitore compra poche azioni su un mercato regolamentato,
 * dove puo' rivenderle in giornata. Se si sta valutando una quota di
 * CONTROLLO in un'azienda PRIVATA, nessuna delle due condizioni vale piu', e
 * servono due aggiustamenti opposti:
 *
 *  - PREMIO DI CONTROLLO (+): chi acquisisce il controllo paga di piu' del
 *    prezzo di mercato di una singola azione, perche' ottiene il diritto di
 *    decidere strategia, management, uso della cassa — cose che un azionista
 *    di minoranza non controlla. Tipicamente +15%/+30%.
 *  - SCONTO DI ILLIQUIDITA' (-): un'azienda privata non ha un mercato liquido
 *    per le sue azioni — non si vendono in un click, servono mesi e un
 *    processo di M&A per uscire dall'investimento. A parita' di fondamentali,
 *    questo la rende strutturalmente meno preziosa. Tipicamente -10%/-25%.
 *
 * CONVENZIONE DI SEGNO (il punto piu' a rischio di ambiguita' del livello):
 * lo sconto di illiquidita' e' generato come valore POSITIVO che rappresenta
 * la MAGNITUDINE della riduzione — es. 0,15 significa "sconto del 15%", non
 * "-15%". La formula sottrae quel valore da 1: multiplo × (1 - sconto). Il
 * segno negativo e' nella STRUTTURA della formula (1 - sconto), non nel dato.
 *
 * DUE TASK, in sequenza OBBLIGATA — stessa logica compositiva di M5-08:
 *  - T1: applica il premio di controllo al multiplo aggiustato (dato di
 *    ingresso, il risultato concettuale di M5-08, qui ridato come DATO
 *    bloccato — nessuna cella condivisa fra template).
 *  - T2: applica lo sconto di illiquidita' al risultato di T1, NON al
 *    multiplo aggiustato originario — di nuovo una composizione MOLTIPLICATIVA
 *    in sequenza, non additiva: multiplo × (1+premio) × (1-sconto), non
 *    multiplo × (1+premio-sconto). Le due basi sono diverse (il premio ha
 *    gia' alzato il multiplo quando si applica lo sconto), quindi sommare le
 *    due percentuali sulla base originaria sottostimerebbe leggermente
 *    l'effetto netto quando il premio supera lo sconto (il caso tipico, dato
 *    che qui il premio e' sempre maggiore in magnitudine dello sconto).
 *
 * Geometria fissa: nessuna posizione dipende dal seed.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  multiplo,
  par,
  pct,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT_MULTIPLO,
  STILE_INPUT_PCT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

/** Output di una formula che restituisce un multiplo: nero, "x". */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_AGGIUSTATO = 'B4'; // Multiplo aggiustato per size/crescita (dato, bloccato — da M5-08)
const B_PREMIO = 'B5'; // Premio di controllo, pp (dato, bloccato, sempre positivo)
const B_SCONTO = 'B6'; // Sconto di illiquidita', pp (dato, bloccato, magnitudine positiva)

const B_STEP1 = 'B9'; // T1: multiplo con premio di controllo
const B_STEP2 = 'B10'; // T2: multiplo finale (premio + sconto illiquidita')

export default defineTemplate({
  id: 'M5-09-SCONTOILLIQUIDITA',
  module: 'M5',
  title: "Premio di controllo e sconto di illiquidita'",
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['comps.adjustments'],
  prerequisites: ['M5-08-AGGIUSTAMENTISIZE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Il multiplo aggiustato per size/crescita: il risultato concettuale
    // di M5-08, qui ridato come DATO bloccato (nessuna cella condivisa fra
    // template). ---------------------------------------------------------
    const multiploAggiustato = roundTo(triangular(r, 6.5, 8.5, 13.0), 0.1);

    // --- Premio di controllo: sempre positivo, tipicamente +15%/+30%. -------
    const premioControllo = roundTo(triangular(r, 0.15, 0.20, 0.30), 0.001);

    // --- Sconto di illiquidita': generato come MAGNITUDINE positiva
    // (0,15 = "sconto del 15%"), tipicamente 10%/25%. La sottrazione e' nella
    // formula (1 - sconto), non nel segno del dato. --------------------------
    const scontoIlliquidita = roundTo(triangular(r, 0.10, 0.15, 0.25), 0.001);

    const multiploStep1 = multiploAggiustato * (1 + premioControllo);
    const multiploStep2 = multiploStep1 * (1 - scontoIlliquidita);

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_STEP1} applica al multiplo aggiustato (${B_AGGIUSTATO}) il premio di controllo ` +
        `(${B_PREMIO}): multiplo aggiustato × (1 + premio di controllo). Chi acquisisce il controllo ` +
        "paga di piu' del prezzo di mercato di una singola azione — ottiene il diritto di decidere " +
        "strategia, management e uso della cassa, cose che un azionista di minoranza non controlla. " +
        `Formula: ${B_AGGIUSTATO}*(1+${B_PREMIO}).`,
      target: `Model!${B_STEP1}`,
      atteso: multiploStep1,
      referenzia: [B_AGGIUSTATO, B_PREMIO],
      senzaLiteral: [1],
      skills: ['comps.adjustments'],
      minKeystrokes: 14,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_STEP2} applica lo sconto di illiquidita' (${B_SCONTO}) al risultato di T1 (${B_STEP1}), ` +
        `NON al multiplo aggiustato originario (${B_AGGIUSTATO}): ${B_STEP1} × (1 − sconto di ` +
        `illiquidita'). ATTENZIONE al segno: ${B_SCONTO} e' scritto come una MAGNITUDINE positiva ` +
        `(${pct(scontoIlliquidita)} significa "sconto del ${pct(scontoIlliquidita)}", non "meno ` +
        `${pct(scontoIlliquidita)}") — sei tu a sottrarla nella formula, con (1-${B_SCONTO}), non a ` +
        "sommarla con un segno gia' negativo nel dato. Un'azienda privata non ha un mercato liquido per " +
        "le sue azioni: niente vendita in un click, serve un processo di M&A di mesi per uscire " +
        "dall'investimento, e questo la rende strutturalmente meno preziosa a parita' di fondamentali. " +
        "I due aggiustamenti si compongono in SEQUENZA, moltiplicativamente — lo sconto si applica alla " +
        `base GIA' alzata dal premio, non alla base originaria — non si sommano le percentuali. Formula: ` +
        `${B_STEP1}*(1-${B_SCONTO}).`,
      target: `Model!${B_STEP2}`,
      atteso: multiploStep2,
      referenzia: [B_STEP1, B_SCONTO],
      senzaLiteral: [1],
      skills: ['comps.adjustments'],
      minKeystrokes: 14,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M5-09-SCONTOILLIQUIDITA',
      seed: rng.seed,
      brief: [
        "## Premio di controllo e sconto di illiquidita'",
        '',
        "I multipli dei comp set — e il multiplo gia' aggiustato per size e crescita — riflettono " +
          "transazioni di MINORANZA su titoli LIQUIDI: un investitore compra poche azioni su un mercato " +
          "regolamentato, e puo' rivenderle in giornata. Se stai valutando una quota di CONTROLLO in " +
          "un'azienda PRIVATA, nessuna delle due condizioni vale piu'. Servono due aggiustamenti opposti.",
        '',
        "**Premio di controllo (+).** Chi acquisisce il controllo paga di piu' del prezzo di mercato di " +
          "una singola azione: ottiene il diritto di decidere strategia, management, uso della cassa — " +
          `cose che un azionista di minoranza non controlla. Oggi: +${pct(premioControllo)} sul multiplo. ` +
          "(Semplificazione: il premio di controllo in senso stretto si misura sul prezzo dell'equity; " +
          'applicarlo al multiplo EV/EBITDA equivale a supporre una societa\' senza debito.)',
        '',
        "**Sconto di illiquidita' (-).** Un'azienda privata non ha un mercato liquido per le sue azioni: " +
          "niente vendita in un click, serve un processo di M&A di mesi per uscire dall'investimento. A " +
          "parita' di fondamentali, questo la rende strutturalmente meno preziosa. Oggi: sconto del " +
          `${pct(scontoIlliquidita)} sul multiplo.`,
        '',
        "**Attenzione al segno.** Lo sconto di illiquidita' e' scritto nel foglio come una MAGNITUDINE " +
          `positiva — ${pct(scontoIlliquidita)} significa "sconto del ${pct(scontoIlliquidita)}", non ` +
          '"meno quella percentuale". Il segno negativo va nella formula, con (1 − sconto), non nel dato.',
        '',
        "**L'ordine conta.** I due aggiustamenti si applicano in SEQUENZA, moltiplicativamente — prima il " +
          "premio, poi lo sconto sulla base gia' alzata dal premio — non sommati sul multiplo aggiustato " +
          "originario. Sommare le due percentuali su basi diverse e' un errore comune che distorce il " +
          "risultato netto.",
        '',
        `**I dati.** Multiplo aggiustato per size/crescita: ${multiplo(multiploAggiustato)}. Premio di ` +
          `controllo: +${pct(premioControllo)}. Sconto di illiquidita': ${pct(scontoIlliquidita)} (da ` +
          "sottrarre)."
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ["Premio di controllo e sconto di illiquidita'"], { style: STILE_TITOLO }),
            riga('A3', ['Dati del multiplo e degli aggiustamenti'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Multiplo aggiustato per size/crescita (EV/EBITDA), x',
                'Premio di controllo (applicato al multiplo), %',
                "Sconto di illiquidita' (magnitudine), pp",
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_AGGIUSTATO, content: multiploAggiustato, style: STILE_INPUT_MULTIPLO, locked: true },
              { ref: B_PREMIO, content: premioControllo, style: STILE_INPUT_PCT, locked: true },
              { ref: B_SCONTO, content: scontoIlliquidita, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A8', ['Multiplo per una quota di controllo, illiquida'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'Multiplo con premio di controllo, x',
                "Multiplo finale (premio + sconto illiquidita'), x",
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_STEP1, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_STEP2, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
          ],
          { colWidths: { A: 440, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_AGGIUSTATO}*(1+${B_PREMIO}) — qui vale ${multiplo(multiploStep1)}: il multiplo aggiustato ` +
            `aumentato del premio di controllo, +${pct(premioControllo)}.`,
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_STEP1}*(1-${B_SCONTO}) — qui vale ${multiplo(multiploStep2)}: il risultato di T1, non il ` +
            `multiplo aggiustato originario, ridotto dello sconto di illiquidita' (${pct(scontoIlliquidita)}). ` +
            `Nota il segno: si SOTTRAE ${B_SCONTO} perche' e' gia' una magnitudine positiva.`,
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${B_STEP1}`,
    };
  },
});
