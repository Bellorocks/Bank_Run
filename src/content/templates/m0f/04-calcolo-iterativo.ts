/**
 * M0-F · 04 — Il cerchio che si chiude da solo (calcolo iterativo).
 *
 * QUESTO E' UNA FEATURE VERA del motore, non un workaround: src/engine/iterative.ts
 * implementa un solver a punto fisso Gauss-Seidel (motore ombra, sweep congelati,
 * §3.1 della spec: max 100 iterazioni, delta 0,001 — gli stessi due numeri della
 * finestra di Excel). `Workbook.setIterative({enabled:true})` lo attiva,
 * `LevelInstance.iterativeCalculation` lo collega in automatico da
 * `src/game/loadLevel.ts`. Qui viene solo USATO, non reimplementato.
 *
 * IL MODELLO — un mini debt schedule di UN periodo, circolare per costruzione:
 *   interessi -> EBT -> utile netto -> cassa disponibile -> rimborso (cash sweep)
 *   -> debito di fine periodo -> debito medio del periodo -> interessi (di nuovo).
 * Niente D&A, niente variazione di NWC: sono tagliati apposta (il compito li
 * chiama "capex fissi minimi") per lasciare in vista SOLO il meccanismo che
 * chiude l'anello — un prestito, un tasso, un EBITDA. E' una semplificazione
 * dichiarata, non un modello di LBO completo.
 *
 * DUE CELLE CHE SI RINCORRONO — B9 (interessi) legge B16 (debito medio), che
 * dipende da B15 (debito di fine periodo), che dipende da B14 (rimborso), che
 * dipende da B9. Non esiste un ordine lineare di calcolo che risolva questo
 * grafo: e' la stessa ragione per cui HyperFormula da solo risponderebbe
 * #CYCLE!. I task chiedono al giocatore di scrivere ESATTAMENTE le due formule
 * che chiudono l'anello (B9 e B15); tutto il resto della catena e' gia' scritto,
 * bloccato, cosi' l'attenzione resta sulla parte che insegna qualcosa.
 *
 * F9 E NON RICALCOLO AUTOMATICO — `Workbook.recalcIterative()` non gira da solo
 * a ogni tasto (vedi il commento su `workbook.ts`: "costa, e durante la
 * digitazione i cicli transitori sono normali"). Nella keymap (src/keymap/bindings.ts)
 * F9 da cella ferma manda `formula.recalculate`, che e' esattamente
 * `recalcIterative()`. Il brief istruisce a premerlo dopo aver scritto entrambe
 * le formule, prima di Verifica — altrimenti il grader legge ancora `#CYCLE!`
 * (o un valore non ancora convergente) e il `requiresCircular`/`value` check
 * fallisce a ragione.
 *
 * NUMERI ATTESI — calcolati in forma chiusa nel `generate()`, risolvendo lo
 * stesso punto fisso a mano (algebra, non il solver): e' lo stesso esercizio di
 * `iterative.test.ts`, qui rifatto sui parametri campionati dal seed invece che
 * su una singola istanza fissa. Il fattore di contrazione (tasso * quota di
 * utile trattenuta / 2) resta sempre ben sotto 1 con i range scelti: il
 * solver converge in una manciata di sweep, mai vicino al tetto di 100.
 */

import {
  defineTemplate,
  areaLibera,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  STILE_ETICHETTA,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  num,
  pct,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import { roundTo, triangular } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';

import { tx } from '../../../i18n/content';
/** Assumption in milioni di euro, un decimale: EBITDA, capex, debito. */
const STILE_INPUT_1DEC: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0.0' };
/** Righe dello schedule, in milioni di euro con due decimali: qui vive la circolarita'. */
const STILE_FORMULA_2DEC: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0.00' };

export default defineTemplate({
  id: 'M0F-04-ITERATIVO',
  module: 'M0-F',
  get title() {
    return tx('M0F-04-ITERATIVO.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 480,
  skills: ['xl.iterative'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Range scelti per garantire, su TUTTI gli angoli dello spazio (verificato
    // numericamente): EBT sempre positivo, cassa disponibile sempre positiva e
    // sempre minore del debito iniziale (il MIN del cash sweep non taglia mai),
    // fattore di contrazione sempre ben sotto 1.
    const ebitda = roundTo(triangular(r, 18, 24, 32), 0.5); // €m
    const capex = roundTo(triangular(r, 1, 1.5, 3), 0.1); // €m, "fissi minimi"
    const taxRate = roundTo(triangular(r, 0.2, 0.24, 0.28), 0.005);
    const tasso = roundTo(triangular(r, 0.05, 0.06, 0.08), 0.0025);
    const debito = roundTo(triangular(r, 70, 95, 130), 1); // €m

    // Punto fisso in forma chiusa — le STESSE operazioni che il giocatore scrive
    // in Excel (B9=B5*B16 ... B16=(B6+B15)/2), risolte algebricamente invece che
    // per iterazione. E' lo stesso numero a cui converge il solver Gauss-Seidel
    // del motore: non e' un numero a caso, e' quello vero.
    //
    //   EBT   = ebitda - interessi
    //   NI    = EBT * (1 - taxRate)                       [imposte sempre > 0 nei nostri range]
    //   cassa = NI - capex
    //   rimb  = MIN(cassa, debito) = cassa                 [mai capped, verificato sopra]
    //   EoP   = debito - rimb
    //   medio = (debito + EoP) / 2
    //   interessi = tasso * medio
    //
    // Sostituendo (k = 1 - taxRate):
    //   interessi = tasso * (debito - k*ebitda/2 + capex/2) / (1 - tasso*k/2)
    const k = 1 - taxRate;
    const denom = 1 - (tasso * k) / 2;
    const numeratore = debito - (k * ebitda) / 2 + capex / 2;
    const interessi = (tasso * numeratore) / denom;
    const ebt = ebitda - interessi;
    const imposte = Math.max(0, ebt * taxRate);
    const utileNetto = ebt - imposte;
    const cassaDisponibile = utileNetto - capex;
    const rimborso = Math.min(cassaDisponibile, debito);
    const debitoFinePeriodo = debito - rimborso;

    const tasks = [
      {
        id: 'T1',
        prompt:
          tx('M0F-04-ITERATIVO.2'),
        targetCell: 'Model!B9',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'mustReference' as const, cells: ['B5', 'B16'] },
          { kind: 'mustNotContainLiteral' as const, except: [] },
          { kind: 'requiresCircular' as const },
          {
            kind: 'value' as const,
            expected: interessi,
            message:
              tx('M0F-04-ITERATIVO.3'),
          },
        ],
        skills: ['xl.iterative'],
        minKeystrokes: 10,
      },
      {
        id: 'T2',
        prompt:
          tx('M0F-04-ITERATIVO.4'),
        targetCell: 'Model!B15',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'mustReference' as const, cells: ['B6', 'B14'] },
          { kind: 'mustNotContainLiteral' as const, except: [] },
          { kind: 'requiresCircular' as const },
          {
            kind: 'value' as const,
            expected: debitoFinePeriodo,
            message:
              tx('M0F-04-ITERATIVO.5'),
          },
        ],
        skills: ['xl.iterative'],
        minKeystrokes: 10,
      },
    ];

    return {
      templateId: 'M0F-04-ITERATIVO',
      seed: rng.seed,
      brief: [tx('M0F-04-ITERATIVO.6', { p0: num(ebitda, 1), p1: num(capex, 1), p2: pct(taxRate), p3: pct(tasso), p4: num(debito, 1) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0F-04-ITERATIVO.7')], { style: STILE_TITOLO }),
            colonna(
              'A2',
              [
                tx('M0F-04-ITERATIVO.8'),
                tx('M0F-04-ITERATIVO.9'),
                tx('M0F-04-ITERATIVO.10'),
                tx('M0F-04-ITERATIVO.11'),
                tx('M0F-04-ITERATIVO.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[ebitda]], { style: STILE_INPUT_1DEC }),
            blocco('B3', [[capex]], { style: STILE_INPUT_1DEC }),
            blocco('B4', [[taxRate]], { style: STILE_INPUT_PCT }),
            blocco('B5', [[tasso]], { style: STILE_INPUT_PCT }),
            blocco('B6', [[debito]], { style: STILE_INPUT_1DEC }),

            riga('A8', [tx('M0F-04-ITERATIVO.13')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M0F-04-ITERATIVO.14'),
                tx('M0F-04-ITERATIVO.15'),
                tx('M0F-04-ITERATIVO.24'),
                tx('M0F-04-ITERATIVO.16'),
                tx('M0F-04-ITERATIVO.17'),
                tx('M0F-04-ITERATIVO.18'),
                tx('M0F-04-ITERATIVO.19'),
                tx('M0F-04-ITERATIVO.20'),
              ],
              { style: STILE_ETICHETTA },
            ),

            // Formule VERE, bloccate: sono il modello dato. Il giocatore scrive
            // solo B9 e B15 (areaLibera piu' sotto), le due celle che chiudono
            // il ciclo — tutto il resto della catena e' gia' qui.
            blocco('B10', [['=B2-B9']], { style: STILE_FORMULA_2DEC }),
            blocco('B11', [['=MAX(0,B10*B4)']], { style: STILE_FORMULA_2DEC }),
            blocco('B12', [['=B10-B11']], { style: STILE_FORMULA_2DEC }),
            blocco('B13', [['=B12-B3']], { style: STILE_FORMULA_2DEC }),
            blocco('B14', [['=MIN(B13,B6)']], { style: STILE_FORMULA_2DEC }),
            blocco('B16', [['=(B6+B15)/2']], { style: STILE_FORMULA_2DEC }),

            areaLibera(['B9', 'B15']),
          ],
          { colWidths: { A: 320, B: 130 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0F-04-ITERATIVO.21'),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0F-04-ITERATIVO.22'),
          8,
        ),
        hint(
          'H3',
          tx('M0F-04-ITERATIVO.23'),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      iterativeCalculation: true,
      startAt: 'Model!B9',
    };
  },
});
