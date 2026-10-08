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
  num,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import { roundTo } from '../../../rng/distributions';

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
  title: 'Il Cash Conversion Cycle: DSO, DIO, DPO',
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
        `In ${B_DSO} calcola il DSO (Days Sales Outstanding): quanti giorni, in media, l'azienda ` +
        `impiega a incassare le proprie vendite. Formula: crediti commerciali (${B_CREDITI}) diviso ` +
        `fatturato annuo (${B_FATTURATO}), moltiplicato per 365 (i giorni dell'anno). Il 365 e' l'unico ` +
        'numero che scrivi a mano: il resto sono riferimenti.',
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
        `In ${B_DIO} calcola il DIO (Days Inventory Outstanding): quanti giorni, in media, la merce ` +
        `resta ferma in magazzino prima di essere venduta. Formula: rimanenze (${B_RIMANENZE}) diviso ` +
        `costo del venduto annuo — COGS — (${B_COGS}), moltiplicato per 365. Stessa struttura del task ` +
        "precedente, cambiano solo le poste: qui non c'entra il fatturato, perche' le rimanenze sono " +
        "valorizzate al costo, non al prezzo di vendita.",
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
        `In ${B_DPO} calcola il DPO (Days Payable Outstanding): quanti giorni, in media, l'azienda ` +
        `impiega a pagare i propri fornitori. Formula: debiti commerciali (${B_DEBITI}) diviso acquisti ` +
        `da fornitori annui (${B_ACQUISTI}), moltiplicato per 365. Nota il denominatore: non e' il COGS ` +
        "del task precedente, sono gli acquisti — la posta da cui i debiti verso fornitori nascono " +
        'davvero.',
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
        `In ${B_CCC} calcola il Cash Conversion Cycle: DSO (${B_DSO}) piu' DIO (${B_DIO}) meno DPO ` +
        `(${B_DPO}). Non ricalcolare nulla da zero: i tre numeri li hai gia' appena trovati, questo task ` +
        "e' solo combinarli. Un CCC positivo sono giorni di cassa \"congelata\" nel ciclo operativo — il " +
        "tempo che passa fra quando l'azienda deve pagare per produrre/comprare e quando incassa di " +
        "nuovo dai clienti. Il DPO si SOTTRAE perche' e' l'unica delle tre poste che gioca a favore della " +
        "cassa: finche' l'azienda non paga i fornitori, e' come se loro le stessero prestando i soldi. " +
        "Piu' DPO, meno capitale deve anticiparci di tasca propria — lo stesso segno gia' visto in M3-01, " +
        'dove i debiti commerciali si sottraevano dal NWC.',
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
      brief: [
        '## Il Cash Conversion Cycle: DSO, DIO, DPO',
        '',
        "In M3-01 hai costruito il NWC da tre poste di fine periodo: crediti, rimanenze e debiti " +
          "commerciali. Sapevi QUANTO valeva ciascuna, ma non quanto fosse grande rispetto al giro " +
          "d'affari dell'azienda che la genera. E' quello che aggiunge questo livello: le stesse tre " +
          'poste, lette come numero di GIORNI.',
        '',
        '> **DSO** = Crediti commerciali / Fatturato × 365 — giorni medi per incassare le vendite',
        '> **DIO** = Rimanenze / COGS × 365 — giorni medi che la merce resta in magazzino',
        '> **DPO** = Debiti commerciali / Acquisti × 365 — giorni medi per pagare i fornitori',
        '',
        '> **Cash Conversion Cycle (CCC) = DSO + DIO − DPO**',
        '',
        "Il CCC misura quanti giorni passano, in media, fra il momento in cui l'azienda tira fuori " +
          'cassa (per produrre o comprare merce) e il momento in cui la incassa di nuovo dai clienti. ' +
          "DSO e DIO sono entrambi giorni in cui la cassa e' gia' uscita — o non ancora entrata — ma " +
          "non e' disponibile: si sommano. DPO e' l'opposto: sono i giorni in cui sono i FORNITORI a " +
          "finanziare l'azienda, perche' lei non li ha ancora pagati — per questo si SOTTRAE. E' lo " +
          "stesso segno che hai gia' usato in M3-01, dove i debiti commerciali si sottraevano dal NWC: " +
          "piu' debiti (o piu' DPO), meno cassa che l'azienda deve anticipare di tasca propria.",
        '',
        `Dati dell'anno: fatturato ${eur(fatturato)}, costo del venduto (COGS) ${eur(cogs)}, acquisti ` +
          `da fornitori ${eur(acquisti)}. A fine periodo: crediti commerciali ${eur(crediti)}, ` +
          `rimanenze ${eur(rimanenze)}, debiti commerciali ${eur(debiti)}.`,
        '',
        `Nota che acquisti e COGS NON coincidono (${eur(acquisti)} contro ${eur(cogs)}): nella realta' ` +
          'differiscono per la variazione di magazzino durante l\'anno. Usa il denominatore giusto per ' +
          'ogni rapporto, come indicato in ciascun task.',
        '',
        `Calcola DSO, DIO e DPO uno alla volta (task 1-3), poi combinali nel Cash Conversion Cycle ` +
          `(task 4). Con questi dati il CCC risulta di circa ${num(ccc, 0)} giorni.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Il Cash Conversion Cycle: DSO, DIO, DPO'], { style: STILE_TITOLO }),

            riga('A3', ["Dati dell'anno"], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Fatturato annuo, €',
                'Costo del venduto (COGS) annuo, €',
                'Acquisti da fornitori annui, €',
                'Crediti commerciali (fine periodo), €',
                'Rimanenze (fine periodo), €',
                'Debiti commerciali (fine periodo), €',
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

            riga('A11', ['Cash Conversion Cycle (in giorni)'], { style: STILE_TITOLO }),
            colonna(
              'A12',
              [
                'DSO (Days Sales Outstanding), giorni',
                'DIO (Days Inventory Outstanding), giorni',
                'DPO (Days Payable Outstanding), giorni',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_DSO, content: null, locked: false, style: STILE_FORMULA_GIORNI },
              { ref: B_DIO, content: null, locked: false, style: STILE_FORMULA_GIORNI },
              { ref: B_DPO, content: null, locked: false, style: STILE_FORMULA_GIORNI },
            ],

            [{ ref: 'A16', content: 'Cash Conversion Cycle, giorni', locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_CCC, content: null, locked: false, style: STILE_FORMULA_GIORNI }],
          ],
          { colWidths: { A: 420, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `=${B_CREDITI}/${B_FATTURATO}*365: crediti diviso fatturato, per 365.`, 8, 'T1'),
        hint('H2', `=${B_RIMANENZE}/${B_COGS}*365: rimanenze diviso COGS, per 365.`, 8, 'T2'),
        hint('H3', `=${B_DEBITI}/${B_ACQUISTI}*365: debiti diviso acquisti, per 365.`, 8, 'T3'),
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
