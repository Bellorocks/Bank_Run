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

import { sectorName, tx } from '../../../i18n/content';
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
  get title() {
    return tx('M5-05-MULTIPLI2.title');
  },
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
        tx('M5-05-MULTIPLI2.2', { B_MULT_EVCAPEX, B_EV, B_EBITDA, B_CAPEX }),
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
        tx('M5-05-MULTIPLI2.3', { B_MULT_PE, B_PREZZO, B_EPS }),
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
        tx('M5-05-MULTIPLI2.4', { B_MULT_PBV, B_PREZZO, B_BVPS }),
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
      brief: [tx('M5-05-MULTIPLI2.5', { sector: sectorName(sector), p1: pct(growth), p2: pct(margin), p3: eurM(ev), p4: eurM(ebitda), p5: eurM(capex), p6: eur(prezzo, 2), p7: eur(eps, 2), p8: eur(bvps, 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M5-05-MULTIPLI2.15')], { style: STILE_TITOLO }),
            riga('A3', [tx('M5-05-MULTIPLI2.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M5-05-MULTIPLI2.7'),
                tx('M5-05-MULTIPLI2.16'),
                tx('M5-05-MULTIPLI2.8'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EV, content: ev, style: STILE_INPUT, locked: true },
              { ref: B_EBITDA, content: ebitda, style: STILE_INPUT, locked: true },
              { ref: B_CAPEX, content: capex, style: STILE_INPUT, locked: true },
            ],

            riga('A8', [tx('M5-05-MULTIPLI2.9')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M5-05-MULTIPLI2.10'),
                tx('M5-05-MULTIPLI2.11'),
                tx('M5-05-MULTIPLI2.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_PREZZO, content: prezzo, style: STILE_INPUT_PERAZIONE, locked: true },
              { ref: B_EPS, content: eps, style: STILE_INPUT_PERAZIONE, locked: true },
              { ref: B_BVPS, content: bvps, style: STILE_INPUT_PERAZIONE, locked: true },
            ],

            riga('A13', [tx('M5-05-MULTIPLI2.17')], { style: STILE_TITOLO }),
            colonna(
              'A14',
              [
                tx('M5-05-MULTIPLI2.18'),
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
          tx('M5-05-MULTIPLI2.h1', { B_EV, B_EBITDA, B_CAPEX, p0: multiplo(multEvCapex) }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M5-05-MULTIPLI2.13', { B_PREZZO, B_EPS, p2: multiplo(multPE) }),
          10,
          'T2',
        ),
        hint(
          'H3',
          tx('M5-05-MULTIPLI2.14', { B_PREZZO, B_BVPS, p2: multiplo(multPBV) }),
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_MULT_EVCAPEX}`,
    };
  },
});
