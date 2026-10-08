/**
 * M1 · 08 — D&A schedule per cespite: il registro, non l'aggregato.
 *
 * M1-07 (TREPROSPETTI) prende il D&A dell'anno gia' come un unico numero
 * aggregato — li' il punto era il collegamento fra i tre prospetti, non la
 * costruzione dell'ammortamento. Qui si torna indietro e si costruisce quel
 * numero come lo costruisce davvero un registro cespiti (asset register): un
 * elenco di cespiti, ciascuno con il proprio costo storico e la propria vita
 * utile, ciascuno con la propria quota di ammortamento annua — che poi si
 * sommano in un fondo ammortamento cumulato.
 *
 * TRE TASK, TRE LIVELLI DI DETTAGLIO CRESCENTE:
 *
 *   T1 — l'ammortamento annuo di CIASCUN cespite (metodo a quote costanti:
 *        costo storico / vita utile), una riga per cespite. Il target e'
 *        l'intera colonna, non una cella sola: il punto didattico e' che la
 *        formula del primo cespite, trascinata giu' sugli altri, deve restare
 *        IDENTICA (a meno della traslazione di riga) — esattamente il check
 *        `consistentRow` di m0b/07-consistenza-riga.ts, riusato qui su un
 *        caso reale invece che su una proiezione. Nota deliberata: questo
 *        task NON verifica il valore numerico di ogni riga (consistentRow
 *        controlla solo la coerenza strutturale) — la correttezza del numero
 *        e' verificata indirettamente da T2, che incatena la SUM di questa
 *        colonna: una formula sbagliata ma coerente (es. moltiplicazione
 *        invece di divisione) passerebbe T1 ma farebbe fallire T2.
 *
 *   T2 — il fondo ammortamento CUMULATO di fine anno: il fondo che c'era gia'
 *        (dato, aggregato, bloccato — rappresenta gli anni precedenti) piu'
 *        la somma degli ammortamenti dell'anno appena costruiti in T1.
 *
 *   T3 — il valore netto contabile TOTALE del parco cespiti: costo storico
 *        complessivo meno il fondo cumulato appena calcolato in T2. E' il
 *        numero che finisce nell'attivo dello Stato Patrimoniale.
 *
 * Geometria: tutta funzione di `nCespiti` (3 o 4, dal seed), mai un
 * letterale fisso — la posizione di FONDO_TITLE_ROW e delle tre righe sotto
 * si sposta se cambia il numero di cespiti.
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
  num,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo } from '../../../rng/distributions';
import type { CellSpec, Task } from '../../types';

import { tx } from '../../../i18n/content';
const CATEGORIE_POOL = () => ([
  tx('M1-08-DASCHEDULE.impianti'),
  tx('M1-08-DASCHEDULE.attrezzature'),
  tx('M1-08-DASCHEDULE.macchinari'),
  tx('M1-08-DASCHEDULE.automezzi'),
  tx('M1-08-DASCHEDULE.1'),
  tx('M1-08-DASCHEDULE.2'),
] as const);

export default defineTemplate({
  id: 'M1-08-DASCHEDULE',
  module: 'M1',
  get title() {
    return tx('M1-08-DASCHEDULE.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 320,
  skills: ['acc.da-schedule', 'xl.row-consistency'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    // Due zone indipendenti: il parco cespiti e il fondo iniziale (che e'
    // ancorato al totale dei cespiti solo DOPO che questi sono generati, ma
    // pesca comunque dal proprio stream cosi' non sposta i cespiti se cambia).
    const rCespiti = rng.fork('cespiti');
    const rFondo = rng.fork('fondo');

    const nCespiti = rCespiti.int(3, 4);
    const categorie = rCespiti.shuffle(CATEGORIE_POOL()).slice(0, nCespiti);

    const cespiti = categorie.map((categoria) => ({
      categoria,
      costoStorico: rCespiti.int(80, 600) * 1000,
      vitaUtile: rCespiti.int(4, 10),
    }));

    const totaleCostoStorico = cespiti.reduce((acc, c) => acc + c.costoStorico, 0);
    const ammortamentiAnnui = cespiti.map((c) => c.costoStorico / c.vitaUtile);
    const totaleAmmortamentoAnnuo = ammortamentiAnnui.reduce((acc, v) => acc + v, 0);

    // Fondo iniziale (anni precedenti): una quota plausibile del costo
    // storico complessivo, cosi' il fondo cumulato finale non "esplode"
    // oltre il costo e il valore netto contabile resta positivo.
    const pctFondoIniziale = rFondo.int(10, 30) / 100;
    const fondoIniziale = roundTo(totaleCostoStorico * pctFondoIniziale, 1000);

    const fondoCumulatoFinale = fondoIniziale + totaleAmmortamentoAnnuo;
    const valoreNettoContabileTotale = totaleCostoStorico - fondoCumulatoFinale;

    // --- Geometria: tutta funzione di nCespiti, nessun letterale fisso. -----
    const HEADER_ROW = 3;
    const CESPITE_ROW_FIRST = HEADER_ROW + 1;
    const CESPITE_ROW_LAST = CESPITE_ROW_FIRST + nCespiti - 1;

    const FONDO_TITLE_ROW = CESPITE_ROW_LAST + 2;
    const R_FONDO_INIZ = FONDO_TITLE_ROW + 1;
    const R_FONDO_FIN = FONDO_TITLE_ROW + 2;
    const R_VNC = FONDO_TITLE_ROW + 3;

    const rangeAmmortamenti = `D${CESPITE_ROW_FIRST}:D${CESPITE_ROW_LAST}`;
    const rangeCosti = `B${CESPITE_ROW_FIRST}:B${CESPITE_ROW_LAST}`;
    const cellsAmmortamento = Array.from({ length: nCespiti }, (_, i) => `D${CESPITE_ROW_FIRST + i}`);
    const cellsCosti = Array.from({ length: nCespiti }, (_, i) => `B${CESPITE_ROW_FIRST + i}`);

    const cellsAmmortamentoSpec: CellSpec[] = cellsAmmortamento.map((ref) => ({
      ref,
      content: null,
      locked: false,
      style: STILE_FORMULA,
    }));

    // T1 — coerenza di riga sull'intera colonna: scritto a mano (non
    // taskFormula) perche' il target e' un range, non una cella sola, e
    // l'unico check che ha senso qui e' la coerenza strutturale (vedi
    // commento di testa: la correttezza numerica la verifica T2).
    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M1-08-DASCHEDULE.4', { CESPITE_ROW_FIRST, CESPITE_ROW_LAST }),
      targetCell: `Model!${rangeAmmortamenti}`,
      check: [
        { kind: 'consistentRow', range: `Model!${rangeAmmortamenti}` },
        { kind: 'noError' },
      ],
      skills: ['acc.da-schedule', 'xl.row-consistency'],
      minKeystrokes: 8,
    };

    const t2 = (() => {
      const base = taskFormula({
        id: 'T2',
        prompt:
          tx('M1-08-DASCHEDULE.5', { R_FONDO_FIN, R_FONDO_INIZ, rangeAmmortamenti }),
        target: `Model!B${R_FONDO_FIN}`,
        atteso: fondoCumulatoFinale,
        referenzia: [`B${R_FONDO_INIZ}`, ...cellsAmmortamento],
        senzaLiteral: [],
        skills: ['acc.da-schedule'],
        minKeystrokes: 18,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUM'] }] };
    })();

    const t3 = (() => {
      const base = taskFormula({
        id: 'T3',
        prompt:
          tx('M1-08-DASCHEDULE.6', { R_VNC, rangeCosti, R_FONDO_FIN }),
        target: `Model!B${R_VNC}`,
        atteso: valoreNettoContabileTotale,
        referenzia: [...cellsCosti, `B${R_FONDO_FIN}`],
        senzaLiteral: [],
        skills: ['acc.da-schedule'],
        minKeystrokes: 16,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUM'] }] };
    })();

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-08-DASCHEDULE',
      seed: rng.seed,
      brief: [tx('M1-08-DASCHEDULE.7', { p0: num(nCespiti) }), ...cespiti.map(
          (c) =>
            tx('M1-08-DASCHEDULE.8', { p0: c.categoria, p1: eur(c.costoStorico), p2: num(c.vitaUtile) }),
        ), tx('M1-08-DASCHEDULE.9', { p0: eur(fondoIniziale) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M1-08-DASCHEDULE.10')], { style: STILE_TITOLO }),
            riga(
              `A${HEADER_ROW}`,
              [tx('M1-08-DASCHEDULE.11'), tx('M1-08-DASCHEDULE.12'), tx('M1-08-DASCHEDULE.13'), tx('M1-08-DASCHEDULE.14')],
              { style: STILE_TITOLO },
            ),
            colonna(
              `A${CESPITE_ROW_FIRST}`,
              cespiti.map((c) => c.categoria),
              { style: STILE_ETICHETTA },
            ),
            blocco(
              `B${CESPITE_ROW_FIRST}`,
              cespiti.map((c) => [c.costoStorico]),
              { style: STILE_INPUT },
            ),
            blocco(
              `C${CESPITE_ROW_FIRST}`,
              cespiti.map((c) => [c.vitaUtile]),
              { style: STILE_INPUT },
            ),
            cellsAmmortamentoSpec,

            riga(`A${FONDO_TITLE_ROW}`, [tx('M1-08-DASCHEDULE.15')], { style: STILE_TITOLO }),
            colonna(
              `A${R_FONDO_INIZ}`,
              [
                tx('M1-08-DASCHEDULE.16'),
                tx('M1-08-DASCHEDULE.17'),
                tx('M1-08-DASCHEDULE.18'),
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco(`B${R_FONDO_INIZ}`, [[fondoIniziale]], { style: STILE_INPUT }),
            [{ ref: `B${R_FONDO_FIN}`, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: `B${R_VNC}`, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 300, B: 160, C: 130, D: 170 }, frozenRows: HEADER_ROW },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M1-08-DASCHEDULE.19', { CESPITE_ROW_FIRST, CESPITE_ROW_LAST }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M1-08-DASCHEDULE.20'),
          6,
          'T1',
        ),
        hint(
          'H3',
          tx('M1-08-DASCHEDULE.21', { R_FONDO_INIZ, rangeAmmortamenti }),
          10,
          'T2',
        ),
        hint(
          'H4',
          tx('M1-08-DASCHEDULE.22', { rangeCosti, R_FONDO_FIN }),
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 80 }),
      startAt: `Model!D${CESPITE_ROW_FIRST}`,
    };
  },
});
