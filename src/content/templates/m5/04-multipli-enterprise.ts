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
  title: 'I tre multipli enterprise-based: EBITDA, EBIT, Sales',
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
        `In ${B_MULT_EBITDA} calcola il multiplo EV/EBITDA: dividi l'Enterprise Value (${B_EV}) per ` +
        `l'EBITDA (${B_EBITDA}). E' il multiplo enterprise-based piu' usato: l'EBITDA e' la metrica ` +
        "operativa piu' vicina alla generazione di cassa prima della struttura finanziaria e delle " +
        'politiche di ammortamento. Formula: EV / EBITDA.',
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
        `In ${B_MULT_EBIT} calcola il multiplo EV/EBIT: dividi lo STESSO Enterprise Value (${B_EV}) ` +
        `per l'EBIT (${B_EBIT}), non per l'EBITDA. Formula: EV / EBIT. Attenzione alla direzione del ` +
        "risultato: l'EBIT e' SEMPRE minore dell'EBITDA (EBIT = EBITDA - D&A, e il D&A e' un costo " +
        "reale anche se non monetario), quindi a parita' di EV dividere per un numero piu' piccolo " +
        `produce un multiplo PIU' ALTO — l'opposto di quello che ci si aspetterebbe per analogia con ` +
        "LTM/NTM, dove il denominatore piu' grande abbassa il multiplo. Qui la relazione fra le due " +
        "metriche e' dettata dalla contabilita', non dal mercato, e va sempre nella stessa direzione.",
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
        `In ${B_MULT_SALES} calcola il multiplo EV/Sales: dividi l'Enterprise Value (${B_EV}) per i ` +
        `Ricavi (${B_RICAVI}). Formula: EV / Ricavi. Questo multiplo torna utile quando l'EBITDA non ` +
        "e' un denominatore affidabile — un'azienda ancora in perdita operativa (EBITDA negativo o " +
        "vicino a zero rende EV/EBITDA privo di senso) o con un EBITDA troppo volatile da un anno " +
        "all'altro per essere un ancoraggio stabile. I Ricavi, la riga piu' in alto del conto " +
        "economico, sono la metrica meno soggetta a queste distorsioni.",
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
      brief: [
        '## I tre multipli enterprise-based',
        '',
        "Un multiplo di mercato e' un rapporto fra un VALORE e una METRICA operativa. L'Enterprise " +
          "Value (EV) sta \"sopra la linea del debito\": non tiene conto di come l'azienda e' " +
          "finanziata, quindi si accoppia solo a metriche anch'esse calcolate PRIMA degli oneri " +
          "finanziari — **enterprise-based**, appunto. I tre piu' comuni sono EV/EBITDA, EV/EBIT ed " +
          'EV/Sales: stesso EV al numeratore, tre denominatori diversi.',
        '',
        "**EV/EBITDA** e' lo standard: l'EBITDA e' la metrica operativa piu' vicina alla generazione " +
          "di cassa, prima di ammortamenti, oneri finanziari e imposte.",
        '',
        "**EV/EBIT** usa l'EBIT, cioe' l'EBITDA al netto di D&A (ammortamenti e svalutazioni). " +
          "L'EBIT e' SEMPRE minore dell'EBITDA — il D&A e' un costo contabile reale, anche se non " +
          "movimenta cassa — quindi, a parita' di EV, EV/EBIT esce SEMPRE PIU' ALTO di EV/EBITDA. E' " +
          "il contrario di quello che l'intuizione (allenata su LTM/NTM, dove denominatore piu' " +
          "grande vuol dire multiplo piu' basso) suggerirebbe: li' il denominatore piu' grande viene " +
          "dal mercato che si aspetta crescita, qui il denominatore piu' piccolo viene da una regola " +
          "contabile fissa, e la direzione della relazione non dipende mai dal caso specifico.",
        '',
        "**EV/Sales** usa i Ricavi. E' il multiplo di ultima istanza: torna utile quando l'EBITDA " +
          "non e' un denominatore affidabile, per un'azienda ancora in perdita operativa o con un " +
          "EBITDA troppo volatile da un anno all'altro.",
        '',
        `**I dati.** Una comparable quotata del settore ${sector} (crescita attesa ${pct(growth)}, ` +
          `margine EBITDA ${pct(margin)}) ha un Enterprise Value di mercato di ${eurM(ev)}, Ricavi ` +
          `di ${eurM(ricavi)}, EBITDA di ${eurM(ebitda)} ed EBIT di ${eurM(ebit)} (D&A di ${eurM(da)}).`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['I tre multipli enterprise-based'], { style: STILE_TITOLO }),
            riga('A3', ['Dati di mercato della comparable'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Enterprise Value di mercato, €',
                'EBITDA, €',
                'EBIT (EBITDA - D&A), €',
                'Ricavi, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EV, content: ev, style: STILE_INPUT, locked: true },
              { ref: B_EBITDA, content: ebitda, style: STILE_INPUT, locked: true },
              { ref: B_EBIT, content: ebit, style: STILE_INPUT, locked: true },
              { ref: B_RICAVI, content: ricavi, style: STILE_INPUT, locked: true },
            ],

            riga('A9', ['Multipli enterprise-based'], { style: STILE_TITOLO }),
            colonna(
              'A10',
              [
                'EV/EBITDA, x',
                'EV/EBIT, x',
                'EV/Sales, x',
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
          `=${B_EV}/${B_EBITDA}: EV su EBITDA (qui vale ${multiplo(multEvEbitda)}).`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_EV}/${B_EBIT}: stesso EV, ma diviso per l'EBIT (qui vale ${multiplo(multEvEbit)}) — ` +
            "piu' alto del multiplo EV/EBITDA perche' il denominatore e' piu' piccolo, non piu' grande.",
          10,
          'T2',
        ),
        hint(
          'H3',
          `=${B_EV}/${B_RICAVI}: EV su Ricavi (qui vale ${multiplo(multEvSales)}) — il piu' basso dei ` +
            "tre, perche' i Ricavi sono la metrica piu' grande al denominatore.",
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${B_MULT_EBITDA}`,
    };
  },
});
