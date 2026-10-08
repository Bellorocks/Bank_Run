/**
 * M5 · 04 — I tre multipli enterprise-based: EBITDA, EBIT, Sales.
 *
 * IL PUNTO DIDATTICO: un multiplo di mercato e' sempre un rapporto fra un
 * VALORE (qui l'Enterprise Value, che sta "sopra la linea del debito" e per
 * questo si accoppia solo a metriche anch'esse enterprise-based, prima degli
 * oneri finanziari) e una METRICA operativa. Cambiare la metrica al
 * denominatore, a parita' di EV, cambia il multiplo — e capire IN CHE
 * DIREZIONE cambia, e perche', e' cio' che questo livello allena.
 *
 * EBIT = EBITDA - D&A (ammortamenti e svalutazioni): a parita' di EV, dividere
 * per un denominatore piu' PICCOLO (EBIT < EBITDA, sempre, perche' il D&A e'
 * un costo reale anche se non monetario) produce un multiplo EV/EBIT
 * sistematicamente PIU' ALTO di EV/EBITDA. E' l'errore piu' comune di chi
 * incontra questi multipli per la prima volta: si aspetta il contrario, per
 * analogia con LTM/NTM dove denominatore piu' grande = multiplo piu' basso.
 * Qui la relazione fra le due metriche (EBIT sempre minore di EBITDA per
 * costruzione contabile, non per un fatto di mercato) va nella direzione
 * opposta, e va spiegata esplicitamente, non lasciata dedurre per analogia.
 *
 * EV/Sales usa il fatturato, la metrica meno vicina al valore ma la piu'
 * difficile da manipolare: torna utile quando l'EBITDA non e' un denominatore
 * affidabile, tipicamente un'azienda ancora in perdita operativa (EBITDA
 * negativo o vicino a zero, multiplo privo di senso) o con un EBITDA molto
 * volatile da un anno all'altro.
 *
 * I quattro dati (EV, EBITDA, EBIT, Ricavi) arrivano gia' pronti come DATO
 * bloccato: il livello precedente (M5-03, se esistesse nel curriculum) o il
 * team di ricerca li ha gia' raccolti da bilancio e quotazione. Qui il lavoro
 * e' scegliere la metrica giusta al denominatore per lo scopo giusto, non
 * ricostruire i dati stessi.
 */

import {
  defineTemplate,
  colonna,
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

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EV = 'B4'; // Enterprise Value di mercato (dato, bloccato)
const B_EBITDA = 'B5'; // EBITDA (dato, bloccato)
const B_EBIT = 'B6'; // EBIT = EBITDA - D&A, sempre < EBITDA (dato, bloccato)
const B_RICAVI = 'B7'; // Ricavi, sempre > EBITDA (dato, bloccato)

const B_MULT_EBITDA = 'B10'; // T1
const B_MULT_EBIT = 'B11'; // T2
const B_MULT_SALES = 'B12'; // T3

export default defineTemplate({
  id: 'M5-04-MULTIPLI1',
  module: 'M5',
  get title() {
    return tx('M5-04-MULTIPLI1.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 280,
  skills: ['comps.multiples'],
  prerequisites: ['M5-01-SELEZIONEPEER'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Profilo settoriale della comparable: stesso meccanismo di
    // rng/finance.ts gia' usato altrove nel modulo, per ottenere un EV, un
    // EBITDA e un Fatturato plausibili e coerenti fra loro. --------------
    const sector = r.pick(SECTORS);
    const ricavi = revenue(r);
    const margin = ebitdaMargin(r, sector);
    const ebitda = roundTo(ricavi * margin, 1000);
    const growth = growthRate(r, sector);
    const evEbitda = evEbitdaMultiple(r, sector, growth, margin);
    const ev = roundTo(ebitda * evEbitda, 1000);

    // --- EBIT: sempre < EBITDA per costruzione, perche' D&A e' un costo
    // reale (anche se non monetario) che si sottrae fra i due. La frazione
    // di D&A sull'EBITDA varia fra il 10% (business asset-light) e il 45%
    // (business capital-intensive), mai a zero: il punto didattico richiede
    // che EBIT < EBITDA sia SEMPRE vero, non un caso fra tanti. Il pavimento
    // a 1.000 evita che l'arrotondamento a mille faccia collassare D&A a
    // zero per le comparable piu' piccole. ---------------------------------
    const daFrazione = triangular(r, 0.1, 0.22, 0.45);
    const da = Math.max(roundTo(ebitda * daFrazione, 1000), 1000);
    const ebit = ebitda - da;

    // Ricavi > EBITDA e' garantito per costruzione: EBITDA = Ricavi * margine,
    // e ogni margine di MARGIN_BOUNDS e' sempre < 1 (max 0,35 nel software).

    const multEvEbitda = ev / ebitda;
    const multEvEbit = ev / ebit;
    const multEvSales = ev / ricavi;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M5-04-MULTIPLI1.2', { B_MULT_EBITDA, B_EV, B_EBITDA }),
      target: `Model!${B_MULT_EBITDA}`,
      atteso: multEvEbitda,
      referenzia: [B_EV, B_EBITDA],
      senzaLiteral: [],
      skills: ['comps.multiples'],
      minKeystrokes: 8,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M5-04-MULTIPLI1.3', { B_MULT_EBIT, B_EV, B_EBIT }),
      target: `Model!${B_MULT_EBIT}`,
      atteso: multEvEbit,
      referenzia: [B_EV, B_EBIT],
      senzaLiteral: [],
      skills: ['comps.multiples'],
      minKeystrokes: 8,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M5-04-MULTIPLI1.4', { B_MULT_SALES, B_EV, B_RICAVI }),
      target: `Model!${B_MULT_SALES}`,
      atteso: multEvSales,
      referenzia: [B_EV, B_RICAVI],
      senzaLiteral: [],
      skills: ['comps.multiples'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M5-04-MULTIPLI1',
      seed: rng.seed,
      brief: [tx('M5-04-MULTIPLI1.5', { sector: sectorName(sector), p1: pct(growth), p2: pct(margin), p3: eurM(ev), p4: eurM(ricavi), p5: eurM(ebitda), p6: eurM(ebit), p7: eurM(da) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M5-04-MULTIPLI1.6')], { style: STILE_TITOLO }),
            riga('A3', [tx('M5-04-MULTIPLI1.7')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M5-04-MULTIPLI1.8'),
                tx('M5-04-MULTIPLI1.13'),
                tx('M5-04-MULTIPLI1.9'),
                tx('M5-04-MULTIPLI1.14'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EV, content: ev, style: STILE_INPUT, locked: true },
              { ref: B_EBITDA, content: ebitda, style: STILE_INPUT, locked: true },
              { ref: B_EBIT, content: ebit, style: STILE_INPUT, locked: true },
              { ref: B_RICAVI, content: ricavi, style: STILE_INPUT, locked: true },
            ],

            riga('A9', [tx('M5-04-MULTIPLI1.10')], { style: STILE_TITOLO }),
            colonna(
              'A10',
              [
                tx('M5-04-MULTIPLI1.15'),
                tx('M5-04-MULTIPLI1.16'),
                tx('M5-04-MULTIPLI1.17'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_MULT_EBITDA, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_MULT_EBIT, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_MULT_SALES, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
          ],
          { colWidths: { A: 260, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M5-04-MULTIPLI1.h1', { B_EV, B_EBITDA, p0: multiplo(multEvEbitda) }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M5-04-MULTIPLI1.11', { B_EV, B_EBIT, p2: multiplo(multEvEbit) }),
          10,
          'T2',
        ),
        hint(
          'H3',
          tx('M5-04-MULTIPLI1.12', { B_EV, B_RICAVI, p2: multiplo(multEvSales) }),
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${B_MULT_EBITDA}`,
    };
  },
});
