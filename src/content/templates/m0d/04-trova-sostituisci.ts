/**
 * M0-D · 04 — Diagnosi: leggere una formula prima di fidarsi del suo output.
 *
 * Modalita' AUDIT: qui non si scrive un modello, lo si controlla. Il foglio
 * arriva con tre formule GIA' scritte (celle bloccate), tutte e tre senza un
 * cancelletto rosso in vista. Due sono corrette. Una ha un riferimento alla
 * colonna sbagliata nel denominatore — un errore da una lettera sola, dello
 * stesso tipo di quelli che sopravvivono mesi in un modello vero perche' il
 * numero che produce e' plausibile, non assurdo.
 *
 * Il punto didattico non e' "trova l'errore": e' "non fidarti del numero
 * finche' non hai riletto la formula". Per questo il task non chiede di
 * CORREGGERE la cella (sarebbe un esercizio di editing), ma di scrivere altrove
 * il valore che quella cella DOVREBBE mostrare — cosa impossibile da fare senza
 * aver prima capito perche' il numero attuale e' sbagliato.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  STILE_ETICHETTA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { SECTORS, ebitdaMargin } from '../../../rng/finance';
import { roundTo, triangular } from '../../../rng/distributions';
import type { SeededRandom } from '../../../rng/SeededRandom';
import type { Task } from '../../types';

import { sectorName, tx } from '../../../i18n/content';
const DIVISIONI = () => ([
  tx('M0D-04-DIAGNOSI.1'),
  tx('M0D-04-DIAGNOSI.2'),
  tx('M0D-04-DIAGNOSI.3'),
  tx('M0D-04-DIAGNOSI.4'),
  tx('M0D-04-DIAGNOSI.5'),
  tx('M0D-04-DIAGNOSI.6'),
] as const);

/** Tre nomi distinti, nell'ordine in cui finiscono in tabella. */
function treDivisioni(rng: SeededRandom): string[] {
  const scelte: string[] = [];
  const disponibili = [...DIVISIONI()];
  for (let i = 0; i < 3; i++) {
    const idx = rng.int(0, disponibili.length - 1);
    scelte.push(disponibili[idx]);
    disponibili.splice(idx, 1);
  }
  return scelte;
}

interface RigaDivisione {
  readonly nome: string;
  readonly ricavi: number;
  readonly costi: number;
  /** Margine EBITDA vero: (ricavi - costi) / ricavi, la formula corretta. */
  readonly margine: number;
}

export default defineTemplate({
  id: 'M0D-04-DIAGNOSI',
  module: 'M0-D',
  get title() {
    return tx('M0D-04-DIAGNOSI.title');
  },
  rank: 2,
  mode: 'AUDIT',
  estimatedSeconds: 240,
  skills: ['xl.trace', 'xl.f9'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const rNomi = rng.fork('nomi');
    const rNumeri = rng.fork('numeri');
    const rSettore = rng.fork('settore');
    const rBug = rng.fork('bug');

    const settore = rSettore.pick(SECTORS);
    const nomi = treDivisioni(rNomi);

    const righe: RigaDivisione[] = nomi.map((nome) => {
      const ricavi = roundTo(triangular(rNumeri, 400_000, 900_000, 2_500_000), 1000);
      const margine = ebitdaMargin(rNumeri, settore);
      // ricavi e' multiplo di 1.000, margine e' multiplo di 0,001: il prodotto
      // e' sempre un intero, quindi il margine ricostruito da (ricavi-costi)/ricavi
      // torna ESATTAMENTE margine, senza rumore di arrotondamento da inseguire.
      const costiAssoluti = ricavi * margine;
      const costi = ricavi - costiAssoluti;
      return { nome, ricavi, costi, margine };
    });

    const bugIdx = rBug.int(0, 2);
    const rigaSbagliata = righe[bugIdx];

    // Le tre formule della colonna D, gia' scritte e bloccate. Quella in
    // posizione bugIdx punta al denominatore sbagliato (Costi invece di
    // Ricavi): stesso schema, una lettera diversa, nessun errore Excel.
    const formuleD = righe.map((_, i) => {
      const rNum = 4 + i;
      const denominatore = i === bugIdx ? 'C' : 'B';
      return `=(B${rNum}-C${rNum})/${denominatore}${rNum}`;
    });

    const task: Task = {
      id: 'T1',
      prompt:
        tx('M0D-04-DIAGNOSI.8'),
      targetCell: 'Model!B8',
      check: [
        {
          kind: 'value',
          expected: rigaSbagliata.margine,
          message:
            tx('M0D-04-DIAGNOSI.9'),
        },
      ],
      skills: ['xl.trace'],
      minKeystrokes: 6,
    };

    const tasks = [task];

    return {
      templateId: 'M0D-04-DIAGNOSI',
      seed: rng.seed,
      brief: [tx('M0D-04-DIAGNOSI.10', { settore: sectorName(settore) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0D-04-DIAGNOSI.11')], { style: STILE_TITOLO }),
            riga('A3', [tx('M0D-04-DIAGNOSI.19'), tx('M0D-04-DIAGNOSI.12'), tx('M0D-04-DIAGNOSI.13'), tx('M0D-04-DIAGNOSI.14')], { style: STILE_TITOLO }),
            colonna('A4', righe.map((r) => r.nome), { style: STILE_ETICHETTA }),
            colonna('B4', righe.map((r) => r.ricavi), { style: STILE_INPUT }),
            colonna('C4', righe.map((r) => r.costi), { style: STILE_INPUT }),
            colonna('D4', formuleD, { style: STILE_FORMULA_PCT }),
            blocco('A8', [[tx('M0D-04-DIAGNOSI.15')]], { style: STILE_ETICHETTA }),
            areaLibera(['B8']),
          ],
          { colWidths: { A: 420, B: 140, C: 140, D: 190 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0D-04-DIAGNOSI.16'),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0D-04-DIAGNOSI.17'),
          10,
          'T1',
        ),
        hint('H3', tx('M0D-04-DIAGNOSI.18', { p0: rigaSbagliata.nome }), 16, 'T1'),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: 'Model!D4',
    };
  },
});
