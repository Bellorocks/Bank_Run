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
  title: 'Tre formati da mestiere',
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
        'In B5 calcola lo scostamento EBITDA: effettivo meno budget. Il numero verra\' negativo — ' +
        'lascialo cosi\', il formato ci pensa a mostrarlo fra parentesi. Poi vestilo: copia la cella ' +
        'campione E3 (Ctrl+C), seleziona B5, e incolla solo il formato con Ctrl+Alt+V seguito da T. ' +
        'La formula che hai scritto non cambia: cambia solo come Excel la disegna.',
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
            'Il numero e\' giusto ma manca il vestito contabile: copia il formato dalla cella campione ' +
            '(Ctrl+C su E3, poi su B5 Ctrl+Alt+V e T) invece di lasciare il segno meno.',
        },
      ],
    };

    const t2Base = taskFormula({
      id: 'T2',
      prompt:
        'In B8 calcola il multiplo EV/EBITDA: Enterprise Value diviso l\'EBITDA effettivo che hai gia\' ' +
        'in B4. Poi copia il formato dalla cella campione E7 (Ctrl+C, poi su B8 Ctrl+Alt+V e T): un ' +
        'multiplo si legge "6,4x", non "6,4" e non "640%".',
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
            'Il numero e\' giusto ma manca la "x": copia il formato dalla cella campione E7 (Ctrl+C, ' +
            'poi su B8 Ctrl+Alt+V e T).',
        },
      ],
    };

    const t3Base = taskFormula({
      id: 'T3',
      prompt:
        'In B12 somma Ricavi Italia e Ricavi estero. Poi copia il formato dalla cella campione E10 ' +
        '(Ctrl+C, poi su B12 Ctrl+Alt+V e T): la virgola finale del formato divide per mille SOLO in ' +
        'facciata, il valore salvato in cella resta quello pieno.',
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
            'Il numero e\' giusto ma non e\' in scala: copia il formato dalla cella campione E10 ' +
            '(Ctrl+C, poi su B12 Ctrl+Alt+V e T).',
        },
      ],
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0F-06-FORMATIAVANZATI',
      seed: rng.seed,
      brief: [
        '## Tre vestiti che si leggono senza pensarci',
        '',
        'Un formato numerico non cambia il numero, cambia solo come Excel lo disegna — lo hai gia\' ' +
        'visto con la valuta e la percentuale. Qui trovi tre formati **custom**, di quelli che non ' +
        'hanno una scorciatoia dedicata e si copiano da una cella che li ha gia\':',
        '',
        `- **Formato contabile** \`${FORMATO_CONTABILE}\` — i negativi fra **parentesi**, mai col segno ` +
        'meno. E\' lo standard di ogni modello IB/PE: uno scostamento negativo disperso in mezzo a una ' +
        'colonna di numeri positivi si vede a colpo d\'occhio solo se non condivide lo stesso segno "-" ' +
        'di un trattino di sottrazione scritto a mano.',
        `- **Moltiplicatore** \`${FORMATO_MULTIPLO}\` — un rapporto come l\'EV/EBITDA si legge "x", non %.`,
        `- **Scala in migliaia** \`${FORMATO_MIGLIAIA}\` — la virgola finale del formato divide per 1.000 ` +
        'solo nella vista: il numero salvato in cella non si tocca.',
        '',
        'Nessuno di questi tre ha una combinazione di tasti dedicata, e questo trainer non ha ancora un ' +
        'dialogo "Formato celle" con cui digitarli a mano. La soluzione e\' quella che si usa anche in un ' +
        'modello vero quando lo standard di formattazione e\' gia\' fissato altrove nel foglio: **si copia ' +
        'il formato**. Ogni blocco qui sotto ha una casella "Esempio", bloccata, gia\' vestita col formato ' +
        'giusto — copiala (`Ctrl+C`), seleziona la cella dove hai scritto la tua formula, e incolla SOLO ' +
        'il formato con `Ctrl+Alt+V` poi `T`: il contenuto della cella bersaglio non cambia, cambia solo ' +
        'come Excel lo disegna.',
        '',
        '## Il caso',
        '',
        `L'EBITDA di budget era ${eur(ebitdaBudget)}, quello effettivo si e\' fermato a ` +
        `${eur(ebitdaEffettivo)} — uno scostamento negativo che va letto fra parentesi, non con un segno ` +
        'meno perso in mezzo alla colonna.',
        '',
        `L'Enterprise Value dell'operazione e\' ${eur(enterpriseValue)}: diviso l'EBITDA effettivo da\' il ` +
        `multiplo a cui e\' stata valutata l'azienda.`,
        '',
        `Infine i ricavi: ${eur(ricaviItalia)} in Italia e ${eur(ricaviEstero)} all'estero. Sommati sono ` +
        'un numero a otto cifre — in un report li mostri in migliaia, cosi\' si leggono senza contare gli ' +
        'zeri.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Report di valutazione'], { style: STILE_TITOLO }),

            blocco('A3', [['EBITDA di budget (€)'], ['EBITDA effettivo (€)'], ['Scostamento vs budget (€)']], {
              style: STILE_ETICHETTA,
            }),
            blocco('B3', [[ebitdaBudget], [ebitdaEffettivo]], { style: STILE_INPUT }),
            blocco('D3', [['Esempio (formato contabile)']], { style: STILE_ETICHETTA }),
            blocco('E3', [[esempioContabile]], { style: STILE_CAMPIONE_CONTABILE }),

            blocco('A7', [['Enterprise Value (€)'], ['Multiplo EV/EBITDA (su EBITDA effettivo)']], {
              style: STILE_ETICHETTA,
            }),
            blocco('B7', [[enterpriseValue]], { style: STILE_INPUT }),
            blocco('D7', [['Esempio (formato multiplo)']], { style: STILE_ETICHETTA }),
            blocco('E7', [[esempioMultiplo]], { style: STILE_CAMPIONE_MULTIPLO }),

            blocco('A10', [['Ricavi Italia (€)'], ['Ricavi estero (€)'], ["Ricavi totali, in migliaia (€'000)"]], {
              style: STILE_ETICHETTA,
            }),
            blocco('B10', [[ricaviItalia], [ricaviEstero]], { style: STILE_INPUT }),
            blocco('D10', [['Esempio (formato migliaia)']], { style: STILE_ETICHETTA }),
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
          '=B4-B3 in B5. Poi Ctrl+C su E3, torna su B5, Ctrl+Alt+V e premi T: copi il formato, non il numero.',
          12,
          'T1',
        ),
        hint(
          'H2',
          `=B7/B4 in B8 (il multiplo e' ${multiplo(multiploAtteso)}). Poi Ctrl+C su E7, seleziona B8, Ctrl+Alt+V e T.`,
          12,
          'T2',
        ),
        hint(
          'H3',
          `=B10+B11 in B12. Poi Ctrl+C su E10, seleziona B12, Ctrl+Alt+V e T: la scala in migliaia arriva col formato, il totale in cella resta pieno (scostamento ${pct(shortfallFrac)} su budget, per contesto).`,
          12,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 95 }),
      startAt: 'Model!B5',
    };
  },
});
