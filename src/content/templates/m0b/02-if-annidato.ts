/**
 * M0-B · 02 — IF annidato: piu' di due risposte.
 *
 * `IF` sceglie fra due valori. Qui le alternative sono quattro: una scala di
 * commissioni di advisory a scaglioni di Enterprise Value, come quelle che un
 * mandato di M&A riporta davvero in calce. Un solo confronto non basta piu' —
 * bisogna incastrare un IF dentro il "valore se falsa" di quello precedente,
 * tante volte quante sono le fasce meno una.
 *
 * Le soglie (B4:B6) nascono da `rng.int`: il seed decide dove cadono i confini
 * e quindi in quale fascia finiscono le due operazioni del livello. Non e'
 * garantito che T1 e T2 cadano in fasce diverse fra loro — ma la fascia di
 * ciascuna, seed dopo seed, si sposta davvero: a volte la 1, a volte la 4.
 * Chi ha capito l'annidamento lo rifa' ogni volta; chi ha imparato a memoria
 * "il valore e' sempre B9" si schianta al primo seed che smentisce l'abitudine.
 *
 * T3 non fa scrivere una formula: chiede cosa succede esattamente sul confine
 * fra due fasce, lo stesso tipo di domanda che M0B-01-IF faceva su `>` contro
 * `>=`, qui applicata a una catena invece che a un singolo confronto.
 *
 * Il brief chiude accennando a IFS come alternativa quando le fasce diventano
 * tante: l'annidamento resta leggibile a quattro livelli, non a dieci.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  eur,
  pct,
} from '../../authoring';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0B-02-IFANNIDATO',
  module: 'M0-B',
  get title() {
    return tx('M0B-02-IFANNIDATO.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['xl.if-nested'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const soglie = rng.fork('soglie');
    // Tre soglie crescenti, ciascuna un multiplo tondo di milione: e' cosi' che
    // si scrive davvero una scala di commissioni in un mandato.
    const soglia1 = soglie.int(30, 70) * 1_000_000;
    const soglia2 = soglia1 + soglie.int(60, 120) * 1_000_000;
    const soglia3 = soglia2 + soglie.int(150, 300) * 1_000_000;

    // Aliquote decrescenti al crescere della dimensione del deal: piu' l'Enterprise
    // Value e' grande, piu' basso e' il punto percentuale di commissione. E' la
    // forma classica — non generata a caso, e' lo schema che il livello insegna.
    const aliquota1 = 0.025;
    const aliquota2 = 0.02;
    const aliquota3 = 0.015;
    const aliquota4 = 0.01;

    const aliquotaPerFascia = (ev: number): number => {
      if (ev < soglia1) return aliquota1;
      if (ev < soglia2) return aliquota2;
      if (ev < soglia3) return aliquota3;
      return aliquota4;
    };

    // Range ampio quanto la piu' estrema combinazione possibile di soglie, cosi'
    // che ciascuna operazione possa davvero cadere in una qualunque delle
    // quattro fasce a seconda del seed.
    const operazioni = rng.fork('operazioni');
    const ev1 = operazioni.int(10, 560) * 1_000_000;
    const ev2 = operazioni.int(10, 560) * 1_000_000;

    const commissione1 = ev1 * aliquotaPerFascia(ev1);
    const commissione2 = ev2 * aliquotaPerFascia(ev2);

    const referenziaScala = ['B4', 'B5', 'B6', 'B9', 'B10', 'B11', 'B12'];

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0B-02-IFANNIDATO.2'),
      targetCell: 'Model!B15',
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: commissione1 },
        { kind: 'mustReference', cells: [...referenziaScala, 'B14'] },
        { kind: 'mustUseFunction', functions: ['IF'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.if-nested'],
      minKeystrokes: 46,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0B-02-IFANNIDATO.3'),
      targetCell: 'Model!B18',
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: commissione2 },
        { kind: 'mustReference', cells: [...referenziaScala, 'B17'] },
        { kind: 'mustUseFunction', functions: ['IF'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.if-nested'],
      minKeystrokes: 46,
    };

    const t3: Task = {
      id: 'T3',
      prompt:
        tx('M0B-02-IFANNIDATO.4'),
      targetCell: 'Model!B20',
      check: [{ kind: 'text', expected: '3' }],
      skills: ['xl.if-nested'],
      minKeystrokes: 1,
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0B-02-IFANNIDATO',
      seed: rng.seed,
      brief: [tx('M0B-02-IFANNIDATO.5', { p0: eur(soglia1), p1: pct(aliquota1), p2: eur(soglia2), p3: pct(aliquota2), p4: eur(soglia2), p5: eur(soglia3), p6: pct(aliquota3), p7: eur(soglia3), p8: pct(aliquota4) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            blocco('A1', [[tx('M0B-02-IFANNIDATO.6')]], { style: STILE_TITOLO }),

            blocco('A3', [[tx('M0B-02-IFANNIDATO.7')]], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [tx('M0B-02-IFANNIDATO.8'), tx('M0B-02-IFANNIDATO.9'), tx('M0B-02-IFANNIDATO.10')],
              { style: STILE_ETICHETTA },
            ),
            colonna('B4', [soglia1, soglia2, soglia3], { style: STILE_INPUT }),

            blocco('A8', [[tx('M0B-02-IFANNIDATO.11')]], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M0B-02-IFANNIDATO.12'),
                tx('M0B-02-IFANNIDATO.13'),
                tx('M0B-02-IFANNIDATO.14'),
                tx('M0B-02-IFANNIDATO.15'),
              ],
              { style: STILE_ETICHETTA },
            ),
            colonna('B9', [aliquota1, aliquota2, aliquota3, aliquota4], { style: STILE_INPUT_PCT }),

            blocco('A14', [[tx('M0B-02-IFANNIDATO.16')]], { style: STILE_ETICHETTA }),
            blocco('B14', [[ev1]], { style: STILE_INPUT }),
            blocco('A15', [[tx('M0B-02-IFANNIDATO.17')]], { style: STILE_ETICHETTA }),

            blocco('A17', [[tx('M0B-02-IFANNIDATO.18')]], { style: STILE_ETICHETTA }),
            blocco('B17', [[ev2]], { style: STILE_INPUT }),
            blocco('A18', [[tx('M0B-02-IFANNIDATO.19')]], { style: STILE_ETICHETTA }),

            blocco(
              'A20',
              [[tx('M0B-02-IFANNIDATO.20')]],
              { style: STILE_ETICHETTA },
            ),

            areaLibera(['B15', 'B18', 'B20']),
          ],
          { colWidths: { A: 380, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0B-02-IFANNIDATO.21'),
          15,
          'T1',
        ),
        hint(
          'H2',
          tx('M0B-02-IFANNIDATO.22'),
          10,
          'T2',
        ),
        hint(
          'H3',
          tx('M0B-02-IFANNIDATO.23'),
          8,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 75 }),
      startAt: 'Model!B15',
    };
  },
});
