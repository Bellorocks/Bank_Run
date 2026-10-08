/**
 * M4 · 10 — Prezzo per azione: l'ultimo passo del bridge.
 *
 * QUESTO E' IL LIVELLO DI CHIUSURA del modulo M4. Non insegna un concetto
 * nuovo: sintetizza in un unico numero l'intera catena costruita dal modulo,
 * dal primo livello all'ultimo:
 *
 *   Enterprise Value
 *     -> Net Debt (base)                              (M4-01)
 *     -> - Σ debt-like + Σ cash-like                   (M4-02, M4-03, M4-04)
 *     -> Equity Value (grezzo)                         (M4-05, il COMBO)
 *     -> - Minorities + Partecipazioni non consolidate (M4-06)
 *     -> Equity Value (di pertinenza del gruppo)
 *     -> / Azioni fully diluted                        (M4-07, M4-08, M4-09)
 *     -> Prezzo per azione
 *
 * Le tre fonti di diluizione viste nel modulo — opzioni con il Treasury
 * Stock Method (M4-07), warrant con lo stesso metodo (M4-08), bond
 * convertibili con l'if-converted test (M4-09) — arrivano qui gia' RISOLTE:
 * ognuna e' un dato bloccato, il risultato concettuale del proprio livello,
 * non una cella live condivisa (nessun template di questo progetto referenzia
 * letteralmente una cella di un altro file). Il compito di QUESTO livello e'
 * unicamente sommarle in un unico numero di azioni fully diluted, e poi
 * dividere l'Equity Value di pertinenza del gruppo per quel numero.
 *
 * I DUE TASK:
 *
 *   1. Azioni fully diluted = azioni ordinarie in circolazione + diluizione
 *      netta da opzioni + diluizione netta da warrant + diluizione EFFETTIVA
 *      da convertibili. Le quattro voci si sommano sempre e comunque: non
 *      c'e' nessuna condizione da valutare qui, quella e' gia' stata risolta
 *      a monte (nei rispettivi livelli). La diluizione da convertibili puo'
 *      essere zero per alcuni seed — coerente con M4-09, dove il bond resta
 *      debito se il test if-converted fallisce — ma la formula del giocatore
 *      e' identica in entrambi i casi: SOMMA tutto, sempre.
 *   2. Prezzo per azione = Equity Value di pertinenza del gruppo / azioni
 *      fully diluted (appena calcolate al task 1). Qui si vede perche' tutto
 *      il lavoro sulla diluizione conta davvero: lo stesso Equity Value,
 *      diviso per un numero di azioni piu' alto (quello fully diluted invece
 *      delle sole azioni ordinarie), da' SEMPRE un prezzo per azione piu'
 *      basso. Ignorare la diluizione significa sistematicamente
 *      sovrastimare quanto vale ogni singola azione.
 *
 * Geometria fissa: nessuna riga dipende dal seed (quattro dati, due task in
 * cascata), quindi i riferimenti sotto sono letterali per costruzione, come
 * in m4/06-minorities-bridge.ts e m4/09-convertibili.ts.
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
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

import { tx } from '../../../i18n/content';
// Stile locale: il prezzo per azione va a due decimali (un formato non
// coperto da STILE_TOTALE, che e' senza decimali) — come il prezzo corrente
// per azione in m4/09-convertibili.ts.
const STILE_TOTALE_PREZZO: CellStyle = {
  fontColor: MODEL_COLORS.formula,
  bold: true,
  numFmt: '#,##0.00',
  borders: { top: { style: 'thin' } },
};

// --- Geometria fissa: non dipende dal seed. --------------------------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3; // "Dati (i risultati gia' risolti del modulo)"
const ROW_EQV = 4;
const ROW_AZIONI_ORD = 5;
const ROW_DIL_OPZIONI = 6;
const ROW_DIL_WARRANT = 7;
const ROW_DIL_CONVERTIBILI = 8;

const ROW_SEZ2 = 10; // "Dall'Equity Value al prezzo per azione"
const ROW_T1 = 11;
const ROW_T2 = 12;

const B_EQV = `B${ROW_EQV}`;
const B_AZIONI_ORD = `B${ROW_AZIONI_ORD}`;
const B_DIL_OPZIONI = `B${ROW_DIL_OPZIONI}`;
const B_DIL_WARRANT = `B${ROW_DIL_WARRANT}`;
const B_DIL_CONVERTIBILI = `B${ROW_DIL_CONVERTIBILI}`;
const B_T1 = `B${ROW_T1}`;
const B_T2 = `B${ROW_T2}`;

export default defineTemplate({
  id: 'M4-10-PREZZOPERAZIONE',
  module: 'M4',
  get title() {
    return tx('M4-10-PREZZOPERAZIONE.title');
  },
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['ev.price-per-share'],
  prerequisites: ['M4-06-MINORITIESBRIDGE', 'M4-09-CONVERTIBILI'],

  generate: (rng) => {
    const rEqv = rng.fork('eqv');
    const rAzioni = rng.fork('azioni');
    const rOpzioni = rng.fork('opzioni');
    const rWarrant = rng.fork('warrant');
    const rConvBool = rng.fork('conv-bool');
    const rConvImporto = rng.fork('conv-importo');

    // Equity Value di pertinenza del gruppo (dato, bloccato): il risultato
    // concettuale di M4-06 — questo livello non lo ricostruisce, parte da
    // qui.
    const equityValueGruppo = rEqv.int(80, 400) * 1_000_000;

    // Azioni ordinarie in circolazione (dato, bloccato): il numero di azioni
    // OGGI, prima di qualunque diluizione potenziale.
    const azioniOrdinarie = rAzioni.int(20, 120) * 1_000_000;

    // Diluizione netta da opzioni (dato, bloccato): il risultato concettuale
    // di M4-07 (Treasury Stock Method) — gia' al netto del riacquisto
    // ipotetico finanziato dallo strike incassato.
    const diluzioneOpzioni = rOpzioni.int(200_000, 2_000_000);

    // Diluizione netta da warrant (dato, bloccato): il risultato concettuale
    // di M4-08, stesso metodo, tipicamente importi piu' contenuti perche' i
    // warrant in circolazione sono di norma meno numerosi delle stock option.
    const diluzioneWarrant = rWarrant.int(100_000, 1_200_000);

    // Diluizione EFFETTIVA da convertibili (dato, bloccato): il risultato
    // concettuale di M4-09, gia' risolto con l'if-converted test — PUO'
    // essere zero (bond out of the money, resta debito) per circa meta' dei
    // seed, esattamente come in M4-09. La formula del giocatore al task 1
    // non deve MAI dipendere da quale caso e' uscito: somma sempre, che il
    // valore sia zero o positivo.
    const inTheMoney = rConvBool.bool();
    const diluzioneConvertibili = inTheMoney ? rConvImporto.int(300_000, 3_000_000) : 0;

    const azioniFullyDiluted =
      azioniOrdinarie + diluzioneOpzioni + diluzioneWarrant + diluzioneConvertibili;
    const prezzoPerAzione = equityValueGruppo / azioniFullyDiluted;

    const t1 = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M4-10-PREZZOPERAZIONE.2', { B_T1, B_AZIONI_ORD, B_DIL_OPZIONI, B_DIL_WARRANT, B_DIL_CONVERTIBILI }),
        target: `Model!${B_T1}`,
        atteso: azioniFullyDiluted,
        referenzia: [B_AZIONI_ORD, B_DIL_OPZIONI, B_DIL_WARRANT, B_DIL_CONVERTIBILI],
        senzaLiteral: [],
        skills: ['ev.price-per-share'],
        minKeystrokes: 20,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUM'] }],
      };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M4-10-PREZZOPERAZIONE.3', { B_T2, B_EQV, B_T1 }),
      target: `Model!${B_T2}`,
      atteso: prezzoPerAzione,
      referenzia: [B_EQV, B_T1],
      senzaLiteral: [],
      skills: ['ev.price-per-share'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M4-10-PREZZOPERAZIONE',
      seed: rng.seed,
      brief: [tx('M4-10-PREZZOPERAZIONE.4', { p0: eur(equityValueGruppo), p1: num(azioniOrdinarie), p2: num(diluzioneOpzioni), p3: num(diluzioneWarrant), p4: num(diluzioneConvertibili) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M4-10-PREZZOPERAZIONE.5')], { style: STILE_TITOLO }),

            riga(`A${ROW_SEZ1}`, [tx('M4-10-PREZZOPERAZIONE.6')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_EQV}`,
              [
                tx('M4-10-PREZZOPERAZIONE.7'),
                tx('M4-10-PREZZOPERAZIONE.8'),
                tx('M4-10-PREZZOPERAZIONE.9'),
                tx('M4-10-PREZZOPERAZIONE.10'),
                tx('M4-10-PREZZOPERAZIONE.11'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EQV, content: equityValueGruppo, style: STILE_INPUT, locked: true }],
            [{ ref: B_AZIONI_ORD, content: azioniOrdinarie, style: STILE_INPUT, locked: true }],
            [{ ref: B_DIL_OPZIONI, content: diluzioneOpzioni, style: STILE_INPUT, locked: true }],
            [{ ref: B_DIL_WARRANT, content: diluzioneWarrant, style: STILE_INPUT, locked: true }],
            [{ ref: B_DIL_CONVERTIBILI, content: diluzioneConvertibili, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, [tx('M4-10-PREZZOPERAZIONE.12')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_T1}`,
              [tx('M4-10-PREZZOPERAZIONE.13'), tx('M4-10-PREZZOPERAZIONE.14')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_T1, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_T2, content: null, locked: false, style: STILE_TOTALE_PREZZO }],
          ],
          { colWidths: { A: 460, B: 150 }, frozenRows: ROW_SEZ1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M4-10-PREZZOPERAZIONE.15', { B_AZIONI_ORD, B_DIL_OPZIONI, B_DIL_WARRANT, B_DIL_CONVERTIBILI }),
          12,
          'T1',
        ),
        hint(
          'H2',
          tx('M4-10-PREZZOPERAZIONE.16', { B_EQV, B_T1, p2: num(prezzoPerAzione, 2) }),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 150 }),
      startAt: `Model!${B_T1}`,
    };
  },
});
