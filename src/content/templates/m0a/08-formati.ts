/**
 * M0-A · 08 — Il vestito del numero: formati di base.
 *
 * Punto didattico: il FORMATO non cambia il numero salvato in cella, cambia solo
 * come Excel lo disegna. E' la stessa idea di `xl.percentages` (0,18 mostrato
 * come 18%) allargata alle altre due vesti che si incontrano in ogni modello:
 * la valuta (due decimali, simbolo €) e il numero con separatore delle migliaia.
 *
 * Tre righe indipendenti, tre task. Ogni task e' prima di tutto un task di
 * FORMULA (mustBeFormula + value), e in piu' il check `numberFormat`: il
 * formato e' il contenuto del livello, quindi si verifica a qualunque rank.
 * Le celle di risposta partono in formato Generale.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_TITOLO,
  eur,
  num,
  pct,
} from '../../authoring';
import { revenue, ebitdaMargin, SECTORS } from '../../../rng/finance';
import { DEFAULT_FORMATS } from '../../../engine/numberFormat';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

import { sectorName, tx } from '../../../i18n/content';
// Stili locali: gli input qui hanno decimali (centesimi, chilogrammi con due
// cifre) che gli stili standard di authoring.ts non prevedono, quindi si
// costruiscono ad hoc sulla stessa convenzione (blu = input, nero = formula).
const STILE_INPUT_VALUTA: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: DEFAULT_FORMATS.valuta };
const STILE_INPUT_NUM2: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: DEFAULT_FORMATS.numero2dec };
// Le celle di risposta partono SENZA formato (Generale): il formato e' proprio
// cio' che il giocatore deve applicare, e il check lo verifica.
const STILE_LIBERA: CellStyle = { fontColor: MODEL_COLORS.formula };

export default defineTemplate({
  id: 'M0A-08-FORMATI',
  module: 'M0-A',
  get title() {
    return tx('M0A-08-FORMATI.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.numfmt', 'xl.percentages'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');
    const sector = r.pick(SECTORS);

    // --- Blocco 1: ricavi, da formattare in valuta -------------------------
    const ricaviItalia = revenue(r) + r.int(0, 99) / 100;
    const quotaEstero = 0.15 + r.next() * 0.35;
    const ricaviEstero = Math.round(ricaviItalia * quotaEstero) + r.int(0, 99) / 100;
    const ricaviTotali = ricaviItalia + ricaviEstero;

    // --- Blocco 2: margine, da formattare in percentuale --------------------
    const ricaviMargine = revenue(r);
    const margineObiettivo = ebitdaMargin(r, sector);
    const ebitda = Math.round(ricaviMargine * margineObiettivo);
    const margineAtteso = ebitda / ricaviMargine;

    // --- Blocco 3: quantita', da formattare col separatore delle migliaia --
    const lottoA = r.int(1200, 8600) + r.int(0, 99) / 100;
    const lottoB = r.int(600, 5200) + r.int(0, 99) / 100;
    const quantitaTotale = lottoA + lottoB;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M0A-08-FORMATI.2'),
      target: 'Model!B5',
      atteso: ricaviTotali,
      referenzia: ['B3', 'B4'],
      senzaLiteral: [],
      skills: ['xl.numfmt'],
      minKeystrokes: 8,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M0A-08-FORMATI.3'),
      target: 'Model!B9',
      atteso: margineAtteso,
      referenzia: ['B7', 'B8'],
      senzaLiteral: [],
      skills: ['xl.percentages', 'xl.numfmt'],
      minKeystrokes: 8,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M0A-08-FORMATI.4'),
      target: 'Model!B13',
      atteso: quantitaTotale,
      referenzia: ['B11', 'B12'],
      senzaLiteral: [],
      skills: ['xl.numfmt'],
      minKeystrokes: 10,
    });

    const tasks: Task[] = [
      {
        ...t1,
        check: [
          ...t1.check,
          {
            kind: 'numberFormat' as const,
            expected: DEFAULT_FORMATS.valuta,
            message:
              tx('M0A-08-FORMATI.5'),
          },
        ],
      },
      {
        ...t2,
        check: [
          ...t2.check,
          {
            kind: 'numberFormat' as const,
            expected: DEFAULT_FORMATS.percentuale,
            message:
              tx('M0A-08-FORMATI.6'),
          },
        ],
      },
      {
        ...t3,
        check: [
          ...t3.check,
          {
            kind: 'numberFormat' as const,
            expected: DEFAULT_FORMATS.numero2dec,
            message:
              tx('M0A-08-FORMATI.7'),
          },
        ],
      },
    ];

    return {
      templateId: 'M0A-08-FORMATI',
      seed: rng.seed,
      brief: [tx('M0A-08-FORMATI.8', { sector: sectorName(sector), p1: eur(ricaviItalia, 2), p2: eur(ricaviEstero, 2), p3: eur(ebitda), p4: eur(ricaviMargine), p5: num(margineAtteso, 4), p6: pct(margineAtteso, 0), p7: num(lottoA, 2), p8: num(lottoB, 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0A-08-FORMATI.9')], { style: STILE_TITOLO }),
            blocco('A3', [[tx('M0A-08-FORMATI.10')], [tx('M0A-08-FORMATI.11')], [tx('M0A-08-FORMATI.12')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('B3', [[ricaviItalia], [ricaviEstero]], { style: STILE_INPUT_VALUTA }),
            blocco('A7', [[tx('M0A-08-FORMATI.13')], [tx('M0A-08-FORMATI.14')], [tx('M0A-08-FORMATI.15')]], { style: STILE_ETICHETTA }),
            blocco('B7', [[ebitda], [ricaviMargine]], { style: STILE_INPUT_VALUTA }),
            blocco('A11', [[tx('M0A-08-FORMATI.16')], [tx('M0A-08-FORMATI.17')], [tx('M0A-08-FORMATI.18')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('B11', [[lottoA], [lottoB]], { style: STILE_INPUT_NUM2 }),
            [
              { ref: 'B5', content: null, locked: false, style: STILE_LIBERA },
              { ref: 'B9', content: null, locked: false, style: STILE_LIBERA },
              { ref: 'B13', content: null, locked: false, style: STILE_LIBERA },
            ],
          ],
          { colWidths: { A: 220, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M0A-08-FORMATI.19'), 8, 'T1'),
        hint(
          'H2',
          tx('M0A-08-FORMATI.20'),
          8,
          'T2',
        ),
        hint('H3', tx('M0A-08-FORMATI.21'), 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: 'Model!B5',
    };
  },
});
