/**
 * M3 · 02 — Il Cash Conversion Cycle: DSO, DIO, DPO.
 *
 * Stessa skill di M3-01 (nwc.cycle), un livello di dettaglio in piu'. In
 * M3-01 il NWC nasceva da tre poste di fine periodo (crediti + rimanenze -
 * debiti) senza chiedersi QUANTO fossero grandi rispetto al giro d'affari
 * dell'azienda. Qui si aggiunge quella dimensione temporale: le stesse tre
 * poste commerciali, lette come NUMERO DI GIORNI rispetto al flusso che le
 * genera.
 *
 *   DSO (Days Sales Outstanding)     = Crediti commerciali / Fatturato x 365
 *   DIO (Days Inventory Outstanding) = Rimanenze / COGS x 365
 *   DPO (Days Payable Outstanding)   = Debiti commerciali / Acquisti x 365
 *
 *   Cash Conversion Cycle (CCC) = DSO + DIO - DPO
 *
 * Il CCC e' il numero di giorni che intercorrono, in media, fra il momento in
 * cui l'azienda paga cassa per produrre/acquistare (fornitori) e il momento
 * in cui la incassa di nuovo dai clienti. Un CCC POSITIVO e' cassa che resta
 * "congelata" nel ciclo operativo per quel numero di giorni: DSO e DIO sono
 * giorni in cui la cassa e' gia' uscita (o non e' ancora entrata) ma non e'
 * disponibile; DPO SI SOTTRAE perche' e' l'opposto — sono giorni in cui i
 * fornitori stanno finanziando l'azienda, cassa che l'azienda non ha ancora
 * dovuto sborsare. Piu' DPO, meno capitale l'azienda deve anticipare di
 * tasca propria: e' lo stesso motivo per cui in M3-01 i debiti commerciali si
 * SOTTRAGGONO dal NWC, qui si ribadisce lo stesso segno da un'altra
 * angolazione.
 *
 * ACQUISTI vs COGS (scelta dichiarata): non li facciamo coincidere. Nella
 * realta' gli acquisti dell'anno differiscono dal costo del venduto per la
 * variazione di magazzino (Acquisti = COGS + ΔRimanenze); questo livello non
 * ha una ΔRimanenze come dato esplicito, quindi generiamo gli acquisti con un
 * fattore indipendente plausibile (0,85x-1,15x del COGS) invece di derivarli
 * esattamente — restano vicini al COGS ma non identici, cosi' DPO usa il suo
 * proprio denominatore invece di riciclare quello di DIO.
 *
 * Geometria fissa: nessuna riga dipende dal seed, quindi i riferimenti di
 * cella sono letterali per costruzione (come in M3-01).
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
  STILE_INPUT,
  STILE_TITOLO,
  eur,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import { roundTo } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
/** Giorni con una cifra decimale: DSO/DIO/DPO/CCC non sono mai numeri interi puliti. */
const STILE_FORMULA_GIORNI: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0.0' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_FATTURATO = 'B4'; // Fatturato annuo (dato, bloccato)
const B_COGS = 'B5'; // Costo del venduto annuo (dato, bloccato)
const B_ACQUISTI = 'B6'; // Acquisti da fornitori annui (dato, bloccato)
const B_CREDITI = 'B7'; // Crediti commerciali, fine periodo (dato, bloccato)
const B_RIMANENZE = 'B8'; // Rimanenze, fine periodo (dato, bloccato)
const B_DEBITI = 'B9'; // Debiti commerciali, fine periodo (dato, bloccato)

const B_DSO = 'B12'; // T1
const B_DIO = 'B13'; // T2
const B_DPO = 'B14'; // T3
const B_CCC = 'B16'; // T4

export default defineTemplate({
  id: 'M3-02-DSODIODPO',
  module: 'M3',
  get title() {
    return tx('M3-02-DSODIODPO.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['nwc.cycle'],
  prerequisites: ['M3-01-COSAENWC'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Dati di base dell'anno. --------------------------------------------
    const fatturato = r.int(3000, 25000) * 1000; // 3m - 25m
    const cogsRatio = 0.45 + r.next() * 0.35; // 45%-80% del fatturato
    const cogs = roundTo(fatturato * cogsRatio, 1000);

    // Acquisti: vicini al COGS ma non identici (vedi commento in testa al file).
    const acquistiFattore = 0.85 + r.next() * 0.3; // 0,85x - 1,15x del COGS
    const acquisti = roundTo(cogs * acquistiFattore, 1000);

    // Le tre poste di fine periodo si costruiscono a partire da un numero di
    // giorni "target" plausibile, cosi' i valori in euro restano coerenti con
    // il giro d'affari dell'azienda invece di essere estratti a caso.
    const dsoTarget = r.int(25, 75);
    const dioTarget = r.int(20, 90);
    const dpoTarget = r.int(20, 80);

    const crediti = roundTo((fatturato * dsoTarget) / 365, 1000);
    const rimanenze = roundTo((cogs * dioTarget) / 365, 1000);
    const debiti = roundTo((acquisti * dpoTarget) / 365, 1000);

    // Valori attesi: ricalcolati dai dati EFFETTIVI (post-arrotondamento a
    // migliaia), non dai target — sono quelli che la formula del giocatore
    // deve effettivamente produrre.
    const dso = (crediti / fatturato) * 365;
    const dio = (rimanenze / cogs) * 365;
    const dpo = (debiti / acquisti) * 365;
    const ccc = dso + dio - dpo;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M3-02-DSODIODPO.2', { B_DSO, B_CREDITI, B_FATTURATO }),
      target: `Model!${B_DSO}`,
      atteso: dso,
      referenzia: [B_CREDITI, B_FATTURATO],
      senzaLiteral: [365],
      skills: ['nwc.cycle'],
      minKeystrokes: 11,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M3-02-DSODIODPO.3', { B_DIO, B_RIMANENZE, B_COGS }),
      target: `Model!${B_DIO}`,
      atteso: dio,
      referenzia: [B_RIMANENZE, B_COGS],
      senzaLiteral: [365],
      skills: ['nwc.cycle'],
      minKeystrokes: 11,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M3-02-DSODIODPO.4', { B_DPO, B_DEBITI, B_ACQUISTI }),
      target: `Model!${B_DPO}`,
      atteso: dpo,
      referenzia: [B_DEBITI, B_ACQUISTI],
      senzaLiteral: [365],
      skills: ['nwc.cycle'],
      minKeystrokes: 11,
    });

    const t4 = taskFormula({
      id: 'T4',
      prompt:
        tx('M3-02-DSODIODPO.5', { B_CCC, B_DSO, B_DIO, B_DPO }),
      target: `Model!${B_CCC}`,
      atteso: ccc,
      referenzia: [B_DSO, B_DIO, B_DPO],
      senzaLiteral: [],
      skills: ['nwc.cycle'],
      minKeystrokes: 13,
    });

    const tasks = [t1, t2, t3, t4];

    return {
      templateId: 'M3-02-DSODIODPO',
      seed: rng.seed,
      brief: [tx('M3-02-DSODIODPO.6', { p0: eur(fatturato), p1: eur(cogs), p2: eur(acquisti), p3: eur(crediti), p4: eur(rimanenze), p5: eur(debiti), p6: eur(acquisti), p7: eur(cogs) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M3-02-DSODIODPO.7')], { style: STILE_TITOLO }),

            riga('A3', [tx('M3-02-DSODIODPO.8')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M3-02-DSODIODPO.9'),
                tx('M3-02-DSODIODPO.10'),
                tx('M3-02-DSODIODPO.11'),
                tx('M3-02-DSODIODPO.12'),
                tx('M3-02-DSODIODPO.13'),
                tx('M3-02-DSODIODPO.14'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_FATTURATO, content: fatturato, style: STILE_INPUT, locked: true },
              { ref: B_COGS, content: cogs, style: STILE_INPUT, locked: true },
              { ref: B_ACQUISTI, content: acquisti, style: STILE_INPUT, locked: true },
              { ref: B_CREDITI, content: crediti, style: STILE_INPUT, locked: true },
              { ref: B_RIMANENZE, content: rimanenze, style: STILE_INPUT, locked: true },
              { ref: B_DEBITI, content: debiti, style: STILE_INPUT, locked: true },
            ],

            riga('A11', [tx('M3-02-DSODIODPO.15')], { style: STILE_TITOLO }),
            colonna(
              'A12',
              [
                tx('M3-02-DSODIODPO.16'),
                tx('M3-02-DSODIODPO.17'),
                tx('M3-02-DSODIODPO.18'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_DSO, content: null, locked: false, style: STILE_FORMULA_GIORNI },
              { ref: B_DIO, content: null, locked: false, style: STILE_FORMULA_GIORNI },
              { ref: B_DPO, content: null, locked: false, style: STILE_FORMULA_GIORNI },
            ],

            [{ ref: 'A16', content: tx('M3-02-DSODIODPO.19'), locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_CCC, content: null, locked: false, style: STILE_FORMULA_GIORNI }],
          ],
          { colWidths: { A: 420, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M3-02-DSODIODPO.20', { B_CREDITI, B_FATTURATO }), 8, 'T1'),
        hint('H2', tx('M3-02-DSODIODPO.21', { B_RIMANENZE, B_COGS }), 8, 'T2'),
        hint('H3', tx('M3-02-DSODIODPO.22', { B_DEBITI, B_ACQUISTI }), 8, 'T3'),
        hint(
          'H4',
          `=${B_DSO}+${B_DIO}-${B_DPO}: DSO piu' DIO, meno DPO. Il DPO si sottrae, non si somma.`,
          8,
          'T4',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 75 }),
      startAt: `Model!${B_DSO}`,
    };
  },
});
