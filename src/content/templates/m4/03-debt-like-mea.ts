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

const POOL_DEBTLIKE = [
  "Earn-out da pagare al venditore per il raggiungimento degli obiettivi post-closing",
  "Contenzioso legale in corso, valore atteso gia' ponderato per la probabilita' di soccombenza stimata",
  "Dividendi deliberati dall'assemblea e non ancora pagati ai soci",
  "Debiti finanziari residui verso i soci (finanziamento soci fruttifero)",
] as const;

const POOL_NONDEBTLIKE = [
  'Debiti verso fornitori scaduti da oltre 60 giorni',
  "Debiti verso l'erario per IVA di periodo, in scadenza regolare",
] as const;

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
  title: "Debt-like da M&A: earn-out, contenziosi, dividendi, soci",
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

    const descrizioniDebtLike = r.shuffle([...POOL_DEBTLIKE]).slice(0, kDebtLike);
    const descrizioneNonDebtLike = r.pick([...POOL_NONDEBTLIKE]);

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
          `In ${C_T1} calcola il totale delle poste debt-like specifiche dell'operazione: la somma dei ` +
          `SOLI importi con Tipo = "debt-like" nell'elenco qui sopra (${rifTipo}:B${DATA_END} per il ` +
          `tipo, ${rifImporti}:C${DATA_END} per gli importi). La voce "${descrizioneNonDebtLike}" e' ` +
          'etichettata "non debt-like" e va lasciata fuori: essere scaduta o comunque poco rassicurante ' +
          "non la trasforma in un finanziamento — resta un debito commerciale ordinario, gia' materia di " +
          "capitale circolante, non di net debt. Sommare l'intero elenco includendo anche quella riga non " +
          "e' solo impreciso ma un errore concettuale grave: gonfieresti il net debt e quindi ridurresti " +
          "l'equity value in modo ingiustificato. Serve una funzione che sommi solo le righe che " +
          'rispettano il criterio.',
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
        `In ${C_T2} calcola il Net Debt aggiustato: il Net Debt di base (${B_NETDEBT_BASE}) piu' il ` +
        `totale delle poste debt-like specifiche dell'operazione appena isolato (${C_T1}). Ognuna di ` +
        "quelle poste e' un'obbligazione economica reale verso terzi (o verso i soci) che riduce quanto " +
        "resta agli azionisti: si aggiungono al net debt di base con segno positivo, esattamente come il " +
        'debito finanziario lordo.',
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
      brief: [
        "## Debt-like da M&A: non tutto cio' che preoccupa e' debito",
        '',
        "Oltre al debito finanziario \"classico\" (mutui, bond, leasing), un'operazione di M&A porta quasi " +
          "sempre alla luce poste specifiche della transazione stessa — impegni che diventano un debito " +
          "della NewCo proprio perche' la proprieta' sta cambiando: un earn-out promesso al venditore, un " +
          'contenzioso legale ereditato, dividendi gia\' deliberati ma non ancora pagati, un finanziamento ' +
          "residuo verso i soci uscenti. Tutte queste sono **debt-like**: obbligazioni economiche reali che " +
          "riducono l'equity value tanto quanto un mutuo bancario, anche se non compaiono come \"debiti " +
          'finanziari" in senso stretto.',
        '',
        "Il rischio non e' dimenticarle: e' il contrario. Un elenco di poste sospette contiene quasi sempre " +
          "anche qualcosa che SEMBRA allarmante ma non lo e'. Un debito verso fornitori scaduto da 60 " +
          "giorni suona come un campanello d'allarme, ma resta cio' che era prima di scadere: un debito " +
          "commerciale della normale gestione operativa, gia' oggetto del capitale circolante. Essere in " +
          "ritardo cambia l'urgenza del pagamento, non la sua natura: non diventa un finanziamento solo " +
          "perche' e' scaduto.",
        '',
        `Il Net Debt di base di questa operazione, gia' calcolato, e' ${eur(netDebtBase)}. Qui sotto trovi ` +
          `${num(n)} poste specifiche dell'operazione, ciascuna etichettata Tipo = "debt-like" oppure ` +
          'Tipo = "non debt-like", in ordine sparso. Il totale di TUTTE le poste, distrattore incluso, e\' ' +
          `${eur(totaleElencoCompleto)} — ma solo una parte di quel numero va aggiunta al net debt. Isola ` +
          'prima le righe giuste, poi somma.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, ["Debt-like da M&A: earn-out, contenziosi, dividendi, soci"], { style: STILE_TITOLO }),
            riga(`A${ROW_SEZ1}`, ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(`A${ROW_NETDEBT_BASE}`, ['Net Debt di base (gia\' calcolato), €'], { style: STILE_ETICHETTA }),
            [{ ref: B_NETDEBT_BASE, content: netDebtBase, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, ["Poste specifiche dell'operazione da classificare"], { style: STILE_TITOLO }),
            riga(`A${ROW_HEADER}`, ['Voce', 'Tipo', 'Importo (€)'], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, voci.map((v) => v.descrizione), { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, voci.map((v) => v.tipo), { style: STILE_ETICHETTA }),
            colonna(`C${DATA_START}`, voci.map((v) => v.importo), { style: STILE_INPUT }),

            riga(`A${ROW_SEZ3}`, ['Net Debt aggiustato'], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_T1}`,
              ["Totale poste debt-like specifiche dell'operazione, €", 'Net Debt aggiustato, €'],
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
          `=SUMIF(${rifTipo}:B${DATA_END},"debt-like",${rifImporti}:C${DATA_END}): somma solo gli importi ` +
            'delle righe con Tipo uguale a "debt-like", ignorando la riga "non debt-like".',
          12,
          'T1',
        ),
        hint(
          'H2',
          `=${B_NETDEBT_BASE}+${C_T1}: Net Debt di base piu' il totale delle poste debt-like appena ` +
            'isolato. Sono tutte obbligazioni aggiuntive: si sommano con segno positivo.',
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${C_T1}`,
    };
  },
});
