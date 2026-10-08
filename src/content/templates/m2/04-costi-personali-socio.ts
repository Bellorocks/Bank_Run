/**
 * M2 · 04 — Costi personali del socio: rettifica come somma di un elenco.
 *
 * Terzo e ultimo template della serie "poste infragruppo" del modulo M2. Nei
 * due precedenti la rettifica nasceva da una DIFFERENZA fra due numeri (un
 * compenso/affitto pagato contro un valore di mercato). Qui cambia forma
 * apposta, per non far credere che "rettifica" significhi sempre sottrazione:
 * la rettifica e' la SOMMA di un piccolo elenco di voci di spesa personale
 * del socio, contabilizzate impropriamente come costi aziendali (auto uso
 * personale, spese di rappresentanza non documentate, viaggi non di lavoro,
 * quota di un club privato...). Non c'e' ambiguita' di segno da testare qui:
 * sono TUTTE spese personali che hanno gonfiato i costi aziendali (quindi
 * sgonfiato l'EBITDA riportato), quindi vanno TUTTE riaggiunte. Il brief lo
 * dichiara comunque in modo esplicito, come da convenzione del modulo.
 *
 * Meccanica Excel: SUM su un range la cui lunghezza dipende dal seed (3 o 4
 * voci, estratte senza ripetizione da un pool di 4 possibili), poi la somma
 * base EBITDA + rettifiche del template introduttivo (M2-01). Il pattern di
 * elenco-che-si-somma e' lo stesso di M1-04 (fondi rischi/TFR), qui applicato
 * a una singola riga di totale invece che a un rollforward a due gambe.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
/** Pool delle possibili voci di spesa personale: se ne scelgono 3 o 4, senza ripetizione. */
const POOL_SPESE_PERSONALI = () => ([
  tx('M2-04-COSTIPERSONALISOCIO.1'),
  tx('M2-04-COSTIPERSONALISOCIO.2'),
  tx('M2-04-COSTIPERSONALISOCIO.3'),
  tx('M2-04-COSTIPERSONALISOCIO.4'),
] as const);

export default defineTemplate({
  id: 'M2-04-COSTIPERSONALISOCIO',
  module: 'M2',
  get title() {
    return tx('M2-04-COSTIPERSONALISOCIO.title');
  },
  rank: 1,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['qoe.related-party'],
  prerequisites: ['M2-01-NORMALIZZAZIONE'],

  generate: (rng) => {
    // Stream indipendenti: quali voci escono, quanto valgono, e l'EBITDA di
    // base non devono correlarsi fra loro.
    const rVoci = rng.fork('voci');
    const nVoci = rVoci.int(3, 4);
    const labelsScelte = rVoci.shuffle(POOL_SPESE_PERSONALI()).slice(0, nVoci);

    const rImporti = rng.fork('importi');
    const importi = labelsScelte.map(() => roundTo(triangular(rImporti, 800, 3200, 11000), 100));

    const rEbitda = rng.fork('ebitda');
    const ebitdaRiportato = rEbitda.int(700, 3500) * 1000;

    const rettificaTotale = importi.reduce((a, b) => a + b, 0);
    const ebitdaNormalizzato = ebitdaRiportato + rettificaTotale;

    // --- Geometria: tutto calcolato dal numero di voci, mai un letterale. ---
    const EBITDA_RIP_ROW = 4;
    const SEZ_SPESE_TITLE_ROW = 6;
    const LIST_FIRST = SEZ_SPESE_TITLE_ROW + 1;
    const LIST_LAST = LIST_FIRST + nVoci - 1;
    const RETTIFICA_ROW = LIST_LAST + 2;
    const SEZ_NORM_TITLE_ROW = RETTIFICA_ROW + 2;
    const NORM_ROW = SEZ_NORM_TITLE_ROW + 1;

    const rangeSpese = `B${LIST_FIRST}:B${LIST_LAST}`;

    const t1 = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M2-04-COSTIPERSONALISOCIO.6', { RETTIFICA_ROW, nVoci, rangeSpese }),
        target: `Model!B${RETTIFICA_ROW}`,
        atteso: rettificaTotale,
        referenzia: [`B${LIST_FIRST}`, `B${LIST_LAST}`],
        senzaLiteral: [],
        skills: ['qoe.related-party'],
        minKeystrokes: 12,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUM'] }] };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M2-04-COSTIPERSONALISOCIO.7', { NORM_ROW, EBITDA_RIP_ROW, RETTIFICA_ROW }),
      target: `Model!B${NORM_ROW}`,
      atteso: ebitdaNormalizzato,
      referenzia: [`B${EBITDA_RIP_ROW}`, `B${RETTIFICA_ROW}`],
      senzaLiteral: [],
      skills: ['qoe.related-party'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-04-COSTIPERSONALISOCIO',
      seed: rng.seed,
      brief: [tx('M2-04-COSTIPERSONALISOCIO.8', { p0: eur(ebitdaRiportato), nVoci }), ...labelsScelte.map((l, i) => `- **${l}**: ${eur(importi[i])}`), tx('M2-04-COSTIPERSONALISOCIO.9')].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M2-04-COSTIPERSONALISOCIO.10')], { style: STILE_TITOLO }),
            riga(`A3`, [tx('M2-04-COSTIPERSONALISOCIO.11')], { style: STILE_TITOLO }),
            colonna(`A${EBITDA_RIP_ROW}`, [tx('M2-04-COSTIPERSONALISOCIO.12')], { style: STILE_ETICHETTA }),
            [{ ref: `B${EBITDA_RIP_ROW}`, content: ebitdaRiportato, style: STILE_INPUT, locked: true }],

            riga(`A${SEZ_SPESE_TITLE_ROW}`, [tx('M2-04-COSTIPERSONALISOCIO.13')], {
              style: STILE_TITOLO,
            }),
            colonna(`A${LIST_FIRST}`, labelsScelte, { style: STILE_ETICHETTA }),
            blocco(
              `B${LIST_FIRST}`,
              importi.map((v) => [v]),
              { style: STILE_INPUT },
            ),

            colonna(`A${RETTIFICA_ROW}`, [tx('M2-04-COSTIPERSONALISOCIO.14')], {
              style: STILE_ETICHETTA,
            }),
            [{ ref: `B${RETTIFICA_ROW}`, content: null, locked: false, style: STILE_FORMULA }],

            riga(`A${SEZ_NORM_TITLE_ROW}`, [tx('M2-04-COSTIPERSONALISOCIO.18')], { style: STILE_TITOLO }),
            colonna(`A${NORM_ROW}`, [tx('M2-04-COSTIPERSONALISOCIO.15')], { style: STILE_ETICHETTA }),
            [{ ref: `B${NORM_ROW}`, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M2-04-COSTIPERSONALISOCIO.16', { rangeSpese }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M2-04-COSTIPERSONALISOCIO.17', { EBITDA_RIP_ROW, RETTIFICA_ROW }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: `Model!B${RETTIFICA_ROW}`,
    };
  },
});
