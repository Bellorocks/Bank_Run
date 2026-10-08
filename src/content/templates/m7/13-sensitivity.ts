/**
 * M7 · 13 — Sensitivity WACC × g: "la tabella che finisce in comitato".
 *
 * Ogni DCF vero chiude con questa griglia: quanto cambia il valore implicito
 * (qui il Terminal Value, metodo Gordon growth) se le due assunzioni piu'
 * incerte — il WACC e il tasso di crescita perpetuo g — si muovono di poco
 * intorno al caso base? E' lo strumento con cui un comitato investimenti
 * smette di fidarsi di un solo numero e vede quanto quel numero e' fragile.
 *
 * NOTA DI IMPLEMENTAZIONE — stesso workaround di `m0f/02-data-table-2way.ts`.
 * HyperFormula non espone la Data Table di Excel (ne' a una ne' a due vie),
 * quindi non esiste un modo per registrare "cella di input riga" / "cella di
 * input colonna" ne' un `Check` che le verifichi. Questo livello riusa
 * IDENTICO il workaround gia' collaudato in M0-F: una matrice di formule
 * esplicite, una per cella, con lo stesso schema di ancoraggio misto — il FCF
 * bloccato su riga E colonna, il WACC di riga bloccato solo sulla colonna, il
 * g di colonna bloccato solo sulla riga — cosi' la STESSA formula, copiata in
 * ogni direzione, produce l'intera griglia. Nessuna reinvenzione: e' lo
 * stesso concetto di M0F-02, applicato ora al vero Terminal Value di un DCF
 * (in M0-F era una perpetuita' semplificata puramente illustrativa) invece
 * che a un caso giocattolo.
 *
 * PERCHE' TRE TASK SULLA GRIGLIA E NON UNO SOLO
 * Una griglia di 9 celle e' abbastanza piccola da poter essere verificata con
 * check diretti invece che affidarsi solo alla coerenza strutturale — ed e'
 * importante farlo: un `consistentRow` da solo verifica che le 9 celle siano
 * la STESSA formula shiftata, ma non che quella formula sia quella giusta. Se
 * il giocatore scrive `=$C$2*(1+C$5)/(C$5-$B6)` (denominatore invertito) in
 * TUTTE le celle, `consistentRow` da solo lo promuoverebbe: e' internamente
 * coerente, solo sistematicamente sbagliato. Per questo:
 *   T1  la prima cella della griglia (angolo WACC minimo / g minimo), con un
 *       check di valore esplicito — intercetta un segno invertito subito;
 *   T2  il resto della griglia, con `consistentRow` — intercetta l'hardcode
 *       cella per cella o un ancoraggio dimenticato a meta' copia;
 *   T3  l'angolo opposto (WACC massimo / g massimo), di nuovo con un check di
 *       valore — e' li' che un ancoraggio sbagliato smette di nascondersi:
 *       al centro della griglia lo stesso errore produce spesso un numero
 *       ancora plausibile, agli estremi no (stessa logica di T3 in M0F-02).
 * Un quarto task, T4, viene dopo la griglia: il RANGE del Terminal Value
 * (massimo meno minimo sull'intera area) per quantificare quanto la
 * sensitivity "si allarga" — il numero che davvero si porta in comitato.
 *
 * VINCOLO CRITICO — WACC deve restare significativamente maggiore di g SU
 * TUTTA la griglia, non solo nel caso base. Il caso peggiore e' l'angolo
 * WACC minimo / g massimo (top-right nella geometria qui sotto): e' li' che
 * il denominatore (WACC − g) e' piu' vicino a zero. Il generatore calcola
 * quel margine direttamente dai valori estratti (non da un limite teorico) e
 * lancia un errore esplicito se scende sotto la soglia di sicurezza — stesso
 * stile difensivo di `m0f/02-data-table-2way.ts` e `m7/09-gordon-growth.ts`.
 *
 * Geometria fissa: nessuna riga o colonna dipende dal seed, i riferimenti di
 * cella sono letterali per costruzione, come negli altri livelli di M7.
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
  eurM,
  pct,
  STILE_ETICHETTA,
  STILE_TITOLO,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import { roundTo, triangular } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
/** FCF: unico numero che OGNI cella della griglia deve guardare — riquadrato. */
const STILE_FCF: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '#,##0" €"',
  borders: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

/** WACC e g: percentuale a due decimali. */
const STILE_ASSUNZIONE_PCT: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '0.00%',
};

const N = 3;
const WACC_STEP = 0.01; // 1 punto percentuale fra una riga e la successiva
const G_STEP = 0.005; // 50 punti base fra una colonna e la successiva

// Margine minimo richiesto, nell'angolo peggiore della griglia (WACC minimo,
// g massimo), fra WACC e g: sotto questa soglia il denominatore (WACC - g)
// e' troppo vicino a zero perche' il Terminal Value abbia senso economico.
const MARGINE_MINIMO_WACC_G = 0.02;

const colLettera = (j: number): string => String.fromCharCode(67 + j); // C, D, E
const rigaMatrice = (i: number): number => 6 + i; // 6, 7, 8

export default defineTemplate({
  id: 'M7-13-SENSITIVITY',
  module: 'M7',
  get title() {
    return tx('M7-13-SENSITIVITY.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['dcf.sensitivity', 'xl.data-table'],
  prerequisites: ['M7-09-GORDONGROWTH'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // FCF dell'ultimo anno esplicito: stesso range di M7-09-GORDONGROWTH (una
    // mid-cap tipica), arrotondato a 50.000 € per evitare code decimali.
    const fcfUltimoAnno = roundTo(triangular(r, 4_000_000, 7_000_000, 12_000_000), 50_000);

    // WACC e g di caso base: stessi range tipici di M7-09-GORDONGROWTH.
    const waccBase = roundTo(triangular(r, 0.08, 0.1, 0.12), 0.001);
    const gBase = roundTo(triangular(r, 0.015, 0.02, 0.025), 0.001);

    // Righe: WACC crescente dall'alto in basso, a passi di 1 punto percentuale.
    // Colonne: g crescente da sinistra a destra, a passi di 50 punti base.
    const waccValues = [waccBase - WACC_STEP, waccBase, waccBase + WACC_STEP].map((v) => roundTo(v, 0.0001));
    const gValues = [gBase - G_STEP, gBase, gBase + G_STEP].map((v) => roundTo(v, 0.0001));

    // Guard-rail (§4.3): il denominatore WACC - g deve restare significativamente
    // positivo anche nell'angolo peggiore della griglia (WACC minimo, g
    // massimo). Calcolato dai valori VERI generati per questo seed, non da un
    // limite teorico: un throw esplicito, non un check che nasconda il problema.
    const marginePeggiore = waccValues[0] - gValues[N - 1];
    if (marginePeggiore < MARGINE_MINIMO_WACC_G) {
      throw new Error(
        `M7-13-SENSITIVITY: margine WACC-g troppo stretto (${marginePeggiore}) per il seed ${rng.seed}: ` +
          `WACC minimo ${waccValues[0]}, g massimo ${gValues[N - 1]} — il denominatore del Terminal ` +
          "Value rischia di collassare nell'angolo peggiore della griglia.",
      );
    }

    const valoreAt = (i: number, j: number): number =>
      (fcfUltimoAnno * (1 + gValues[j])) / (waccValues[i] - gValues[j]);

    // Tutti i 9 valori della griglia: servono per T4 (range = max - min).
    const tuttiIValori: number[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) tuttiIValori.push(valoreAt(i, j));
    }
    const valoreMax = Math.max(...tuttiIValori);
    const valoreMin = Math.min(...tuttiIValori);
    const rangeTV = valoreMax - valoreMin;

    const primaCella = `C${rigaMatrice(0)}`; // C6 — WACC minimo, g minimo
    const ultimaCella = `${colLettera(N - 1)}${rigaMatrice(N - 1)}`; // E8 — WACC massimo, g massimo
    const rangeMatrice = `Model!C${rigaMatrice(0)}:${colLettera(N - 1)}${rigaMatrice(N - 1)}`; // Model!C6:E8

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M7-13-SENSITIVITY.2', { primaCella, p1: rigaMatrice(0) }),
      target: `Model!${primaCella}`,
      atteso: valoreAt(0, 0),
      referenzia: ['C2', `B${rigaMatrice(0)}`, 'C5'],
      ancoraggio: '$C$2',
      senzaLiteral: [1],
      skills: ['dcf.sensitivity', 'xl.anchoring'],
      minKeystrokes: 26,
    });

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M7-13-SENSITIVITY.3', { p0: rangeMatrice.replace('Model!', '') }),
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
        tx('M7-13-SENSITIVITY.4', { ultimaCella }),
      targetCell: `Model!${ultimaCella}`,
      check: [
        { kind: 'mustBeFormula' as const },
        {
          kind: 'value' as const,
          expected: valoreAt(N - 1, N - 1),
          message:
            tx('M7-13-SENSITIVITY.5'),
        },
      ],
      skills: ['dcf.sensitivity'],
      minKeystrokes: 0,
    };

    // Costruito a mano (non taskFormula, che non supporta mustUseFunction) per
    // obbligare l'uso di MAX e MIN sull'intera griglia — il modo in cui in un
    // vero DCF si legge "quanto si allarga la sensitivity", non la sottrazione
    // di due celle scelte a mano fra le nove.
    const t4: Task = {
      id: 'T4',
      prompt:
        tx('M7-13-SENSITIVITY.6', { p0: rangeMatrice.replace('Model!', '') }),
      targetCell: 'Model!C10',
      check: [
        { kind: 'mustBeFormula' as const },
        {
          kind: 'value' as const,
          expected: rangeTV,
          tolerance: 0.001,
          toleranceMode: 'relative' as const,
          message:
            tx('M7-13-SENSITIVITY.7', { p0: rangeMatrice.replace('Model!', '') }),
        },
        { kind: 'mustReference' as const, cells: [primaCella, `${colLettera(N - 1)}${rigaMatrice(0)}`, `C${rigaMatrice(N - 1)}`, ultimaCella] },
        { kind: 'mustUseFunction' as const, functions: ['MAX', 'MIN'], quantifier: 'all' as const },
        { kind: 'mustNotContainLiteral' as const, except: [] },
      ],
      skills: ['dcf.sensitivity'],
      minKeystrokes: 20,
    };

    const tasks: Task[] = [t1, t2, t3, t4];

    const areaMatrice: string[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) areaMatrice.push(`${colLettera(j)}${rigaMatrice(i)}`);
    }

    return {
      templateId: 'M7-13-SENSITIVITY',
      seed: rng.seed,
      brief: [tx('M7-13-SENSITIVITY.8', { p0: eurM(fcfUltimoAnno), p1: pct(waccValues[0], 2), p2: pct(waccValues[N - 1], 2), p3: pct(gValues[0], 2), p4: pct(gValues[N - 1], 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-13-SENSITIVITY.9')], { style: STILE_TITOLO }),
            colonna('A2', [tx('M7-13-SENSITIVITY.10')], { style: STILE_ETICHETTA }),
            [{ ref: 'C2', content: fcfUltimoAnno, style: STILE_FCF, locked: true }],

            riga('A5', [tx('M7-13-SENSITIVITY.11')], { style: STILE_ETICHETTA }),
            riga('C5', gValues, { style: STILE_ASSUNZIONE_PCT }),
            colonna('B6', waccValues, { style: STILE_ASSUNZIONE_PCT }),

            colonna('A10', [tx('M7-13-SENSITIVITY.12')], { style: STILE_ETICHETTA }),

            areaLibera([...areaMatrice, 'C10']),
          ],
          {
            colWidths: { A: 420, B: 90, C: 130, D: 130, E: 130 },
            frozenRows: 5,
            frozenCols: 2,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M7-13-SENSITIVITY.13', { p0: rigaMatrice(0), p1: rigaMatrice(0) }),
          15,
          'T1',
        ),
        hint('H2', tx('M7-13-SENSITIVITY.14', { primaCella, p1: rangeMatrice.replace('Model!', '') }), 10, 'T2'),
        hint(
          'H3',
          tx('M7-13-SENSITIVITY.15'),
          10,
          'T3',
        ),
        hint('H4', `=MAX(${rangeMatrice.replace('Model!', '')})-MIN(${rangeMatrice.replace('Model!', '')})`, 10, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${primaCella}`,
    };
  },
});
