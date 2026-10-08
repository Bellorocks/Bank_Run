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
  title: 'WACC: la media ponderata del costo del capitale',
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
        `In ${B_KD_AT} calcola il costo del debito DOPO le imposte: il costo del debito pre-tax ` +
        `(${B_KD}) moltiplicato per (1 - aliquota fiscale) (${B_TAX}). ` +
        'Formula: Kd after-tax = Kd × (1 - aliquota). Gli interessi passivi sul debito sono ' +
        "deducibili dalle imposte: pagarli riduce l'utile imponibile, quindi riduce le imposte " +
        "dovute. Il costo \"vero\" del debito per l'azienda e' percio' piu' basso del tasso nominale " +
        "che paga ai creditori — questo e' lo scudo fiscale (tax shield). Usa le due celle date, " +
        'senza copiare i numeri a mano.',
      targetCell: `Model!${B_KD_AT}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: kdAfterTax,
          tolerance: 0.0001,
          toleranceMode: 'absolute',
          message:
            'Il valore non torna: controlla che tu stia moltiplicando Kd per (1 - aliquota), non ' +
            "per l'aliquota da sola (e non per (1 + aliquota)).",
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
        `In ${B_WACC} calcola il WACC: la media ponderata fra il costo del capitale proprio ` +
        `(${B_KE}) pesato per il peso equity (${B_WE}) e il costo del debito DOPO le imposte appena ` +
        `calcolato in T1 (${B_KD_AT}) pesato per il peso debito (${B_WD}). ` +
        'Formula: WACC = Ke × peso equity + Kd after-tax × peso debito. ' +
        `IMPORTANTE: usa ${B_KD_AT} (il costo del debito DOPO le imposte, calcolato in T1), NON ` +
        `${B_KD} (il tasso Kd nominale PRIMA delle imposte) — lo scudo fiscale sugli interessi ` +
        "riduce il costo effettivo del debito per l'azienda, e il WACC deve pesare quel costo vero, " +
        "non quello lordo. Il Ke, al contrario, entra senza aggiustamenti: i dividendi pagati agli " +
        "azionisti non sono deducibili, quindi l'equity non ha un equivalente scudo fiscale. Usa le " +
        'quattro celle date, senza copiare i numeri a mano.',
      targetCell: `Model!${B_WACC}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: wacc,
          tolerance: 0.0001,
          toleranceMode: 'absolute',
          message:
            'Il valore non torna: controlla che tu stia usando il costo del debito DOPO le imposte ' +
            `(${B_KD_AT}, da T1) e non Kd pre-tax (${B_KD}) direttamente, e che tu stia pesando Ke ` +
            'per il peso equity e Kd after-tax per il peso debito (non il contrario).',
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
      brief: [
        '## WACC: la media ponderata del costo del capitale',
        '',
        "Il FCFF si sconta al WACC (Weighted Average Cost of Capital): il costo medio di TUTTO il " +
          "capitale che finanzia l'azienda, non solo l'equity. E' una media ponderata fra il costo " +
          'del capitale proprio (Ke, gia\' pronto da M7-06) e il costo del debito — ma il debito entra ' +
          'DOPO un aggiustamento fiscale.',
        '',
        '**Perche\' il debito costa MENO del suo tasso nominale.** Gli interessi passivi sul debito ' +
          "sono deducibili dalle imposte: pagarli riduce l'utile imponibile, quindi riduce le imposte " +
          "dovute. Il costo \"vero\" del debito per l'azienda non e' il tasso Kd che paga ai " +
          'creditori, ma quel tasso al netto di questo scudo fiscale (tax shield):',
        '',
        '> **Kd after-tax = Kd × (1 - aliquota)**',
        '',
        "Il Ke non ha un equivalente: i dividendi pagati agli azionisti non sono deducibili, quindi " +
          "l'equity non genera nessuno scudo fiscale. Per questo il WACC pesa Ke al lordo, ma il " +
          'debito solo DOPO averlo depurato:',
        '',
        '> **WACC = Ke × peso equity + Kd after-tax × peso debito**',
        '',
        "I pesi (E/(D+E) e D/(D+E), che sommano sempre a 1) sono la struttura di capitale TARGET " +
          "dell'azienda — quanta parte del capitale complessivo e' finanziata da equity contro " +
          'quanta da debito.',
        '',
        `**I dati**, gia' pronti come assunzioni: Ke aggiustato per il rischio paese (M7-06) ` +
          `${pct(ke, 2)}, costo del debito pre-tax (Kd) ${pct(kd, 2)}, aliquota fiscale ` +
          `${pct(TAX_RATE, 0)}, peso equity target E/(D+E) ${pct(weEquity, 0)}, peso debito target ` +
          `D/(D+E) ${pct(weDebt, 0)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['WACC: la media ponderata del costo del capitale'], { style: STILE_TITOLO }),
            riga('A3', ['Assunzioni'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Ke aggiustato per il rischio paese (M7-06)',
                'Kd: costo del debito pre-tax',
                'Aliquota fiscale',
                'Peso equity target E/(D+E)',
                'Peso debito target D/(D+E)',
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

            riga('A10', ['Costo del debito e WACC'], { style: STILE_TITOLO }),
            colonna(
              'A11',
              ['Kd dopo le imposte (after-tax)', 'WACC'],
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
          `=${B_KD}*(1-${B_TAX}): Kd pre-tax moltiplicato per (1 - aliquota) (qui vale ` +
            `${pct(kdAfterTax, 2)}).`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_KE}*${B_WE}+${B_KD_AT}*${B_WD}: Ke per il peso equity, piu' il Kd after-tax (non ` +
            `Kd pre-tax) per il peso debito (qui vale ${pct(wacc, 2)}).`,
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_KD_AT}`,
    };
  },
});
