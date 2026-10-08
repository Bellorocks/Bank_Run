/**
 * M9 · 06 — EPS Bridge: dall'EPS standalone a quello pro-forma, voce per voce.
 *
 * Il bridge spiega al board PERCHE' l'EPS cambia, non solo di quanto:
 *
 *   EPS standalone                         = utile acquirer / azioni acquirer
 *   (−) diluizione da nuove azioni         = utile acquirer / azioni pro-forma − EPS standalone
 *   (+) contributo utile target            = utile target / azioni pro-forma
 *   (+) sinergie dopo le imposte           = sinergie / azioni pro-forma
 *   (−) costo del finanziamento            = − oneri / azioni pro-forma
 *   (−) ammortamento PPA                   = − PPA / azioni pro-forma
 *   = EPS pro-forma
 *
 * La somma delle voci deve coincidere con l'EPS pro-forma calcolato da
 * zero: e' il controllo che il bridge non abbia dimenticato o contato due
 * volte qualcosa. Le voci negative vanno scritte col segno.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  num,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';

import { tx } from '../../../i18n/content';
const B_ACQ_NI = 'B4';
const B_ACQ_SH = 'B5';
const B_TGT_NI = 'B6';
const B_SYN = 'B7';
const B_FIN = 'B8';
const B_PPA = 'B9';
const B_NEW_SH = 'B10';
const B_PF_SH = 'B11'; // formula data: B5 + B10

const B_EPS_SA = 'B14'; // formula data
const B_DILUIZ = 'B15'; // T1
const B_TARGET = 'B16'; // T2
const B_SINERG = 'B17'; // T3
const B_FINANZ = 'B18'; // T4
const B_PPA_PS = 'B19'; // T5
const B_EPS_PF = 'B20'; // T6

const STILE_EPS: CellStyle = { ...STILE_FORMULA, numFmt: '0.000' };

export default defineTemplate({
  id: 'M9-06-EPSBRIDGE',
  module: 'M9',
  get title() {
    return tx('M9-06-EPSBRIDGE.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 420,
  skills: ['ma.eps-bridge'],
  prerequisites: ['M9-04-ACCRETIONDILUTION'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const acqNi = roundTo(triangular(r, 40_000_000, 55_000_000, 70_000_000), 500_000);
    const acqSh = roundTo(triangular(r, 10_000_000, 14_000_000, 18_000_000), 100_000);
    const tgtNi = roundTo(acqNi * triangular(r, 0.15, 0.25, 0.35), 100_000);
    const syn = roundTo(triangular(r, 3_000_000, 5_000_000, 8_000_000), 100_000);
    const fin = roundTo(triangular(r, 2_000_000, 4_000_000, 6_000_000), 100_000);
    const ppa = roundTo(triangular(r, 1_000_000, 2_000_000, 3_000_000), 100_000);
    const newSh = roundTo(acqSh * triangular(r, 0.1, 0.2, 0.35), 50_000);
    const pfSh = acqSh + newSh;

    const epsSa = acqNi / acqSh;
    const diluiz = acqNi / pfSh - epsSa;
    const target = tgtNi / pfSh;
    const sinerg = syn / pfSh;
    const finanz = -fin / pfSh;
    const ppaPs = -ppa / pfSh;
    const epsPf = (acqNi + tgtNi + syn - fin - ppa) / pfSh;

    const per = (id: string, target: string, prompt: string, atteso: number, referenzia: string[]) =>
      taskFormula({
        id,
        prompt,
        target: `Model!${target}`,
        atteso,
        referenzia,
        senzaLiteral: [],
        skills: ['ma.eps-bridge'],
        minKeystrokes: 10,
      });

    const tasks = [
      per(
        'T1',
        B_DILUIZ,
        tx('M9-06-EPSBRIDGE.2', { B_DILUIZ }),
        diluiz,
        [B_ACQ_NI, B_PF_SH, B_EPS_SA],
      ),
      per('T2', B_TARGET, tx('M9-06-EPSBRIDGE.3', { B_TARGET }), target, [B_TGT_NI, B_PF_SH]),
      per('T3', B_SINERG, tx('M9-06-EPSBRIDGE.4', { B_SINERG }), sinerg, [B_SYN, B_PF_SH]),
      per(
        'T4',
        B_FINANZ,
        tx('M9-06-EPSBRIDGE.5', { B_FINANZ }),
        finanz,
        [B_FIN, B_PF_SH],
      ),
      per('T5', B_PPA_PS, tx('M9-06-EPSBRIDGE.6', { B_PPA_PS }), ppaPs, [B_PPA, B_PF_SH]),
      taskFormula({
        id: 'T6',
        prompt:
          tx('M9-06-EPSBRIDGE.7', { B_EPS_PF }),
        target: `Model!${B_EPS_PF}`,
        atteso: epsPf,
        referenzia: [B_EPS_SA, B_DILUIZ, B_PPA_PS],
        senzaLiteral: [],
        skills: ['ma.eps-bridge'],
        minKeystrokes: 12,
      }),
    ];

    const brief = [tx('M9-06-EPSBRIDGE.8', { p0: eur(acqNi), p1: num(acqSh), p2: eur(tgtNi), p3: eur(syn), p4: eur(fin), p5: eur(ppa), p6: num(newSh) })].join('\n');

    const sheet = foglio('Model', [
      riga('A1', [tx('M9-06-EPSBRIDGE.9')], { style: STILE_TITOLO }),
      riga('A3', [tx('M9-06-EPSBRIDGE.26'), tx('M9-06-EPSBRIDGE.27')], { style: STILE_TITOLO }),
      colonna(
        'A4',
        [
          tx('M9-06-EPSBRIDGE.10'),
          tx('M9-06-EPSBRIDGE.11'),
          tx('M9-06-EPSBRIDGE.12'),
          tx('M9-06-EPSBRIDGE.13'),
          tx('M9-06-EPSBRIDGE.14'),
          tx('M9-06-EPSBRIDGE.15'),
          tx('M9-06-EPSBRIDGE.16'),
          tx('M9-06-EPSBRIDGE.17'),
        ],
        { style: STILE_ETICHETTA },
      ),
      colonna(B_ACQ_NI, [acqNi, acqSh, tgtNi, syn, fin, ppa, newSh], { style: STILE_INPUT }),
      [{ ref: B_PF_SH, content: `=${B_ACQ_SH}+${B_NEW_SH}`, style: STILE_FORMULA, locked: true }],

      riga('A13', [tx('M9-06-EPSBRIDGE.18'), tx('M9-06-EPSBRIDGE.28')], { style: STILE_TITOLO }),
      colonna(
        'A14',
        [
          tx('M9-06-EPSBRIDGE.19'),
          tx('M9-06-EPSBRIDGE.20'),
          tx('M9-06-EPSBRIDGE.21'),
          tx('M9-06-EPSBRIDGE.29'),
          tx('M9-06-EPSBRIDGE.22'),
          tx('M9-06-EPSBRIDGE.23'),
          tx('M9-06-EPSBRIDGE.24'),
        ],
        { style: STILE_ETICHETTA },
      ),
      [{ ref: B_EPS_SA, content: `=${B_ACQ_NI}/${B_ACQ_SH}`, style: STILE_EPS, locked: true }],
      ...[B_DILUIZ, B_TARGET, B_SINERG, B_FINANZ, B_PPA_PS].map((ref) => [
        { ref, content: null, locked: false, style: STILE_EPS },
      ]),
      [{ ref: B_EPS_PF, content: null, locked: false, style: { ...STILE_TOTALE, numFmt: '0.000' } }],
    ]);

    return {
      templateId: 'M9-06-EPSBRIDGE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!${B_DILUIZ}`,
      hints: [
        hint('H1', `=${B_ACQ_NI}/${B_PF_SH}-${B_EPS_SA}`, 15, 'T1'),
        hint('H2', tx('M9-06-EPSBRIDGE.25', { B_TGT_NI, B_PF_SH }), 10, 'T2'),
        hint('H3', `=SUM(${B_EPS_SA}:${B_PPA_PS})`, 10, 'T6'),
      ],
    };
  },
});
