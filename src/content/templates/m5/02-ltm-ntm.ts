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
 * un'anomalia da correggere: e' il motivo per cui, quando si valuta un target
 * in forte crescita, si preferisce ancorarsi a NTM. Il multiplo LTM
 * "sconta" — cioe' applica un moltiplicatore di mercato pensato per un
 * profilo di rischio/crescita — a una base che il mercato ha gia' superato:
 * usarlo per un target che sta crescendo velocemente sottostimerebbe quanto
 * il mercato sia disposto a pagare OGGI per quella traiettoria.
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
  title: 'LTM vs NTM: quale base per il multiplo',
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
        `In ${B_MULT_LTM} calcola il multiplo EV/EBITDA su base LTM: dividi l'Enterprise Value ` +
        `(${B_EV}) per l'EBITDA LTM (${B_EBITDA_LTM}), i dodici mesi REALMENTE gia' osservati. ` +
        'Formula: EV / EBITDA LTM.',
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
        `In ${B_MULT_NTM} calcola lo STESSO multiplo, ma su base NTM (Next Twelve Months): dividi ` +
        `lo stesso Enterprise Value (${B_EV}) per l'EBITDA NTM stimato da consensus (${B_EBITDA_NTM}), ` +
        "non per l'EBITDA LTM. Formula: EV / EBITDA NTM. Il risultato deve uscire PIU' BASSO del " +
        `multiplo LTM che hai appena calcolato in ${B_MULT_LTM}: stesso EV al numeratore, ma un ` +
        "denominatore piu' alto (l'EBITDA che il mercato SI ASPETTA fra un anno, per un business in " +
        "crescita, e' maggiore di quello gia' osservato) abbassa aritmeticamente il rapporto. E' per " +
        "questo che, per valutare un target in forte crescita, si preferisce ancorarsi a NTM: il " +
        "multiplo LTM applicherebbe il prezzo di mercato a una base storica che la crescita ha gia' " +
        'superato, sottostimando quanto il mercato sia disposto a pagare oggi per quella traiettoria.',
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
      brief: [
        '## LTM vs NTM: quale base per il multiplo',
        '',
        "Lo stesso Enterprise Value, diviso per due basi di EBITDA diverse, produce due multipli " +
          "diversi. **LTM** (*Last Twelve Months*, gia' visto in M2) e' la base REALMENTE osservata: " +
          "dodici mesi di storia gia' accaduta. **NTM** (*Next Twelve Months*) e' invece una STIMA " +
          "forward-looking, tipicamente presa dal consensus degli analisti che seguono il titolo.",
        '',
        "Per un business in crescita l'EBITDA NTM e' sistematicamente **PIU' ALTO** dell'EBITDA LTM: " +
          "la stessa azienda, un anno dopo, ha semplicemente prodotto di piu'. Con lo STESSO EV al " +
          "numeratore, un denominatore piu' alto produce un multiplo NTM sistematicamente **PIU' " +
          "BASSO** del multiplo LTM.",
        '',
        "Non e' un'anomalia da correggere: e' il motivo per cui, quando si valuta un target in forte " +
          "crescita, si preferisce ancorarsi a NTM. Il multiplo LTM applica il prezzo che il mercato " +
          "riconosce OGGI a una base storica che la crescita ha gia' superato — usarlo per un business " +
          "che sta accelerando sottostimerebbe quanto il mercato sia disposto a pagare per quella " +
          "traiettoria.",
        '',
        `**I dati.** Una comparable quotata del settore ${sector} (crescita media di settore attesa ` +
          `${pct(growth)}, margine EBITDA ${pct(margin)}) ha un Enterprise Value di mercato di ` +
          `${eurM(ev)}. Il suo EBITDA LTM e' ${eurM(ebitdaLtm)}; il consensus di mercato stima per ` +
          `QUESTA comparable un EBITDA NTM di ${eurM(ebitdaNtm)}, piu' alto dell'LTM: gli analisti ` +
          "che la seguono si aspettano che superi la media di settore appena citata nei prossimi " +
          'dodici mesi.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['LTM vs NTM: quale base per il multiplo'], { style: STILE_TITOLO }),
            riga('A3', ['Dati di mercato della comparable'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Enterprise Value di mercato, €',
                'EBITDA LTM (ultimi 12 mesi realmente osservati), €',
                'EBITDA NTM (stima consensus, prossimi 12 mesi), €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EV, content: ev, style: STILE_INPUT, locked: true },
              { ref: B_EBITDA_LTM, content: ebitdaLtm, style: STILE_INPUT, locked: true },
              { ref: B_EBITDA_NTM, content: ebitdaNtm, style: STILE_INPUT, locked: true },
            ],

            riga('A8', ['Multipli EV/EBITDA'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'EV/EBITDA su base LTM, x',
                'EV/EBITDA su base NTM, x',
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
          `=${B_EV}/${B_EBITDA_LTM}: EV su EBITDA LTM (qui vale ${multiplo(multiploLtm)}).`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_EV}/${B_EBITDA_NTM}: stesso EV, ma diviso per l'EBITDA NTM (qui vale ` +
            `${multiplo(multiploNtm)}) — piu' basso del multiplo LTM perche' il denominatore e' ` +
            "maggiore.",
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_MULT_LTM}`,
    };
  },
});
