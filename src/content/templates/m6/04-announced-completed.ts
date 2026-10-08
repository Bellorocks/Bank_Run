/**
 * M6 · 04 — Announced vs completed: il multiplo si muove col tempo che passa.
 *
 * IL PUNTO DIDATTICO: il multiplo di una transazione precedente non e' un
 * numero congelato nel comunicato stampa dell'annuncio. Fra il giorno in cui
 * un deal viene annunciato e il giorno in cui si chiude (closing/completion)
 * possono passare mesi, e i termini economici possono cambiare — per almeno
 * tre ragioni tipiche: (1) una rinegoziazione del prezzo, spesso perche' una
 * due diligence successiva all'annuncio rivela problemi (o opportunita'); (2)
 * il pagamento e', in tutto o in parte, in AZIONI del compratore, e il loro
 * valore di mercato si muove fra annuncio e closing — un target pagato "20
 * milioni di azioni Compratore SpA" vale una cifra diversa in euro a seconda
 * di quando si guarda; (3) condizioni sospensive (autorizzazioni
 * antitrust, regolatorie, approvazioni assembleari) che, quando si
 * avverano con modifiche, cambiano i termini finali rispetto a quelli
 * annunciati. Chi legge un multiplo di transazione da un database M&A deve
 * sempre chiedersi: e' il multiplo ANNOUNCED o quello COMPLETED? Sono due
 * numeri diversi della stessa operazione, e la differenza fra i due e' essa
 * stessa un'informazione (quanto si e' mosso il deal fra i due momenti).
 *
 * Semplificazione deliberata di questo livello: il numero di azioni del
 * target e il suo EBITDA restano IDENTICI fra annuncio e completamento — solo
 * il prezzo per azione offerto cambia. E' una scelta didattica: isola la sola
 * variabile "prezzo nel tempo" senza mescolarla a variazioni di perimetro
 * (add-on, cessioni) o di stima dell'EBITDA, che sono un problema diverso.
 */

import {
  defineTemplate,
  colonna,
  eur,
  eurM,
  foglio,
  hint,
  multiplo,
  num,
  par,
  pct,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

/** Input battuto a mano espresso in euro con i centesimi: prezzo per azione. */
const STILE_INPUT_PREZZO: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0.00' };
/** Output di una formula che restituisce un multiplo: nero, "x". */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_AZIONI = 'B4'; // Numero di azioni del target (dato, bloccato)
const B_EBITDA = 'B5'; // EBITDA del target, invariato fra annuncio e closing (dato, bloccato)
const B_PREZZO_ANNUNCIO = 'B6'; // Prezzo per azione offerto all'annuncio (dato, bloccato)
const B_PREZZO_CLOSING = 'B7'; // Prezzo per azione effettivo al closing (dato, bloccato)

const B_MULT_ANNUNCIO = 'B10'; // T1
const B_MULT_COMPLETAMENTO = 'B11'; // T2
const B_VARIAZIONE = 'B12'; // T3

export default defineTemplate({
  id: 'M6-04-ANNOUNCEDCOMPLETED',
  module: 'M6',
  title: 'Announced vs completed: il multiplo si muove col tempo',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['prec.timing'],
  prerequisites: ['M6-01-MULTIPLIDITRANSAZIONE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Dimensione del deal: EBITDA e multiplo di annuncio tipici di
    // un'operazione mid-market, generati direttamente (il punto qui e' il
    // timing, non il settore, quindi non serve agganciarsi a SECTORS). ------
    const ebitdaTarget = roundTo(triangular(r, 4_000_000, 12_000_000, 60_000_000), 100_000);
    const multiploAnnuncioTarget = roundTo(triangular(r, 6, 9, 16), 0.1);
    const valoreTotaleAnnuncio = roundTo(multiploAnnuncioTarget * ebitdaTarget, 1000);

    // --- Numero di azioni: dedotto dal valore totale offerto e da un prezzo
    // per azione "corridoio" tipico di un titolo quotato mid/large-cap
    // (8-120 €), poi arrotondato a un decimo di milione di azioni. Il prezzo
    // per azione VERO si ricalcola dopo, dai dati effettivamente scritti in
    // foglio — stesso schema di M6-01. ---------------------------------------
    const prezzoCorridoio = triangular(r, 8, 30, 120);
    const azioni = roundTo(valoreTotaleAnnuncio / prezzoCorridoio, 100_000);
    const prezzoAnnuncio = roundTo(valoreTotaleAnnuncio / azioni, 0.01);

    // --- Prezzo al closing: si muove rispetto all'annuncio, sia sopra sia
    // sotto a seconda del seed. Il minimo del 2% garantisce che la
    // differenza sia sempre leggibile (non si perde nell'arrotondamento ai
    // centesimi) e non banale da ignorare. ------------------------------
    const segno = r.bool() ? 1 : -1;
    const magnitudo = triangular(r, 0.02, 0.07, 0.2);
    const prezzoClosing = roundTo(prezzoAnnuncio * (1 + segno * magnitudo), 0.01);

    // Valori "veri" usati come atteso nei task: ricalcolati dai DATI
    // effettivamente scritti in foglio (dopo tutti gli arrotondamenti), non
    // dai parametri intermedi di generazione.
    const multiploAnnuncio = (prezzoAnnuncio * azioni) / ebitdaTarget;
    const multiploCompletamento = (prezzoClosing * azioni) / ebitdaTarget;
    const variazione = (multiploCompletamento - multiploAnnuncio) / multiploAnnuncio;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_MULT_ANNUNCIO} calcola il multiplo di transazione implicito nel prezzo OFFERTO ` +
        `ALL'ANNUNCIO del deal: (Prezzo per azione all'annuncio, ${B_PREZZO_ANNUNCIO}, × Numero di ` +
        `azioni del target, ${B_AZIONI}) / EBITDA del target (${B_EBITDA}). Il numeratore e' il valore ` +
        "totale che il compratore ha dichiarato di voler pagare per il 100% del target, calcolato al " +
        "prezzo per azione annunciato al mercato.",
      target: `Model!${B_MULT_ANNUNCIO}`,
      atteso: multiploAnnuncio,
      referenzia: [B_PREZZO_ANNUNCIO, B_AZIONI, B_EBITDA],
      senzaLiteral: [],
      skills: ['prec.timing'],
      minKeystrokes: 12,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_MULT_COMPLETAMENTO} calcola lo stesso multiplo ma con il prezzo EFFETTIVO pagato AL ` +
        `COMPLETAMENTO (closing) del deal: (Prezzo per azione al closing, ${B_PREZZO_CLOSING}, × Numero ` +
        `di azioni del target, ${B_AZIONI}) / EBITDA del target (${B_EBITDA}). Numero di azioni ed ` +
        "EBITDA restano gli stessi usati per il multiplo di annuncio: cambia solo il prezzo per azione " +
        "— e' esattamente la variabile che si vuole isolare.",
      target: `Model!${B_MULT_COMPLETAMENTO}`,
      atteso: multiploCompletamento,
      referenzia: [B_PREZZO_CLOSING, B_AZIONI, B_EBITDA],
      senzaLiteral: [],
      skills: ['prec.timing'],
      minKeystrokes: 12,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In ${B_VARIAZIONE} calcola la variazione percentuale fra il multiplo al completamento ` +
        `(${B_MULT_COMPLETAMENTO}) e quello all'annuncio (${B_MULT_ANNUNCIO}): (${B_MULT_COMPLETAMENTO} ` +
        `- ${B_MULT_ANNUNCIO}) / ${B_MULT_ANNUNCIO}. Puo' venire positiva o negativa: un database M&A ` +
        "che riporta solo il multiplo \"announced\" di un deal puo' farti leggere un numero che il " +
        "mercato non ha mai davvero pagato. Le ragioni tipiche per cui i due numeri differiscono: una " +
        "rinegoziazione del prezzo dopo l'annuncio (spesso per esiti della due diligence), un pagamento " +
        "in tutto o in parte in azioni del compratore il cui valore si muove fra annuncio e closing, o " +
        "condizioni sospensive (autorizzazioni antitrust, approvazioni assembleari) che modificano i " +
        "termini finali rispetto a quelli annunciati.",
      target: `Model!${B_VARIAZIONE}`,
      atteso: variazione,
      referenzia: [B_MULT_COMPLETAMENTO, B_MULT_ANNUNCIO],
      senzaLiteral: [],
      skills: ['prec.timing'],
      minKeystrokes: 16,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M6-04-ANNOUNCEDCOMPLETED',
      seed: rng.seed,
      brief: [
        "## Announced vs completed: il multiplo si muove col tempo",
        '',
        "Un multiplo di transazione letto su un database M&A e' quasi sempre calcolato su un " +
          "prezzo — ma UN deal ha due prezzi rilevanti, non uno solo. Il prezzo **all'annuncio** " +
          "(announced) e' quello dichiarato al mercato il giorno in cui l'operazione viene resa " +
          "pubblica. Il prezzo **al completamento** (completed/closing) e' quello effettivamente " +
          "pagato il giorno in cui l'operazione si chiude — settimane o mesi dopo. Fra i due " +
          "momenti i termini possono cambiare: per una rinegoziazione (spesso a valle della due " +
          "diligence), perche' il pagamento e', in tutto o in parte, in azioni del compratore e il " +
          "loro valore di mercato si e' mosso nel frattempo, o per condizioni sospensive " +
          "(autorizzazioni antitrust, approvazioni assembleari) che modificano i termini finali.",
        '',
        "Il multiplo calcolato sul prezzo di annuncio e quello calcolato sul prezzo di closing " +
          "sono quindi due numeri DIVERSI della stessa transazione, e chi confronta deal precedenti " +
          "deve sapere quale dei due sta guardando — e quanto i due si sono scostati.",
        '',
        `**Il deal.** Il target ha ${num(azioni, 0)} azioni in circolazione e un EBITDA di ` +
          `${eurM(ebitdaTarget)}, invariato fra annuncio e closing. Il compratore ha offerto ` +
          `${eur(prezzoAnnuncio, 2)} per azione all'annuncio del deal. Al completamento, il prezzo ` +
          `effettivamente pagato per azione e' stato di ${eur(prezzoClosing, 2)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Announced vs completed: il multiplo si muove col tempo'], { style: STILE_TITOLO }),
            riga('A3', ['Dati del deal'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Numero di azioni del target',
                'EBITDA del target, invariato fra annuncio e closing, €',
                "Prezzo per azione offerto all'annuncio, €",
                'Prezzo per azione effettivo al closing, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_AZIONI, content: azioni, style: STILE_INPUT, locked: true }],
            [{ ref: B_EBITDA, content: ebitdaTarget, style: STILE_INPUT, locked: true }],
            [{ ref: B_PREZZO_ANNUNCIO, content: prezzoAnnuncio, style: STILE_INPUT_PREZZO, locked: true }],
            [{ ref: B_PREZZO_CLOSING, content: prezzoClosing, style: STILE_INPUT_PREZZO, locked: true }],

            riga('A9', ['Multiplo di transazione: annuncio vs completamento'], { style: STILE_TITOLO }),
            colonna(
              'A10',
              [
                "Multiplo di transazione all'annuncio, x",
                'Multiplo di transazione al completamento (closing), x',
                'Variazione percentuale fra i due multipli, %',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_MULT_ANNUNCIO, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_MULT_COMPLETAMENTO, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_VARIAZIONE, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 380, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_PREZZO_ANNUNCIO}*${B_AZIONI}/${B_EBITDA}: valore totale offerto all'annuncio (prezzo ` +
            `× azioni) diviso l'EBITDA del target (qui vale ${multiplo(multiploAnnuncio)}).`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_PREZZO_CLOSING}*${B_AZIONI}/${B_EBITDA}: stessa formula, ma con il prezzo per azione ` +
            `effettivo al closing (qui vale ${multiplo(multiploCompletamento)}).`,
          10,
          'T2',
        ),
        hint(
          'H3',
          `=(${B_MULT_COMPLETAMENTO}-${B_MULT_ANNUNCIO})/${B_MULT_ANNUNCIO}: quanto il multiplo al ` +
            `completamento si scosta da quello all'annuncio, in percentuale dell'annuncio (qui vale ` +
            `${pct(variazione)}).`,
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_MULT_ANNUNCIO}`,
    };
  },
});
