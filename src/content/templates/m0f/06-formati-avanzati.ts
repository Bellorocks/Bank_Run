/**
 * M0-F · 06 — Tre formati che si vedono in ogni modello IB/PE.
 *
 * Punto didattico: qui il vestito del numero non e' un dettaglio estetico, e'
 * un CODICE che i lettori di un modello danno per scontato:
 *  - `#,##0;(#,##0);-` — il formato contabile. I negativi fra parentesi, MAI
 *    col segno meno: e' lo standard di mestiere, e la sezione zero (`-`) e'
 *    il trattino che si vede al posto di uno zero "vero".
 *  - `0.0x` — il moltiplicatore. EV/EBITDA, leva, qualunque rapporto che si
 *    legge come "6,4 volte", mai come una percentuale o un numero nudo.
 *  - `#,##0,` — la scala in migliaia. La virgola finale non e' un separatore:
 *    divide per mille SOLO in facciata. Il valore salvato in cella resta
 *    quello pieno; e' cosi' che un modello mostra "42.500" invece di
 *    "42.500.000" senza toccare un solo numero sottostante.
 *
 * NOTA SUL COME SI APPLICA IL FORMATO. In `src/keymap/bindings.ts` esiste
 * `Ctrl+1` (`format.cellsDialog`), ma non ha logica in `src/game/session.ts`
 * ne' un dialogo nella UI: non c'e' un modo di digitare un formato custom a
 * mano dentro questo trainer (stessa famiglia di lacune di `structure.group`,
 * gia' segnalata altrove nel batch). Non era questo compito ad implementare
 * quella feature.
 *
 * La strada usata qui e' pero' REALE, non un ripiego: `clipboard.pasteFormats`
 * (`Ctrl+Alt+V`, poi `T`) e' implementato per intero in `session.ts` e fa
 * esattamente quello che fa in Excel vero — incolla SOLO il formato di una
 * cella su un'altra, lasciando contenuto e formula del bersaglio intatti.
 * Ogni blocco qui sotto ha quindi una cella "campione", bloccata, gia' vestita
 * col formato giusto: il giocatore scrive la formula nella cella libera, poi
 * copia il campione e incolla-solo-formato sul bersaglio. E' la tecnica che
 * si usa davvero quando si eredita un modello con uno standard di formattazione
 * gia' fissato altrove nel foglio: si copia il vestito, non si reinventa.
 * Il check `numberFormat` e' quindi vincolante per davvero (rank 3 →
 * `enforceStyle`), e lo diventa con un gesto che il motore sa eseguire.
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
  STILE_TITOLO,
  eur,
  multiplo,
  pct,
} from '../../authoring';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
/** Formato contabile: negativi fra parentesi, zero mostrato come trattino. */
const FORMATO_CONTABILE = '#,##0;(#,##0);-';
/** Moltiplicatore, come si scrive un EV/EBITDA o una leva. */
const FORMATO_MULTIPLO = '0.0x';
/** Scala in migliaia: la virgola finale divide per mille solo in facciata. */
const FORMATO_MIGLIAIA = '#,##0,';

const STILE_CAMPIONE_CONTABILE = { ...STILE_FORMULA, numFmt: FORMATO_CONTABILE };
const STILE_CAMPIONE_MULTIPLO = { ...STILE_FORMULA, numFmt: FORMATO_MULTIPLO };
const STILE_CAMPIONE_MIGLIAIA = { ...STILE_FORMULA, numFmt: FORMATO_MIGLIAIA };

export default defineTemplate({
  id: 'M0F-06-FORMATIAVANZATI',
  module: 'M0-F',
  get title() {
    return tx('M0F-06-FORMATIAVANZATI.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['xl.numfmt', 'spd.paste-special'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Blocco 1: scostamento EBITDA, formato contabile -------------------
    // Costruito apposta sotto budget: lo shortfall minimo (4% su un budget
    // di almeno 1,5 mln) e' sempre di gran lunga piu' grande della
    // granularita' dell'arrotondamento (10.000), quindi il segno resta
    // negativo per costruzione, su ogni seed.
    const ebitdaBudget = r.int(6, 18) * 250_000;
    const shortfallFrac = 0.04 + r.next() * 0.14;
    const ebitdaEffettivo = Math.round((ebitdaBudget * (1 - shortfallFrac)) / 10_000) * 10_000;
    const scostamento = ebitdaEffettivo - ebitdaBudget;
    const esempioContabile = -(r.int(200, 900));

    // --- Blocco 2: multiplo EV/EBITDA, formato 0.0x -------------------------
    const evMultiploTarget = 5 + r.next() * 4;
    const enterpriseValue = Math.round((ebitdaEffettivo * evMultiploTarget) / 100_000) * 100_000;
    const multiploAtteso = enterpriseValue / ebitdaEffettivo;
    const esempioMultiplo = Math.round((3 + r.next() * 7) * 10) / 10;

    // --- Blocco 3: ricavi totali in migliaia, formato #,##0, ---------------
    const ricaviItalia = r.int(15, 45) * 1_000_000;
    const ricaviEstero = r.int(5, 25) * 1_000_000;
    const ricaviTotali = ricaviItalia + ricaviEstero;
    const esempioMigliaia = r.int(2, 9) * 1_000_000;

    const t1Base = taskFormula({
      id: 'T1',
      prompt:
        tx('M0F-06-FORMATIAVANZATI.2'),
      target: 'Model!B5',
      atteso: scostamento,
      referenzia: ['B4', 'B3'],
      senzaLiteral: [],
      skills: ['xl.numfmt'],
      minKeystrokes: 14,
    });
    const t1: Task = {
      ...t1Base,
      check: [
        ...t1Base.check,
        {
          kind: 'numberFormat' as const,
          expected: FORMATO_CONTABILE,
          message:
            tx('M0F-06-FORMATIAVANZATI.3'),
        },
      ],
    };

    const t2Base = taskFormula({
      id: 'T2',
      prompt:
        tx('M0F-06-FORMATIAVANZATI.4'),
      target: 'Model!B8',
      atteso: multiploAtteso,
      referenzia: ['B7', 'B4'],
      senzaLiteral: [],
      skills: ['xl.numfmt'],
      minKeystrokes: 14,
    });
    const t2: Task = {
      ...t2Base,
      check: [
        ...t2Base.check,
        {
          kind: 'numberFormat' as const,
          expected: FORMATO_MULTIPLO,
          message:
            tx('M0F-06-FORMATIAVANZATI.5'),
        },
      ],
    };

    const t3Base = taskFormula({
      id: 'T3',
      prompt:
        tx('M0F-06-FORMATIAVANZATI.6'),
      target: 'Model!B12',
      atteso: ricaviTotali,
      referenzia: ['B10', 'B11'],
      senzaLiteral: [],
      skills: ['xl.numfmt'],
      minKeystrokes: 16,
    });
    const t3: Task = {
      ...t3Base,
      check: [
        ...t3Base.check,
        {
          kind: 'numberFormat' as const,
          expected: FORMATO_MIGLIAIA,
          message:
            tx('M0F-06-FORMATIAVANZATI.7'),
        },
      ],
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0F-06-FORMATIAVANZATI',
      seed: rng.seed,
      brief: [tx('M0F-06-FORMATIAVANZATI.8', { FORMATO_CONTABILE, FORMATO_MULTIPLO, FORMATO_MIGLIAIA, p3: eur(ebitdaBudget), p4: eur(ebitdaEffettivo), p5: eur(enterpriseValue), p6: eur(ricaviItalia), p7: eur(ricaviEstero) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0F-06-FORMATIAVANZATI.9')], { style: STILE_TITOLO }),

            blocco('A3', [[tx('M0F-06-FORMATIAVANZATI.10')], [tx('M0F-06-FORMATIAVANZATI.11')], [tx('M0F-06-FORMATIAVANZATI.12')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('B3', [[ebitdaBudget], [ebitdaEffettivo]], { style: STILE_INPUT }),
            blocco('D3', [[tx('M0F-06-FORMATIAVANZATI.13')]], { style: STILE_ETICHETTA }),
            blocco('E3', [[esempioContabile]], { style: STILE_CAMPIONE_CONTABILE }),

            blocco('A7', [[tx('M0F-06-FORMATIAVANZATI.14')], [tx('M0F-06-FORMATIAVANZATI.15')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('B7', [[enterpriseValue]], { style: STILE_INPUT }),
            blocco('D7', [[tx('M0F-06-FORMATIAVANZATI.16')]], { style: STILE_ETICHETTA }),
            blocco('E7', [[esempioMultiplo]], { style: STILE_CAMPIONE_MULTIPLO }),

            blocco('A10', [[tx('M0F-06-FORMATIAVANZATI.17')], [tx('M0F-06-FORMATIAVANZATI.18')], [tx('M0F-06-FORMATIAVANZATI.19')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('B10', [[ricaviItalia], [ricaviEstero]], { style: STILE_INPUT }),
            blocco('D10', [[tx('M0F-06-FORMATIAVANZATI.20')]], { style: STILE_ETICHETTA }),
            blocco('E10', [[esempioMigliaia]], { style: STILE_CAMPIONE_MIGLIAIA }),

            areaLibera(['B5', 'B8', 'B12']),
          ],
          { colWidths: { A: 280, B: 150, C: 20, D: 210, E: 110 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0F-06-FORMATIAVANZATI.h1'),
          12,
          'T1',
        ),
        hint(
          'H2',
          tx('M0F-06-FORMATIAVANZATI.h2', { p0: multiplo(multiploAtteso) }),
          12,
          'T2',
        ),
        hint(
          'H3',
          tx('M0F-06-FORMATIAVANZATI.21', { p0: pct(shortfallFrac) }),
          12,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 95 }),
      startAt: 'Model!B5',
    };
  },
});
