/**
 * M7 · 02 — Costruzione del FCF, riga per riga.
 *
 * M7-01 partiva gia' dall'EBIT dato. Qui si costruisce il Free Cash Flow to
 * Firm DA ZERO, partendo da EBITDA: e' la sequenza che si trova davvero in un
 * modello di valutazione, dove EBITDA e D&A sono le due righe che arrivano
 * dal conto economico proiettato, non un EBIT gia' pronto.
 *
 * TRE TASK IN CASCATA, ognuno riferisce il risultato del precedente:
 *
 *   T1  EBIT   = EBITDA - D&A
 *   T2  NOPAT  = EBIT * (1 - aliquota)          (Net Operating Profit After Tax)
 *   T3  FCFF   = NOPAT + D&A - Capex - ΔNWC
 *
 * IL PUNTO DIDATTICO DI T3 — perche' il D&A si riaggiunge dopo essere stato
 * sottratto in T1: il D&A e' un costo non monetario. Riduce l'EBIT e quindi
 * riduce l'imponibile fiscale (giustamente: e' un costo vero ai fini
 * dell'IRES), ma non e' MAI un'uscita di cassa reale — nessun bonifico parte
 * quando si registra un ammortamento. Il NOPAT ha gia' "pagato" le imposte
 * calcolate su un imponibile piu' basso grazie al D&A (lo scudo fiscale del
 * D&A e' incorporato nel NOPAT), ma il NOPAT stesso e' ancora "troppo basso"
 * rispetto alla cassa vera, perche' porta dentro una sottrazione (il D&A) che
 * non e' mai uscita. Si riaggiunge per tornare a un numero di cassa.
 *
 * Aliquota fiscale FISSA al 24% (IRES post-2017, dato di legge italiano, mai
 * randomizzata — coerente con m1/09-imposte.ts e con M7-01).
 *
 * ΔNWC: stessa convenzione di sempre (M3-03, M7-01) — positiva = il NWC e'
 * aumentato, ha ASSORBITO cassa, si sottrae; puo' essere negativa.
 *
 * Geometria fissa: nessuna riga dipende dal seed, i riferimenti di cella sono
 * letterali per costruzione, come in M7-01.
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
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
} from '../../authoring';

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBITDA = 'B4'; // EBITDA dell'anno (dato, bloccato)
const B_DA = 'B5'; // Ammortamenti (D&A) dell'anno (dato, bloccato)
const B_ALIQ = 'B6'; // Aliquota fiscale, fissa 24% (dato, bloccato)
const B_CAPEX = 'B7'; // Capex dell'anno (dato, bloccato)
const B_DNWC = 'B8'; // ΔNWC dell'anno, gia' con segno (dato, bloccato)

const B_EBIT = 'B12'; // T1
const B_NOPAT = 'B13'; // T2
const B_FCFF = 'B14'; // T3

const ALIQUOTA_FISCALE = 0.24; // dato di legge, non randomizzato

export default defineTemplate({
  id: 'M7-02-COSTRUZIONEFCF',
  module: 'M7',
  title: 'Costruzione del FCF, riga per riga',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['dcf.build-fcf'],
  prerequisites: ['M7-01-FCFFFCFE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBITDA: un valore plausibile per una mid-cap, in migliaia.
    const ebitda = r.int(3000, 10000) * 1000;

    // D&A: sempre minore dell'EBITDA (altrimenti l'EBIT diventa negativo, un
    // caso patologico non voluto in un livello introduttivo).
    const da = r.int(300, Math.floor(ebitda / 1000 / 2)) * 1000;

    // Capex: range indipendente, positivo.
    const capex = r.int(400, 1800) * 1000;

    // ΔNWC: puo' essere positiva (assorbe cassa) o negativa (ne libera).
    const deltaNWC = r.int(-400, 500) * 1000;

    // Valori attesi, calcolati con la STESSA algebra dei tre task in cascata.
    const ebit = ebitda - da;
    const nopat = ebit * (1 - ALIQUOTA_FISCALE);
    const fcff = nopat + da - capex - deltaNWC;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_EBIT} calcola l'EBIT dell'anno: EBITDA (${B_EBITDA}) meno gli ammortamenti D&A (${B_DA}). ` +
        "L'EBITDA e' il margine operativo PRIMA di ammortamenti e imposte; sottraendo il D&A si arriva " +
        "all'EBIT, il margine operativo dopo aver contabilizzato l'usura degli asset — ma ancora prima " +
        'delle imposte.',
      target: `Model!${B_EBIT}`,
      atteso: ebit,
      referenzia: [B_EBITDA, B_DA],
      skills: ['dcf.build-fcf'],
      minKeystrokes: 12,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_NOPAT} calcola il NOPAT (Net Operating Profit After Tax, l'EBIT dopo le imposte): l'EBIT ` +
        `appena calcolato (${B_EBIT} — NON ricalcolarlo da zero) moltiplicato per (1 - aliquota fiscale), ` +
        `con l'aliquota in ${B_ALIQ}.`,
      target: `Model!${B_NOPAT}`,
      atteso: nopat,
      referenzia: [B_EBIT],
      senzaLiteral: [1],
      skills: ['dcf.build-fcf'],
      minKeystrokes: 14,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In ${B_FCFF} calcola il FCFF (Free Cash Flow to Firm): parti dal NOPAT appena calcolato ` +
        `(${B_NOPAT} — NON ricalcolarlo da zero), RIAGGIUNGI il D&A (${B_DA}), sottrai il Capex (${B_CAPEX}) ` +
        `e sottrai la ΔNWC (${B_DNWC}, gia' col segno giusto). Perche' si riaggiunge il D&A dopo averlo ` +
        "gia' sottratto per arrivare all'EBIT e al NOPAT? Perche' e' un costo NON monetario: riduce " +
        "l'imponibile fiscale (giustamente, e' un costo vero a Conto Economico) ma non e' mai un'uscita di " +
        'cassa reale — nessun bonifico parte quando si registra un ammortamento. Il NOPAT ha gia\' ' +
        "beneficiato dello scudo fiscale del D&A, ma resta un numero \"di conto economico\", non di cassa: " +
        "riaggiungere il D&A e' il passo che lo riporta a un flusso di cassa vero.",
      target: `Model!${B_FCFF}`,
      atteso: fcff,
      referenzia: [B_NOPAT, B_DA, B_CAPEX, B_DNWC],
      skills: ['dcf.build-fcf'],
      minKeystrokes: 20,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M7-02-COSTRUZIONEFCF',
      seed: rng.seed,
      brief: [
        '## Costruzione del FCF, riga per riga',
        '',
        "Nel livello precedente l'EBIT era gia' un dato. In un modello vero non lo e' mai: arriva da un " +
          'conto economico proiettato che parte da EBITDA e D&A, due righe distinte. Qui costruisci il FCFF ' +
          'da zero, partendo esattamente da li\'.',
        '',
        '> **EBIT = EBITDA − D&A**',
        '> **NOPAT = EBIT × (1 − aliquota)**',
        '> **FCFF = NOPAT + D&A − Capex − ΔNWC**',
        '',
        '**Perche\' il D&A compare due volte, prima sottratto e poi riaggiunto**: e\' un costo non ' +
          "monetario. Riduce l'imponibile fiscale — giustamente, e' un costo vero — ma nessuna cassa esce " +
          "mai quando si registra un ammortamento. Il NOPAT e' un numero di conto economico, gia' corretto " +
          "per le imposte ma non ancora per la cassa vera: riaggiungere il D&A e' il passo che lo trasforma " +
          'in un flusso di cassa.',
        '',
        `Dati dell'anno: EBITDA ${eur(ebitda)}, ammortamenti (D&A) ${eur(da)}, aliquota fiscale ` +
          `${pct(ALIQUOTA_FISCALE)} (l'IRES italiana, fissa per legge), Capex ${eur(capex)}, ΔNWC ` +
          `${eur(deltaNWC)}.`,
        '',
        "Tre task in cascata: EBIT, poi NOPAT, poi FCFF. Ogni task usa il risultato del precedente — mai " +
          'ricalcolarlo da capo.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Costruzione del FCF, riga per riga'], { style: STILE_TITOLO }),

            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                "EBITDA dell'anno, €",
                "Ammortamenti (D&A) dell'anno, €",
                'Aliquota fiscale',
                "Capex dell'anno, €",
                "ΔNWC dell'anno (gia' col segno), €",
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA, content: ebitda, style: STILE_INPUT, locked: true },
              { ref: B_DA, content: da, style: STILE_INPUT, locked: true },
              { ref: B_ALIQ, content: ALIQUOTA_FISCALE, style: STILE_INPUT_PCT, locked: true },
              { ref: B_CAPEX, content: capex, style: STILE_INPUT, locked: true },
              { ref: B_DNWC, content: deltaNWC, style: STILE_INPUT, locked: true },
            ],

            riga('A11', ['Free Cash Flow'], { style: STILE_TITOLO }),
            colonna(
              'A12',
              ['EBIT, €', 'NOPAT (EBIT dopo le imposte), €', 'FCFF (Free Cash Flow to Firm), €'],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EBIT, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_NOPAT, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_FCFF, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `=${B_EBITDA}-${B_DA}: EBITDA meno gli ammortamenti.`, 10, 'T1'),
        hint('H2', `=${B_EBIT}*(1-${B_ALIQ}): EBIT moltiplicato per (1 - aliquota).`, 10, 'T2'),
        hint(
          'H3',
          `=${B_NOPAT}+${B_DA}-${B_CAPEX}-${B_DNWC}: NOPAT, piu' D&A riaggiunto, meno Capex, meno ΔNWC ` +
            '(col suo segno).',
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_EBIT}`,
    };
  },
});
