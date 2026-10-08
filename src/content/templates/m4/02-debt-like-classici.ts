/**
 * M4 · 02 — Debt-like items classici: TFR, fondo pensione, leasing IFRS16.
 *
 * Secondo mattone del bridge EV-equity:
 *
 *   Equity Value = Enterprise Value - Net Debt (base) - Σ debt-like items +
 *                  Σ cash-like items - Minorities + Partecipazioni non consolidate
 *
 * M4-01 ha insegnato il Net Debt di BASE (debito finanziario lordo - cassa).
 * Questo livello introduce il pezzo successivo: le poste italiane "classiche"
 * che il modulo M1 ha gia' fatto costruire come schedule contabili — TFR
 * (M1-04), fondo pensione (variante dello stesso rollforward) e passivita'
 * leasing IFRS16 (M1-10) — e le fa RICONOSCERE come equivalenti a debito nel
 * bridge, anche se non compaiono mai nella voce "debito finanziario" del
 * bilancio.
 *
 * Il punto didattico e' interamente concettuale, non aritmetico: perche' TFR,
 * fondo pensione e leasing sono "debt-like"? Perche' sono impegni CERTI verso
 * terzi — i dipendenti per TFR e fondo pensione, la controparte del contratto
 * di leasing — che un compratore erediterebbe e dovrebbe onorare esattamente
 * come un mutuo bancario, anche se tecnicamente non sono "debito finanziario"
 * in senso stretto (non hanno un tasso di interesse esplicito ne' una banca
 * come controparte). Per questo si SOMMANO al Net Debt di base: piu' alto e'
 * il Net Debt, piu' basso e' l'Equity Value a parita' di Enterprise Value —
 * il compratore paga di meno per l'equity perche' si sta accollando anche
 * questi impegni.
 *
 * Nota di continuita' con l'architettura del modulo: il Net Debt di base qui
 * sotto e' un DATO bloccato generato da questo stesso template (il "risultato
 * di un M4-01 concettuale"), non un riferimento letterale a un'altra
 * istanza — ogni LevelInstance e' autosufficiente.
 *
 * Layout fisso (nessuno shuffle di righe o colonne): la posizione delle
 * quattro poste debt-like non dipende MAI dal seed, quindi i riferimenti
 * sotto sono letterali di proposito, come in M1-10.
 */

import {
  defineTemplate,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio. -------------------------------------------
const ROW_TITOLO = 1;
const ROW_SEZ_BASE = 3; // "Net Debt di base"
const ROW_NETDEBT_BASE = 4;

const ROW_SEZ_DEBTLIKE = 6; // "Poste debt-like classiche"
const ROW_TFR = 7;
const ROW_FONDO = 8;
const ROW_LEASING = 9;

const ROW_SEZ_TOT = 11; // "Net Debt aggiustato"
const ROW_T1 = 12; // Totale poste debt-like classiche
const ROW_T2 = 13; // Net Debt aggiustato

const B_NETDEBT_BASE = `B${ROW_NETDEBT_BASE}`;
const B_TFR = `B${ROW_TFR}`;
const B_FONDO = `B${ROW_FONDO}`;
const B_LEASING = `B${ROW_LEASING}`;
const B_T1 = `B${ROW_T1}`;
const B_T2 = `B${ROW_T2}`;

export default defineTemplate({
  id: 'M4-02-DEBTLIKECLASSICI',
  module: 'M4',
  get title() {
    return tx('M4-02-DEBTLIKECLASSICI.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['ev.debt-like'],
  prerequisites: ['M4-01-NETDEBT'],

  generate: (rng) => {
    // Quattro sotto-stream indipendenti: scalare una posta non deve spostare
    // di un euro le altre, ne' il Net Debt di base.
    const rBase = rng.fork('net-debt-base');
    const rTfr = rng.fork('tfr');
    const rFondo = rng.fork('fondo-pensione');
    const rLeasing = rng.fork('leasing');

    const netDebtBase = roundTo(triangular(rBase, 1_000_000, 3_000_000, 8_000_000), 10_000);
    const tfr = roundTo(triangular(rTfr, 150_000, 300_000, 520_000), 1000);
    const fondoPensione = roundTo(triangular(rFondo, 50_000, 150_000, 400_000), 1000);
    const leasing = roundTo(triangular(rLeasing, 100_000, 400_000, 1_500_000), 1000);

    const totaleDebtLike = tfr + fondoPensione + leasing;
    const netDebtAggiustato = netDebtBase + totaleDebtLike;

    const t1: Task = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M4-02-DEBTLIKECLASSICI.2', { B_T1, B_TFR, B_FONDO, B_LEASING }),
        target: `Model!${B_T1}`,
        atteso: totaleDebtLike,
        referenzia: [B_TFR, B_FONDO, B_LEASING],
        senzaLiteral: [],
        skills: ['ev.debt-like'],
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
        tx('M4-02-DEBTLIKECLASSICI.3', { B_T2, B_NETDEBT_BASE, B_T1 }),
      target: `Model!${B_T2}`,
      atteso: netDebtAggiustato,
      referenzia: [B_NETDEBT_BASE, B_T1],
      senzaLiteral: [],
      skills: ['ev.debt-like'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M4-02-DEBTLIKECLASSICI',
      seed: rng.seed,
      brief: [tx('M4-02-DEBTLIKECLASSICI.4', { p0: eur(tfr), p1: eur(fondoPensione), p2: eur(leasing), p3: eur(netDebtBase) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M4-02-DEBTLIKECLASSICI.5')], {
              style: STILE_TITOLO,
            }),

            riga(`A${ROW_SEZ_BASE}`, [tx('M4-02-DEBTLIKECLASSICI.6')], { style: STILE_TITOLO }),
            [
              {
                ref: `A${ROW_NETDEBT_BASE}`,
                content: tx('M4-02-DEBTLIKECLASSICI.7'),
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_NETDEBT_BASE, content: netDebtBase, locked: true, style: STILE_INPUT },
            ],

            riga(`A${ROW_SEZ_DEBTLIKE}`, [tx('M4-02-DEBTLIKECLASSICI.8')], { style: STILE_TITOLO }),
            [
              {
                ref: `A${ROW_TFR}`,
                content: tx('M4-02-DEBTLIKECLASSICI.9'),
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_TFR, content: tfr, locked: true, style: STILE_INPUT },
              { ref: `A${ROW_FONDO}`, content: tx('M4-02-DEBTLIKECLASSICI.10'), locked: true, style: STILE_ETICHETTA },
              { ref: B_FONDO, content: fondoPensione, locked: true, style: STILE_INPUT },
              {
                ref: `A${ROW_LEASING}`,
                content: tx('M4-02-DEBTLIKECLASSICI.11'),
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_LEASING, content: leasing, locked: true, style: STILE_INPUT },
            ],

            riga(`A${ROW_SEZ_TOT}`, [tx('M4-02-DEBTLIKECLASSICI.12')], { style: STILE_TITOLO }),
            [
              {
                ref: `A${ROW_T1}`,
                content: tx('M4-02-DEBTLIKECLASSICI.13'),
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_T1, content: null, locked: false, style: STILE_FORMULA },
              {
                ref: `A${ROW_T2}`,
                content: tx('M4-02-DEBTLIKECLASSICI.14'),
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_T2, content: null, locked: false, style: STILE_TOTALE },
            ],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: ROW_SEZ_BASE },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M4-02-DEBTLIKECLASSICI.15', { B_TFR, B_LEASING }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M4-02-DEBTLIKECLASSICI.16', { B_NETDEBT_BASE, B_T1 }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: `Model!${B_T1}`,
    };
  },
});
