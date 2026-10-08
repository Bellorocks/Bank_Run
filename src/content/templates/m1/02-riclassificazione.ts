/**
 * M1 · 02 — Riclassificazione: valore aggiunto e margine di contribuzione.
 *
 * Il CE qui sotto arriva GIA' classificato (M1-01 ha gia' insegnato quello):
 * niente disordine da riordinare in questo livello. Il punto didattico e' un
 * altro: lo stesso conto economico si puo' leggere in due modi diversi, con
 * due scopi diversi.
 *
 * - Schema A (valore aggiunto / MOL): raggruppa i costi per NATURA — cosa
 *   l'azienda ha comprato da fuori (materie prime, servizi, beni di terzi) e
 *   cosa ha pagato al proprio personale. E' lo schema che si vede nei bilanci
 *   pubblicati.
 * - Schema B (margine di contribuzione): raggruppa gli STESSI ricavi per
 *   COMPORTAMENTO del costo — variabile o fisso rispetto al volume. E' lo
 *   schema che si usa per le decisioni di breakeven e pricing, e i suoi dati
 *   di costo sono generati in modo indipendente da quelli dello Schema A: non
 *   e' la stessa scomposizione riletta, e' un taglio analitico diverso sullo
 *   stesso business. Il fatturato (Ricavi) e' l'unico numero condiviso fra i
 *   due schemi — appare identico in entrambe le tabelle apposta, per rendere
 *   visibile che la base di partenza e' la stessa.
 *
 * Conseguenza esplicita nel brief: MOL (Schema A) e Margine di contribuzione
 * (Schema B) NON sono la stessa grandezza e non c'e' motivo per cui debbano
 * coincidere. Se il giocatore se lo aspettasse, il livello avrebbe fallito il
 * suo scopo.
 *
 * Geometria del foglio fissa (nessuna riga aggiunta/rimossa/mescolata per
 * seed): gli indirizzi di cella qui sotto possono restare literal.
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
export default defineTemplate({
  id: 'M1-02-RICLASSIFICAZIONE',
  module: 'M1',
  get title() {
    return tx('M1-02-RICLASSIFICAZIONE.title');
  },
  rank: 1,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['acc.reclass'],
  prerequisites: ['M1-01-SCHEMACEE'],

  generate: (rng) => {
    // --- Ricavi: l'unico numero condiviso fra i due schemi. -----------------
    const rBase = rng.fork('base');
    const ricavi = rBase.int(2000, 15000) * 1000; // 2.000.000 - 15.000.000, step 1.000

    // --- Schema A: valore aggiunto / MOL, per natura. ------------------------
    const rA = rng.fork('valoreAggiunto');
    const variazioneRimanenze = rA.int(-300, 300) * 1000;
    const costiMateriePrime = roundTo(triangular(rA, 0.2 * ricavi, 0.3 * ricavi, 0.42 * ricavi), 500);
    const costiServizi = roundTo(triangular(rA, 0.1 * ricavi, 0.16 * ricavi, 0.24 * ricavi), 500);
    const costiGodimento = roundTo(triangular(rA, 0.02 * ricavi, 0.04 * ricavi, 0.07 * ricavi), 500);
    const costoPersonale = roundTo(triangular(rA, 0.15 * ricavi, 0.24 * ricavi, 0.34 * ricavi), 500);

    const valoreAggiunto = ricavi + variazioneRimanenze - (costiMateriePrime + costiServizi + costiGodimento);
    const mol = valoreAggiunto - costoPersonale;

    // --- Schema B: margine di contribuzione, per comportamento. Dati
    // generati da un fork indipendente: cambiare lo Schema A non deve
    // spostare di un euro i numeri dello Schema B, e viceversa. -------------
    const rB = rng.fork('margineContribuzione');
    const costiVariabili = roundTo(triangular(rB, 0.3 * ricavi, 0.42 * ricavi, 0.55 * ricavi), 500);
    const costiFissi = roundTo(triangular(rB, 0.15 * ricavi, 0.22 * ricavi, 0.3 * ricavi), 500);

    const margineContribuzione = ricavi - costiVariabili;

    const t1 = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M1-02-RICLASSIFICAZIONE.2'),
        target: 'Model!B12',
        atteso: valoreAggiunto,
        referenzia: ['B4', 'B5', 'B6', 'B7', 'B8'],
        senzaLiteral: [],
        skills: ['acc.reclass'],
        minKeystrokes: 16,
      });
      return base;
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M1-02-RICLASSIFICAZIONE.3'),
      target: 'Model!B13',
      atteso: mol,
      referenzia: ['B12', 'B9'],
      senzaLiteral: [],
      skills: ['acc.reclass'],
      minKeystrokes: 7,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M1-02-RICLASSIFICAZIONE.4'),
      target: 'Model!B23',
      atteso: margineContribuzione,
      referenzia: ['B18', 'B19'],
      senzaLiteral: [],
      skills: ['acc.reclass'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-02-RICLASSIFICAZIONE',
      seed: rng.seed,
      brief: [tx('M1-02-RICLASSIFICAZIONE.5')].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M1-02-RICLASSIFICAZIONE.6')], { style: STILE_TITOLO }),

            // --- Schema A: valore aggiunto / MOL, per natura. ----------------
            riga('A3', [tx('M1-02-RICLASSIFICAZIONE.7'), tx('M1-02-RICLASSIFICAZIONE.8')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M1-02-RICLASSIFICAZIONE.9'),
                tx('M1-02-RICLASSIFICAZIONE.10'),
                tx('M1-02-RICLASSIFICAZIONE.11'),
                tx('M1-02-RICLASSIFICAZIONE.12'),
                tx('M1-02-RICLASSIFICAZIONE.13'),
                tx('M1-02-RICLASSIFICAZIONE.14'),
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco(
              'B4',
              [
                [ricavi],
                [variazioneRimanenze],
                [costiMateriePrime],
                [costiServizi],
                [costiGodimento],
                [costoPersonale],
              ],
              { style: STILE_INPUT },
            ),
            riga('A11', [tx('M1-02-RICLASSIFICAZIONE.15')], { style: STILE_TITOLO }),
            colonna('A12', [tx('M1-02-RICLASSIFICAZIONE.16'), tx('M1-02-RICLASSIFICAZIONE.17')], {
              style: STILE_ETICHETTA,
            }),
            areaLibera(['B12', 'B13']),

            // --- Schema B: margine di contribuzione, per comportamento. -----
            riga('A15', [tx('M1-02-RICLASSIFICAZIONE.18')], { style: STILE_TITOLO }),
            riga('A17', [tx('M1-02-RICLASSIFICAZIONE.28'), tx('M1-02-RICLASSIFICAZIONE.19')], { style: STILE_TITOLO }),
            colonna(
              'A18',
              [tx('M1-02-RICLASSIFICAZIONE.20'), tx('M1-02-RICLASSIFICAZIONE.21'), tx('M1-02-RICLASSIFICAZIONE.22')],
              { style: STILE_ETICHETTA },
            ),
            blocco('B18', [[ricavi], [costiVariabili], [costiFissi]], { style: STILE_INPUT }),
            riga('A22', [tx('M1-02-RICLASSIFICAZIONE.23')], { style: STILE_TITOLO }),
            colonna('A23', [tx('M1-02-RICLASSIFICAZIONE.24')], { style: STILE_ETICHETTA }),
            areaLibera(['B23']),
          ],
          { colWidths: { A: 380, B: 130 }, frozenRows: 0 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M1-02-RICLASSIFICAZIONE.25'), 10, 'T1'),
        hint('H2', tx('M1-02-RICLASSIFICAZIONE.26'), 8, 'T2'),
        hint('H3', tx('M1-02-RICLASSIFICAZIONE.27'), 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 75 }),
      startAt: 'Model!B12',
    };
  },
});
