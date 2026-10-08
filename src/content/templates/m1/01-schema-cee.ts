/**
 * M1 · 01 — Schema di Conto Economico CEE (art. 2425 c.c., forma scalare).
 *
 * Prima esposizione del giocatore alla contabilita' italiana: un elenco grezzo
 * di voci di Conto Economico, ciascuna gia' etichettata con la sua classe (A o
 * B), da sommare nello schema scalare del codice civile. Non e' un esercizio a
 * se stante: "A) Valore della produzione" e "B) Costi della produzione" sono i
 * due totali su cui si costruira' tutto il resto del modulo M1
 * (riclassificazioni, EBITDA, i tre prospetti collegati). Per questo il livello
 * e' GUIDED — celle target evidenziate, hint sempre disponibile — ed e' la
 * primissima pietra, non una verifica di velocita'.
 *
 * Le righe non vengono mai mescolate per seed: restano nell'ordine fisso
 * "prima tutte le A, poi tutte le B". Cio' che varia da seed a seed e' quali
 * voci di classe B compaiono (4 o 5 delle 6 possibili) e i loro importi — mai
 * la loro posizione relativa, quindi ogni indirizzo di formula qui sotto e'
 * calcolato dalle stesse variabili di riga usate per costruire il foglio, mai
 * scritto come letterale.
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
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
/** Voci di classe A — "Valore della produzione". Sempre tutte e tre presenti. */
const CLASSE_A = () => ([
  tx('M1-01-SCHEMACEE.1'),
  tx('M1-01-SCHEMACEE.2'),
  tx('M1-01-SCHEMACEE.3'),
] as const);

/**
 * Voci di classe B — "Costi della produzione". Il livello ne mostra 4 o 5 delle
 * 6 possibili, sempre nello stesso ordine relativo: e' cosi' che il totale
 * righe resta fra 7 e 8 (§ brief) senza mai riordinare la lista.
 */
const CLASSE_B_POOL = () => ([
  tx('M1-01-SCHEMACEE.4'),
  tx('M1-01-SCHEMACEE.5'),
  tx('M1-01-SCHEMACEE.6'),
  tx('M1-01-SCHEMACEE.7'),
  tx('M1-01-SCHEMACEE.ammortamenti'),
  tx('M1-01-SCHEMACEE.8'),
] as const);

/** Peso di ciascuna voce B come frazione dei ricavi, stesso ordine di CLASSE_B_POOL. */
const B_FRAZIONI: readonly { min: number; mode: number; max: number }[] = [
  { min: 0.22, mode: 0.32, max: 0.45 }, // Costi per materie prime e merci
  { min: 0.1, mode: 0.16, max: 0.24 }, // Costi per servizi
  { min: 0.02, mode: 0.04, max: 0.07 }, // Costi per godimento di beni di terzi
  { min: 0.15, mode: 0.24, max: 0.34 }, // Costo del personale
  { min: 0.02, mode: 0.035, max: 0.06 }, // Ammortamenti
  { min: 0.01, mode: 0.02, max: 0.04 }, // Altri costi operativi
];

export default defineTemplate({
  id: 'M1-01-SCHEMACEE',
  module: 'M1',
  get title() {
    return tx('M1-01-SCHEMACEE.title');
  },
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 260,
  skills: ['acc.cee'],
  prerequisites: ['M0A-03-AGGREGAZIONI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Classe A: sempre tutte e tre le voci. ---------------------------
    const ricavi = r.int(2000, 15000) * 1000; // 2.000.000 - 15.000.000, step 1.000
    const variazioneRimanenze = r.int(-300, 300) * 1000; // puo' essere negativa: e' una variazione, non un ricavo puro
    const altriRicavi = r.int(50, 600) * 1000;
    const valoriA = [ricavi, variazioneRimanenze, altriRicavi];

    // --- Classe B: 4 o 5 voci su 6, ordine relativo mai alterato. --------
    const bCount = r.int(4, 5);
    const bIndiciTutti = CLASSE_B_POOL().map((_voce, i) => i);
    const bIndiciScelti = r.shuffle(bIndiciTutti).slice(0, bCount).sort((a, b) => a - b);
    const classeB = bIndiciScelti.map((i) => CLASSE_B_POOL()[i]);
    const valoriB = bIndiciScelti.map((i) => {
      const f = B_FRAZIONI[i];
      return roundTo(triangular(r, f.min * ricavi, f.mode * ricavi, f.max * ricavi), 500);
    });

    const vociTotali = [...CLASSE_A(), ...classeB];
    const classiTotali = [...CLASSE_A().map(() => 'A'), ...classeB.map(() => 'B')];
    const importiTotali = [...valoriA, ...valoriB];

    const sommaA = valoriA.reduce((a, b) => a + b, 0);
    const sommaB = valoriB.reduce((a, b) => a + b, 0);
    const differenza = sommaA - sommaB;

    // --- Geometria: righe calcolate, mai letterali. -----------------------
    const HEADER_ROW = 3;
    const A_ROW_FIRST = HEADER_ROW + 1; // 4
    const A_ROW_LAST = A_ROW_FIRST + CLASSE_A().length - 1; // 6
    const B_ROW_FIRST = A_ROW_LAST + 1; // 7
    const B_ROW_LAST = B_ROW_FIRST + classeB.length - 1; // 10 o 11
    const RIEP_TITLE_ROW = B_ROW_LAST + 2;
    const R1 = RIEP_TITLE_ROW + 1; // A) Valore della produzione
    const R2 = RIEP_TITLE_ROW + 2; // B) Costi della produzione
    const R3 = RIEP_TITLE_ROW + 3; // Differenza (A-B)

    const rangeA = `C${A_ROW_FIRST}:C${A_ROW_LAST}`;
    const rangeB = `C${B_ROW_FIRST}:C${B_ROW_LAST}`;

    const t1 = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M1-01-SCHEMACEE.10', { R1, p1: CLASSE_A().length, A_ROW_FIRST, A_ROW_LAST }),
        target: `Model!C${R1}`,
        atteso: sommaA,
        referenzia: [`C${A_ROW_FIRST}`, `C${A_ROW_LAST}`],
        skills: ['acc.cee'],
        minKeystrokes: 13,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUM'] }] };
    })();

    const t2 = (() => {
      const base = taskFormula({
        id: 'T2',
        prompt:
          tx('M1-01-SCHEMACEE.11', { R2, p1: classeB.length, B_ROW_FIRST, B_ROW_LAST }),
        target: `Model!C${R2}`,
        atteso: sommaB,
        referenzia: [`C${B_ROW_FIRST}`, `C${B_ROW_LAST}`],
        skills: ['acc.cee'],
        minKeystrokes: 15,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUM'] }] };
    })();

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M1-01-SCHEMACEE.12', { R3, R1, R2 }),
      target: `Model!C${R3}`,
      atteso: differenza,
      referenzia: [`C${R1}`, `C${R2}`],
      senzaLiteral: [],
      skills: ['acc.cee'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-01-SCHEMACEE',
      seed: rng.seed,
      brief: [tx('M1-01-SCHEMACEE.13')].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M1-01-SCHEMACEE.14')], { style: STILE_TITOLO }),
            riga(`A${HEADER_ROW}`, [tx('M1-01-SCHEMACEE.15'), tx('M1-01-SCHEMACEE.23'), tx('M1-01-SCHEMACEE.16')], { style: STILE_TITOLO }),
            colonna(`A${A_ROW_FIRST}`, vociTotali, { style: STILE_ETICHETTA }),
            colonna(`B${A_ROW_FIRST}`, classiTotali, { style: STILE_ETICHETTA }),
            blocco(
              `C${A_ROW_FIRST}`,
              importiTotali.map((v) => [v]),
              { style: STILE_INPUT },
            ),
            riga(`A${RIEP_TITLE_ROW}`, [tx('M1-01-SCHEMACEE.24')], { style: STILE_TITOLO }),
            colonna(
              `A${R1}`,
              [
                tx('M1-01-SCHEMACEE.17'),
                tx('M1-01-SCHEMACEE.18'),
                tx('M1-01-SCHEMACEE.19'),
              ],
              { style: STILE_ETICHETTA },
            ),
            areaLibera([`C${R1}`, `C${R2}`, `C${R3}`]),
          ],
          { colWidths: { A: 340, B: 60, C: 130 }, frozenRows: HEADER_ROW },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M1-01-SCHEMACEE.20', { rangeA }), 8, 'T1'),
        hint('H2', tx('M1-01-SCHEMACEE.21', { rangeB }), 8, 'T2'),
        hint('H3', tx('M1-01-SCHEMACEE.22', { R1, R2 }), 6, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!C${R1}`,
    };
  },
});
