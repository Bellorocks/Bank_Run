/**
 * M0-C · 02 — MATCH: esatto (0) o approssimato (1)?
 *
 * Il punto didattico e' il disastro del terzo argomento omesso (spec §5): MATCH
 * senza terzo argomento assume 1, cioe' "il piu' grande valore minore o uguale,
 * in un elenco ordinato crescente". Su un elenco NON ordinato quell'ipotesi e'
 * falsa, ma Excel non lo controlla: restituisce un numero plausibile, senza
 * nessun cancelletto rosso. E' l'errore silenzioso per eccellenza — si scopre
 * mesi dopo, quando qualcuno confronta il totale con la fonte originale.
 *
 *  - T1: l'elenco delle pratiche e' ordinato per data di arrivo, non per ID.
 *    Serve match ESATTO (terzo argomento 0). Ometterlo o sbagliarlo produce
 *    quasi sempre un numero diverso da quello atteso: il check "value" con
 *    tolleranza stretta basta da solo a bocciarlo, senza bisogno di leggere
 *    la formula carattere per carattere.
 *  - T2 e' il caso gemello e complementare: una griglia di scaglioni di leva,
 *    ORDINATA crescente apposta. Qui il match approssimato non e' un errore,
 *    e' l'unico modo corretto di trovare "la fascia giusta" quando il valore
 *    cercato non compare mai esattamente nella colonna.
 *
 * Senza T2 il livello insegnerebbe "usa sempre 0", che e' falso quanto "MATCH
 * funziona sempre cosi'": l'approssimato esiste ed e' lo strumento giusto
 * quando — e solo quando — l'ordinamento e' garantito.
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
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  multiplo,
  num,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const CLIENTI = () => ([
  tx('M0C-02-MATCHTIPO.1'),
  tx('M0C-02-MATCHTIPO.2'),
  tx('M0C-02-MATCHTIPO.3'),
  tx('M0C-02-MATCHTIPO.4'),
  tx('M0C-02-MATCHTIPO.5'),
  tx('M0C-02-MATCHTIPO.6'),
  tx('M0C-02-MATCHTIPO.7'),
  tx('M0C-02-MATCHTIPO.8'),
  tx('M0C-02-MATCHTIPO.9'),
  tx('M0C-02-MATCHTIPO.10'),
] as const);

const N_PRATICHE = 7;
const N_SCAGLIONI = 5;

export default defineTemplate({
  id: 'M0C-02-MATCHTIPO',
  module: 'M0-C',
  get title() {
    return tx('M0C-02-MATCHTIPO.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 270,
  skills: ['xl.match-exact', 'xl.index-match'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // ------------------------------------------------------------------
    // Tabella 1: pratiche registrate per data di arrivo, NON per ID.
    // ------------------------------------------------------------------
    const clientiMescolati = r.shuffle(CLIENTI());
    const clientiPratiche = clientiMescolati.slice(0, N_PRATICHE);
    const clienteLeva = clientiMescolati[N_PRATICHE]; // uno dei rimasti, per la tabella 2

    const idsSet = new Set<number>();
    while (idsSet.size < N_PRATICHE) {
      idsSet.add(r.int(1000, 9999));
    }
    const ids = [...idsSet];
    // Sicurezza: la lista deve percepirsi come non ordinata. Con ID casuali
    // capita per costruzione quasi sempre, ma se il seed produce per caso una
    // sequenza gia' crescente o decrescente si scambiano le prime due righe.
    const crescente = ids.every((v, i) => i === 0 || v >= ids[i - 1]);
    const decrescente = ids.every((v, i) => i === 0 || v <= ids[i - 1]);
    if (crescente || decrescente) {
      [ids[0], ids[1]] = [ids[1], ids[0]];
    }

    const fees = ids.map(() => roundTo(triangular(r, 60_000, 140_000, 320_000), 1_000));

    const targetIdx = r.int(1, N_PRATICHE - 2); // mai la prima ne' l'ultima riga
    const targetId = ids[targetIdx];
    const targetFee = fees[targetIdx];

    // ------------------------------------------------------------------
    // Tabella 2: scaglioni di margine per leva d'ingresso, ordinati crescenti.
    // ------------------------------------------------------------------
    const bp: number[] = [0];
    for (let i = 1; i < N_SCAGLIONI; i++) {
      bp.push(roundTo(bp[i - 1] + triangular(r, 0.6, 0.9, 1.3), 0.1));
    }
    const margini: number[] = [r.int(220, 300)];
    for (let i = 1; i < N_SCAGLIONI; i++) {
      margini.push(margini[i - 1] + r.int(40, 90));
    }

    const k = r.int(1, N_SCAGLIONI - 2); // scaglione con un vicino sopra e uno sotto
    const frazione = 0.2 + r.next() * 0.6;
    let leva = roundTo(bp[k] + frazione * (bp[k + 1] - bp[k]), 0.1);
    if (leva <= bp[k]) leva = roundTo(bp[k] + 0.1, 0.1);
    if (leva >= bp[k + 1]) leva = roundTo(bp[k + 1] - 0.1, 0.1);
    const margineAtteso = margini[k];

    // ------------------------------------------------------------------
    // Task
    // ------------------------------------------------------------------
    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0C-02-MATCHTIPO.12', { targetId }),
      targetCell: 'Model!B13',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: targetFee,
          tolerance: 0.01,
          toleranceMode: 'absolute',
          message:
            tx('M0C-02-MATCHTIPO.13'),
        },
        { kind: 'mustReference', cells: ['A4', 'A10', 'C4', 'C10', 'B12'] },
        { kind: 'mustUseFunction', functions: ['INDEX', 'MATCH'], quantifier: 'all' },
        { kind: 'mustNotContainLiteral', except: [0] },
      ],
      skills: ['xl.match-exact', 'xl.index-match'],
      minKeystrokes: 26,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M0C-02-MATCHTIPO.14', { clienteLeva, p1: multiplo(leva) }),
      targetCell: 'Model!B24',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: margineAtteso,
          tolerance: 0.01,
          toleranceMode: 'absolute',
          message:
            tx('M0C-02-MATCHTIPO.15'),
        },
        { kind: 'mustReference', cells: ['A17', 'A21', 'B17', 'B21', 'B23'] },
        { kind: 'mustUseFunction', functions: ['INDEX', 'MATCH'], quantifier: 'all' },
        { kind: 'mustNotContainLiteral', except: [1] },
      ],
      skills: ['xl.match-exact', 'xl.index-match'],
      minKeystrokes: 26,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0C-02-MATCHTIPO',
      seed: rng.seed,
      brief: [tx('M0C-02-MATCHTIPO.16', { p0: num(N_PRATICHE), p1: multiplo(bp[0]) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0C-02-MATCHTIPO.17')], { style: STILE_TITOLO }),
            riga('A3', [tx('M0C-02-MATCHTIPO.18'), tx('M0C-02-MATCHTIPO.30'), tx('M0C-02-MATCHTIPO.19')], { style: STILE_TITOLO }),
            colonna('A4', ids, { style: { ...STILE_INPUT, numFmt: '0000' } }),
            colonna('B4', clientiPratiche, { style: STILE_ETICHETTA }),
            colonna('C4', fees, { style: { ...STILE_INPUT, numFmt: '#,##0" €"' } }),

            blocco('A12', [[tx('M0C-02-MATCHTIPO.20')]], { style: STILE_ETICHETTA }),
            blocco('B12', [[targetId]], { style: { ...STILE_INPUT, numFmt: '0000' } }),
            blocco('A13', [[tx('M0C-02-MATCHTIPO.21')]], { style: STILE_ETICHETTA }),

            riga('A15', [tx('M0C-02-MATCHTIPO.22')], { style: STILE_TITOLO }),
            riga('A16', [tx('M0C-02-MATCHTIPO.23'), tx('M0C-02-MATCHTIPO.24')], { style: STILE_TITOLO }),
            colonna('A17', bp, { style: STILE_INPUT_MULTIPLO }),
            colonna('B17', margini, { style: { ...STILE_INPUT, numFmt: '#,##0" bps"' } }),

            blocco('A23', [[tx('M0C-02-MATCHTIPO.25', { clienteLeva })]], { style: STILE_ETICHETTA }),
            blocco('B23', [[leva]], { style: STILE_INPUT_MULTIPLO }),
            blocco('A24', [[tx('M0C-02-MATCHTIPO.26')]], { style: STILE_ETICHETTA }),

            areaLibera(['B13', 'B24']),
          ],
          { colWidths: { A: 260, B: 190, C: 190 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0C-02-MATCHTIPO.27'),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0C-02-MATCHTIPO.28'),
          10,
          'T1',
        ),
        hint(
          'H3',
          tx('M0C-02-MATCHTIPO.29'),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 80 }),
      startAt: 'Model!B13',
    };
  },
});
