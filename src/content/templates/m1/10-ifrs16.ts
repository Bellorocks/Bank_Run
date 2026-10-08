/**
 * M1 · 10 — IFRS 16: il leasing entra in bilancio.
 *
 * Con IFRS 16 il leasing operativo genera una passivita' finanziaria pari al
 * VALORE ATTUALE dei canoni futuri, scontati al tasso di finanziamento
 * marginale (IBR), e un diritto d'uso (right-of-use) di pari importo. Il
 * canone sparisce dai costi operativi ed e' sostituito da:
 *
 *   ammortamento del ROU  = passivita' iniziale / durata   (lineare)
 *   interessi anno 1      = passivita' iniziale × IBR
 *
 * entrambi sotto la riga EBITDA. Conseguenze, che sono il punto del livello:
 *   - l'EBITDA sale esattamente del canone;
 *   - il primo anno il costo totale (ammortamento + interessi) SUPERA il
 *     canone: l'utile ante imposte scende (effetto front-loading), perche' gli
 *     interessi si calcolano su un debito che all'inizio e' al massimo.
 *
 * Canoni posticipati (pagati a fine anno), nessun costo diretto iniziale.
 */

import {
  defineTemplate,
  foglio,
  colonna,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
  eur,
  pct,
} from '../../authoring';

import { tx } from '../../../i18n/content';
const B_CANONE = 'B4';
const B_DURATA = 'B5';
const B_IBR = 'B6';

const B_PASSIVITA = 'B9'; // T1
const B_AMMORT = 'B10'; // T2
const B_INTERESSI = 'B11'; // T3
const B_EFFETTO_EBITDA = 'B12'; // T4
const B_EFFETTO_UTILE = 'B13'; // T5

export default defineTemplate({
  id: 'M1-10-IFRS16',
  module: 'M1',
  get title() {
    return tx('M1-10-IFRS16.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 330,
  skills: ['acc.ifrs16'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const canone = r.int(30, 200) * 1000;
    const durata = r.int(4, 10);
    const ibr = r.int(30, 70) / 1000;

    const passivita = (canone * (1 - Math.pow(1 + ibr, -durata))) / ibr;
    const ammort = passivita / durata;
    const interessi = passivita * ibr;
    const effettoEbitda = canone;
    const effettoUtile = canone - ammort - interessi;

    const t = (
      id: string,
      target: string,
      prompt: string,
      atteso: number,
      referenzia: string[],
      ammessi: number[],
      minKeystrokes: number,
    ) =>
      taskFormula({
        id,
        prompt,
        target: `Model!${target}`,
        atteso,
        referenzia,
        senzaLiteral: ammessi,
        skills: ['acc.ifrs16'],
        minKeystrokes,
      });

    const tasks = [
      t(
        'T1',
        B_PASSIVITA,
        tx('M1-10-IFRS16.2', { B_PASSIVITA }),
        passivita,
        [B_CANONE, B_DURATA, B_IBR],
        [0, 1],
        18,
      ),
      t(
        'T2',
        B_AMMORT,
        tx('M1-10-IFRS16.3', { B_AMMORT }),
        ammort,
        [B_PASSIVITA, B_DURATA],
        [],
        8,
      ),
      t(
        'T3',
        B_INTERESSI,
        tx('M1-10-IFRS16.4', { B_INTERESSI }),
        interessi,
        [B_PASSIVITA, B_IBR],
        [],
        8,
      ),
      t(
        'T4',
        B_EFFETTO_EBITDA,
        tx('M1-10-IFRS16.5', { B_EFFETTO_EBITDA }),
        effettoEbitda,
        [B_CANONE],
        [],
        3,
      ),
      t(
        'T5',
        B_EFFETTO_UTILE,
        tx('M1-10-IFRS16.6', { B_EFFETTO_UTILE }),
        effettoUtile,
        [B_CANONE, B_AMMORT, B_INTERESSI],
        [],
        12,
      ),
    ];

    return {
      templateId: 'M1-10-IFRS16',
      seed: rng.seed,
      brief: [tx('M1-10-IFRS16.7', { p0: eur(canone), durata, p2: pct(ibr) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M1-10-IFRS16.8')], { style: STILE_TITOLO }),
            riga('A3', [tx('M1-10-IFRS16.19'), tx('M1-10-IFRS16.20')], { style: STILE_TITOLO }),
            colonna('A4', [tx('M1-10-IFRS16.9'), tx('M1-10-IFRS16.10'), tx('M1-10-IFRS16.11')], {
              style: STILE_ETICHETTA,
            }),
            [{ ref: B_CANONE, content: canone, locked: true, style: STILE_INPUT }],
            [{ ref: B_DURATA, content: durata, locked: true, style: { ...STILE_INPUT, numFmt: '0' } }],
            [{ ref: B_IBR, content: ibr, locked: true, style: STILE_INPUT_PCT }],
            riga('A8', [tx('M1-10-IFRS16.12'), '€'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M1-10-IFRS16.13'),
                tx('M1-10-IFRS16.14'),
                tx('M1-10-IFRS16.15'),
                tx('M1-10-IFRS16.16'),
                tx('M1-10-IFRS16.17'),
              ],
              { style: STILE_ETICHETTA },
            ),
            ...[B_PASSIVITA, B_AMMORT, B_INTERESSI, B_EFFETTO_EBITDA].map((ref) => [
              { ref, content: null, locked: false, style: STILE_FORMULA },
            ]),
            [{ ref: B_EFFETTO_UTILE, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 420, B: 150 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M1-10-IFRS16.h1', { B_IBR, B_DURATA, B_CANONE }), 12, 'T1'),
        hint('H2', `=${B_PASSIVITA}/${B_DURATA}`, 8, 'T2'),
        hint('H3', `=${B_PASSIVITA}*${B_IBR}`, 8, 'T3'),
        hint('H4', tx('M1-10-IFRS16.18', { B_CANONE }), 8, 'T4'),
        hint('H5', `=${B_CANONE}-${B_AMMORT}-${B_INTERESSI}`, 8, 'T5'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!${B_PASSIVITA}`,
    };
  },
});
