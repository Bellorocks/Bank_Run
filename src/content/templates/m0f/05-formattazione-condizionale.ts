/**
 * M0-F · 05 — Formattazione condizionale: il colore che nasce da una regola.
 *
 * NOTA DI IMPLEMENTAZIONE: `GridSession` (src/game/session.ts) non ha nessun comando
 * di formattazione condizionale — ne' una voce in keymap ne' logica sotto, a
 * differenza per esempio di `structure.group/ungroup` che almeno compaiono nella
 * keymap senza implementazione. Aggiungerla era fuori dal perimetro di questo file
 * (avrebbe voluto dire un motore di regole dentro `Workbook`/`CellStyle`, assegnato
 * altrove). Vedi anche l'apertura corrispondente in `openIssues`.
 *
 * Qui il workaround e' particolarmente naturale, piu' che in altri livelli di
 * questo batch: l'alternativa "a formule" alla formattazione condizionale — una
 * colonna di flag calcolati con IF che segnalano quando una soglia e' superata —
 * non e' un ripiego goffo, e' ESATTAMENTE cio' che la formattazione condizionale
 * automatizza a livello visivo. La regola vera "se leva > soglia, sfondo rosso" e
 * la formula `=IF(leva>soglia,"BREACH","OK")` sono la stessa logica di confronto;
 * la prima disegna un colore quando il foglio ricalcola, la seconda produce un
 * valore che un'altra formula puo' leggere (contare, filtrare, sommare). Il brief
 * spiega la differenza e dichiara il limite invece di fingere che non esista.
 *
 * Scenario: covenant di leva massima (Net Debt/EBITDA) testato ogni trimestre.
 * La leva dell'istanza e' costruita per essere STRETTAMENTE DECRESCENTE nel
 * tempo (Net Debt che scende per il rimborso, EBITDA che cresce), cosi' la
 * soglia scelta a meta' tabella garantisce, per QUALSIASI seed, alcuni trimestri
 * in breach e altri in regola — mai tutti uguali, che renderebbe il flag inutile
 * da vedere in azione.
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
  STILE_INPUT,
  STILE_TITOLO,
  eur,
  num,
} from '../../authoring';
import { leverage } from '../../../rng/finance';
import { roundTo } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const RIGHE = 7;
const RIGA_INTESTAZIONE = 4;
const RIGA_PRIMO = 5;
const RIGA_ULTIMA = RIGA_PRIMO + RIGHE - 1; // 11
const RIGA_TOTALE = 13;

const RANGE_LEVA = `Model!D${RIGA_PRIMO}:D${RIGA_ULTIMA}`;
const RANGE_ESITO = `Model!E${RIGA_PRIMO}:E${RIGA_ULTIMA}`;

/** Soglia di leva: casella riquadrata, stessa convenzione delle assunzioni uniche referenziate da ogni riga. */
const STILE_SOGLIA: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '0.00x',
  borders: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

/**
 * Un valore strettamente compreso fra `basso` e `alto` (basso < alto), il piu'
 * "tondo" possibile. Prova prima lo scarto di 0,1x, poi 0,05x, poi 0,01x: la
 * soglia non deve mai coincidere con la leva di un trimestre, altrimenti quel
 * trimestre diventa un caso limite ambiguo invece di un esempio pulito.
 */
function sogliaTraDue(alto: number, basso: number): number {
  const centro = (alto + basso) / 2;
  for (const passo of [0.1, 0.05, 0.01]) {
    const candidato = roundTo(centro, passo);
    if (candidato > basso && candidato < alto) return candidato;
  }
  return centro;
}

export default defineTemplate({
  id: 'M0F-05-CONDFORMAT',
  module: 'M0-F',
  get title() {
    return tx('M0F-05-CONDFORMAT.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['xl.cond-format', 'xl.if', 'xl.sanity-checks', 'xl.anchoring', 'xl.row-consistency'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Leva d'ingresso realistica (3,0x-5,5x, moda 4,0x) come punto di partenza:
    // da li' si deriva il Net Debt del primo trimestre, arrotondato a 100k.
    const ebitdaQ1 = r.int(24, 42) * 100_000;
    const levaIngresso = leverage(r);
    const netDebtQ1 = Math.round((levaIngresso * ebitdaQ1) / 100_000) * 100_000;

    // Rimborso trimestrale costante (cash sweep) e crescita EBITDA trimestrale
    // costante: bastano per garantire Net Debt strettamente decrescente ed
    // EBITDA strettamente crescente su ogni seed, quindi leva strettamente
    // decrescente per costruzione algebrica (numeratore giu', denominatore su).
    const rimborsoTrim = r.int(3, 6) * 100_000;
    const crescitaEbitdaTrim = roundTo(0.008 + r.next() * 0.018, 0.001);

    const netDebt: number[] = [];
    const ebitda: number[] = [];
    for (let i = 0; i < RIGHE; i++) {
      netDebt.push(netDebtQ1 - i * rimborsoTrim);
      ebitda.push(Math.round((ebitdaQ1 * Math.pow(1 + crescitaEbitdaTrim, i)) / 1000) * 1000);
    }
    const leva = netDebt.map((nd, i) => nd / ebitda[i]);

    // Soglia a cavallo del terzo/quarto trimestre: garantisce alcuni breach
    // all'inizio (leva ancora alta) e la regola rispettata dopo (leva scesa).
    const soglia = sogliaTraDue(leva[2], leva[3]);
    const esito = leva.map((l) => (l > soglia ? 'BREACH' : 'OK'));
    const numeroBreach = esito.filter((e) => e === 'BREACH').length;

    const trimestri = Array.from({ length: RIGHE }, (_, i) => tx('common.trimestre', { n: i + 1 }));

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M0F-05-CONDFORMAT.2', { RIGA_PRIMO }),
      target: `Model!D${RIGA_PRIMO}`,
      atteso: leva[0],
      referenzia: [`B${RIGA_PRIMO}`, `C${RIGA_PRIMO}`],
      senzaLiteral: [],
      skills: ['xl.arithmetic'],
      minKeystrokes: 10,
    });

    const t2: Task = {
      id: 'T2',
      prompt: tx('M0F-05-CONDFORMAT.3', { RIGA_PRIMO, RIGA_ULTIMA }),
      targetCell: RANGE_LEVA,
      check: [
        { kind: 'consistentRow' as const, range: RANGE_LEVA },
        { kind: 'noError' as const },
      ],
      skills: ['xl.fill', 'xl.row-consistency'],
      minKeystrokes: 10,
    };

    const t3: Task = {
      id: 'T3',
      prompt:
        tx('M0F-05-CONDFORMAT.4', { RIGA_PRIMO }),
      targetCell: `Model!E${RIGA_PRIMO}`,
      check: [
        { kind: 'mustBeFormula' as const },
        {
          kind: 'text' as const,
          expected: esito[0],
          message:
            tx('M0F-05-CONDFORMAT.5', { RIGA_PRIMO }),
        },
        { kind: 'mustReference' as const, cells: [`D${RIGA_PRIMO}`, 'C2'] },
        { kind: 'anchoring' as const, pattern: '$C$2' },
        { kind: 'mustUseFunction' as const, functions: ['IF'] },
      ],
      skills: ['xl.if', 'xl.cond-format', 'xl.anchoring'],
      minKeystrokes: 32,
    };

    const t4: Task = {
      id: 'T4',
      prompt: tx('M0F-05-CONDFORMAT.6', { RIGA_PRIMO, RIGA_ULTIMA }),
      targetCell: RANGE_ESITO,
      check: [
        { kind: 'consistentRow' as const, range: RANGE_ESITO },
        { kind: 'noError' as const },
      ],
      skills: ['xl.fill', 'xl.row-consistency'],
      minKeystrokes: 10,
    };

    const t5: Task = {
      id: 'T5',
      prompt:
        tx('M0F-05-CONDFORMAT.7', { RIGA_TOTALE }),
      targetCell: `Model!E${RIGA_TOTALE}`,
      check: [
        { kind: 'mustBeFormula' as const },
        {
          kind: 'value' as const,
          expected: numeroBreach,
          message: tx('M0F-05-CONDFORMAT.8', { RIGA_PRIMO, RIGA_ULTIMA }),
        },
        { kind: 'mustReference' as const, cells: [`E${RIGA_PRIMO}`, `E${RIGA_ULTIMA}`] },
        { kind: 'mustUseFunction' as const, functions: ['COUNTIF', 'COUNTIFS'], quantifier: 'any' as const },
      ],
      skills: ['xl.sanity-checks'],
      minKeystrokes: 26,
    };

    const tasks = [t1, t2, t3, t4, t5];

    return {
      templateId: 'M0F-05-CONDFORMAT',
      seed: rng.seed,
      brief: [tx('M0F-05-CONDFORMAT.9', { p0: num(soglia, 2), p1: num(RIGHE), p2: eur(netDebt[0]), p3: eur(ebitda[0]) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0F-05-CONDFORMAT.10')], { style: STILE_TITOLO }),
            colonna('A2', [tx('M0F-05-CONDFORMAT.11')], { style: STILE_ETICHETTA }),
            [{ ref: 'C2', content: soglia, style: STILE_SOGLIA, locked: true }],

            riga(`A${RIGA_INTESTAZIONE}`, [tx('M0F-05-CONDFORMAT.21'), tx('M0F-05-CONDFORMAT.12'), tx('M0F-05-CONDFORMAT.13'), tx('M0F-05-CONDFORMAT.14'), tx('M0F-05-CONDFORMAT.15')], {
              style: STILE_TITOLO,
            }),
            colonna(`A${RIGA_PRIMO}`, trimestri, { style: STILE_ETICHETTA }),
            colonna(`B${RIGA_PRIMO}`, netDebt, { style: STILE_INPUT }),
            colonna(`C${RIGA_PRIMO}`, ebitda, { style: STILE_INPUT }),

            colonna(`A${RIGA_TOTALE}`, [tx('M0F-05-CONDFORMAT.16')], { style: STILE_ETICHETTA }),

            areaLibera([
              ...Array.from({ length: RIGHE }, (_, i) => `D${RIGA_PRIMO + i}`),
              ...Array.from({ length: RIGHE }, (_, i) => `E${RIGA_PRIMO + i}`),
              `E${RIGA_TOTALE}`,
            ]),
          ],
          {
            colWidths: { A: 170, B: 130, C: 120, D: 180, E: 140 },
            frozenRows: RIGA_INTESTAZIONE,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M0F-05-CONDFORMAT.17', { RIGA_PRIMO }), 8, 'T1'),
        hint('H2', tx('M0F-05-CONDFORMAT.18', { RIGA_PRIMO, p1: RANGE_LEVA.replace('Model!', '') }), 8, 'T2'),
        hint(
          'H3',
          tx('M0F-05-CONDFORMAT.19', { RIGA_PRIMO }),
          12,
          'T3',
        ),
        hint('H4', tx('M0F-05-CONDFORMAT.20', { RIGA_PRIMO, p1: RANGE_ESITO.replace('Model!', '') }), 8, 'T4'),
        hint('H5', `=COUNTIF(E${RIGA_PRIMO}:E${RIGA_ULTIMA},"BREACH")`, 10, 'T5'),
      ],
      parScore: par(tasks, { letturaSecondi: 80 }),
      startAt: `Model!D${RIGA_PRIMO}`,
    };
  },
});
