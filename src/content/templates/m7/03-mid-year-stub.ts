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
 * TRE TASK IN CASCATA:
 *
 *   T1  Frazione di stub period          s = (fine FY - data val.) / 365
 *   T2  Fattore di sconto dello stub        = (1+WACC)^-(s/2)
 *   T3  Fattore del primo anno pieno        = (1+WACC)^-(s+0,5)
 *
 * T3 e' il punto che i manuali sbrigativi sbagliano: il primo anno fiscale
 * pieno comincia DOPO lo stub, quindi il suo flusso arriva in media a s + 0,5
 * anni dalla data di valutazione, non a 0,5. L'esponente -0,5 vale solo se si
 * valuta esattamente all'inizio dell'anno fiscale (stub nullo); ogni anno
 * successivo aggiunge 1 all'esponente.
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

const B_FRAZIONESTUB = 'B9'; // T1
const B_FATTORESTUB = 'B10'; // T2
const B_FATTOREANNO = 'B11'; // T3

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
    const attesoFrazioneStub = stubGiorni / 365;
    const attesoFattoreStub = Math.pow(1 + wacc, -(attesoFrazioneStub / 2));
    const attesoFattoreAnno = Math.pow(1 + wacc, -(attesoFrazioneStub + 0.5));

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_FRAZIONESTUB} la frazione di stub period: quanto resta del primo anno fiscale, dalla data ` +
        `di valutazione (${B_DATAVAL}) alla sua fine (${B_FINEFY}), espresso in anni (anno di 365 giorni). ` +
        'Lavora sulle due celle-data, senza contare i giorni a mano.',
      target: `Model!${B_FRAZIONESTUB}`,
      atteso: attesoFrazioneStub,
      referenzia: [B_DATAVAL, B_FINEFY],
      senzaLiteral: [365],
      skills: ['xl.date-functions'],
      minKeystrokes: 14,
    });

    // Tolleranza assoluta stretta: i fattori vivono vicino a 1, e la formula
    // che dimentica di dimezzare lo stub deve restare fuori su ogni seed.
    const t2: Task = {
      id: 'T2',
      prompt:
        `In ${B_FATTORESTUB} il fattore di sconto del flusso dello stub period con la mid-year ` +
        `convention: quel flusso arriva in media a meta' dello stub (${B_FRAZIONESTUB}). WACC in ${B_WACC}.`,
      targetCell: `Model!${B_FATTORESTUB}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: attesoFattoreStub,
          tolerance: 0.0005,
          toleranceMode: 'absolute',
          message:
            "Il valore non torna: con la mid-year convention il flusso dello stub si sconta a META' " +
            "della frazione di stub, non all'intero stub e non a mezzo anno.",
        },
        { kind: 'mustReference', cells: [B_WACC, B_FRAZIONESTUB] },
        { kind: 'mustNotContainLiteral', except: [1, 2, 0.5, -0.5] },
      ],
      skills: ['dcf.mid-year'],
      minKeystrokes: 20,
    };

    const t3: Task = {
      id: 'T3',
      prompt:
        `In ${B_FATTOREANNO} il fattore di sconto del primo anno fiscale PIENO, quello che comincia alla ` +
        "fine dello stub. Con la mid-year convention il suo flusso arriva a meta' di quell'anno: quanto " +
        "tempo e' passato, in tutto, dalla data di valutazione?",
      targetCell: `Model!${B_FATTOREANNO}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: attesoFattoreAnno,
          tolerance: 0.0005,
          toleranceMode: 'absolute',
          message:
            "Il valore non torna: il primo anno pieno comincia dopo lo stub, quindi il suo flusso arriva " +
            "a stub + mezzo anno dalla data di valutazione, non a mezzo anno.",
        },
        { kind: 'mustReference', cells: [B_WACC, B_FRAZIONESTUB] },
        { kind: 'mustNotContainLiteral', except: [1, 2, 0.5, -0.5] },
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
        "Il primo anno fiscale pieno comincia alla fine dello stub: il suo flusso arriva in media a " +
          "stub + mezzo anno dalla data di valutazione. L'esponente -0,5 dei manuali vale solo quando si " +
          "valuta esattamente all'inizio dell'anno fiscale; ogni anno successivo aggiunge 1.",
        '',
        `Dati: WACC ${pct(wacc, 1)} (dato, non e\' l'oggetto di questo livello). Data di valutazione ` +
          `${num(giornoVal)}/${num(meseVal)}/${num(annoVal)}. Fine del primo anno fiscale ` +
          `${num(fineFY.giorno)}/${num(fineFY.mese)}/${num(fineFY.anno)} — ${num(stubGiorni)} giorni dopo.`,
        '',
        "Tre task: la frazione di stub, il fattore di sconto dello stub, il fattore del primo anno pieno. " +
          'Gli ultimi due riferiscono la frazione di stub: mai ricalcolarla da zero.',
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
                "Frazione di stub period rimanente nell'anno corrente",
                'Fattore di sconto, stub period (mid-year)',
                'Fattore di sconto, primo anno pieno (mid-year)',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_FRAZIONESTUB, content: null, locked: false, style: STILE_FORMULA_4DEC }],
            [{ ref: B_FATTORESTUB, content: null, locked: false, style: STILE_FORMULA_4DEC }],
            [{ ref: B_FATTOREANNO, content: null, locked: false, style: STILE_FORMULA_4DEC }],
          ],
          { colWidths: { A: 440, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `=(${B_FINEFY}-${B_DATAVAL})/365: sottrazione diretta fra le due date, poi diviso 365.`, 10, 'T1'),
        hint('H2', `=(1+${B_WACC})^-(${B_FRAZIONESTUB}/2): si sconta a meta' dello stub.`, 10, 'T2'),
        hint(
          'H3',
          `=(1+${B_WACC})^-(${B_FRAZIONESTUB}+0.5), oppure =1/(1+${B_WACC})^(${B_FRAZIONESTUB}+0.5): ` +
            "lo stub intero piu' mezzo anno.",
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_FRAZIONESTUB}`,
    };
  },
});
