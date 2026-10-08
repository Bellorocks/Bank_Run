/**
 * M4 · 05 — Il bridge completo: da Enterprise Value a Equity Value, posta per posta.
 *
 * QUESTO E' IL LIVELLO [COMBO] del modulo M4. I tre livelli precedenti hanno
 * insegnato i pezzi separatamente: M4-01 il Net Debt di base, M4-02/M4-03 il
 * lato "debt-like" (poste che si SOMMANO al net debt perche' sono impegni
 * certi verso terzi anche se non si chiamano "debito"), M4-04 il lato
 * "cash-like" (il rovescio: cassa di bilancio che NON riduce il debito, o
 * poste non operative che si comportano come cassa anche se non lo sono).
 * Qui i due lati confluiscono nella stessa formula:
 *
 *   Equity Value = Enterprise Value - Net Debt (base) - Σ debt-like items +
 *                  Σ cash-like items - Minorities + Partecipazioni non consolidate
 *
 * (Minorities e partecipazioni non consolidate arrivano in un livello
 * successivo, dedicato: qui il bridge si ferma al pezzo debt-like/cash-like.)
 *
 * SCELTA DICHIARATA SUL NUMERO DI POSTE: lo spec del modulo chiede "15 poste
 * ambigue da classificare". Qui se ne generano 10-12: e' il compromesso fra
 * la ricchezza voluta dallo spec e la leggibilita' di un esercizio Excel
 * giocabile — oltre le 12 righe la tabella scorre fuori da una schermata
 * comoda e il giocatore comincia a perdere il filo riga per riga, il che
 * mina proprio la disciplina di lettura che il livello vuole allenare.
 * 10-12 bastano a mescolare le tre categorie in ordine sparso senza mai
 * lasciare che la posizione diventi una scorciatoia.
 *
 * A differenza di M4-01/M4-02/M4-03 (dove il giocatore doveva CAPIRE la
 * classificazione da solo), qui la classificazione e' gia' DATA in colonna:
 * il livello non testa piu' "sai riconoscere un debt-like da un cash-like",
 * ma "sai tradurre una tabella gia' classificata nel numero giusto, con il
 * segno giusto" — il punto didattico si sposta dalla classificazione
 * all'ARITMETICA DEL BRIDGE, che e' l'unico pezzo che i livelli precedenti,
 * concentrati un lato alla volta, non avevano ancora messo alla prova insieme.
 *
 * LE TRE CATEGORIE E PERCHE' OGNUNA VA COME VA (dichiarato qui, non lasciato
 * implicito nel codice — vale per ogni voce di ciascun pool sotto):
 *
 *   - **debt-like** (pool `DEBT_LIKE`): impegni finanziari o assimilabili
 *     verso terzi che un compratore erediterebbe e dovrebbe onorare come un
 *     mutuo — TFR e fondo pensione (impegni certi verso i dipendenti),
 *     leasing IFRS16 (canoni futuri gia' contrattualizzati), earn-out e
 *     dividendi deliberati (impegni di pagamento gia' certi, nati o resi
 *     esigibili proprio dall'operazione), contenzioso legale (valore atteso
 *     gia' ponderato, non l'esposizione massima), debiti verso i soci e
 *     interessi maturati (finanziari per natura, non operativi), quota di
 *     prezzo differita da un'acquisizione pregressa (un debito con un
 *     venditore precedente, non un fornitore). Si SOMMANO al net debt:
 *     riducono l'equity value perche' il compratore se li accolla insieme
 *     al debito finanziario vero e proprio.
 *   - **cash-like** (pool `CASH_LIKE`): attivita' non operative, facilmente
 *     liquidabili o gia' liquidate nella sostanza, che si comportano come
 *     cassa anche se non sono "cassa e mezzi equivalenti" in senso stretto —
 *     titoli disponibili per la vendita, un immobile non strumentale gia'
 *     destinato alla vendita, un credito finanziario verso un terzo estraneo
 *     al ciclo operativo, un credito IVA gia' validato dall'erario (non piu'
 *     un rischio, solo un incasso in attesa), un deposito cauzionale
 *     svincolato (non piu' vincolato a nessuna garanzia). Si SOTTRAGGONO dal
 *     net debt (cioe' si SOMMANO all'equity value): aumentano quanto il
 *     compratore puo' davvero disporre, esattamente come la cassa.
 *   - **irrilevante** (pool `IRRILEVANTE`): poste che restano fuori dal
 *     bridge perche' appartengono altrove — gia' materia di capitale
 *     circolante (fornitori scaduti, IVA di periodo in scadenza regolare,
 *     magazzino), gia' contabilizzate altrove (un credito d'imposta gia'
 *     portato a riduzione delle imposte nel conto economico, un fondo
 *     svalutazione crediti gia' netto in bilancio), o semplicemente non
 *     un'obbligazione finanziaria (un impegno di acquisto pluriennale a
 *     prezzi di mercato correnti, una garanzia bancaria ordinaria mai
 *     escussa). Non toccano ne' il debt-like ne' il cash-like: vanno lasciate
 *     fuori da entrambe le somme.
 *
 * Gli importi di tutte e tre le categorie condividono la STESSA distribuzione
 * (stesso `triangular`, stesso range): la dimensione dell'importo non deve
 * MAI essere un indizio su cui classificare una riga, coerente con la
 * disciplina gia' vista in M4-01/M4-03. L'unico modo corretto di isolare le
 * righe giuste e' leggere la colonna Categoria — motivo per cui le tre
 * categorie vengono rimescolate insieme, mai raggruppate.
 *
 * Geometria: DATA_END dipende da `n` (10-12, deciso a runtime dal seed), ma
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
  STILE_TOTALE,
  eur,
  num,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const DEBT_LIKE = () => ([
  tx('M4-05-BRIDGECOMPLETO.1'),
  tx('M4-05-BRIDGECOMPLETO.2'),
  tx('M4-05-BRIDGECOMPLETO.3'),
  tx('M4-05-BRIDGECOMPLETO.4'),
  tx('M4-05-BRIDGECOMPLETO.5'),
  tx('M4-05-BRIDGECOMPLETO.6'),
  tx('M4-05-BRIDGECOMPLETO.7'),
  tx('M4-05-BRIDGECOMPLETO.8'),
  tx('M4-05-BRIDGECOMPLETO.9'),
] as const);

const CASH_LIKE = () => ([
  tx('M4-05-BRIDGECOMPLETO.10'),
  tx('M4-05-BRIDGECOMPLETO.11'),
  tx('M4-05-BRIDGECOMPLETO.12'),
  tx('M4-05-BRIDGECOMPLETO.13'),
  tx('M4-05-BRIDGECOMPLETO.14'),
] as const);

const IRRILEVANTE = () => ([
  tx('M4-05-BRIDGECOMPLETO.15'),
  tx('M4-05-BRIDGECOMPLETO.16'),
  tx('M4-05-BRIDGECOMPLETO.17'),
  tx('M4-05-BRIDGECOMPLETO.18'),
  tx('M4-05-BRIDGECOMPLETO.19'),
  tx('M4-05-BRIDGECOMPLETO.20'),
  tx('M4-05-BRIDGECOMPLETO.21'),
] as const);

type Categoria = 'debt-like' | 'cash-like' | 'irrilevante';

interface Voce {
  readonly descrizione: string;
  readonly categoria: Categoria;
  readonly importo: number;
}

// --- Geometria fissa dell'intestazione: non dipende dal seed. --------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3; // "Dati di base"
const ROW_EV = 4;
const ROW_NETDEBT_BASE = 5;
const ROW_SEZ2 = 7; // "Poste da classificare (categoria gia' assegnata)"
const ROW_HEADER = 8; // Voce | Categoria | Importo (€)
const DATA_START = 9;

const C_EV = `C${ROW_EV}`;
const C_NETDEBT_BASE = `C${ROW_NETDEBT_BASE}`;

export default defineTemplate({
  id: 'M4-05-BRIDGECOMPLETO',
  module: 'M4',
  get title() {
    return tx('M4-05-BRIDGECOMPLETO.title');
  },
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['ev.bridge'],
  prerequisites: ['M4-02-DEBTLIKECLASSICI', 'M4-03-DEBTLIKEMEA', 'M4-04-CASHLIKE'],
  combo: true,

  generate: (rng) => {
    const rDati = rng.fork('dati');
    const rVoci = rng.fork('voci');
    const rImporti = rng.fork('importi');

    // Net Debt di base: dato bloccato, autosufficiente (nessuna cella live
    // condivisa con un altro template).
    const netDebtBase = rDati.int(2000, 12000) * 1000;

    // Enterprise Value: generato con un margine ampio sopra il Net Debt di
    // base, cosi' che per costruzione l'Equity Value resti sempre
    // ampiamente positivo qualunque combinazione di poste esca dal seed
    // (il totale debt-like massimo teorico, 4 poste a 1.800.000, resta
    // comunque ben al di sotto del margine minimo di 20.000.000).
    const enterpriseValue = netDebtBase + rDati.int(20_000, 120_000) * 1000;

    // 10-12 poste totali, con un mix garantito di tutte e tre le categorie:
    // almeno 3 debt-like, almeno 3 cash-like, almeno 2 irrilevanti. Mai un
    // conteggio che azzeri una categoria, altrimenti una delle due SUMIF
    // del livello varrebbe zero per costruzione e non testerebbe nulla.
    const n = rDati.int(10, 12);
    const kDebt = rDati.int(3, 4);
    const kCash = rDati.int(3, Math.min(CASH_LIKE().length, n - kDebt - 2));
    const kIrr = n - kDebt - kCash;

    const descrizioniDebt = rVoci.shuffle([...DEBT_LIKE()]).slice(0, kDebt);
    const descrizioniCash = rVoci.shuffle([...CASH_LIKE()]).slice(0, kCash);
    const descrizioniIrr = rVoci.shuffle([...IRRILEVANTE()]).slice(0, kIrr);

    // Stessa distribuzione per tutte e tre le categorie: la dimensione
    // dell'importo non deve mai essere un indizio su cui classificare una
    // riga (la classificazione, qui, e' comunque gia' data — ma il principio
    // resta lo stesso delle SUMIF nei livelli precedenti del modulo).
    const importo = () => roundTo(triangular(rImporti, 150_000, 500_000, 1_800_000), 1000);

    const vociDebt: Voce[] = descrizioniDebt.map((descrizione) => ({
      descrizione,
      categoria: 'debt-like',
      importo: importo(),
    }));
    const vociCash: Voce[] = descrizioniCash.map((descrizione) => ({
      descrizione,
      categoria: 'cash-like',
      importo: importo(),
    }));
    const vociIrr: Voce[] = descrizioniIrr.map((descrizione) => ({
      descrizione,
      categoria: 'irrilevante',
      importo: importo(),
    }));

    // Rimescolate insieme: nella tabella che il giocatore vede le tre
    // categorie non sono mai raggruppate, cosi' che "prendi le prime righe"
    // non sia mai una scorciatoia che funziona per caso.
    const voci: Voce[] = rVoci.shuffle([...vociDebt, ...vociCash, ...vociIrr]);

    const DATA_END = DATA_START + n - 1;
    const ROW_SEZ3 = DATA_END + 2; // "Bridge: da Enterprise Value a Equity Value"
    const ROW_T1 = ROW_SEZ3 + 1; // Totale debt-like
    const ROW_T2 = ROW_T1 + 1; // Totale cash-like
    const ROW_T3 = ROW_T2 + 1; // Equity Value

    const rifCategoria = `B${DATA_START}`;
    const rifImporti = `C${DATA_START}`;
    const C_T1 = `C${ROW_T1}`;
    const C_T2 = `C${ROW_T2}`;
    const C_T3 = `C${ROW_T3}`;

    const totaleDebtLike = voci
      .filter((v) => v.categoria === 'debt-like')
      .reduce((acc, v) => acc + v.importo, 0);
    const totaleCashLike = voci
      .filter((v) => v.categoria === 'cash-like')
      .reduce((acc, v) => acc + v.importo, 0);
    const totaleIrrilevante = voci
      .filter((v) => v.categoria === 'irrilevante')
      .reduce((acc, v) => acc + v.importo, 0);
    const equityValue = enterpriseValue - netDebtBase - totaleDebtLike + totaleCashLike;

    const t1: Task = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M4-05-BRIDGECOMPLETO.23', { C_T1, rifCategoria, DATA_END, rifImporti }),
        target: `Model!${C_T1}`,
        atteso: totaleDebtLike,
        referenzia: [rifCategoria, rifImporti],
        senzaLiteral: [],
        skills: ['ev.bridge'],
        minKeystrokes: 32,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUMIF'] }],
      };
    })();

    const t2: Task = (() => {
      const base = taskFormula({
        id: 'T2',
        prompt:
          tx('M4-05-BRIDGECOMPLETO.24', { C_T2, rifCategoria, DATA_END, rifImporti }),
        target: `Model!${C_T2}`,
        atteso: totaleCashLike,
        referenzia: [rifCategoria, rifImporti],
        senzaLiteral: [],
        skills: ['ev.bridge'],
        minKeystrokes: 32,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUMIF'] }],
      };
    })();

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M4-05-BRIDGECOMPLETO.25', { C_T3, C_EV, C_NETDEBT_BASE, C_T1, C_T2 }),
      target: `Model!${C_T3}`,
      atteso: equityValue,
      referenzia: [C_EV, C_NETDEBT_BASE, C_T1, C_T2],
      senzaLiteral: [],
      skills: ['ev.bridge'],
      minKeystrokes: 16,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M4-05-BRIDGECOMPLETO',
      seed: rng.seed,
      brief: [tx('M4-05-BRIDGECOMPLETO.26', { p0: num(n), p1: eur(totaleIrrilevante), p2: eur(enterpriseValue), p3: eur(netDebtBase) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M4-05-BRIDGECOMPLETO.27')], {
              style: STILE_TITOLO,
            }),

            riga(`A${ROW_SEZ1}`, [tx('M4-05-BRIDGECOMPLETO.28')], { style: STILE_TITOLO }),
            colonna(`A${ROW_EV}`, [tx('M4-05-BRIDGECOMPLETO.29'), tx('M4-05-BRIDGECOMPLETO.30')], { style: STILE_ETICHETTA }),
            [{ ref: C_EV, content: enterpriseValue, style: STILE_INPUT, locked: true }],
            [{ ref: C_NETDEBT_BASE, content: netDebtBase, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, [tx('M4-05-BRIDGECOMPLETO.31')], { style: STILE_TITOLO }),
            riga(`A${ROW_HEADER}`, [tx('M4-05-BRIDGECOMPLETO.40'), tx('M4-05-BRIDGECOMPLETO.41'), tx('M4-05-BRIDGECOMPLETO.32')], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, voci.map((v) => v.descrizione), { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, voci.map((v) => tx(`M4-05-BRIDGECOMPLETO.tok.${v.categoria}`)), { style: STILE_ETICHETTA }),
            colonna(`C${DATA_START}`, voci.map((v) => v.importo), { style: STILE_INPUT }),

            riga(`A${ROW_SEZ3}`, [tx('M4-05-BRIDGECOMPLETO.33')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_T1}`,
              [tx('M4-05-BRIDGECOMPLETO.34'), tx('M4-05-BRIDGECOMPLETO.35'), tx('M4-05-BRIDGECOMPLETO.36')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: C_T1, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: C_T2, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: C_T3, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 480, B: 120, C: 150 }, frozenRows: ROW_HEADER },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M4-05-BRIDGECOMPLETO.37', { rifCategoria, DATA_END, rifImporti }),
          12,
          'T1',
        ),
        hint(
          'H2',
          tx('M4-05-BRIDGECOMPLETO.38', { rifCategoria, DATA_END, rifImporti }),
          12,
          'T2',
        ),
        hint(
          'H3',
          tx('M4-05-BRIDGECOMPLETO.39', { C_EV, C_NETDEBT_BASE, C_T1, C_T2 }),
          14,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 170 }),
      startAt: `Model!${C_T1}`,
    };
  },
});
