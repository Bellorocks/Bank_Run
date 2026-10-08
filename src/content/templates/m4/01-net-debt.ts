/**
 * M4 · 01 — Net Debt: debito finanziario lordo meno cassa, e cosa NON ci va dentro.
 *
 * Primo template del modulo M4 (Enterprise Value <-> Equity Value bridge). Il
 * punto di arrivo del modulo e' il bridge completo:
 *
 *   Equity Value = Enterprise Value - Net Debt (base) - Σ debt-like items +
 *                  Σ cash-like items - Minorities + Partecipazioni non consolidate
 *
 * Questo livello insegna il primo mattone, quello su cui poggia tutto il
 * resto: la definizione BASE di Net Debt.
 *
 *   Net Debt = Debito finanziario lordo - Cassa e mezzi equivalenti
 *
 * Il rischio didattico che il livello mette alla prova non e' l'aritmetica
 * (sottrarre due numeri e' banale) ma la CLASSIFICAZIONE: quali voci di
 * passivo sono "debito finanziario" e quali no. Un elenco misto di voci di
 * passivo contiene sempre due famiglie:
 *
 *   - voci FINANZIARIE: mutui, prestiti obbligazionari, finanziamenti soci
 *     fruttiferi, linee di credito utilizzate — soldi presi in prestito da
 *     una controparte finanziaria, con un costo esplicito (interessi). Queste
 *     ENTRANO nel debito finanziario lordo.
 *   - voci OPERATIVE: debiti verso fornitori, verso il personale, verso
 *     l'erario, verso gli istituti previdenziali — soldi dovuti come parte
 *     normale del ciclo operativo dell'azienda, non un finanziamento. Queste
 *     NON entrano nel debito finanziario lordo, anche se sono "debiti" in
 *     senso contabile: sono gia' (o saranno) dentro il capitale circolante,
 *     non nel net debt. Includerle sarebbe un errore concettuale, non un
 *     dettaglio tecnico: gonfierebbe il net debt e quindi ridurrebbe
 *     l'equity value in modo ingiustificato.
 *
 * Le voci vengono scelte da due pool distinti (finanziarie/operative) e poi
 * RIMESCOLATE insieme in ordine casuale (non raggruppate per tipo), cosi' che
 * "prendi le prime righe" non sia mai una scorciatoia che funziona per caso —
 * l'unico modo corretto di isolare le voci giuste e' leggere la colonna Tipo.
 *
 * Geometria: DATA_END dipende da `n` (5 o 6, deciso a runtime dal seed), ma
 * tutti i riferimenti sotto sono calcolati come funzione di DATA_START/n, mai
 * scritti come letterali fissi.
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
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

const FINANZIARIE = [
  'Mutuo bancario a medio termine',
  'Prestito obbligazionario',
  'Finanziamento soci fruttifero',
  'Linea di credito bancaria a breve (utilizzata)',
] as const;

const OPERATIVE = [
  'Debiti verso fornitori',
  'Debiti verso il personale per stipendi da pagare',
  "Debiti tributari (IVA da versare)",
  'Debiti verso istituti previdenziali',
] as const;

interface Voce {
  readonly descrizione: string;
  readonly tipo: 'finanziario' | 'operativo';
  readonly importo: number;
}

// --- Geometria fissa dell'intestazione: non dipende dal seed. --------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3; // "Passivo: voci da classificare"
const ROW_HEADER = 4; // Voce | Tipo | Importo (€)
const DATA_START = 5;

export default defineTemplate({
  id: 'M4-01-NETDEBT',
  module: 'M4',
  title: 'Net Debt: cosa entra e cosa no',
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 260,
  skills: ['ev.net-debt'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // 5 o 6 voci totali, con un mix garantito: almeno due finanziarie e
    // almeno due operative (mai un solo tipo, altrimenti SUM e SUMIF
    // darebbero lo stesso risultato e il livello non insegnerebbe niente).
    const n = r.int(5, 6);
    const kFinanziarie = r.int(2, n - 2);
    const kOperative = n - kFinanziarie;

    const descrizioniFinanziarie = r.shuffle([...FINANZIARIE]).slice(0, kFinanziarie);
    const descrizioniOperative = r.shuffle([...OPERATIVE]).slice(0, kOperative);

    const vociFinanziarie: Voce[] = descrizioniFinanziarie.map((descrizione) => ({
      descrizione,
      tipo: 'finanziario',
      // Debito finanziario vero: importi piu' consistenti (mutui, bond).
      importo: roundTo(triangular(r, 300_000, 900_000, 3_000_000), 1000),
    }));
    const vociOperative: Voce[] = descrizioniOperative.map((descrizione) => ({
      descrizione,
      tipo: 'operativo',
      // Debiti del ciclo operativo: importi tipicamente piu' contenuti.
      importo: roundTo(triangular(r, 50_000, 250_000, 900_000), 1000),
    }));

    // Rimescolate insieme: nell'elenco che il giocatore vede, finanziarie e
    // operative non sono raggruppate.
    const voci: Voce[] = r.shuffle([...vociFinanziarie, ...vociOperative]);

    const cassa = r.int(100, 1500) * 1000; // Cassa e mezzi equivalenti (dato, bloccato)

    const DATA_END = DATA_START + n - 1;
    const ROW_SEZ2 = DATA_END + 2; // "Altri dati"
    const ROW_CASSA = ROW_SEZ2 + 1;
    const ROW_SEZ3 = ROW_CASSA + 2; // "Net Debt"
    const ROW_T1 = ROW_SEZ3 + 1; // Debito finanziario lordo
    const ROW_T2 = ROW_T1 + 1; // Net Debt

    const rifTipo = `B${DATA_START}`;
    const rifImporti = `C${DATA_START}`;
    const C_CASSA = `C${ROW_CASSA}`;
    const C_T1 = `C${ROW_T1}`;
    const C_T2 = `C${ROW_T2}`;

    const debitoFinanziarioLordo = voci
      .filter((v) => v.tipo === 'finanziario')
      .reduce((acc, v) => acc + v.importo, 0);
    const totaleElencoCompleto = voci.reduce((acc, v) => acc + v.importo, 0);
    const netDebt = debitoFinanziarioLordo - cassa;

    const t1: Task = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          `In ${C_T1} calcola il debito finanziario lordo: la somma dei SOLI importi con Tipo = ` +
          `"finanziario" nell'elenco qui sopra (${rifTipo}:B${DATA_END} per il tipo, ` +
          `${rifImporti}:C${DATA_END} per gli importi). Le voci "operativo" (fornitori, personale, ` +
          "erario, istituti previdenziali) sono debiti del ciclo operativo, non finanziamenti: NON vanno " +
          "toccate. Sommare l'intero elenco, incluse le voci operative, non e' solo impreciso ma un " +
          "errore concettuale grave — gonfieresti il net debt e quindi ridurresti l'equity value in modo " +
          "ingiustificato. Serve una funzione che sommi solo le righe che rispettano il criterio.",
        target: `Model!${C_T1}`,
        atteso: debitoFinanziarioLordo,
        referenzia: [rifTipo, rifImporti],
        senzaLiteral: [],
        skills: ['ev.net-debt'],
        minKeystrokes: 30,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUMIF'] }],
      };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${C_T2} calcola il Net Debt: il debito finanziario lordo appena isolato (${C_T1}) meno la ` +
        `cassa e i mezzi equivalenti (${C_CASSA}). La cassa e' disponibilita' immediata: riduce il debito ` +
        'netto quanto il debito finanziario lo aumenta.',
      target: `Model!${C_T2}`,
      atteso: netDebt,
      referenzia: [C_T1, C_CASSA],
      senzaLiteral: [],
      skills: ['ev.net-debt'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M4-01-NETDEBT',
      seed: rng.seed,
      brief: [
        '## Net Debt: non tutti i debiti sono debito finanziario',
        '',
        "Il Net Debt (posizione finanziaria netta) e' il primo pezzo del ponte fra Enterprise Value ed " +
          "Equity Value, e nella sua forma piu' semplice e':",
        '',
        '> **Net Debt = Debito finanziario lordo - Cassa e mezzi equivalenti**',
        '',
        "La parte che sbaglia chi inizia non e' la sottrazione: e' capire COSA conta come debito " +
          '"finanziario". Un elenco di voci di passivo mescola quasi sempre due famiglie diverse:',
        '',
        "- voci **finanziarie** (mutui, prestiti obbligazionari, finanziamenti soci fruttiferi, linee di " +
          "credito utilizzate): soldi presi in prestito da una controparte finanziaria, con un costo " +
          'esplicito in interessi. Queste ENTRANO nel debito finanziario lordo.',
        "- voci **operative** (debiti verso fornitori, verso il personale, verso l'erario, verso gli " +
          "istituti previdenziali): soldi dovuti come parte normale della gestione corrente, non un " +
          'finanziamento. Anche se sono "debiti" in senso contabile, NON entrano nel debito finanziario ' +
          "lordo: sono gia' materia di capitale circolante, non di net debt.",
        '',
        `Qui sotto trovi ${num(n)} voci di passivo, ciascuna etichettata Tipo = "finanziario" oppure ` +
          'Tipo = "operativo", in ordine sparso. Trattarle tutte allo stesso modo sarebbe un errore ' +
          `concettuale, non un dettaglio: il totale di TUTTE le voci e' ${eur(totaleElencoCompleto)}, ma ` +
          "solo una parte di quel numero e' davvero debito finanziario. Isola prima le righe giuste, poi " +
          `somma. La cassa e i mezzi equivalenti, gia' data, sono ${eur(cassa)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, ['Net Debt: cosa entra e cosa no'], { style: STILE_TITOLO }),
            riga(`A${ROW_SEZ1}`, ['Passivo: voci da classificare'], { style: STILE_TITOLO }),
            riga(`A${ROW_HEADER}`, ['Voce', 'Tipo', 'Importo (€)'], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, voci.map((v) => v.descrizione), { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, voci.map((v) => v.tipo), { style: STILE_ETICHETTA }),
            colonna(`C${DATA_START}`, voci.map((v) => v.importo), { style: STILE_INPUT }),

            riga(`A${ROW_SEZ2}`, ['Altri dati'], { style: STILE_TITOLO }),
            colonna(`A${ROW_CASSA}`, ['Cassa e mezzi equivalenti, €'], { style: STILE_ETICHETTA }),
            [{ ref: C_CASSA, content: cassa, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ3}`, ['Net Debt'], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_T1}`,
              ['Debito finanziario lordo (solo voci "finanziario"), €', 'Net Debt, €'],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: C_T1, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: C_T2, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 420, B: 130, C: 140 }, frozenRows: ROW_HEADER },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=SUMIF(${rifTipo}:B${DATA_END},"finanziario",${rifImporti}:C${DATA_END}): somma solo gli ` +
            'importi delle righe con Tipo uguale a "finanziario", ignorando le righe "operativo".',
          12,
          'T1',
        ),
        hint(
          'H2',
          `=${C_T1}-${C_CASSA}: debito finanziario lordo meno cassa e mezzi equivalenti.`,
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${C_T1}`,
    };
  },
});
