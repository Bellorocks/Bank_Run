/**
 * M4 · 03 — Debt-like items da M&A: earn-out, contenziosi, dividendi, debiti soci.
 *
 * Secondo template sulla skill `ev.debt-like` (il primo copre i debt-like
 * "classici" — TFR, fondi pensione, leasing). Qui lo scenario e' diverso: le
 * poste NON vengono dal bilancio ordinario, ma sono specifiche dell'operazione
 * di M&A in corso — cose che emergono proprio perche' l'azienda sta per
 * cambiare proprieta':
 *
 *   - earn-out da pagare al venditore: un impegno di pagamento futuro e
 *     condizionato, ma e' gia' un debito della NewCo verso il venditore.
 *   - contenzioso legale con probabilita' di soccombenza stimata: l'importo
 *     nell'elenco e' gia' il valore atteso (ponderato per la probabilita'),
 *     non l'esposizione massima — il giocatore non deve ricalcolare nulla,
 *     solo riconoscere che e' un'obbligazione economica reale verso terzi.
 *   - dividendi deliberati e non ancora pagati: l'assemblea li ha gia'
 *     approvati, quindi sono un impegno di cassa dovuto ai vecchi soci prima
 *     del closing — economicamente equivalente a un debito.
 *   - debiti finanziari verso i soci: un prestito da una controparte
 *     correlata, ma comunque un finanziamento fruttifero, non un debito
 *     operativo.
 *
 * Il distrattore e' il punto didattico centrale del livello: una posta che
 * "sembra" un problema (un debito SCADUTO da 60 giorni suona come un segnale
 * di stress finanziario) ma resta un debito commerciale ordinario — parte del
 * capitale circolante, non un finanziamento assunto per l'operazione. Essere
 * scaduto non lo riclassifica: cambia la sua urgenza, non la sua natura. Chi
 * lo somma nel debt-like perche' "sembra grave" commette lo stesso errore
 * concettuale di M4-01 (trattare un debito operativo come se fosse
 * finanziario), solo con un travestimento diverso.
 *
 * Le poste vengono scelte da due pool distinti (debt-like / non debt-like) e
 * poi RIMESCOLATE insieme in ordine casuale (non raggruppate), cosi' che
 * "prendi le prime righe" non sia mai una scorciatoia che funziona per caso.
 *
 * Geometria: DATA_END dipende da `n` (4 o 5, deciso a runtime dal seed), ma
 * tutti i riferimenti sotto sono calcolati come funzione di DATA_START/n, mai
 * scritti come letterali fissi — coerente con la classe di bug #1 dello spec.
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

import { tx } from '../../../i18n/content';
const POOL_DEBTLIKE = () => ([
  tx('M4-03-DEBTLIKEMEA.1'),
  tx('M4-03-DEBTLIKEMEA.2'),
  tx('M4-03-DEBTLIKEMEA.3'),
  tx('M4-03-DEBTLIKEMEA.4'),
] as const);

const POOL_NONDEBTLIKE = () => ([
  tx('M4-03-DEBTLIKEMEA.5'),
  tx('M4-03-DEBTLIKEMEA.6'),
] as const);

interface Voce {
  readonly descrizione: string;
  readonly tipo: 'debt-like' | 'non debt-like';
  readonly importo: number;
}

// --- Geometria fissa dell'intestazione: non dipende dal seed. --------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3; // "Dati di partenza"
const ROW_NETDEBT_BASE = 4; // B4: Net Debt di base (dato, bloccato)
const ROW_SEZ2 = 6; // "Poste specifiche dell'operazione da classificare"
const ROW_HEADER = 7; // Voce | Tipo | Importo (€)
const DATA_START = 8;

export default defineTemplate({
  id: 'M4-03-DEBTLIKEMEA',
  module: 'M4',
  get title() {
    return tx('M4-03-DEBTLIKEMEA.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['ev.debt-like'],
  prerequisites: ['M4-01-NETDEBT'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Net Debt di base: dato bloccato, non ricostruito da un altro template
    // (nessuna cella live e' condivisa fra template diversi).
    const netDebtBase = r.int(2000, 12000) * 1000;

    // 4 o 5 poste totali: sempre TUTTE le poste debt-like tranne UNA riga
    // finale, che e' sempre e solo il distrattore non debt-like. E' un mix
    // volutamente sbilanciato (non simmetrico come in M4-01): il livello
    // insegna a riconoscere il singolo intruso dentro una lista che sembra
    // omogenea, non a separare due gruppi di pari dimensione.
    const n = r.int(4, 5);
    const kDebtLike = n - 1;

    const descrizioniDebtLike = r.shuffle([...POOL_DEBTLIKE()]).slice(0, kDebtLike);
    const descrizioneNonDebtLike = r.pick([...POOL_NONDEBTLIKE()]);

    const vociDebtLike: Voce[] = descrizioniDebtLike.map((descrizione) => ({
      descrizione,
      tipo: 'debt-like',
      importo: roundTo(triangular(r, 150_000, 700_000, 2_500_000), 1000),
    }));
    const voceNonDebtLike: Voce = {
      descrizione: descrizioneNonDebtLike,
      tipo: 'non debt-like',
      // Stesso ordine di grandezza delle poste debt-like: la dimensione
      // dell'importo non deve essere un indizio su cui classificarla.
      importo: roundTo(triangular(r, 150_000, 500_000, 1_200_000), 1000),
    };

    // Rimescolate insieme: nell'elenco che il giocatore vede, il distrattore
    // non e' sempre nella stessa posizione.
    const voci: Voce[] = r.shuffle([...vociDebtLike, voceNonDebtLike]);

    const DATA_END = DATA_START + n - 1;
    const ROW_SEZ3 = DATA_END + 2; // "Net Debt aggiustato"
    const ROW_T1 = ROW_SEZ3 + 1; // Totale debt-like M&A-specific
    const ROW_T2 = ROW_T1 + 1; // Net Debt aggiustato

    const rifTipo = `B${DATA_START}`;
    const rifImporti = `C${DATA_START}`;
    const B_NETDEBT_BASE = `B${ROW_NETDEBT_BASE}`;
    const C_T1 = `C${ROW_T1}`;
    const C_T2 = `C${ROW_T2}`;

    const totaleDebtLike = voci
      .filter((v) => v.tipo === 'debt-like')
      .reduce((acc, v) => acc + v.importo, 0);
    const totaleElencoCompleto = voci.reduce((acc, v) => acc + v.importo, 0);
    const netDebtAggiustato = netDebtBase + totaleDebtLike;

    const t1: Task = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M4-03-DEBTLIKEMEA.9', { C_T1, rifTipo, DATA_END, rifImporti, descrizioneNonDebtLike }),
        target: `Model!${C_T1}`,
        atteso: totaleDebtLike,
        referenzia: [rifTipo, rifImporti],
        senzaLiteral: [],
        skills: ['ev.debt-like'],
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
        tx('M4-03-DEBTLIKEMEA.10', { C_T2, B_NETDEBT_BASE, C_T1 }),
      target: `Model!${C_T2}`,
      atteso: netDebtAggiustato,
      referenzia: [B_NETDEBT_BASE, C_T1],
      skills: ['ev.debt-like'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M4-03-DEBTLIKEMEA',
      seed: rng.seed,
      brief: [tx('M4-03-DEBTLIKEMEA.11', { p0: eur(netDebtBase), p1: num(n), p2: eur(totaleElencoCompleto) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M4-03-DEBTLIKEMEA.12')], { style: STILE_TITOLO }),
            riga(`A${ROW_SEZ1}`, [tx('M4-03-DEBTLIKEMEA.13')], { style: STILE_TITOLO }),
            colonna(`A${ROW_NETDEBT_BASE}`, [tx('M4-03-DEBTLIKEMEA.14')], { style: STILE_ETICHETTA }),
            [{ ref: B_NETDEBT_BASE, content: netDebtBase, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, [tx('M4-03-DEBTLIKEMEA.15')], { style: STILE_TITOLO }),
            riga(`A${ROW_HEADER}`, [tx('M4-03-DEBTLIKEMEA.22'), tx('M4-03-DEBTLIKEMEA.23'), tx('M4-03-DEBTLIKEMEA.16')], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, voci.map((v) => v.descrizione), { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, voci.map((v) => (v.tipo === 'debt-like' ? tx('M4-03-DEBTLIKEMEA.tok.debtlike') : tx('M4-03-DEBTLIKEMEA.8'))), { style: STILE_ETICHETTA }),
            colonna(`C${DATA_START}`, voci.map((v) => v.importo), { style: STILE_INPUT }),

            riga(`A${ROW_SEZ3}`, [tx('M4-03-DEBTLIKEMEA.17')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_T1}`,
              [tx('M4-03-DEBTLIKEMEA.18'), tx('M4-03-DEBTLIKEMEA.19')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: C_T1, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: C_T2, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 130, C: 140 }, frozenRows: ROW_HEADER },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M4-03-DEBTLIKEMEA.20', { rifTipo, DATA_END, rifImporti }),
          12,
          'T1',
        ),
        hint(
          'H2',
          tx('M4-03-DEBTLIKEMEA.21', { B_NETDEBT_BASE, C_T1 }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${C_T1}`,
    };
  },
});
