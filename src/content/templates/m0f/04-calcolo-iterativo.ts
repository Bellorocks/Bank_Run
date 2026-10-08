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

/** Assumption in milioni di euro, un decimale: EBITDA, capex, debito. */
const STILE_INPUT_1DEC: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0.0' };
/** Righe dello schedule, in milioni di euro con due decimali: qui vive la circolarita'. */
const STILE_FORMULA_2DEC: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0.00' };

export default defineTemplate({
  id: 'M0F-04-ITERATIVO',
  module: 'M0-F',
  title: 'Il cerchio che si chiude da solo',
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
          'In B9 scrivi gli interessi: il tasso di interesse (B5) per il debito MEDIO del periodo, ' +
          "che sta in B16, otto righe piu' in basso. Si': quando scrivi questa formula B16 e' ancora " +
          "una cella che dipende da questa stessa B9 — leggi il riquadro sopra la tabella prima di " +
          "scriverla, e' voluto.",
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
              'Gli interessi non tornano. Ricontrolla che B9 legga B5 (tasso) e B16 (debito medio), ' +
              'e che tu abbia gia premuto F9 da cella ferma per far girare il calcolo iterativo.',
          },
        ],
        skills: ['xl.iterative'],
        minKeystrokes: 10,
      },
      {
        id: 'T2',
        prompt:
          "In B15 chiudi lo schedule: il debito di fine periodo e' il debito iniziale (B6) meno il " +
          "rimborso di cassa gia' calcolato in B14. Questa e' la cella che chiude davvero l'anello: da " +
          "qui parte B16 (debito medio), che alimenta di nuovo gli interessi in B9. Il valore che vedrai " +
          "dopo aver ricalcolato e' quello STABILE, dopo che il motore ha smesso di correggerlo.",
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
              'Il debito di fine periodo non torna. Deve essere B6 meno B14, e deve essere gia ' +
              'convergente: premi F9 da cella ferma (non in modifica) prima di controllare il numero.',
          },
        ],
        skills: ['xl.iterative'],
        minKeystrokes: 10,
      },
    ];

    return {
      templateId: 'M0F-04-ITERATIVO',
      seed: rng.seed,
      brief: [
        '## Il cerchio che si chiude da solo',
        '',
        'Un debt schedule di un solo periodo, ridotto ai suoi ingredienti minimi: EBITDA, un debito, un',
        `tasso. EBITDA ${num(ebitda, 1)} milioni, capex fissi ${num(capex, 1)} milioni, aliquota fiscale`,
        `${pct(taxRate)}, tasso di interesse ${pct(tasso)}, debito iniziale ${num(debito, 1)} milioni.`,
        '',
        'La catena e\':',
        '',
        '**interessi -> EBT -> utile netto -> cassa disponibile -> rimborso -> debito di fine periodo ->',
        'debito medio -> interessi**',
        '',
        "Nota l'ultima freccia: torna al punto di partenza. Gli interessi si calcolano sul debito MEDIO",
        "del periodo (media fra inizio e fine), ma il debito di fine periodo dipende dal rimborso, che",
        "dipende dalla cassa rimasta DOPO aver pagato gli interessi. Per sapere quanto debito rimane devi",
        'gia\' sapere gli interessi; per sapere gli interessi devi gia\' sapere quanto debito rimane.',
        '',
        "Non e' un errore di progettazione del foglio: e' cosi' che funziona un vero debt schedule con",
        'interessi sul debito medio, in ogni banca di investimento. E non esiste NESSUN ordine in cui',
        "calcolare le celle una alla volta che risolva questo anello: qualunque cella tu scelga di",
        'calcolare per prima, ti servirebbe gia\' il risultato di un\'altra cella che viene dopo di lei.',
        "E' esattamente per questo che Excel, di fronte a un ciclo A -> B -> A, normalmente si rifiuta e",
        'segnala `#CYCLE!` (o, nella versione vera del programma, un errore di riferimento circolare).',
        '',
        'La soluzione e\' il **calcolo iterativo**: invece di pretendere un ordine che non esiste, si parte',
        'da un valore provvisorio (zero, a freddo) su tutte le celle del ciclo e si ricalcola l\'intera',
        'catena piu\' e piu\' volte, ogni giro un po\' piu\' vicino al punto in cui i numeri smettono di',
        'cambiare. In Excel vero si attiva da **File > Opzioni > Formule > Abilita calcolo iterativo**,',
        'con **Numero massimo di iterazioni = 100** e **Variazione massima = 0,001**: sono esattamente i',
        'due numeri che questo motore usa di default. In questo livello il calcolo iterativo e\' gia\'',
        'attivo: non devi cercarlo in nessun menu.',
        '',
        "Quello che NON e' automatico e' il ricalcolo: qui gira quando lo chiedi tu, con **F9** premuto",
        "da una cella ferma (non mentre stai scrivendo una formula — quell'F9 fa un'altra cosa, vista in",
        "un altro livello). Scrivi le due formule che chiudono l'anello, poi premi F9: il motore esegue",
        "gli sweep e i numeri si stabilizzano. Se il valore ti sembra ancora sbagliato, ricontrolla di",
        "aver ricalcolato PRIMA di leggerlo.",
        '',
        'La tabella sotto ha gia\' scritte, bloccate, tutte le celle della catena tranne due: gli',
        '**interessi** (B9) e il **debito di fine periodo** (B15). Sono proprio le due celle che chiudono',
        "il cerchio — il resto e' gia' pronto, per tenere l'attenzione sul punto vero del livello.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Debt schedule con interessi circolari'], { style: STILE_TITOLO }),
            colonna(
              'A2',
              [
                'EBITDA (€m)',
                'Capex fissi (€m)',
                'Aliquota fiscale',
                'Tasso di interesse annuo',
                'Debito iniziale (€m)',
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[ebitda]], { style: STILE_INPUT_1DEC }),
            blocco('B3', [[capex]], { style: STILE_INPUT_1DEC }),
            blocco('B4', [[taxRate]], { style: STILE_INPUT_PCT }),
            blocco('B5', [[tasso]], { style: STILE_INPUT_PCT }),
            blocco('B6', [[debito]], { style: STILE_INPUT_1DEC }),

            riga('A8', ['Conto economico e cassa disponibile (€m)'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'Interessi sul debito medio',
                'EBT (EBITDA - interessi)',
                'Imposte',
                'Utile netto',
                'Cassa disponibile per il rimborso',
                'Rimborso (cash sweep)',
                'Debito di fine periodo',
                'Debito medio del periodo',
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
          'Interessi = tasso per debito medio: `=B5*B16`. B16 e\' piu\' in basso e dipende da B9 — e\' normale, e\' il ciclo di cui parla il brief.',
          10,
          'T1',
        ),
        hint(
          'H2',
          'Se dopo aver scritto la formula vedi ancora #CYCLE! (o un numero che non torna), non hai ancora ricalcolato: premi F9 da cella ferma, non in modifica.',
          8,
        ),
        hint(
          'H3',
          'Debito di fine periodo = debito iniziale meno rimborso: `=B6-B14`. Poi F9 di nuovo per vedere il valore convergente.',
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
