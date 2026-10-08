/**
 * M2 · 05 — One-off legali e di ristrutturazione: isolare lo straordinario con SUMIF.
 *
 * Primo dei quattro template "one-off" del modulo (skill `qoe.one-off`). Il
 * pattern di normalizzazione (EBITDA normalizzato = EBITDA riportato + Σ
 * rettifiche) e' gia' stato insegnato in M2-01: qui la novita' e' che la
 * rettifica non e' piu' un singolo numero dato, ma va ISOLATA da un piccolo
 * elenco misto di voci legali/di ristrutturazione — alcune "ricorrente" (la
 * normale gestione legale dell'azienda, che NON va toccata), alcune
 * "straordinaria" (una causa legale una tantum, un piano di ristrutturazione).
 *
 * Il rischio didattico che il livello mette alla prova non e' il segno (qui
 * c'e' un solo tipo di rettifica, sempre da riaggiungere: un costo one-off
 * gia' dentro l'EBITDA riportato) ma l'AMBITO della somma: sommare l'intero
 * elenco, incluse le voci ricorrenti, e' un errore concettuale — non un
 * dettaglio tecnico — perche' gonfia l'EBITDA normalizzato riaggiungendo
 * costi che si ripeteranno ogni anno. Da qui SUMIF: un solo criterio
 * (Tipo = "straordinaria") basta a isolare le righe giuste.
 *
 * Le voci ricorrenti e straordinarie vengono scelte da due pool distinti e
 * poi RIMESCOLATE insieme in ordine casuale (non raggruppate), cosi' che
 * "prendi le prime righe" non sia mai una scorciatoia che funziona per caso.
 *
 * Geometria: DATA_END dipende da `n` (4 o 5, deciso a runtime dal seed), ma
 * tutti i riferimenti sotto sono calcolati come funzione di DATA_START/n, mai
 * scritti come letterali fissi — coerente con la classe di bug #1 dello spec.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
  num,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const RICORRENTI = () => ([
  tx('M2-05-ONEOFFLEGALI.1'),
  tx('M2-05-ONEOFFLEGALI.2'),
  tx('M2-05-ONEOFFLEGALI.3'),
  tx('M2-05-ONEOFFLEGALI.4'),
  tx('M2-05-ONEOFFLEGALI.5'),
] as const);

const STRAORDINARIE = () => ([
  tx('M2-05-ONEOFFLEGALI.6'),
  tx('M2-05-ONEOFFLEGALI.7'),
  tx('M2-05-ONEOFFLEGALI.8'),
  tx('M2-05-ONEOFFLEGALI.9'),
  tx('M2-05-ONEOFFLEGALI.10'),
] as const);

interface Voce {
  readonly descrizione: string;
  readonly tipo: 'ricorrente' | 'straordinaria';
  readonly importo: number;
}

// --- Geometria fissa dell'intestazione: non dipende dal seed. --------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3;
const ROW_EBITDA = 4; // B4: EBITDA riportato (dato, bloccato)
const ROW_SEZ2 = 6;
const ROW_HEADER = 7; // Voce | Tipo | Importo (€)
const DATA_START = 8;

export default defineTemplate({
  id: 'M2-05-ONEOFFLEGALI',
  module: 'M2',
  get title() {
    return tx('M2-05-ONEOFFLEGALI.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['qoe.one-off'],
  prerequisites: ['M2-01-NORMALIZZAZIONE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBITDA "come riportato" in bilancio, prima di qualunque rettifica.
    const ebitdaRiportato = r.int(700, 3800) * 1000;

    // 4 o 5 voci totali, con un mix garantito: almeno una ricorrente e
    // almeno una straordinaria (mai tutte dello stesso tipo, altrimenti
    // SUMIF e SUM darebbero lo stesso risultato e il livello non
    // insegnerebbe niente).
    const n = r.int(4, 5);
    const kStraordinarie = r.int(1, n - 1);
    const nRicorrenti = n - kStraordinarie;

    const descrizioniRicorrenti = r.shuffle([...RICORRENTI()]).slice(0, nRicorrenti);
    const descrizioniStraordinarie = r.shuffle([...STRAORDINARIE()]).slice(0, kStraordinarie);

    const vociRicorrenti: Voce[] = descrizioniRicorrenti.map((descrizione) => ({
      descrizione,
      tipo: 'ricorrente',
      // Spese legali della normale gestione: importi contenuti.
      importo: roundTo(triangular(r, 3_000, 8_000, 20_000), 250),
    }));
    const vociStraordinarie: Voce[] = descrizioniStraordinarie.map((descrizione) => ({
      descrizione,
      tipo: 'straordinaria',
      // Causa legale / ristrutturazione una tantum: importi piu' consistenti.
      importo: roundTo(triangular(r, 15_000, 45_000, 120_000), 500),
    }));

    // Rimescolate insieme: nell'elenco che il giocatore vede, ricorrenti e
    // straordinarie non sono raggruppate.
    const voci: Voce[] = r.shuffle([...vociRicorrenti, ...vociStraordinarie]);

    const DATA_END = DATA_START + n - 1;
    const ROW_SEZ3 = DATA_END + 2;
    const ROW_RETT = ROW_SEZ3 + 1; // T1
    const ROW_NORM = ROW_RETT + 1; // T2

    const rifTipo = `B${DATA_START}`;
    const rifImporti = `C${DATA_START}`;
    const B_EBITDA_RIP = `B${ROW_EBITDA}`;
    const C_RETTIFICA = `C${ROW_RETT}`;
    const C_EBITDA_NORM = `C${ROW_NORM}`;

    const rettifica = voci
      .filter((v) => v.tipo === 'straordinaria')
      .reduce((acc, v) => acc + v.importo, 0);
    const totaleElencoCompleto = voci.reduce((acc, v) => acc + v.importo, 0);
    const ebitdaNormalizzato = ebitdaRiportato + rettifica;

    const t1: Task = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M2-05-ONEOFFLEGALI.12', { C_RETTIFICA, rifTipo, DATA_END, rifImporti }),
        target: `Model!${C_RETTIFICA}`,
        atteso: rettifica,
        referenzia: [rifTipo, rifImporti],
        senzaLiteral: [],
        skills: ['qoe.one-off'],
        minKeystrokes: 30,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUMIF'] }],
      };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M2-05-ONEOFFLEGALI.13', { C_EBITDA_NORM, B_EBITDA_RIP, C_RETTIFICA }),
      target: `Model!${C_EBITDA_NORM}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, C_RETTIFICA],
      senzaLiteral: [],
      skills: ['qoe.one-off'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-05-ONEOFFLEGALI',
      seed: rng.seed,
      brief: [tx('M2-05-ONEOFFLEGALI.14', { p0: eur(ebitdaRiportato), p1: num(n), p2: eur(totaleElencoCompleto) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M2-05-ONEOFFLEGALI.15')], { style: STILE_TITOLO }),
            riga(`A${ROW_SEZ1}`, [tx('M2-05-ONEOFFLEGALI.16')], { style: STILE_TITOLO }),
            colonna(`A${ROW_EBITDA}`, [tx('M2-05-ONEOFFLEGALI.17')], { style: STILE_ETICHETTA }),
            [{ ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, [tx('M2-05-ONEOFFLEGALI.18')], { style: STILE_TITOLO }),
            riga(`A${ROW_HEADER}`, [tx('M2-05-ONEOFFLEGALI.24'), tx('M2-05-ONEOFFLEGALI.25'), tx('M2-05-ONEOFFLEGALI.19')], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, voci.map((v) => v.descrizione), { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, voci.map((v) => tx(`M2-05-ONEOFFLEGALI.tok.${v.tipo}`)), { style: STILE_ETICHETTA }),
            colonna(`C${DATA_START}`, voci.map((v) => v.importo), { style: STILE_INPUT }),

            riga(`A${ROW_SEZ3}`, [tx('M2-05-ONEOFFLEGALI.26')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_RETT}`,
              [tx('M2-05-ONEOFFLEGALI.20'), tx('M2-05-ONEOFFLEGALI.21')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: C_RETTIFICA, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: C_EBITDA_NORM, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 420, B: 130, C: 140 }, frozenRows: ROW_HEADER },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M2-05-ONEOFFLEGALI.22', { rifTipo, DATA_END, rifImporti }),
          12,
          'T1',
        ),
        hint(
          'H2',
          tx('M2-05-ONEOFFLEGALI.23', { B_EBITDA_RIP, C_RETTIFICA }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: `Model!${C_RETTIFICA}`,
    };
  },
});
