/**
 * M7 · 07 — WACC: la media ponderata del costo del capitale.
 *
 * Il FCFF (M7-01..03) si sconta al WACC (Weighted Average Cost of Capital), il
 * costo "medio" di tutto il capitale che finanzia l'azienda — non solo
 * l'equity (Ke, M7-04 e M7-06), ma anche il debito. Questo livello mette
 * insieme i due pezzi.
 *
 * IL PUNTO DIDATTICO — il debito costa MENO del suo tasso nominale
 *
 * Gli interessi passivi sul debito sono deducibili dalle imposte: pagare
 * interessi riduce l'utile imponibile, quindi riduce le imposte dovute. Il
 * costo "vero" del debito per l'azienda non e' il tasso nominale Kd che paga
 * ai creditori, ma quel tasso al netto dello scudo fiscale che genera:
 *
 *   Kd after-tax = Kd × (1 - aliquota)
 *
 * Il Ke (costo del capitale proprio, gia' pronto da M7-06) NON ha un
 * equivalente scudo fiscale: i dividendi pagati agli azionisti non sono
 * deducibili. Per questo il WACC pesa Ke al lordo, ma il debito SOLO dopo
 * averlo depurato dello scudo fiscale:
 *
 *   WACC = Ke × peso equity + Kd after-tax × peso debito
 *
 * I pesi (E/(D+E) e D/(D+E), che sommano a 1) sono la struttura di capitale
 * TARGET dell'azienda — quanto del suo capitale complessivo e' finanziato da
 * equity contro quanto da debito — non la struttura storica o quella di un
 * singolo istante: e' lo stesso concetto di "target" gia' incontrato nel D/E
 * target del beta di Hamada (M7-05).
 *
 * Errore didattico principale da intercettare: usare Kd (il tasso nominale
 * pre-tax) direttamente in T2 invece del Kd after-tax calcolato in T1. E'
 * l'errore piu' comune e il piu' subdolo, perche' il numero risultante resta
 * plausibile (un WACC leggermente piu' alto del vero) — per questo T2 obbliga
 * esplicitamente il riferimento alla cella di T1 (mustReference) e il prompt
 * lo ribadisce due volte.
 *
 * Geometria fissa: nessuna riga dipende dal seed, i riferimenti di cella sono
 * letterali per costruzione, come negli altri livelli M7.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  pct,
  riga,
  STILE_ETICHETTA,
  STILE_INPUT_PCT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const STILE_FORMULA_PCT: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0%' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_KE = 'B4'; // Ke aggiustato per il rischio paese (dato, bloccato — risultato concettuale di M7-06)
const B_KD = 'B5'; // Kd: costo del debito PRE-tasse (dato, bloccato)
const B_TAX = 'B6'; // Aliquota fiscale, fissa 24% (dato, bloccato)
const B_WE = 'B7'; // Peso equity E/(D+E), struttura target (dato, bloccato)
const B_WD = 'B8'; // Peso debito D/(D+E) = 1 - peso equity (dato, bloccato)

const B_KD_AT = 'B11'; // T1: costo del debito DOPO le imposte
const B_WACC = 'B12'; // T2: WACC

const TAX_RATE = 0.24;

export default defineTemplate({
  id: 'M7-07-WACC',
  module: 'M7',
  get title() {
    return tx('M7-07-WACC.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['dcf.wacc'],
  prerequisites: ['M7-05-BETAHAMADA', 'M7-06-COUNTRYRISK'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Ke aggiustato per il rischio paese: 9%-16%, moda 11% — il risultato
    // concettuale di M7-06, qui ridato come dato bloccato (nessuna cella live
    // condivisa fra template diversi).
    const ke = roundTo(triangular(r, 0.09, 0.11, 0.16), 0.001);

    // Kd pre-tax: 4%-6%, moda 5% — un costo del debito tipico per
    // un'azienda mid-market con un profilo di credito solido.
    const kd = roundTo(triangular(r, 0.04, 0.05, 0.06), 0.001);

    // Peso equity E/(D+E): 0,55-0,75, moda 0,65 — una struttura target
    // moderatamente equity-heavy, il caso piu' comune fuori dall'LBO.
    const weEquity = roundTo(triangular(r, 0.55, 0.65, 0.75), 0.01);
    const weDebt = roundTo(1 - weEquity, 0.01);

    const kdAfterTax = kd * (1 - TAX_RATE);
    const wacc = ke * weEquity + kdAfterTax * weDebt;

    // NB: entrambi i task sono costruiti a mano (non con taskFormula) per
    // stringere la tolleranza del check 'value', per lo stesso motivo degli
    // altri livelli M7 (04, 05, 06). La tolleranza di default di taskFormula
    // ('hybrid', pavimento assoluto 0,01) e' un intero punto percentuale:
    // enorme rispetto alla scala di questi risultati (Kd after-tax 3-5%, WACC
    // 6-13%). Con quel pavimento formule strutturalmente SBAGLIATE — es. usare
    // l'aliquota da sola invece di (1 - aliquota) in T1, o usare Kd pre-tax al
    // posto di Kd after-tax in T2 — restano spesso vicine al valore corretto e
    // verrebbero accettate per errore. mustReference e mustNotContainLiteral
    // non bastano da sole: l'argine strutturale principale e' il check
    // 'value' con tolleranza stretta.
    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M7-07-WACC.2', { B_KD_AT, B_KD, B_TAX }),
      targetCell: `Model!${B_KD_AT}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: kdAfterTax,
          tolerance: 0.0001,
          toleranceMode: 'absolute',
          message:
            tx('M7-07-WACC.3'),
        },
        { kind: 'mustReference', cells: [B_KD, B_TAX] },
        { kind: 'mustNotContainLiteral', except: [1] },
      ],
      skills: ['dcf.wacc'],
      minKeystrokes: 12,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M7-07-WACC.4', { B_WACC, B_KE, B_WE, B_KD_AT, B_WD, B_KD }),
      targetCell: `Model!${B_WACC}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: wacc,
          tolerance: 0.0001,
          toleranceMode: 'absolute',
          message:
            tx('M7-07-WACC.5', { B_KD_AT, B_KD }),
        },
        { kind: 'mustReference', cells: [B_KE, B_KD_AT, B_WE, B_WD] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['dcf.wacc'],
      minKeystrokes: 20,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M7-07-WACC',
      seed: rng.seed,
      brief: [tx('M7-07-WACC.6', { p0: pct(ke, 2), p1: pct(kd, 2), p2: pct(TAX_RATE, 0), p3: pct(weEquity, 0), p4: pct(weDebt, 0) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-07-WACC.7')], { style: STILE_TITOLO }),
            riga('A3', [tx('M7-07-WACC.17')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M7-07-WACC.8'),
                tx('M7-07-WACC.9'),
                tx('M7-07-WACC.10'),
                tx('M7-07-WACC.11'),
                tx('M7-07-WACC.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_KE, content: ke, style: STILE_INPUT_PCT, locked: true },
              { ref: B_KD, content: kd, style: STILE_INPUT_PCT, locked: true },
              { ref: B_TAX, content: TAX_RATE, style: STILE_INPUT_PCT, locked: true },
              { ref: B_WE, content: weEquity, style: STILE_INPUT_PCT, locked: true },
              { ref: B_WD, content: weDebt, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A10', [tx('M7-07-WACC.13')], { style: STILE_TITOLO }),
            colonna(
              'A11',
              [tx('M7-07-WACC.14'), tx('M7-07-WACC.18')],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_KD_AT, content: null, locked: false, style: STILE_FORMULA_PCT },
              { ref: B_WACC, content: null, locked: false, style: STILE_FORMULA_PCT },
            ],
          ],
          { colWidths: { A: 320, B: 120 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M7-07-WACC.15', { B_KD, B_TAX, p2: pct(kdAfterTax, 2) }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M7-07-WACC.16', { B_KE, B_WE, B_KD_AT, B_WD, p4: pct(wacc, 2) }),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_KD_AT}`,
    };
  },
});
