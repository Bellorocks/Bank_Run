/**
 * M7 · 03 — Mid-year convention e stub period.
 *
 * Due correzioni al fattore di sconto "da manuale" (1+WACC)^-t, entrambe
 * necessarie in un DCF vero:
 *
 *  - MID-YEAR CONVENTION: la formula da manuale sconta ogni flusso annuo come
 *    se arrivasse tutto il 31/12 (t intero: 1, 2, 3...). Nella realta' un'azienda
 *    incassa e paga durante TUTTO l'anno, non in un colpo solo a fine anno: in
 *    media, un flusso "distribuito uniformemente" arriva a META' del suo
 *    periodo. Si sconta quindi a t-0,5 invece che a t intero — l'esponente
 *    diventa -0,5 per il primo anno pieno invece di -1. Scontare per MENO tempo
 *    AUMENTA il valore attuale (un euro fra 6 mesi vale piu' di un euro fra 12).
 *  - STUB PERIOD: la data di valutazione quasi mai cade esattamente
 *    sull'inizio dell'anno fiscale. Il primo periodo che si sconta davvero non
 *    e' un anno pieno: e' il pezzo di anno fiscale rimanente dalla data di
 *    valutazione alla fine di quell'anno fiscale — piu' corto di 12 mesi. La
 *    mid-year convention si applica alla META' di QUESTO periodo piu' corto,
 *    non alla meta' di un anno intero.
 *
 * TRE TASK, ognuno riferisce quanto serve senza ricalcolare da capo:
 *
 *   T1  Fattore di sconto per un anno pieno, mid-year  = (1+WACC)^-0,5
 *   T2  Frazione di stub period rimanente nell'anno    = (fine FY - data val.) / 365
 *   T3  Fattore di sconto per lo stub period            = (1+WACC)^-(T2/2)
 *
 * T3 e' la stessa identica logica di T1 (mid-year: si sconta a META' del
 * periodo), applicata pero' non a un anno intero (esponente -0,5) ma alla
 * frazione di anno calcolata in T2 (esponente -(T2/2)): ecco perche' T3 DEVE
 * riferire la cella di T2, mai un numero di giorni ricalcolato o scritto a mano.
 *
 * DATE: costruite SEMPRE con DATE(anno,mese,giorno) dentro la formula (classe di
 * bug #4 del progetto). La sottrazione diretta fra le due celle-data in T2 e'
 * sicura per qualunque giorno del mese, ma i giorni generati restano comunque
 * 1-28 per coerenza con gli altri livelli che costruiscono date (M1-03, M0F-09).
 *
 * VINCOLO GARANTITO NEL GENERATORE (non lasciato al caso): la data di fine del
 * primo anno fiscale e' costruita SOMMANDO alla data di valutazione un numero
 * di giorni estratto in [30, 330] — mai calcolata come "31/12 piu' vicino" con
 * aritmetica di mesi. Questo garantisce per costruzione, su qualunque seed:
 *   - fine FY sempre DOPO la data di valutazione (stub > 0);
 *   - fine FY sempre entro 330 giorni, quindi lo stub e' SEMPRE minore di un
 *     anno (< 365 giorni), mai un caso patologico di stub "quasi pieno" o nullo.
 * Le due date restano quindi entrambe DATE(...) esplicite, coerenti fra loro
 * per costruzione, senza bisogno di un throw di guardia: l'intervallo [30,330]
 * rende impossibile violare il vincolo.
 *
 * WACC: dato, bloccato, 8,0%-12,0% a passi di 0,1 punti percentuali — non e'
 * l'oggetto di questo livello (arriva costruito da CAPM/Hamada nei livelli
 * precedenti/successivi del modulo), qui e' un input gia' pronto.
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
  num,
  pct,
  STILE_ETICHETTA,
  STILE_INPUT_PCT,
  STILE_TITOLO,
} from '../../authoring';
import { DEFAULT_FORMATS } from '../../../engine/numberFormat';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

const MS_PER_DAY = 86_400_000;

/** Giorni dal 30/12/1899 (epoca di Excel) — stessa funzione usata in M1-03 e M0F-09. */
function serialeData(anno: number, mese: number, giorno: number): number {
  return Math.round((Date.UTC(anno, mese - 1, giorno) - Date.UTC(1899, 11, 30)) / MS_PER_DAY);
}

/** Inversa di `serialeData`: da un seriale Excel torna a (anno, mese, giorno). */
function dataDaSeriale(seriale: number): { anno: number; mese: number; giorno: number } {
  const dt = new Date(Date.UTC(1899, 11, 30) + seriale * MS_PER_DAY);
  return { anno: dt.getUTCFullYear(), mese: dt.getUTCMonth() + 1, giorno: dt.getUTCDate() };
}

const STILE_INPUT_DATA: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: DEFAULT_FORMATS.data };
const STILE_FORMULA_4DEC: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0000' };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_WACC = 'B4'; // WACC (dato, bloccato)
const B_DATAVAL = 'B5'; // Data di valutazione (dato, bloccato)
const B_FINEFY = 'B6'; // Data di fine del primo anno fiscale (dato, bloccato)

const B_FATTOREANNO = 'B9'; // T1
const B_FRAZIONESTUB = 'B10'; // T2
const B_FATTORESTUB = 'B11'; // T3

export default defineTemplate({
  id: 'M7-03-MIDYEARSTUB',
  module: 'M7',
  title: 'Mid-year convention e stub period',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 340,
  skills: ['dcf.mid-year', 'xl.date-functions'],
  prerequisites: ['M7-02-COSTRUZIONEFCF'],

  generate: (rng) => {
    const rWacc = rng.fork('wacc');
    // 8,0%-12,0% a passi di 0,1 punti percentuali.
    const wacc = rWacc.int(80, 120) / 1000;

    const rDate = rng.fork('date');
    const annoVal = rDate.int(2024, 2027);
    const meseVal = rDate.int(1, 12);
    const giornoVal = rDate.int(1, 28);
    const serialeVal = serialeData(annoVal, meseVal, giornoVal);

    // Giorni fino alla fine del primo anno fiscale: SEMPRE in [30, 330], quindi
    // lo stub e' garantito positivo e sempre minore di un anno per costruzione.
    const stubGiorni = rDate.int(30, 330);
    const serialeFineFY = serialeVal + stubGiorni;
    const fineFY = dataDaSeriale(serialeFineFY);

    // Valori attesi, calcolati con la STESSA algebra dei tre task.
    const attesoFattoreAnno = Math.pow(1 + wacc, -0.5);
    const attesoFrazioneStub = stubGiorni / 365;
    const attesoFattoreStub = Math.pow(1 + wacc, -(attesoFrazioneStub / 2));

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_FATTOREANNO} calcola il fattore di sconto per UN ANNO PIENO applicando la mid-year ` +
        `convention: (1 + WACC, ${B_WACC})^-0,5. L'esponente e' -0,5 e non -1: un flusso di cassa non ` +
        "arriva tutto il 31/12, arriva distribuito durante l'anno, quindi in media a META' anno. " +
        "Scontare per meno tempo (6 mesi invece di 12) AUMENTA il valore attuale rispetto alla formula " +
        "da manuale.",
      target: `Model!${B_FATTOREANNO}`,
      atteso: attesoFattoreAnno,
      referenzia: [B_WACC],
      senzaLiteral: [1, -0.5],
      skills: ['dcf.mid-year'],
      minKeystrokes: 14,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_FRAZIONESTUB} calcola la frazione di stub period: quanto resta del primo anno fiscale, ` +
        `da OGGI (la data di valutazione, ${B_DATAVAL}) alla sua fine (${B_FINEFY}), espresso come ` +
        "frazione dell'anno. Formula: (data di fine del primo anno fiscale − data di valutazione) / 365 " +
        '— sottrazione diretta fra le due celle-data, mai un numero di giorni scritto a mano.',
      target: `Model!${B_FRAZIONESTUB}`,
      atteso: attesoFrazioneStub,
      referenzia: [B_DATAVAL, B_FINEFY],
      senzaLiteral: [365],
      skills: ['xl.date-functions'],
      minKeystrokes: 14,
    });

    // NB: costruito a mano (non con taskFormula) per poter stringere la
    // tolleranza del check 'value'. attesoFattoreStub vive sempre vicino a 1
    // (fra ~0,95 e ~0,997 su tutto il range di WACC 8%-12% e stub 30-330
    // giorni): la tolleranza di default di taskFormula e' `hybrid` con un
    // PAVIMENTO ASSOLUTO di 0,01 (§4.1 tolerance), e su questo livello di
    // scala quel pavimento e' piu' largo dell'errore prodotto da una formula
    // strutturalmente SBAGLIATA come "dimenticare /2" — cioe' scontare lo
    // stub SENZA applicare la mid-year convention, il punto didattico
    // centrale del task. Verificato empiricamente: con la tolleranza di
    // default quella formula sbagliata viene accettata per errore su circa
    // il 16% dei seed (ogni volta che WACC e stub sono entrambi bassi, il
    // quadrato di un numero vicino a 1 resta vicino a 1). mustReference non
    // basta a intercettarlo, perche' quella formula referenzia comunque sia
    // WACC sia B_FRAZIONESTUB: l'unico argine e' il check 'value' con
    // tolleranza stretta (assoluta, ben sotto il piu' piccolo scarto
    // possibile fra le due formule su tutto il range generabile).
    const t3: Task = {
      id: 'T3',
      prompt:
        `In ${B_FATTORESTUB} calcola il fattore di sconto per lo STUB PERIOD: e' la STESSA logica di ` +
        `${B_FATTOREANNO} (mid-year: si sconta a META' del periodo), ma applicata non a un anno intero, ` +
        `bensi' alla frazione di anno appena calcolata in ${B_FRAZIONESTUB} — NON ricalcolarla da capo, ` +
        `riferiscila. Formula: (1 + WACC, ${B_WACC})^-(${B_FRAZIONESTUB}/2). Questo fattore SOSTITUISCE ` +
        `${B_FATTOREANNO} nel primo periodo di un DCF con stub, perche' il primo periodo che si sconta ` +
        "davvero non e' un anno pieno.",
      targetCell: `Model!${B_FATTORESTUB}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: attesoFattoreStub,
          tolerance: 0.0005,
          toleranceMode: 'absolute',
          message:
            "Il valore non torna: controlla di aver applicato la mid-year convention ALLA FRAZIONE " +
            `di stub (dividerla per 2), non allo stub intero — la formula e' (1+WACC)^-(${B_FRAZIONESTUB}/2).`,
        },
        { kind: 'mustReference', cells: [B_WACC, B_FRAZIONESTUB] },
        { kind: 'mustNotContainLiteral', except: [1, 2] },
      ],
      skills: ['dcf.mid-year'],
      minKeystrokes: 20,
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M7-03-MIDYEARSTUB',
      seed: rng.seed,
      brief: [
        '## Mid-year convention e stub period',
        '',
        "La formula da manuale sconta ogni flusso annuo come se arrivasse tutto il 31/12: esponente " +
          '-1, -2, -3... Nella realta\' un\'azienda incassa e paga durante TUTTO l\'anno, non in un colpo ' +
          "solo a fine anno. In media, un flusso distribuito uniformemente arriva a META' del suo " +
          'periodo: e\' la **mid-year convention**, e cambia l\'esponente da -1 a -0,5 per il primo anno ' +
          "pieno. Scontare per MENO tempo AUMENTA il valore attuale — un euro fra 6 mesi vale di piu' di " +
          'un euro fra 12.',
        '',
        "C'e' una seconda complicazione, quasi sempre presente in un DCF vero: la data di valutazione " +
          "quasi mai cade esattamente all'inizio dell'anno fiscale dell'azienda. Il primo periodo che si " +
          "sconta davvero non e' un anno pieno: e' lo **stub period**, il pezzo di anno fiscale che resta " +
          "dalla data di valutazione alla sua fine — piu' corto di 12 mesi. La mid-year convention si " +
          "applica alla META' di QUESTO periodo piu' corto, non alla meta' di un anno intero.",
        '',
        '> **Fattore di sconto, anno pieno, mid-year: (1 + WACC)^-0,5**',
        '> **Frazione di stub period: (fine primo anno fiscale − data di valutazione) / 365**',
        '> **Fattore di sconto, stub period: (1 + WACC)^-(frazione di stub / 2)**',
        '',
        `Dati: WACC ${pct(wacc, 1)} (dato, non e\' l'oggetto di questo livello). Data di valutazione ` +
          `${num(giornoVal)}/${num(meseVal)}/${num(annoVal)}. Fine del primo anno fiscale ` +
          `${num(fineFY.giorno)}/${num(fineFY.mese)}/${num(fineFY.anno)} — ${num(stubGiorni)} giorni dopo.`,
        '',
        "Tre task: prima il fattore mid-year per un anno pieno (che userai su TUTTI i periodi tranne il " +
          "primo), poi la frazione di stub, poi il fattore di sconto specifico dello stub, che SOSTITUISCE " +
          'il primo nel primo periodo. Il terzo task riferisce il secondo — mai ricalcolarlo da zero.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Mid-year convention e stub period'], { style: STILE_TITOLO }),

            riga('A3', ['Dati'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              ['WACC', 'Data di valutazione', 'Data di fine del primo anno fiscale'],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_WACC, content: wacc, style: STILE_INPUT_PCT, locked: true }],
            [{ ref: B_DATAVAL, content: `=DATE(${annoVal},${meseVal},${giornoVal})`, style: STILE_INPUT_DATA, locked: true }],
            [{ ref: B_FINEFY, content: `=DATE(${fineFY.anno},${fineFY.mese},${fineFY.giorno})`, style: STILE_INPUT_DATA, locked: true }],

            riga('A8', ["Sconto: mid-year convention e stub period"], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                "Fattore di sconto, anno pieno (mid-year convention)",
                "Frazione di stub period rimanente nell'anno corrente",
                'Fattore di sconto, stub period',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_FATTOREANNO, content: null, locked: false, style: STILE_FORMULA_4DEC }],
            [{ ref: B_FRAZIONESTUB, content: null, locked: false, style: STILE_FORMULA_4DEC }],
            [{ ref: B_FATTORESTUB, content: null, locked: false, style: STILE_FORMULA_4DEC }],
          ],
          { colWidths: { A: 440, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `=(1+${B_WACC})^-0.5: esponente -0.5, non -1 — e' la mid-year convention.`, 10, 'T1'),
        hint('H2', `=(${B_FINEFY}-${B_DATAVAL})/365: sottrazione diretta fra le due date, poi diviso 365.`, 10, 'T2'),
        hint(
          'H3',
          `=(1+${B_WACC})^-(${B_FRAZIONESTUB}/2): stessa struttura di T1, ma l'esponente e' meta' della ` +
            'frazione di stub calcolata in T2, non -0.5.',
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_FATTOREANNO}`,
    };
  },
});
