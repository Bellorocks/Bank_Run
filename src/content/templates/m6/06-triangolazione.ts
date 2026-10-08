/**
 * M6 · 06 — Triangolazione: comps, precedenti e DCF che divergono.
 *
 * QUESTO E' IL LIVELLO [COMBO] DEL MODULO M6. Lo spec del modulo chiede
 * "triangolare comps + precedenti + DCF e spiegare le divergenze". I tre
 * moduli di valutazione fondamentali — comps trading (M5), precedenti (questo
 * modulo, M6) e DCF (curriculum M7, NON ANCORA SCRITTO in questo progetto) —
 * raramente producono lo STESSO Enterprise Value implicito per lo stesso
 * target, e questo non e' un errore da correggere: e' l'informazione.
 *
 * SEMPLIFICAZIONE DICHIARATA (coerente con lo stile di documentare le
 * scelte gia' visto altrove nel progetto — vedi ad es. M4-05, M5-10): il DCF
 * vero e proprio (proiezione di flussi di cassa liberi, sconto al WACC,
 * valore terminale) e' materia di M7, che non esiste ancora in questo
 * curriculum. L'EV implicito da DCF arriva percio' qui come un DATO bloccato
 * diretto, esattamente come gli EV da comps e da precedenti — nessuno dei tre
 * e' "derivato" da un template precedente: come da regola di progetto, ogni
 * LevelInstance e' autosufficiente e non esiste cella condivisa fra template
 * diversi, quindi anche i "risultati concettuali" di M5 e di M6 rientrano qui
 * come input bloccati propri, non come riferimenti cross-livello.
 *
 * IL PUNTO DIDATTICO CENTRALE: nessuno dei tre metodi e' "quello giusto" per
 * definizione.
 *  - i COMPS riflettono il sentiment di mercato CORRENTE — un mercato azionario
 *    puo' essere ottimistico o pessimistico in un dato momento, e i multipli
 *    trading si muovono con lui anche quando i fondamentali del target non
 *    sono cambiati;
 *  - i PRECEDENTI riflettono premi di controllo pagati in transazioni
 *    STORICHE (M6-02, M6-03), magari in condizioni di ciclo di mercato
 *    diverse da oggi (M6-05) — sono un fatto realmente accaduto, ma un fatto
 *    del passato;
 *  - il DCF riflette assunzioni INTERNE (crescita, margini, WACC) scelte da
 *    chi costruisce il modello: possono essere piu' o meno prudenti, e non
 *    dipendono affatto dall'umore del mercato in un giorno preciso.
 * La triangolazione non serve a scegliere un vincitore fra i tre: serve a
 * CAPIRE PERCHE' divergono, cosa dice quella divergenza sulle assunzioni di
 * ciascun metodo, e quale intervallo di valori e' effettivamente difendibile.
 *
 * DIVERGENZA COSTRUITA, NON CASUALE: il generatore impone che il rapporto fra
 * il valore piu' alto e quello piu' basso dei tre stia fra 1,15x e 1,40x
 * (15%-40% di scarto) — un vincolo nel generatore, non solo un'osservazione:
 * con tre numeri quasi identici l'esercizio di "spiegare le divergenze"
 * perderebbe senso. QUALE dei tre metodi risulti il piu' alto, il piu' basso
 * o quello intermedio cambia col seed (assegnazione mescolata): non c'e' un
 * ordine fisso "i comps sono sempre ottimisti" — nella realta' non lo sono
 * sempre, ed e' proprio questo che rende la triangolazione un esercizio di
 * lettura caso per caso, non una regola meccanica.
 *
 * TRE TASK, IN CASCATA:
 *   T1 — l'AMPIEZZA del range: MAX dei tre valori meno MIN dei tre valori.
 *        Quanto e' largo, in euro, l'intervallo dentro cui i tre metodi
 *        collocano l'EV del target.
 *   T2 — il valore MEDIO semplice dei tre metodi (AVERAGE): una sintesi
 *        naive, che pesa i tre metodi allo stesso modo — un punto di
 *        partenza, non necessariamente il numero "giusto" da usare in un
 *        deal reale (una media semplice non sa che i comps di oggi possono
 *        essere gonfiati da un mercato caldo, o che il DCF puo' riposare su
 *        assunzioni troppo ottimistiche).
 *   T3 — lo SCOSTAMENTO % del DCF rispetto alla media di comps e precedenti,
 *        SENZA includere il DCF stesso in quella media (altrimenti il DCF
 *        si confronterebbe in parte con se stesso). Isola quanto il metodo
 *        basato su assunzioni interne (DCF) si discosta dai due metodi
 *        basati sul mercato (comps e precedenti) — e in che direzione.
 *
 * Geometria fissa: nessuna posizione dipende dal seed.
 */

import {
  defineTemplate,
  colonna,
  eurM,
  foglio,
  hint,
  multiplo,
  num,
  par,
  pct,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { revenue } from '../../../rng/finance';
import type { Task } from '../../types';

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EV_COMPS = 'B4'; // EV implicito da comps (dato, bloccato — risultato concettuale di M5)
const B_EV_PRECEDENTI = 'B5'; // EV implicito da precedenti (dato, bloccato — risultato concettuale di M6)
const B_EV_DCF = 'B6'; // EV implicito da DCF (dato, bloccato diretto — M7 non ancora scritto)

const B_AMPIEZZA = 'B9'; // T1
const B_MEDIA = 'B10'; // T2
const B_SCOSTAMENTO_DCF = 'B11'; // T3

const rangeValori = `${B_EV_COMPS}:${B_EV_DCF}`; // B4:B6, i tre EV impliciti

export default defineTemplate({
  id: 'M6-06-TRIANGOLAZIONE',
  module: 'M6',
  title: 'Triangolazione: comps, precedenti e DCF che divergono',
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['prec.triangulation'],
  prerequisites: ['M6-03-SINERGIENELPREZZO', 'M6-05-CICLODIMERCATO'],
  combo: true,

  generate: (rng) => {
    const rBase = rng.fork('base');
    const rDivergenza = rng.fork('divergenza');
    const rAssegnazione = rng.fork('assegnazione');

    // --- Ordine di grandezza: stesso trucco di M6-03, la distribuzione di
    // `revenue()` riusata come generico generatore di un importo plausibile
    // da mid-market (mediana 8m, range 1,5m-150m) — non rappresenta ricavi,
    // e' solo la scala giusta per un Enterprise Value "azienda vera". ------
    const evBase = revenue(rBase);

    // --- Divergenza fra il valore piu' alto e il piu' basso dei tre metodi:
    // vincolo COSTRUITO nel generatore, 15%-40% (spec del task), moda 25%. --
    const spread = triangular(rDivergenza, 0.15, 0.25, 0.4);

    // --- Il valore intermedio non sta esattamente a meta' fra basso e alto:
    // in un caso reale i tre metodi raramente si dispongono in modo cosi'
    // ordinato. Range 20%-80% dello spread, moda 50%. -----------------------
    const frazioneMedio = triangular(rDivergenza, 0.2, 0.5, 0.8);

    const multBasso = 1;
    const multAlto = 1 + spread;
    const multMedio = 1 + frazioneMedio * spread;

    // --- Quale dei tre metodi risulti il piu' alto, il piu' basso o quello
    // intermedio cambia col seed: non c'e' un ordine fisso "i comps sono
    // sempre ottimisti" — e' proprio l'incertezza su CHI diverge in quale
    // direzione che rende la triangolazione un esercizio di lettura, non una
    // regola meccanica (vedi commento di testa). ----------------------------
    const [multComps, multPrecedenti, multDcf] = rAssegnazione.shuffle([multBasso, multMedio, multAlto]);

    const evComps = roundTo(evBase * multComps, 1000);
    const evPrecedenti = roundTo(evBase * multPrecedenti, 1000);
    const evDcf = roundTo(evBase * multDcf, 1000);

    // Valori "veri" usati come atteso nei task: ricalcolati dai DATI
    // effettivamente scritti in foglio (dopo l'arrotondamento a mille euro),
    // non dai parametri intermedi di generazione.
    const valori = [evComps, evPrecedenti, evDcf];
    const ampiezza = Math.max(...valori) - Math.min(...valori);
    const media = (evComps + evPrecedenti + evDcf) / 3;
    const mediaCompsPrecedenti = (evComps + evPrecedenti) / 2;
    const scostamentoDcf = (evDcf - mediaCompsPrecedenti) / mediaCompsPrecedenti;

    const t1 = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          `In ${B_AMPIEZZA} calcola l'AMPIEZZA del range di triangolazione: il valore piu' ALTO fra i tre ` +
          `EV impliciti (${rangeValori}) meno il valore piu' BASSO — cioe' MAX(${rangeValori})-` +
          `MIN(${rangeValori}). E' quanto e' largo, in euro, l'intervallo dentro cui comps, precedenti e ` +
          "DCF collocano l'Enterprise Value del target: piu' e' largo, meno i tre metodi sono d'accordo fra " +
          'loro, e piu' + "' serve capire il perche' prima di usarne uno solo.",
        target: `Model!${B_AMPIEZZA}`,
        atteso: ampiezza,
        referenzia: [B_EV_COMPS, B_EV_PRECEDENTI, B_EV_DCF],
        senzaLiteral: [],
        skills: ['prec.triangulation'],
        minKeystrokes: 22,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['MAX', 'MIN'], quantifier: 'all' as const }],
      };
    })();

    const t2 = (() => {
      const base = taskFormula({
        id: 'T2',
        prompt:
          `In ${B_MEDIA} calcola il valore MEDIO semplice dei tre metodi: AVERAGE(${rangeValori}). E' una ` +
          "sintesi naive — pesa comps, precedenti e DCF allo stesso identico modo, senza sapere se uno dei " +
          "tre e' distorto (un mercato dei comps insolitamente caldo, un DCF con assunzioni troppo " +
          "ottimistiche, un precedente pagato in un ciclo di mercato molto diverso da oggi). E' un punto di " +
          "partenza per la triangolazione, non necessariamente il numero da scrivere nel term sheet.",
        target: `Model!${B_MEDIA}`,
        atteso: media,
        referenzia: [B_EV_COMPS, B_EV_PRECEDENTI, B_EV_DCF],
        senzaLiteral: [],
        skills: ['prec.triangulation'],
        minKeystrokes: 14,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['AVERAGE'] }] };
    })();

    const t3 = (() => {
      const base = taskFormula({
        id: 'T3',
        prompt:
          `In ${B_SCOSTAMENTO_DCF} calcola lo SCOSTAMENTO % del DCF rispetto alla media di comps e ` +
          `precedenti — SENZA includere il DCF in quella media (altrimenti il DCF finirebbe confrontato ` +
          `in parte con se stesso): (${B_EV_DCF}-AVERAGE(${B_EV_COMPS},${B_EV_PRECEDENTI}))/` +
          `AVERAGE(${B_EV_COMPS},${B_EV_PRECEDENTI}). Un risultato positivo dice che il DCF vale PIU' di ` +
          "quanto suggeriscano i due metodi basati sul mercato; negativo, che vale MENO. In entrambi i " +
          "casi non e' automaticamente un errore: il DCF riflette assunzioni interne (crescita, margini, " +
          "WACC) che per costruzione non devono coincidere col sentiment di mercato — lo scostamento e' " +
          "l'innesco per chiedersi perche', non un segnale da correggere a tavolino.",
        target: `Model!${B_SCOSTAMENTO_DCF}`,
        atteso: scostamentoDcf,
        referenzia: [B_EV_DCF, B_EV_COMPS, B_EV_PRECEDENTI],
        senzaLiteral: [],
        skills: ['prec.triangulation'],
        minKeystrokes: 34,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['AVERAGE'] }] };
    })();

    const tasks: Task[] = [t1, t2, t3];

    return {
      templateId: 'M6-06-TRIANGOLAZIONE',
      seed: rng.seed,
      brief: [
        '## Triangolazione: comps, precedenti e DCF che divergono',
        '',
        "Tre metodi diversi per stimare lo stesso Enterprise Value RARAMENTE producono lo stesso numero " +
          "— e non e' un errore da correggere, e' informazione.",
        '',
        "**I comps trading** riflettono il sentiment di mercato CORRENTE: un mercato azionario ottimista " +
          "spinge in alto i multipli anche quando i fondamentali del target non sono cambiati di una " +
          "virgola; un mercato pessimista li comprime allo stesso modo.",
        '',
        "**I precedenti** (i livelli di questo modulo) riflettono premi di controllo pagati in transazioni " +
          "STORICHE — un fatto realmente accaduto, ma un fatto del passato, magari in un ciclo di mercato " +
          "molto diverso da quello di oggi.",
        '',
        "**Il DCF** (materia del prossimo modulo, qui dato come input) riflette assunzioni INTERNE — " +
          "crescita, margini, WACC — scelte da chi costruisce il modello: possono essere piu' o meno " +
          "prudenti, e non dipendono dall'umore del mercato in un giorno preciso.",
        '',
        "Nessuno dei tre e' \"quello giusto\" per definizione. Triangolare non vuol dire scegliere un " +
          "vincitore: vuol dire capire PERCHE' i tre numeri divergono, e quale intervallo resta " +
          "effettivamente difendibile.",
        '',
        `**Il caso.** Per lo stesso target, i tre metodi implicano: EV da comps ${eurM(evComps)}, EV da ` +
          `precedenti ${eurM(evPrecedenti)}, EV da DCF ${eurM(evDcf)} (il DCF vero e proprio e' materia ` +
          "del modulo successivo: qui arriva gia' calcolato, come dato).",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Triangolazione: comps, precedenti e DCF che divergono'], { style: STILE_TITOLO }),
            riga('A3', ["I tre valori impliciti dell'Enterprise Value"], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'EV implicito da comps, €',
                'EV implicito da precedenti, €',
                'EV implicito da DCF (dato, vedi nota), €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EV_COMPS, content: evComps, style: STILE_INPUT, locked: true }],
            [{ ref: B_EV_PRECEDENTI, content: evPrecedenti, style: STILE_INPUT, locked: true }],
            [{ ref: B_EV_DCF, content: evDcf, style: STILE_INPUT, locked: true }],

            riga('A8', ['Triangolazione: range, media e scostamento del DCF'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                "Ampiezza del range (valore piu' alto − valore piu' basso), €",
                'Valore medio semplice dei tre metodi, €',
                'Scostamento % del DCF vs. media di comps e precedenti (DCF escluso dalla media)',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_AMPIEZZA, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_MEDIA, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_SCOSTAMENTO_DCF, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 460, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=MAX(${rangeValori})-MIN(${rangeValori}): il piu' alto dei tre meno il piu' basso (qui vale ` +
            `${eurM(ampiezza)}).`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=AVERAGE(${rangeValori}): media semplice dei tre EV (qui vale ${eurM(media)}).`,
          10,
          'T2',
        ),
        hint(
          'H3',
          `=(${B_EV_DCF}-AVERAGE(${B_EV_COMPS},${B_EV_PRECEDENTI}))/AVERAGE(${B_EV_COMPS},${B_EV_PRECEDENTI}): ` +
            `DCF meno la media di comps e precedenti, diviso quella stessa media (qui vale ` +
            `${pct(scostamentoDcf)} — con EV da comps ${eurM(evComps)}, precedenti ${eurM(evPrecedenti)} e ` +
            `DCF ${eurM(evDcf)}, cioe' un multiplo di divergenza di ${multiplo(Math.max(evComps, evPrecedenti, evDcf) / Math.min(evComps, evPrecedenti, evDcf))} fra il piu' alto e il piu' basso, con ${num(valori.length)} metodi a confronto).`,
          14,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 170 }),
      startAt: `Model!${B_AMPIEZZA}`,
    };
  },
});
