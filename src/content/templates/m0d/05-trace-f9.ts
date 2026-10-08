/**
 * M0-D · 05 — Trace precedents/dependents (Ctrl+[ / Ctrl+]) e F9 su frammento.
 *
 * Il modello di questo livello e' gia' costruito: B4 e B6 sono formule VERE,
 * bloccate, che il giocatore non deve scrivere ma solo attraversare. E' apposta:
 * la lezione non e' "sai scrivere una catena di formule" (gia' vista in M0-A),
 * e' "sai risalire una catena che ha scritto qualcun altro senza ricalcolare
 * tutto a mente". Ctrl+[ sposta la selezione sui precedenti diretti della cella
 * attiva; Ctrl+] fa il percorso inverso sui dipendenti. Nessuno dei due e'
 * osservabile dal grader (sono movimenti di selezione, non producono un valore
 * in cella), quindi il livello non prova a verificarli — li spiega nel brief e
 * basta, come dice il compito.
 *
 * T1 chiede il risultato finale della catena: una formula nuova, scritta dal
 * giocatore, che chiude la catena (equity value = EV − debito). T2 e' il punto
 * vero del livello: chiede un valore che vive DENTRO quella formula (EV, cioe'
 * EBITDA × multiplo) ma che non ha una cella propria. Ricalcolarlo a mano vuol
 * dire rifare la moltiplicazione; il modo rapido e' entrare in modifica su B9
 * (F2), selezionare il frammento `B6*B8` nella barra della formula e premere
 * F9 — Excel lo sostituisce li' per li' col suo valore. La trappola da
 * segnalare nel brief: dopo aver letto il numero si esce con ESC, non con
 * INVIO, altrimenti quel valore letterale sostituisce la formula per sempre.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  eur,
  eurM,
  pct,
  multiplo,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0D-05-TRACEF9',
  module: 'M0-D',
  get title() {
    return tx('M0D-05-TRACEF9.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.trace', 'xl.f9'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Numeri "sporchi" quanto basta da rendere il calcolo a mente scomodo:
    // e' proprio il motivo per cui F9 conviene, non un dettaglio estetico.
    const ricavi = roundTo(triangular(r, 4_000_000, 8_000_000, 15_000_000), 50_000);
    const crescita = roundTo(triangular(r, 0.02, 0.05, 0.09), 0.001);
    const margine = roundTo(triangular(r, 0.14, 0.19, 0.26), 0.001);
    const debito = roundTo(triangular(r, 1_500_000, 3_000_000, 6_000_000), 50_000);
    const mult = roundTo(triangular(r, 5.5, 7.0, 9.0), 0.1);

    // Stessa aritmetica delle formule che il motore calcolera' davvero: il
    // valore atteso deve nascere dagli stessi passaggi, non da una scorciatoia.
    const ricaviProiettati = ricavi * (1 + crescita);
    const ebitdaProiettato = ricaviProiettati * margine;
    const enterpriseValue = ebitdaProiettato * mult;
    const equityValue = enterpriseValue - debito;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M0D-05-TRACEF9.2'),
        target: 'Model!B9',
        atteso: equityValue,
        referenzia: ['B6', 'B7', 'B8'],
        senzaLiteral: [],
        skills: ['xl.trace'],
        minKeystrokes: 14,
      }),
      {
        id: 'T2',
        prompt:
          tx('M0D-05-TRACEF9.3'),
        targetCell: 'Model!B11',
        check: [
          {
            kind: 'value' as const,
            expected: enterpriseValue,
            message:
              tx('M0D-05-TRACEF9.4'),
          },
        ],
        skills: ['xl.f9'],
        // Non e' un riferimento breve come "A9": qui la risposta e' il valore letto
        // (7-11 cifre a seconda del seed, es. "9004616" o "12656923,92"). Il minimo
        // teorico deve contare quelle cifre piu' la discesa da B9 a B11 e l'Invio,
        // non un valore fisso indipendente dal seed.
        minKeystrokes: 10,
      },
    ];

    return {
      templateId: 'M0D-05-TRACEF9',
      seed: rng.seed,
      brief: [tx('M0D-05-TRACEF9.5', { p0: eurM(ricavi), p1: pct(crescita), p2: pct(margine), p3: eur(debito), p4: multiplo(mult) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0D-05-TRACEF9.6')], { style: STILE_TITOLO }),
            blocco(
              'A2',
              [
                [tx('M0D-05-TRACEF9.7')],
                [tx('M0D-05-TRACEF9.8')],
                [tx('M0D-05-TRACEF9.9')],
                [tx('M0D-05-TRACEF9.10')],
                [tx('M0D-05-TRACEF9.11')],
                [tx('M0D-05-TRACEF9.12')],
                [tx('M0D-05-TRACEF9.13')],
                [tx('M0D-05-TRACEF9.14')],
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[ricavi]], { style: STILE_INPUT }),
            blocco('B3', [[crescita]], { style: STILE_INPUT_PCT }),
            // Formule VERE, bloccate: sono il modello dato, non il compito.
            blocco('B4', [['=B2*(1+B3)']], { style: STILE_FORMULA }),
            blocco('B5', [[margine]], { style: STILE_INPUT_PCT }),
            blocco('B6', [['=B4*B5']], { style: STILE_FORMULA }),
            blocco('B7', [[debito]], { style: STILE_INPUT }),
            blocco('B8', [[mult]], { style: STILE_INPUT_MULTIPLO }),
            blocco('A11', [[tx('M0D-05-TRACEF9.15')]], { style: STILE_ETICHETTA }),
            areaLibera(['B9', 'B11']),
          ],
          { colWidths: { A: 300, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0D-05-TRACEF9.16'),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0D-05-TRACEF9.17'),
          6,
          'T1',
        ),
        hint(
          'H3',
          tx('M0D-05-TRACEF9.18'),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: 'Model!B9',
    };
  },
});
