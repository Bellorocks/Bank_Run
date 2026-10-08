/**
 * M7 · 01 — FCFF vs FCFE: due flussi, due tassi di sconto.
 *
 * Primo livello del modulo DCF. Introduce la distinzione fra i due flussi di
 * cassa che si possono scontare in una valutazione:
 *
 *   - FCFF (Free Cash Flow to Firm): il flusso disponibile per TUTTI i
 *     finanziatori dell'azienda, debito ED equity insieme, PRIMA del
 *     servizio del debito. Si sconta al WACC (il costo medio ponderato di
 *     tutte le fonti di capitale) — il WACC arriva nei livelli successivi di
 *     questo modulo, qui non si sconta ancora nulla.
 *   - FCFE (Free Cash Flow to Equity): il flusso che resta ai SOLI azionisti,
 *     DOPO aver pagato gli interessi e rimborsato (o incassato) debito. Si
 *     sconta al costo del capitale proprio (Ke), MAI al WACC.
 *
 * IL PUNTO PIU' IMPORTANTE DEL LIVELLO — ripetuto nel brief e nel prompt di
 * T2: scontare l'FCFE al WACC e' l'errore classico. Il WACC e' una media fra
 * costo del debito (piu' basso, perche' il debito e' meno rischioso per chi
 * lo presta) e costo dell'equity (piu' alto). L'FCFE e' un flusso che spetta
 * SOLO agli azionisti, quindi il suo rischio e' quello dell'equity levered,
 * non una media col debito: scontarlo al WACC usa un tasso troppo BASSO per
 * il suo rischio vero, e quindi SOVRASTIMA il valore dell'equity.
 *
 * DERIVAZIONE ALGEBRICA DEI DUE TASK, calcolata in forma chiusa nel
 * generate() (non un placeholder):
 *
 *   T1  FCFF = EBIT * (1 - aliquota) + D&A - Capex - ΔNWC
 *   T2  FCFE = FCFF - Interessi passivi netti * (1 - aliquota) - Rimborso netto di debito
 *
 * CONVENZIONI DI SEGNO:
 *   - ΔNWC: stessa convenzione stabilita in M3-03 (skill nwc.fcf-impact,
 *     prerequisito di questo livello) — positiva = il NWC e' aumentato, ha
 *     ASSORBITO cassa, quindi si sottrae. Puo' essere negativa (NWC che
 *     libera cassa): sottrarre un negativo la restituisce.
 *   - Interessi passivi netti: sempre un costo, sempre positivi come dato;
 *     nel calcolo dell'FCFE si applica loro lo scudo fiscale (si tassano
 *     "in meno", esattamente come l'EBIT) prima di sottrarli, perche' sono
 *     gia' un costo DEDOTTO ai fini fiscali (a differenza di Capex e ΔNWC,
 *     che sono voci di cassa, non di Conto Economico, e quindi non hanno
 *     scudo fiscale proprio).
 *   - Rimborso netto di debito: positivo = l'azienda ha rimborsato piu'
 *     debito di quanto ne abbia acceso nell'anno, riducendo la cassa
 *     disponibile per gli azionisti. Si sottrae sempre.
 *
 * Aliquota fiscale FISSA al 24% (dato di legge italiano, IRES post-2017: mai
 * randomizzata, coerente con m1/09-imposte.ts). Tutti gli altri input sono
 * generati come multipli di 1.000, quindi ogni prodotto per l'aliquota resta
 * un numero esatto in virgola: non serve una tolleranza allargata.
 *
 * Geometria fissa: nessuna riga dipende dal seed, quindi i riferimenti di
 * cella sono letterali per costruzione, come in M3-03 e M1-09.
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
const B_EBIT = 'B4'; // EBIT dell'anno (dato, bloccato)
const B_ALIQ = 'B5'; // Aliquota fiscale, fissa 24% (dato, bloccato)
const B_DA = 'B6'; // Ammortamenti (D&A) dell'anno (dato, bloccato)
const B_CAPEX = 'B7'; // Capex dell'anno (dato, bloccato)
const B_DNWC = 'B8'; // ΔNWC dell'anno, gia' con segno (dato, bloccato)
const B_INT = 'B9'; // Interessi passivi netti dell'anno (dato, bloccato)
const B_RIMB = 'B10'; // Rimborso netto di debito dell'anno (dato, bloccato)

const B_FCFF = 'B14'; // T1
const B_FCFE = 'B15'; // T2

const ALIQUOTA_FISCALE = 0.24; // dato di legge, non randomizzato

export default defineTemplate({
  id: 'M7-01-FCFFFCFE',
  module: 'M7',
  get title() {
    return tx('M7-01-FCFFFCFE.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['dcf.fcff-fcfe'],
  prerequisites: ['M3-03-NWCEFCF'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBIT: un valore plausibile per una mid-cap, in migliaia.
    const ebit = r.int(2000, 8000) * 1000;

    // D&A e Capex: range indipendenti, entrambi positivi.
    const da = r.int(300, 1200) * 1000;
    const capex = r.int(400, 1800) * 1000;

    // ΔNWC: puo' essere positiva (assorbe cassa) o negativa (ne libera),
    // esattamente come in M3-03 — non ha un segno fisso fra un seed e l'altro.
    const deltaNWC = r.int(-400, 500) * 1000;

    // Interessi passivi netti: sempre un costo, range indipendente.
    const interessi = r.int(100, 600) * 1000;

    // Rimborso netto di debito: positivo, riduce la cassa per l'equity.
    const rimborsoDebito = r.int(100, 800) * 1000;

    // Valori attesi, calcolati con la STESSA algebra dei due task.
    const fcff = ebit * (1 - ALIQUOTA_FISCALE) + da - capex - deltaNWC;
    const fcfe = fcff - interessi * (1 - ALIQUOTA_FISCALE) - rimborsoDebito;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M7-01-FCFFFCFE.2', { B_FCFF, B_EBIT, B_ALIQ, B_DA, B_CAPEX, B_DNWC }),
      target: `Model!${B_FCFF}`,
      atteso: fcff,
      referenzia: [B_EBIT, B_ALIQ, B_DA, B_CAPEX, B_DNWC],
      senzaLiteral: [1],
      skills: ['dcf.fcff-fcfe'],
      minKeystrokes: 28,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M7-01-FCFFFCFE.3', { B_FCFE, B_FCFF, B_INT, B_ALIQ, B_RIMB }),
      target: `Model!${B_FCFE}`,
      atteso: fcfe,
      referenzia: [B_FCFF, B_INT, B_ALIQ, B_RIMB],
      senzaLiteral: [1],
      skills: ['dcf.fcff-fcfe'],
      minKeystrokes: 22,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M7-01-FCFFFCFE',
      seed: rng.seed,
      brief: [tx('M7-01-FCFFFCFE.4', { p0: eur(ebit), p1: pct(ALIQUOTA_FISCALE), p2: eur(da), p3: eur(capex), p4: eur(deltaNWC), p5: eur(interessi), p6: eur(rimborsoDebito) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-01-FCFFFCFE.5')], { style: STILE_TITOLO }),

            riga('A3', [tx('M7-01-FCFFFCFE.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M7-01-FCFFFCFE.7'),
                tx('M7-01-FCFFFCFE.8'),
                tx('M7-01-FCFFFCFE.9'),
                tx('M7-01-FCFFFCFE.10'),
                tx('M7-01-FCFFFCFE.11'),
                tx('M7-01-FCFFFCFE.12'),
                tx('M7-01-FCFFFCFE.13'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBIT, content: ebit, style: STILE_INPUT, locked: true },
              { ref: B_ALIQ, content: ALIQUOTA_FISCALE, style: STILE_INPUT_PCT, locked: true },
              { ref: B_DA, content: da, style: STILE_INPUT, locked: true },
              { ref: B_CAPEX, content: capex, style: STILE_INPUT, locked: true },
              { ref: B_DNWC, content: deltaNWC, style: STILE_INPUT, locked: true },
              { ref: B_INT, content: interessi, style: STILE_INPUT, locked: true },
              { ref: B_RIMB, content: rimborsoDebito, style: STILE_INPUT, locked: true },
            ],

            riga('A13', [tx('M7-01-FCFFFCFE.14')], { style: STILE_TITOLO }),
            colonna(
              'A14',
              [tx('M7-01-FCFFFCFE.15'), tx('M7-01-FCFFFCFE.16')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_FCFF, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_FCFE, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M7-01-FCFFFCFE.h1', { B_EBIT, B_ALIQ, B_DA, B_CAPEX, B_DNWC }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M7-01-FCFFFCFE.17', { B_FCFF, B_INT, B_ALIQ, B_RIMB }),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_FCFF}`,
    };
  },
});
