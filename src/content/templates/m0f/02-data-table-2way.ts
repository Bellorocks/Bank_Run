/**
 * M0-F · 02 — La matrice a due variabili (Data Table 2 vie, in attesa del motore).
 *
 * NOTA DI IMPLEMENTAZIONE, stesso limite di M0B-06-NAMEDRANGES: HyperFormula non
 * espone la Data Table di Excel (ne' a una ne' a due vie — vedi `GridSession` in
 * `src/game/session.ts`, nessun comando la implementa), quindi non esiste un modo
 * per registrare "cella di input riga" / "cella di input colonna" ne' un `Check`
 * che le verifichi. Il livello insegna il CONCETTO con gli strumenti che il
 * motore ha davvero: una matrice di formule esplicite, una per cella, con lo
 * stesso ancoraggio misto di M0A-05-ANCORAGGI (il prerequisito) esteso a due
 * dimensioni invece che a una riga sola. Il brief spiega cosa farebbe la vera
 * Data Table 2 vie e perche' il risultato — a schermo — e' identico.
 *
 * Perche' proprio WACC × g: e' la sensitivity table che chiude ogni DCF vero
 * (anticipa M7, skill `dcf.sensitivity`), il primo posto dove un IC vero smette
 * di fidarsi di un solo numero. Qui il "valore implicito" e' la perpetuita' di
 * Gordon semplificata, V = FCF×(1+g)/(WACC−g): basta a mostrare la stessa cosa
 * che mostrerebbe un DCF completo, senza costruire lo stack di sconto (fuori
 * scope per M0-F, arriva in M7).
 *
 * Geometria fissa, nessuno shuffle: righe (WACC) e colonne (g) sono sempre
 * ordinate crescenti dalla stessa posizione, quindi gli indirizzi letterali
 * usati nei task (C6, G10, E8...) sono legittimi — non dipendono dal seed,
 * cambiano solo i NUMERI dentro le celle. Non c'e' inserimento/eliminazione di
 * righe o colonne: i due bug noti del progetto non si applicano qui.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_TITOLO,
  eur,
  pct,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import { roundTo, triangular } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
/** Assunzione unica in valuta: bordo tutto intorno, come la casella-nome di M0B-06. */
const STILE_ASSUNZIONE_EUR: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '#,##0" €"',
  borders: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

/** WACC e g: percentuale a due decimali — la griglia si muove a passi di 25/50 bps. */
const STILE_ASSUNZIONE_PCT: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '0.00%',
};

const N = 5;
const WACC_STEP = 0.005; // 50 bps fra una riga e la successiva
const G_STEP = 0.0025; // 25 bps fra una colonna e la successiva

export default defineTemplate({
  id: 'M0F-02-DATATABLE2',
  module: 'M0-F',
  get title() {
    return tx('M0F-02-DATATABLE2.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 420,
  skills: ['xl.data-table', 'xl.anchoring', 'xl.row-consistency'],
  prerequisites: ['M0A-05-ANCORAGGI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const fcfTerminale = roundTo(triangular(r, 3_000_000, 6_000_000, 12_000_000), 100_000);
    const waccBase = roundTo(triangular(r, 0.085, 0.10, 0.125), 0.0025);
    const gBase = roundTo(triangular(r, 0.018, 0.024, 0.032), 0.0025);

    // Righe: WACC crescente dall'alto in basso. Colonne: g crescente da sinistra a destra.
    const waccValues = Array.from({ length: N }, (_, i) => roundTo(waccBase + (i - 2) * WACC_STEP, 0.0001));
    const gValues = Array.from({ length: N }, (_, j) => roundTo(gBase + (j - 2) * G_STEP, 0.0001));

    // Garanzia di sicurezza: il denominatore WACC−g deve restare positivo su
    // TUTTA la griglia, angolo peggiore incluso (WACC minimo, g massimo). I range
    // dei due triangular sopra lo garantiscono per costruzione (margine minimo
    // ~3,8 punti percentuali), ma un assert costa nulla e documenta l'invariante.
    const minDenom = waccValues[0] - gValues[N - 1];
    if (minDenom < 0.02) {
      throw new Error(`M0F-02-DATATABLE2: denominatore troppo vicino a zero (${minDenom})`);
    }

    const valoreAt = (i: number, j: number): number =>
      (fcfTerminale * (1 + gValues[j])) / (waccValues[i] - gValues[j]);

    const colLettera = (j: number): string => String.fromCharCode(67 + j); // C, D, E, F, G
    const rigaMatrice = (i: number): number => 6 + i; // 6..10

    const CASO_BASE_I = 2;
    const CASO_BASE_J = 2;
    const cellaCasoBase = `${colLettera(CASO_BASE_J)}${rigaMatrice(CASO_BASE_I)}`; // E8

    const primaCella = `C${rigaMatrice(0)}`; // C6
    const ultimaCella = `${colLettera(N - 1)}${rigaMatrice(N - 1)}`; // G10
    const rangeMatrice = `Model!C${rigaMatrice(0)}:${colLettera(N - 1)}${rigaMatrice(N - 1)}`;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M0F-02-DATATABLE2.2', { primaCella }),
      target: `Model!${primaCella}`,
      atteso: valoreAt(0, 0),
      referenzia: ['C2', 'B6', 'C5'],
      ancoraggio: '$C$2',
      senzaLiteral: [1],
      skills: ['xl.data-table', 'xl.anchoring'],
      minKeystrokes: 24,
    });

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0F-02-DATATABLE2.3', { p0: rangeMatrice.replace('Model!', '') }),
      targetCell: rangeMatrice,
      check: [
        { kind: 'consistentRow' as const, range: rangeMatrice },
        { kind: 'noError' as const },
      ],
      skills: ['xl.row-consistency'],
      minKeystrokes: 10,
    };

    const t3: Task = {
      id: 'T3',
      prompt:
        tx('M0F-02-DATATABLE2.4', { ultimaCella }),
      targetCell: `Model!${ultimaCella}`,
      check: [
        { kind: 'mustBeFormula' as const },
        {
          kind: 'value' as const,
          expected: valoreAt(N - 1, N - 1),
          message:
            tx('M0F-02-DATATABLE2.5'),
        },
      ],
      skills: ['xl.anchoring'],
      minKeystrokes: 0,
    };

    const t4 = taskFormula({
      id: 'T4',
      prompt:
        tx('M0F-02-DATATABLE2.6', { p0: pct(waccValues[CASO_BASE_I], 2), p1: pct(gValues[CASO_BASE_J], 2), cellaCasoBase }),
      target: 'Model!C12',
      atteso: valoreAt(CASO_BASE_I, CASO_BASE_J),
      referenzia: [cellaCasoBase],
      senzaLiteral: [],
      skills: ['xl.data-table'],
      minKeystrokes: 6,
    });

    const tasks: Task[] = [t1, t2, t3, t4];

    const areaMatrice: string[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        areaMatrice.push(`${colLettera(j)}${rigaMatrice(i)}`);
      }
    }

    return {
      templateId: 'M0F-02-DATATABLE2',
      seed: rng.seed,
      brief: [tx('M0F-02-DATATABLE2.7', { p0: eur(fcfTerminale), p1: pct(waccValues[0], 2), p2: pct(waccValues[N - 1], 2), p3: pct(gValues[0], 2), p4: pct(gValues[N - 1], 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0F-02-DATATABLE2.8')], { style: STILE_TITOLO }),
            colonna('A2', [tx('M0F-02-DATATABLE2.9')], { style: STILE_ETICHETTA }),
            [{ ref: 'C2', content: fcfTerminale, style: STILE_ASSUNZIONE_EUR, locked: true }],

            riga('A5', [tx('M0F-02-DATATABLE2.10')], { style: STILE_ETICHETTA }),
            riga('C5', gValues, { style: STILE_ASSUNZIONE_PCT }),
            colonna('B6', waccValues, { style: STILE_ASSUNZIONE_PCT }),

            colonna('A12', [tx('M0F-02-DATATABLE2.11')], { style: STILE_ETICHETTA }),

            areaLibera([...areaMatrice, 'C12']),
          ],
          {
            colWidths: { A: 210, B: 90, C: 120, D: 120, E: 120, F: 120, G: 120 },
            frozenRows: 5,
            frozenCols: 2,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0F-02-DATATABLE2.12'),
          15,
          'T1',
        ),
        hint('H2', tx('M0F-02-DATATABLE2.13', { primaCella, p1: rangeMatrice.replace('Model!', '') }), 10, 'T2'),
        hint(
          'H3',
          tx('M0F-02-DATATABLE2.14'),
          10,
          'T3',
        ),
        hint('H4', tx('M0F-02-DATATABLE2.15', { cellaCasoBase }), 6, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${primaCella}`,
    };
  },
});
