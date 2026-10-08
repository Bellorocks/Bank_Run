/**
 * M5 · 02 — LTM vs NTM: quale base per quale scopo.
 *
 * IL PUNTO DIDATTICO: lo stesso Enterprise Value di una comparable, diviso per
 * due basi di EBITDA diverse, produce due multipli diversi. LTM (Last Twelve
 * Months, gia' insegnato in M2-10) e' la base REALMENTE osservata: dodici mesi
 * di storia gia' accaduta. NTM (Next Twelve Months) e' invece una STIMA
 * forward-looking, tipicamente presa dal consensus degli analisti che
 * seguono il titolo.
 *
 * Per un business in crescita l'EBITDA NTM e' sistematicamente PIU' ALTO
 * dell'EBITDA LTM (la stessa azienda, un anno dopo, vale di piu' se cresce).
 * Con lo STESSO EV al numeratore, un denominatore piu' alto produce un
 * multiplo NTM sistematicamente PIU' BASSO del multiplo LTM. Questo non e'
 * un'anomalia da correggere: il multiplo LTM di un'azienda in crescita
 * sembra "caro" solo perche' il denominatore e' vecchio. La regola che conta
 * e' la coerenza: un multiplo NTM si applica a un EBITDA NTM, un LTM a un
 * LTM. Mescolarli (multiplo LTM dei peer su EBITDA NTM del target, o
 * viceversa) gonfia o sgonfia la valutazione di tutta la crescita di un anno.
 *
 * Il file NON ricalcola l'LTM come somma FY + H1 - H1 (quello e' l'oggetto di
 * M2-10): qui LTM e NTM sono entrambi DATI bloccati, gia' pronti, perche' il
 * punto didattico di QUESTO livello e' la scelta della base per il multiplo,
 * non la sua ricostruzione contabile.
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
/** Output di una formula che restituisce un multiplo (es. EV/EBITDA): nero, "x". */
const STILE_FORMULA_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0x' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EV = 'B4'; // Enterprise Value di mercato della comparable (dato, bloccato)
const B_EBITDA_LTM = 'B5'; // EBITDA LTM (dato, bloccato)
const B_EBITDA_NTM = 'B6'; // EBITDA NTM stimato da consensus (dato, bloccato)

const B_MULT_LTM = 'B9'; // T1
const B_MULT_NTM = 'B10'; // T2

export default defineTemplate({
  id: 'M5-02-LTMNTM',
  module: 'M5',
  get title() {
    return tx('M5-02-LTMNTM.title');
  },
  rank: 1,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['comps.ltm-ntm'],
  prerequisites: ['M2-10-LTM'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Profilo settoriale della comparable: serve solo a generare un EV e
    // un EBITDA LTM plausibili e coerenti fra loro (stesso meccanismo di
    // rng/finance.ts usato altrove nel curriculum). ------------------------
    const sector = r.pick(SECTORS);
    const revenueLtm = revenue(r);
    const margin = ebitdaMargin(r, sector);
    const growth = growthRate(r, sector);
    const ebitdaLtm = roundTo(revenueLtm * margin, 1000);
    const evEbitda = evEbitdaMultiple(r, sector, growth, margin);
    const ev = roundTo(ebitdaLtm * evEbitda, 1000);

    // --- EBITDA NTM: sistematicamente PIU' ALTO dell'LTM per una comparable
    // in crescita. Uso lo stesso tasso di crescita di settore gia' generato,
    // ma forzo un fattore minimo per garantire che NTM > LTM sempre (anche
    // nei settori/seed con crescita di settore vicina allo zero): il punto
    // didattico richiede che il caso "NTM piu' alto" sia SEMPRE quello
    // generato, non un caso fra tanti. La moda passata a `triangular` va
    // anche CLAMPATA al bound superiore (settore software arriva a growth
    // 0,45, che spingerebbe la moda a 1,45 contro un max di 1,35 — altrimenti
    // `triangular` lancia "la moda deve stare dentro [min, max]"). ---------
    const fattoreCrescitaNtm = triangular(r, 1.04, Math.min(1.0 + Math.max(growth, 0.06), 1.35), 1.35);
    const ebitdaNtm = roundTo(ebitdaLtm * Math.max(fattoreCrescitaNtm, 1.04), 1000);

    const multiploLtm = ev / ebitdaLtm;
    const multiploNtm = ev / ebitdaNtm;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M5-02-LTMNTM.2', { B_MULT_LTM, B_EV, B_EBITDA_LTM }),
      target: `Model!${B_MULT_LTM}`,
      atteso: multiploLtm,
      referenzia: [B_EV, B_EBITDA_LTM],
      senzaLiteral: [],
      skills: ['comps.ltm-ntm'],
      minKeystrokes: 8,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M5-02-LTMNTM.3', { B_MULT_NTM, B_EV, B_EBITDA_NTM, B_MULT_LTM }),
      target: `Model!${B_MULT_NTM}`,
      atteso: multiploNtm,
      referenzia: [B_EV, B_EBITDA_NTM],
      senzaLiteral: [],
      skills: ['comps.ltm-ntm'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M5-02-LTMNTM',
      seed: rng.seed,
      brief: [tx('M5-02-LTMNTM.4', { sector: sectorName(sector), p1: pct(growth), p2: pct(margin), p3: eurM(ev), p4: eurM(ebitdaLtm), p5: eurM(ebitdaNtm) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M5-02-LTMNTM.5')], { style: STILE_TITOLO }),
            riga('A3', [tx('M5-02-LTMNTM.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M5-02-LTMNTM.7'),
                tx('M5-02-LTMNTM.8'),
                tx('M5-02-LTMNTM.9'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EV, content: ev, style: STILE_INPUT, locked: true },
              { ref: B_EBITDA_LTM, content: ebitdaLtm, style: STILE_INPUT, locked: true },
              { ref: B_EBITDA_NTM, content: ebitdaNtm, style: STILE_INPUT, locked: true },
            ],

            riga('A8', [tx('M5-02-LTMNTM.10')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M5-02-LTMNTM.11'),
                tx('M5-02-LTMNTM.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_MULT_LTM, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
            [{ ref: B_MULT_NTM, content: null, locked: false, style: STILE_FORMULA_MULTIPLO }],
          ],
          { colWidths: { A: 440, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M5-02-LTMNTM.h1', { B_EV, B_EBITDA_LTM, p0: multiplo(multiploLtm) }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M5-02-LTMNTM.13', { B_EV, B_EBITDA_NTM, p2: multiplo(multiploNtm) }),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_MULT_LTM}`,
    };
  },
});
