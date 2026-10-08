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

import { tx } from '../../../i18n/content';
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
  get title() {
    return tx('M7-02-COSTRUZIONEFCF.title');
  },
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
        tx('M7-02-COSTRUZIONEFCF.2', { B_EBIT, B_EBITDA, B_DA }),
      target: `Model!${B_EBIT}`,
      atteso: ebit,
      referenzia: [B_EBITDA, B_DA],
      skills: ['dcf.build-fcf'],
      minKeystrokes: 12,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M7-02-COSTRUZIONEFCF.3', { B_NOPAT, B_EBIT, B_ALIQ }),
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
        tx('M7-02-COSTRUZIONEFCF.4', { B_FCFF, B_NOPAT, B_DA, B_CAPEX, B_DNWC }),
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
      brief: [tx('M7-02-COSTRUZIONEFCF.5', { p0: eur(ebitda), p1: eur(da), p2: pct(ALIQUOTA_FISCALE), p3: eur(capex), p4: eur(deltaNWC) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-02-COSTRUZIONEFCF.6')], { style: STILE_TITOLO }),

            riga('A3', [tx('M7-02-COSTRUZIONEFCF.7')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M7-02-COSTRUZIONEFCF.8'),
                tx('M7-02-COSTRUZIONEFCF.9'),
                tx('M7-02-COSTRUZIONEFCF.10'),
                tx('M7-02-COSTRUZIONEFCF.11'),
                tx('M7-02-COSTRUZIONEFCF.12'),
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

            riga('A11', [tx('M7-02-COSTRUZIONEFCF.13')], { style: STILE_TITOLO }),
            colonna(
              'A12',
              [tx('M7-02-COSTRUZIONEFCF.18'), tx('M7-02-COSTRUZIONEFCF.14'), tx('M7-02-COSTRUZIONEFCF.15')],
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
        hint('H1', tx('M7-02-COSTRUZIONEFCF.16', { B_EBITDA, B_DA }), 10, 'T1'),
        hint('H2', tx('M7-02-COSTRUZIONEFCF.17', { B_EBIT, B_ALIQ }), 10, 'T2'),
        hint(
          'H3',
          tx('M7-02-COSTRUZIONEFCF.h3', { B_NOPAT, B_DA, B_CAPEX, B_DNWC }),
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_EBIT}`,
    };
  },
});
