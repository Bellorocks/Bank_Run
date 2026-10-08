/**
 * M0-B · 06 — Il nome al posto dell'indirizzo (named ranges, in attesa del motore).
 *
 * NOTA DI IMPLEMENTAZIONE: `HyperFormula.addNamedExpression` esiste nel motore
 * (vedi node_modules/hyperformula/typings/HyperFormula.d.ts), ma `Workbook`
 * (src/engine/workbook.ts) non lo espone ancora — non c'e' un modo per un
 * `LevelTemplate` di pre-registrare un nome, ne' un `Check` che lo verifichi.
 * Aggiungerlo era fuori dal perimetro di questo file (avrebbe voluto dire
 * toccare `workbook.ts` e `types.ts`, entrambi assegnati altrove).
 *
 * Il livello insegna quindi il concetto per via indiretta, con lo schema gia'
 * disponibile: un'unica cella di assunzione, resa visivamente inconfondibile,
 * che OGNI riga della tabella deve referenziare con un ancoraggio assoluto —
 * esattamente il pattern che un named range formalizza. Il brief spiega cosa
 * sarebbe un vero nome definito e perche' rende le formule leggibili; quando
 * il motore avra' un modo di registrare nomi (vedi apertura in `openIssues`
 * del batch), questo livello e' il candidato naturale da riscrivere con un
 * vero `mustReference` su un nome invece che su un indirizzo.
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
  pct,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import { roundTo, triangular } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';

import { tx } from '../../../i18n/content';
/** Prezzo per azione: due decimali, e un bordo tutto intorno — la casella che "farebbe" da nome. */
const STILE_ASSUNZIONE_PREZZO: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '#,##0.00',
  borders: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

const STILE_ASSUNZIONE_PCT: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '0.0%',
  borders: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

interface Socio {
  readonly nome: string;
  readonly azioni: number;
}

export default defineTemplate({
  id: 'M0B-06-NAMEDRANGES',
  module: 'M0-B',
  get title() {
    return tx('M0B-06-NAMEDRANGES.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 330,
  skills: ['xl.named-ranges', 'xl.anchoring', 'xl.fill', 'xl.row-consistency', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const prezzoAzione = roundTo(triangular(r, 6.5, 15, 38), 0.05);
    const commissionePct = roundTo(triangular(r, 0.006, 0.014, 0.028), 0.001);

    const soci: readonly Socio[] = [
      { nome: tx('M0B-06-NAMEDRANGES.2'), azioni: r.int(420_000, 680_000) },
      { nome: tx('M0B-06-NAMEDRANGES.3'), azioni: r.int(180_000, 340_000) },
      { nome: tx('M0B-06-NAMEDRANGES.4'), azioni: r.int(90_000, 220_000) },
      { nome: tx('M0B-06-NAMEDRANGES.5'), azioni: r.int(60_000, 140_000) },
      { nome: tx('M0B-06-NAMEDRANGES.6'), azioni: r.int(15_000, 55_000) },
    ];

    const lordo = soci.map((s) => s.azioni * prezzoAzione);
    const netto = lordo.map((l) => l - l * commissionePct);
    const totaleNetto = netto.reduce((acc, n) => acc + n, 0);

    const RIGA_PRIMO_SOCIO = 6;
    const RIGA_ULTIMO_SOCIO = RIGA_PRIMO_SOCIO + soci.length - 1; // 10
    const RIGA_TOTALE = 12;

    const rangeLordo = `Model!C${RIGA_PRIMO_SOCIO}:C${RIGA_ULTIMO_SOCIO}`;
    const rangeNetto = `Model!D${RIGA_PRIMO_SOCIO}:D${RIGA_ULTIMO_SOCIO}`;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M0B-06-NAMEDRANGES.7', { RIGA_PRIMO_SOCIO }),
        target: `Model!C${RIGA_PRIMO_SOCIO}`,
        atteso: lordo[0],
        referenzia: [`B${RIGA_PRIMO_SOCIO}`, 'C2'],
        ancoraggio: '$C$2',
        senzaLiteral: [],
        skills: ['xl.named-ranges', 'xl.anchoring'],
        minKeystrokes: 12,
      }),
      {
        id: 'T2',
        prompt:
          tx('M0B-06-NAMEDRANGES.8', { RIGA_PRIMO_SOCIO, RIGA_ULTIMO_SOCIO }),
        targetCell: rangeLordo,
        check: [
          { kind: 'consistentRow' as const, range: rangeLordo },
          { kind: 'noError' as const },
        ],
        skills: ['xl.fill', 'xl.row-consistency'],
        minKeystrokes: 8,
      },
      taskFormula({
        id: 'T3',
        prompt:
          tx('M0B-06-NAMEDRANGES.9', { RIGA_PRIMO_SOCIO }),
        target: `Model!D${RIGA_PRIMO_SOCIO}`,
        atteso: netto[0],
        referenzia: [`C${RIGA_PRIMO_SOCIO}`, 'C3'],
        ancoraggio: '$C$3',
        senzaLiteral: [],
        skills: ['xl.named-ranges', 'xl.anchoring'],
        minKeystrokes: 16,
      }),
      {
        id: 'T4',
        prompt: tx('M0B-06-NAMEDRANGES.10', { RIGA_PRIMO_SOCIO, RIGA_ULTIMO_SOCIO }),
        targetCell: rangeNetto,
        check: [
          { kind: 'consistentRow' as const, range: rangeNetto },
          { kind: 'noError' as const },
        ],
        skills: ['xl.fill', 'xl.row-consistency'],
        minKeystrokes: 8,
      },
      taskFormula({
        id: 'T5',
        prompt: tx('M0B-06-NAMEDRANGES.11', { RIGA_TOTALE }),
        target: `Model!D${RIGA_TOTALE}`,
        atteso: totaleNetto,
        referenzia: [`D${RIGA_PRIMO_SOCIO}`, `D${RIGA_ULTIMO_SOCIO}`],
        skills: ['xl.aggregates'],
        minKeystrokes: 12,
      }),
    ];

    const areaLavoro = [
      ...Array.from({ length: soci.length }, (_, i) => `C${RIGA_PRIMO_SOCIO + i}`),
      ...Array.from({ length: soci.length }, (_, i) => `D${RIGA_PRIMO_SOCIO + i}`),
      `D${RIGA_TOTALE}`,
    ];

    return {
      templateId: 'M0B-06-NAMEDRANGES',
      seed: rng.seed,
      brief: [tx('M0B-06-NAMEDRANGES.12', { p0: eur(prezzoAzione, 2), p1: pct(commissionePct), p2: num(soci.length) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0B-06-NAMEDRANGES.13')], { style: STILE_TITOLO }),
            colonna('A2', [tx('M0B-06-NAMEDRANGES.14'), tx('M0B-06-NAMEDRANGES.15')], { style: STILE_ETICHETTA }),
            [{ ref: 'C2', content: prezzoAzione, style: STILE_ASSUNZIONE_PREZZO, locked: true }],
            [{ ref: 'C3', content: commissionePct, style: STILE_ASSUNZIONE_PCT, locked: true }],

            riga('A5', [tx('M0B-06-NAMEDRANGES.24'), tx('M0B-06-NAMEDRANGES.25'), tx('M0B-06-NAMEDRANGES.16'), tx('M0B-06-NAMEDRANGES.17')], { style: STILE_TITOLO }),
            colonna(`A${RIGA_PRIMO_SOCIO}`, soci.map((s) => s.nome), { style: STILE_ETICHETTA }),
            colonna(`B${RIGA_PRIMO_SOCIO}`, soci.map((s) => s.azioni), { style: STILE_INPUT }),

            colonna(`A${RIGA_TOTALE}`, [tx('M0B-06-NAMEDRANGES.18')], { style: STILE_ETICHETTA }),

            areaLibera(areaLavoro),
          ],
          {
            colWidths: { A: 230, B: 100, C: 140, D: 140 },
            frozenRows: 5,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0B-06-NAMEDRANGES.19'),
          10,
          'T1',
        ),
        hint('H2', tx('M0B-06-NAMEDRANGES.20', { RIGA_PRIMO_SOCIO, p1: rangeLordo.replace('Model!', '') }), 8, 'T2'),
        hint(
          'H3',
          tx('M0B-06-NAMEDRANGES.21', { RIGA_PRIMO_SOCIO }),
          10,
          'T3',
        ),
        hint('H4', tx('M0B-06-NAMEDRANGES.22', { RIGA_PRIMO_SOCIO, p1: rangeNetto.replace('Model!', '') }), 8, 'T4'),
        hint('H5', tx('M0B-06-NAMEDRANGES.23'), 8, 'T5'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!C${RIGA_PRIMO_SOCIO}`,
    };
  },
});
