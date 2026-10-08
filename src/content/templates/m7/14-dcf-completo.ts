/**
 * M7 · 14 — DCF completo: tre scenari e reconciliation al valore di mercato.
 *
 * QUESTO E' IL LIVELLO [COMBO] DEL MODULO M7 — il piu' complesso del progetto
 * finora (spec: "DCF completo con tre scenari e reconciliation al valore di
 * mercato"). Ripercorre in un solo livello il percorso di tutto il modulo:
 * FCF (M7-01..03) → WACC (M7-04..08: CAPM, beta di Hamada, country risk,
 * struttura target) → Terminal Value (M7-09..12: Gordon growth, cross-check
 * con l'exit multiple, capex normalizzato, NOL) → qui, l'ultimo miglio:
 * mettere insieme tre scenari e confrontare il risultato con il mercato.
 *
 * SEMPLIFICAZIONE DICHIARATA (stesso spirito di M4-05 e M6-06): per restare
 * un esercizio Excel giocabile, i cinque anni di flussi di cassa espliciti
 * proiettati e scontati NON vengono ricostruiti qui riga per riga — e' materia
 * gia' coperta da M7-01/02/03. Ogni scenario arriva con il suo "valore
 * attuale dei FCF espliciti" gia' sommato in un'unica cella (dato, bloccato)
 * e il suo Terminal Value gia' calcolato (dato, bloccato, coerente con Gordon
 * growth ma qui dato diretto, non ri-derivato da FCF/g/WACC — quella
 * derivazione e' materia di M7-09). Il giocatore completa solo l'ultimo
 * miglio: scontare il Terminal Value e sommarlo al valore attuale dei FCF,
 * per ciascuno dei tre scenari, poi riconciliare lo scenario base col mercato.
 *
 * TRE SCENARI INDIPENDENTI, STESSO WACC
 * Base, ottimistico e pessimistico condividono lo stesso WACC — quindi lo
 * stesso fattore di sconto del Terminal Value, (1+WACC)^-5, con 5 anni di
 * orizzonte esplicito: cio' che cambia fra scenari e' l'AZIENDA (quanta cassa
 * genera, quanto vale la perpetuita' oltre l'orizzonte esplicito), non il
 * prezzo del capitale che la finanzia. Ogni scenario ha il proprio
 * `rng.fork` ('base', 'ottimistico', 'pessimistico'): ottimistico e
 * pessimistico sono costruiti come multipli indipendenti dello scenario base,
 * cosi' che l'ordinamento Ottimistico > Base > Pessimistico regga per
 * costruzione — coerente col significato dei tre nomi, non lasciato al caso.
 *
 * QUATTRO TASK:
 *   T1  Enterprise Value scenario BASE = PV FCF (base) + TV (base) × fattore
 *       di sconto TV (base).
 *   T2  Stessa formula, sui dati dello scenario OTTIMISTICO.
 *   T3  Stessa formula, sui dati dello scenario PESSIMISTICO.
 *   T4  Reconciliation: scostamento % fra l'Enterprise Value di mercato
 *       osservato (da comps/precedenti, dato bloccato, lo stesso benchmark
 *       per tutti e tre gli scenari) e l'Enterprise Value dello scenario BASE
 *       appena calcolato in T1 — MAI ricalcolato da zero dai dati grezzi di
 *       riga 5, sempre a partire dalla cella di T1 (mustReference), stesso
 *       principio gia' visto in M6-06 T3 e M7-09 T2:
 *       = (EV di mercato − T1) / T1.
 *
 * Il punto di chiusura dell'intero percorso di valutazione del curriculum:
 * FCF → WACC (CAPM, beta, country risk) → Terminal Value (Gordon growth,
 * cross-check con l'exit multiple) → tre scenari → Enterprise Value →
 * confronto col mercato, per giudicare se le assunzioni di partenza sono
 * ragionevoli o vanno riviste.
 *
 * Geometria fissa: nessuna riga dipende dal seed, i riferimenti di cella sono
 * letterali per costruzione, come negli altri livelli di M7.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eurM,
  num,
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

/** Fattore di sconto del Terminal Value: non e' una percentuale ne' un multiplo "x", e' un decimale puro. */
const STILE_FATTORE: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '0.0000' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3; // "I tre scenari"
const ROW_HEADER = 4; // Scenario | PV FCF espliciti | Terminal Value | Fattore sconto TV | Enterprise Value
const ROW_BASE = 5;
const ROW_OTT = 6;
const ROW_PESS = 7;

const ROW_SEZ2 = 9; // "Confronto con il mercato"
const ROW_EV_MERCATO = 10;
const ROW_RECON = 11;

const B_PV_BASE = `B${ROW_BASE}`;
const C_TV_BASE = `C${ROW_BASE}`;
const D_FATT_BASE = `D${ROW_BASE}`;
const E_EV_BASE = `E${ROW_BASE}`; // T1

const B_PV_OTT = `B${ROW_OTT}`;
const C_TV_OTT = `C${ROW_OTT}`;
const D_FATT_OTT = `D${ROW_OTT}`;
const E_EV_OTT = `E${ROW_OTT}`; // T2

const B_PV_PESS = `B${ROW_PESS}`;
const C_TV_PESS = `C${ROW_PESS}`;
const D_FATT_PESS = `D${ROW_PESS}`;
const E_EV_PESS = `E${ROW_PESS}`; // T3

const B_EV_MERCATO = `B${ROW_EV_MERCATO}`;
const B_RECON = `B${ROW_RECON}`; // T4

const ORIZZONTE_ANNI = 5;

export default defineTemplate({
  id: 'M7-14-DCFCOMPLETO',
  module: 'M7',
  title: 'DCF completo: tre scenari e reconciliation al valore di mercato',
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 420,
  skills: ['dcf.terminal-value', 'dcf.wacc', 'dcf.build-fcf'],
  prerequisites: [
    'M7-07-WACC',
    'M7-08-STRUTTURATARGET',
    'M7-10-EXITMULTIPLE',
    'M7-11-CAPEXTERMINALE',
    'M7-12-NOL',
    'M7-13-SENSITIVITY',
  ],
  combo: true,

  generate: (rng) => {
    const rBase = rng.fork('base');
    const rOtt = rng.fork('ottimistico');
    const rPess = rng.fork('pessimistico');
    const rWacc = rng.fork('wacc');
    const rMercato = rng.fork('mercato');

    // --- Scenario BASE: valore attuale dei FCF espliciti (5 anni, gia'
    // scontati e sommati a monte — materia di M7-01/02/03) e Terminal Value
    // (Gordon growth, gia' calcolato a monte — materia di M7-09). Mid-cap
    // tipica, in milioni, arrotondati per evitare code decimali innaturali. --
    const pvFcfBase = roundTo(triangular(rBase, 15_000_000, 22_000_000, 32_000_000), 50_000);
    const tvBase = roundTo(triangular(rBase, 90_000_000, 150_000_000, 220_000_000), 100_000);

    // --- Scenario OTTIMISTICO: multiplo indipendente (fork proprio) applicato
    // a entrambe le poste dello scenario base, sempre > 1 per costruzione —
    // "ottimistico" deve valere PIU' del base, non e' un'etichetta a caso. ---
    const multOtt = roundTo(triangular(rOtt, 1.1, 1.2, 1.35), 0.01);
    const pvFcfOtt = roundTo(pvFcfBase * multOtt, 50_000);
    const tvOtt = roundTo(tvBase * multOtt, 100_000);

    // --- Scenario PESSIMISTICO: stesso principio, multiplo indipendente
    // sempre < 1. -------------------------------------------------------------
    const multPess = roundTo(triangular(rPess, 0.65, 0.8, 0.9), 0.01);
    const pvFcfPess = roundTo(pvFcfBase * multPess, 50_000);
    const tvPess = roundTo(tvBase * multPess, 100_000);

    // --- WACC condiviso dai tre scenari, quindi anche il fattore di sconto
    // del Terminal Value e' lo stesso numero, ridato in tutte e tre le righe
    // come dato bloccato (nessuna cella live condivisa fra righe diverse). --
    const wacc = roundTo(triangular(rWacc, 0.08, 0.1, 0.12), 0.001);
    const fattoreSconto = roundTo(Math.pow(1 + wacc, -ORIZZONTE_ANNI), 0.0001);

    // Enterprise Value "veri" per ciascuno scenario, ricalcolati dai dati
    // effettivamente scritti in foglio (dopo l'arrotondamento), non dai
    // parametri intermedi di generazione.
    const evBase = pvFcfBase + tvBase * fattoreSconto;
    const evOtt = pvFcfOtt + tvOtt * fattoreSconto;
    const evPess = pvFcfPess + tvPess * fattoreSconto;

    // --- Enterprise Value di mercato osservato (da comps/precedenti): un
    // singolo numero, indipendente, lo stesso benchmark per tutti e tre gli
    // scenari — puo' cadere sopra o sotto l'EV base a seconda del seed, cosi'
    // che lo scostamento di T4 non abbia un segno fisso per costruzione.
    // Guard-rail (§4.3): il multiplo e' pescato da due intervalli DISGIUNTI,
    // mai da un intervallo unico intorno a 1 — altrimenti alcuni seed
    // produrrebbero uno scostamento troppo vicino a zero, sia per la lettura
    // didattica (un DCF che "coincide col mercato" entro pochi decimi di
    // punto percentuale non e' un caso interessante da commentare) sia per il
    // check di T4: una formula con il DENOMINATORE invertito produce un
    // errore proporzionale al QUADRATO dello scostamento vero, quindi con uno
    // scostamento troppo piccolo quell'errore scenderebbe sotto la tolleranza
    // e la formula sbagliata verrebbe accettata per sbaglio. Tenendo lo
    // scostamento sempre sopra ~4-5 punti percentuali in valore assoluto,
    // l'errore del denominatore invertito resta sempre ben sopra la
    // tolleranza di T4 (vedi commento sul check di T4 piu' sotto). ----------
    const sopra = rMercato.bool();
    const multMercato = sopra
      ? roundTo(triangular(rMercato, 1.05, 1.15, 1.3), 0.01)
      : roundTo(triangular(rMercato, 0.7, 0.85, 0.95), 0.01);
    const evMercato = roundTo(evBase * multMercato, 100_000);

    const scostamento = (evMercato - evBase) / evBase;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${E_EV_BASE} calcola l'Enterprise Value dello scenario BASE: il valore attuale dei FCF ` +
        `espliciti (${B_PV_BASE}) PIU' il Terminal Value (${C_TV_BASE}) moltiplicato per il fattore di ` +
        `sconto del Terminal Value (${D_FATT_BASE}). Formula: Enterprise Value = PV FCF espliciti + ` +
        'Terminal Value × Fattore di sconto TV. Il fattore di sconto (1+WACC)^-5, gia\' calcolato a monte, ' +
        "porta il Terminal Value — che per costruzione e' un valore a fine anno 5 — al suo equivalente " +
        "in euro di OGGI, esattamente come il valore attuale dei FCF espliciti e' gia' scontato a oggi: " +
        "sommare i due pezzi senza scontare il Terminal Value sarebbe come sommare euro di anni diversi. " +
        'Usa le tre celle date, senza copiare i numeri a mano.',
      target: `Model!${E_EV_BASE}`,
      atteso: evBase,
      referenzia: [B_PV_BASE, C_TV_BASE, D_FATT_BASE],
      senzaLiteral: [],
      skills: ['dcf.terminal-value', 'dcf.wacc'],
      minKeystrokes: 18,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${E_EV_OTT} calcola l'Enterprise Value dello scenario OTTIMISTICO, stessa formula di T1 ma ` +
        `sui dati di questa riga: PV FCF espliciti (${B_PV_OTT}) PIU' Terminal Value (${C_TV_OTT}) ` +
        `moltiplicato per il fattore di sconto TV (${D_FATT_OTT}) — attenzione, e' lo STESSO fattore di ` +
        'sconto dello scenario base (stesso WACC), non un numero diverso: cio\' che cambia fra scenari ' +
        "e' l'azienda, non il costo del capitale che la finanzia. Usa le tre celle di QUESTA riga, senza " +
        'copiare i numeri a mano.',
      target: `Model!${E_EV_OTT}`,
      atteso: evOtt,
      referenzia: [B_PV_OTT, C_TV_OTT, D_FATT_OTT],
      senzaLiteral: [],
      skills: ['dcf.terminal-value', 'dcf.wacc'],
      minKeystrokes: 18,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In ${E_EV_PESS} calcola l'Enterprise Value dello scenario PESSIMISTICO, sempre la stessa ` +
        `formula: PV FCF espliciti (${B_PV_PESS}) PIU' Terminal Value (${C_TV_PESS}) moltiplicato per il ` +
        `fattore di sconto TV (${D_FATT_PESS}) — di nuovo lo stesso fattore di sconto delle altre due ` +
        'righe. Usa le tre celle di QUESTA riga, senza copiare i numeri a mano.',
      target: `Model!${E_EV_PESS}`,
      atteso: evPess,
      referenzia: [B_PV_PESS, C_TV_PESS, D_FATT_PESS],
      senzaLiteral: [],
      skills: ['dcf.terminal-value', 'dcf.build-fcf'],
      minKeystrokes: 18,
    });

    // NB: costruito a mano (non con taskFormula) per obbligare esplicitamente
    // il riferimento a T1 (mustReference), non solo alle celle grezze di riga
    // 5: ricalcolare l'Enterprise Value base da zero qui (invece di puntare
    // alla cella di T1 gia' verificata) sarebbe la variante "quasi giusta ma
    // concettualmente sbagliata" — stesso argine gia' visto in M7-09 T2 e
    // M6-06 T3.
    const t4 = {
      id: 'T4',
      prompt:
        `In ${B_RECON} calcola la reconciliation: lo scostamento percentuale fra l'Enterprise Value di ` +
        `mercato osservato (${B_EV_MERCATO}, da comps/precedenti) e l'Enterprise Value dello scenario ` +
        `BASE appena calcolato in T1 (${E_EV_BASE} — NON ricalcolarlo da zero dalle celle di riga ${ROW_BASE}, ` +
        `usa direttamente il risultato di T1). Formula: Scostamento % = (${B_EV_MERCATO} − ${E_EV_BASE}) / ` +
        `${E_EV_BASE}. ATTENZIONE all'ordine della sottrazione: EV di mercato MENO EV base, mai il ` +
        "contrario — invertirlo ribalta il segno della lettura. Un risultato positivo dice che il mercato " +
        "valuta l'azienda PIU' di quanto suggerisca lo scenario base (le assunzioni potrebbero essere " +
        "troppo prudenti, o il mercato sta pagando un premio); negativo, che il mercato valuta MENO (le " +
        "assunzioni potrebbero essere troppo ottimistiche, o il mercato sta scontando un rischio che il " +
        "modello non cattura). E' la domanda con cui si chiude ogni DCF vero: le assunzioni di partenza " +
        "sono ragionevoli, o vanno riviste?",
      targetCell: `Model!${B_RECON}`,
      check: [
        { kind: 'mustBeFormula' as const },
        {
          // Tolleranza stretta e assoluta, non la 'hybrid' di default: il
          // pavimento assoluto di default (0,01, cioe' un intero punto
          // percentuale) e' enorme per un check che deve intercettare un
          // denominatore invertito. Con quel pavimento, un errore sul
          // denominatore (dividere per l'EV di mercato invece che per l'EV
          // base) produce uno scarto proporzionale al QUADRATO dello
          // scostamento vero — con uno scostamento gia' tenuto sopra ~4-5
          // punti percentuali dal guard-rail su evMercato (vedi sopra), quel
          // quadrato resta comunque ben sopra questa tolleranza stretta,
          // mentre con la tolleranza di default sarebbe rimasto sotto e la
          // formula sbagliata sarebbe stata accettata per errore.
          kind: 'value' as const,
          expected: scostamento,
          tolerance: 0.0005,
          toleranceMode: 'absolute' as const,
          message:
            "Il valore non torna: controlla che tu stia sottraendo l'EV base dall'EV di mercato " +
            `(${B_EV_MERCATO} − ${E_EV_BASE}, non il contrario) e che il denominatore sia ${E_EV_BASE} ` +
            `(l'EV base di T1), non ${B_EV_MERCATO} o un altro numero.`,
        },
        { kind: 'mustReference' as const, cells: [B_EV_MERCATO, E_EV_BASE] },
        { kind: 'mustNotContainLiteral' as const, except: [] },
      ],
      skills: ['dcf.terminal-value', 'dcf.wacc', 'dcf.build-fcf'],
      minKeystrokes: 16,
    };

    const tasks = [t1, t2, t3, t4];

    return {
      templateId: 'M7-14-DCFCOMPLETO',
      seed: rng.seed,
      brief: [
        '## DCF completo: tre scenari e reconciliation al valore di mercato',
        '',
        "Il livello che chiude il percorso di valutazione del curriculum. In un DCF vero, ogni pezzo " +
          "costruito finora confluisce qui: **FCF** (quanta cassa genera davvero l'azienda) → **WACC** " +
          "(CAPM, beta di Hamada, country risk: quanto costa il capitale che la finanzia) → **Terminal " +
          "Value** (Gordon growth, con il cross-check dell'exit multiple: quanto vale tutto cio' che " +
          "viene dopo l'orizzonte esplicito) → **tre scenari** (quanto e' sensibile il risultato alle " +
          "assunzioni) → **Enterprise Value** → **confronto col mercato**, per giudicare se le assunzioni " +
          'di partenza sono ragionevoli o vanno riviste.',
        '',
        '*(Per restare un esercizio giocabile, i 5 anni di flussi espliciti scontati non si ricostruiscono ' +
          "qui riga per riga — e' materia gia' coperta da M7-01/02/03. Ogni scenario arriva con il suo " +
          "valore attuale dei FCF espliciti gia' sommato, e il suo Terminal Value gia' calcolato — materia " +
          'di M7-09 — entrambi come dati bloccati. Il tuo compito e\' l\'ultimo miglio: scontare il ' +
          'Terminal Value e sommarlo, per ciascuno scenario, poi riconciliare col mercato.)*',
        '',
        '> **Enterprise Value = PV FCF espliciti + Terminal Value × Fattore di sconto TV**',
        '',
        `Il fattore di sconto del Terminal Value e' (1+WACC)^-${num(ORIZZONTE_ANNI)}: porta un valore che, ` +
          "per costruzione, e' calcolato a fine anno 5 al suo equivalente in euro di oggi — esattamente " +
          "come il valore attuale dei FCF espliciti e' gia' scontato a oggi. **Base, ottimistico e " +
          "pessimistico condividono lo stesso WACC**, quindi lo stesso fattore di sconto: cio' che cambia " +
          "fra scenari e' l'azienda (quanta cassa genera, quanto vale la perpetuita'), non il prezzo del " +
          'capitale che la finanzia.',
        '',
        `**I tre scenari**, gia' pronti come dati: PV FCF espliciti e Terminal Value per ciascuno, piu' il ` +
          `fattore di sconto TV comune, ${num(fattoreSconto, 4)} (da un WACC di ${pct(wacc, 1)}).`,
        '',
        `Dopo aver calcolato i tre Enterprise Value, riconcilia lo scenario BASE con l'Enterprise Value di ` +
          `mercato osservato, gia' dato: ${eurM(evMercato)} — un benchmark indipendente da comps o ` +
          'precedenti, lo stesso per tutti e tre gli scenari, contro cui giudicare se le assunzioni del ' +
          'DCF sono ragionevoli.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, ['DCF completo: tre scenari e reconciliation al valore di mercato'], {
              style: STILE_TITOLO,
            }),

            riga(`A${ROW_SEZ1}`, ['I tre scenari — Enterprise Value'], { style: STILE_TITOLO }),
            riga(`A${ROW_HEADER}`, [
              'Scenario',
              'PV FCF espliciti, €',
              'Terminal Value, €',
              'Fattore sconto TV = (1+WACC)^-5',
              'Enterprise Value, €',
            ], { style: STILE_TITOLO }),

            colonna(`A${ROW_BASE}`, ['BASE'], { style: STILE_ETICHETTA }),
            [{ ref: B_PV_BASE, content: pvFcfBase, style: STILE_INPUT, locked: true }],
            [{ ref: C_TV_BASE, content: tvBase, style: STILE_INPUT, locked: true }],
            [{ ref: D_FATT_BASE, content: fattoreSconto, style: STILE_FATTORE, locked: true }],
            [{ ref: E_EV_BASE, content: null, locked: false, style: STILE_FORMULA }],

            colonna(`A${ROW_OTT}`, ['OTTIMISTICO'], { style: STILE_ETICHETTA }),
            [{ ref: B_PV_OTT, content: pvFcfOtt, style: STILE_INPUT, locked: true }],
            [{ ref: C_TV_OTT, content: tvOtt, style: STILE_INPUT, locked: true }],
            [{ ref: D_FATT_OTT, content: fattoreSconto, style: STILE_FATTORE, locked: true }],
            [{ ref: E_EV_OTT, content: null, locked: false, style: STILE_FORMULA }],

            colonna(`A${ROW_PESS}`, ['PESSIMISTICO'], { style: STILE_ETICHETTA }),
            [{ ref: B_PV_PESS, content: pvFcfPess, style: STILE_INPUT, locked: true }],
            [{ ref: C_TV_PESS, content: tvPess, style: STILE_INPUT, locked: true }],
            [{ ref: D_FATT_PESS, content: fattoreSconto, style: STILE_FATTORE, locked: true }],
            [{ ref: E_EV_PESS, content: null, locked: false, style: STILE_FORMULA }],

            riga(`A${ROW_SEZ2}`, ['Confronto con il mercato'], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_EV_MERCATO}`,
              [
                'Enterprise Value di mercato osservato (da comps/precedenti), €',
                'Scostamento % EV di mercato vs. Enterprise Value scenario BASE',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EV_MERCATO, content: evMercato, style: STILE_INPUT, locked: true }],
            [{ ref: B_RECON, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 260, B: 170, C: 170, D: 220, E: 180 }, frozenRows: ROW_HEADER },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_PV_BASE}+${C_TV_BASE}*${D_FATT_BASE}: PV FCF espliciti piu' Terminal Value moltiplicato ` +
            `per il fattore di sconto (qui vale ${eurM(evBase)}).`,
          14,
          'T1',
        ),
        hint(
          'H2',
          `=${B_PV_OTT}+${C_TV_OTT}*${D_FATT_OTT}: stessa formula di T1, dati di questa riga (qui vale ` +
            `${eurM(evOtt)}).`,
          14,
          'T2',
        ),
        hint(
          'H3',
          `=${B_PV_PESS}+${C_TV_PESS}*${D_FATT_PESS}: stessa formula, dati di questa riga (qui vale ` +
            `${eurM(evPess)}).`,
          14,
          'T3',
        ),
        hint(
          'H4',
          `=(${B_EV_MERCATO}-${E_EV_BASE})/${E_EV_BASE}: EV di mercato meno EV base (da T1), diviso EV ` +
            `base — mai il contrario (qui vale ${pct(scostamento)}).`,
          16,
          'T4',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 210 }),
      startAt: `Model!${E_EV_BASE}`,
    };
  },
});
