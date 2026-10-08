/**
 * M5 · 05 — EV/(EBITDA-Capex) e i due multipli equity-based: P/E e P/BV.
 *
 * IL PUNTO DIDATTICO: non tutti i multipli sono enterprise-based, e non tutti i
 * multipli enterprise-based trattano l'EBITDA come una proxy di cassa affidabile
 * cosi' com'e'.
 *
 * EV/(EBITDA-Capex) resta enterprise-based (EV al numeratore), ma corregge il
 * denominatore: in un business capital-intensive l'EBITDA da solo sovrastima la
 * cassa realmente generabile, perche' ignora il capex ricorrente necessario solo
 * per mantenere in piedi l'attivo esistente (manutenzione impianti, rinnovo
 * flotta, ...). Sottrarre il capex ricorrente dall'EBITDA prima di dividere
 * avvicina il denominatore a un proxy di free cash flow operativo, ed e' per
 * questo che il multiplo che ne risulta e' SEMPRE piu' alto di EV/EBITDA (stesso
 * numeratore, denominatore piu' piccolo) — esattamente la stessa logica gia'
 * incontrata con EV/EBIT nel livello precedente, applicata qui al capex invece
 * che al D&A.
 *
 * P/E e P/BV sono invece EQUITY-based: numeratore e denominatore sono entrambi
 * "sotto la linea del debito" (prezzo per azione, non EV; utile netto o
 * patrimonio netto, non EBITDA o EBIT). Questo cambia cosa il multiplo puo' e
 * non puo' fare:
 *  - P/E confronta aziende SOLO se la loro struttura del capitale (la leva) e'
 *    comparabile: l'utile netto e' gia' al netto degli oneri finanziari, quindi
 *    due aziende identiche a livello operativo ma con leva diversa avranno P/E
 *    diversi per un motivo che non ha a che fare col business;
 *  - P/BV ignora del tutto la capacita' reddituale e guarda il valore contabile
 *    del patrimonio netto: e' la metrica giusta per banche e assicurazioni, dove
 *    l'EBITDA non esiste nemmeno come concetto (il "prodotto" e' un bilancio
 *    fatto di attivi e passivi finanziari, non un conto economico industriale) e
 *    il valore dell'attivo e' l'ancora di prezzo piu' difendibile.
 *
 * Tutti i dati (EV, EBITDA, Capex, prezzo per azione, EPS, valore contabile per
 * azione) arrivano gia' pronti come DATO bloccato: il lavoro di questo livello e'
 * scegliere denominatore e formula giusti, non ricostruire i dati stessi.
 */

import {
  defineTemplate,
  colonna,
  eur,
  eurM,
  foglio,
  hint,
  multiplo,
  par,
  pct,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { SECTORS, ebitdaMargin, evEbitdaMultiple, growthRate, revenue } from '../../../rng/finance';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

/** Output di una formula che restituisce un multiplo: nero, "x". */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };
/** Input battuto a mano su valori per azione: blu, due decimali. */
const STILE_INPUT_PERAZIONE: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0.00' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EV = 'B4'; // Enterprise Value di mercato (dato, bloccato)
const B_EBITDA = 'B5'; // EBITDA (dato, bloccato)
const B_CAPEX = 'B6'; // Capex ricorrente annuo, sempre < EBITDA (dato, bloccato)

const B_PREZZO = 'B9'; // Prezzo corrente per azione (dato, bloccato)
const B_EPS = 'B10'; // Utile netto per azione (dato, bloccato)
const B_BVPS = 'B11'; // Valore contabile del patrimonio netto per azione (dato, bloccato)

const B_MULT_EVCAPEX = 'B14'; // T1
const B_MULT_PE = 'B15'; // T2
const B_MULT_PBV = 'B16'; // T3

export default defineTemplate({
  id: 'M5-05-MULTIPLI2',
  module: 'M5',
  title: 'EV/(EBITDA-Capex), P/E e P/BV: quando ciascuno serve',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['comps.multiples'],
  prerequisites: ['M5-04-MULTIPLI1'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Profilo settoriale, stesso meccanismo del livello precedente. -----
    const sector = r.pick(SECTORS);
    const ricavi = revenue(r);
    const margin = ebitdaMargin(r, sector);
    const ebitda = roundTo(ricavi * margin, 1000);
    const growth = growthRate(r, sector);
    const evEbitda = evEbitdaMultiple(r, sector, growth, margin);
    const ev = roundTo(ebitda * evEbitda, 1000);

    // --- Capex ricorrente: sempre < EBITDA per costruzione. La frazione va
    // da 15% (business asset-light) a 50% (business capital-intensive): il
    // pavimento a 1.000 evita che l'arrotondamento a mille faccia collassare
    // il capex a zero per le comparable piu' piccole, il tetto a 50% garantisce
    // che EBITDA - Capex resti sempre ampiamente positivo, qualunque seed. ---
    const capexFrazione = triangular(r, 0.15, 0.3, 0.5);
    const capex = Math.max(roundTo(ebitda * capexFrazione, 1000), 1000);
    const ebitdaMenoCapex = ebitda - capex;
    const multEvCapex = ev / ebitdaMenoCapex;

    // --- Dati equity-based: stream indipendente, non correlati ai dati
    // operativi sopra (un prezzo di mercato e un EBITDA non "si parlano"
    // dentro questo livello, esattamente come non lo fanno in un vero comp
    // set finche' qualcuno non li mette in rapporto). Si generano prezzo e
    // due multipli impliciti plausibili, da cui si ricavano EPS e BVPS: cosi'
    // il prezzo per azione resta sempre un numero "rotondo" come lo scrive un
    // analista, mentre EPS e BVPS restano sempre positivi per costruzione. ---
    const rEquity = rng.fork('equity');
    const prezzo = roundTo(triangular(rEquity, 8, 28, 90), 0.05);
    const peImplicito = triangular(rEquity, 7, 14, 26);
    const eps = roundTo(prezzo / peImplicito, 0.01);
    const pbvImplicito = triangular(rEquity, 0.5, 1.3, 3.5);
    const bvps = roundTo(prezzo / pbvImplicito, 0.01);

    const multPE = prezzo / eps;
    const multPBV = prezzo / bvps;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_MULT_EVCAPEX} calcola il multiplo EV/(EBITDA-Capex): dividi l'Enterprise Value ` +
        `(${B_EV}) per l'EBITDA (${B_EBITDA}) MENO il Capex ricorrente annuo (${B_CAPEX}). Formula: ` +
        'EV / (EBITDA - Capex). Resta un multiplo enterprise-based (EV resta al numeratore), ma corregge ' +
        "il denominatore: in un business capital-intensive l'EBITDA da solo sovrastima la cassa " +
        "realmente generabile, perche' ignora il capex ricorrente che serve solo a mantenere in piedi " +
        "l'attivo esistente, non a crescere. Sottrarlo avvicina il denominatore a un proxy di free " +
        "cash flow operativo — e siccome il denominatore cosi' e' PIU' PICCOLO dell'EBITDA puro, questo " +
        "multiplo esce SEMPRE piu' alto di EV/EBITDA, per lo stesso motivo per cui EV/EBIT era piu' " +
        "alto di EV/EBITDA nel livello precedente.",
      target: `Model!${B_MULT_EVCAPEX}`,
      atteso: multEvCapex,
      referenzia: [B_EV, B_EBITDA, B_CAPEX],
      senzaLiteral: [],
      skills: ['comps.multiples'],
      minKeystrokes: 12,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_MULT_PE} calcola il multiplo P/E: dividi il prezzo corrente per azione (${B_PREZZO}) ` +
        `per l'utile netto per azione, EPS (${B_EPS}). Formula: Prezzo / EPS. E' il primo multiplo di ` +
        "questo livello che NON e' enterprise-based: numeratore e denominatore sono entrambi \"sotto " +
        "la linea del debito\" (il prezzo per azione riflette l'equity value, non l'EV; l'utile netto " +
        "e' gia' al netto degli oneri finanziari). Per questo il P/E confronta bene due aziende SOLO se " +
        "hanno una struttura del capitale comparabile: a parita' di business operativo, un'azienda piu' " +
        "indebitata ha un utile netto piu' basso (piu' interessi) e un equity value piu' basso (piu' " +
        "debito da togliere all'EV). Il P/E si muove, in su o in giu', per un motivo che non racconta " +
        "nulla sul business — solo sulla sua leva.",
      target: `Model!${B_MULT_PE}`,
      atteso: multPE,
      referenzia: [B_PREZZO, B_EPS],
      senzaLiteral: [],
      skills: ['comps.multiples'],
      minKeystrokes: 8,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In ${B_MULT_PBV} calcola il multiplo P/BV: dividi il prezzo corrente per azione (${B_PREZZO}) ` +
        `per il valore contabile del patrimonio netto per azione, BVPS (${B_BVPS}). Formula: Prezzo / ` +
        "BVPS. E' tipico di banche e assicurazioni, dove l'EBITDA non esiste nemmeno come concetto " +
        "utile: il \"prodotto\" di un istituto finanziario e' un bilancio fatto di attivi e passivi " +
        "finanziari, non un margine operativo industriale, quindi la capacita' reddituale conta meno " +
        "del valore contabile degli asset che la genera. Il valore contabile del patrimonio netto " +
        "diventa l'ancora di prezzo piu' difendibile.",
      target: `Model!${B_MULT_PBV}`,
      atteso: multPBV,
      referenzia: [B_PREZZO, B_BVPS],
      senzaLiteral: [],
      skills: ['comps.multiples'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M5-05-MULTIPLI2',
      seed: rng.seed,
      brief: [
        '## EV/(EBITDA-Capex), P/E e P/BV: quando ciascuno serve',
        '',
        "Non tutti i multipli sono enterprise-based, e non tutti i multipli enterprise-based " +
          "trattano l'EBITDA come una proxy di cassa affidabile cosi' com'e'.",
        '',
        "**EV/(EBITDA-Capex)** resta enterprise-based (EV al numeratore), ma corregge il denominatore " +
          "sottraendo il capex ricorrente annuo dall'EBITDA prima di dividere. In un business " +
          "capital-intensive l'EBITDA da solo sovrastima la cassa realmente generabile: ignora il capex " +
          "che serve solo a mantenere in piedi l'attivo esistente, non a crescere. Il denominatore cosi' " +
          "corretto e' piu' piccolo dell'EBITDA puro, quindi il multiplo esce SEMPRE piu' alto di " +
          "EV/EBITDA — la stessa logica di EV/EBIT, applicata qui al capex invece che al D&A.",
        '',
        "**P/E** = prezzo per azione / utile netto per azione (EPS). E' **equity-based**: numeratore e " +
          "denominatore sono entrambi calcolati DOPO gli oneri finanziari, non prima come per i " +
          "multipli enterprise-based. Confronta bene due aziende solo se la loro struttura del capitale " +
          "e' comparabile: a leva diversa, l'utile netto — e quindi il P/E — si muove per un motivo che " +
          "non ha a che fare con la qualita' del business.",
        '',
        "**P/BV** = prezzo per azione / valore contabile del patrimonio netto per azione (BVPS). E' " +
          "tipico di banche e assicurazioni: per un istituto finanziario l'EBITDA non e' un concetto " +
          "utile, e il valore dell'attivo — non la capacita' reddituale — e' l'ancora di prezzo piu' " +
          "difendibile.",
        '',
        `**I dati enterprise-based.** Una comparable quotata del settore ${sector} (crescita attesa ` +
          `${pct(growth)}, margine EBITDA ${pct(margin)}) ha un Enterprise Value di mercato di ` +
          `${eurM(ev)}, EBITDA di ${eurM(ebitda)} e un Capex ricorrente annuo di ${eurM(capex)}.`,
        '',
        `**I dati equity-based.** La stessa comparable tratta a un prezzo di mercato di ` +
          `${eur(prezzo, 2)} per azione, con un utile netto per azione di ${eur(eps, 2)} e un valore ` +
          `contabile del patrimonio netto per azione di ${eur(bvps, 2)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['EV/(EBITDA-Capex), P/E e P/BV'], { style: STILE_TITOLO }),
            riga('A3', ['Dati enterprise-based della comparable'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Enterprise Value di mercato, €',
                'EBITDA, €',
                'Capex ricorrente annuo, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EV, content: ev, style: STILE_INPUT, locked: true },
              { ref: B_EBITDA, content: ebitda, style: STILE_INPUT, locked: true },
              { ref: B_CAPEX, content: capex, style: STILE_INPUT, locked: true },
            ],

            riga('A8', ['Dati equity-based della comparable'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'Prezzo corrente per azione, €',
                'Utile netto per azione (EPS), €',
                'Valore contabile patrimonio netto per azione (BVPS), €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_PREZZO, content: prezzo, style: STILE_INPUT_PERAZIONE, locked: true },
              { ref: B_EPS, content: eps, style: STILE_INPUT_PERAZIONE, locked: true },
              { ref: B_BVPS, content: bvps, style: STILE_INPUT_PERAZIONE, locked: true },
            ],

            riga('A13', ['Multipli'], { style: STILE_TITOLO }),
            colonna(
              'A14',
              [
                'EV/(EBITDA-Capex), x',
                'P/E, x',
                'P/BV, x',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_MULT_EVCAPEX, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_MULT_PE, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_MULT_PBV, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
          ],
          { colWidths: { A: 340, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_EV}/(${B_EBITDA}-${B_CAPEX}): EV su EBITDA meno Capex (qui vale ${multiplo(multEvCapex)}) — ` +
            "piu' alto di EV/EBITDA perche' il denominatore e' piu' piccolo.",
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_PREZZO}/${B_EPS}: prezzo per azione su EPS (qui vale ${multiplo(multPE)}). Ricorda: e' ` +
            "equity-based, non enterprise-based — sensibile alla leva.",
          10,
          'T2',
        ),
        hint(
          'H3',
          `=${B_PREZZO}/${B_BVPS}: prezzo per azione su valore contabile per azione (qui vale ` +
            `${multiplo(multPBV)}) — la metrica giusta quando l'EBITDA non e' un concetto utile.`,
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_MULT_EVCAPEX}`,
    };
  },
});
