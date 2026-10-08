/**
 * M2 · 10 — LTM (Last Twelve Months) e calendarizzazione.
 *
 * IL PUNTO DIDATTICO: un compratore non negozia mai sull'ultimo FY chiuso (che
 * puo' avere 6-18 mesi di dati ormai vecchi) ne' su una proiezione ottenuta
 * raddoppiando l'ultimo semestre disponibile. Usa l'LTM: gli ultimi 12 mesi
 * REALMENTE OSSERVATI, ricostruiti da pezzi di bilanci gia' pubblicati:
 *
 *   EBITDA LTM = FY (ultimo anno fiscale intero) + H1 corrente - H1 precedente
 *
 * Il FY piu' recente include gia', al suo interno, i sei mesi che compongono
 * "H1 precedente" (lo stesso periodo dell'anno prima, gia' chiuso). Sommare
 * H1 corrente sopra il FY senza togliere H1 precedente conterebbe due volte
 * quei sei mesi: la sottrazione non e' un dettaglio tecnico, e' cio' che
 * evita il doppio conteggio.
 *
 * PERCHE' NON BASTA RADDOPPIARE L'H1 CORRENTE (spiegato nel brief con numeri
 * concreti generati qui): un business stagionale — retail con il Black
 * Friday e il Natale, turismo con l'estate — non distribuisce l'EBITDA in
 * modo uniforme fra i due semestri. Se l'H1 e' strutturalmente il semestre
 * debole (Q4 forte concentrato nel secondo semestre), raddoppiarlo
 * SOTTOSTIMA l'anno; se e' il semestre forte, lo SOVRASTIMA. L'LTM aggira il
 * problema perche' non proietta nulla: somma e sottrae dati REALMENTE
 * osservati.
 *
 * Le due date di chiusura semestre sono costruite con `DATE(anno,mese,giorno)`
 * dentro la formula (classe di bug #4 del progetto), mai come stringa
 * letterale, e condividono lo STESSO mese/giorno un anno dopo: e' cosi' che
 * si garantisce per costruzione (non per range scelto a mano) che la finestra
 * valga sempre 365 o 366 giorni, mai un valore intermedio arbitrario. Il
 * conteggio dei giorni usa la sottrazione diretta fra le due celle-data, mai
 * EDATE/EOMONTH/YEARFRAC: la sottrazione e' sicura per qualunque giorno del
 * mese (stessa tecnica di M1-03-RATEIRISCONTI), qui il giorno resta comunque
 * confinato a 1-28 per coerenza con le altre date del progetto, anche se qui
 * non ci sarebbe un vero bisogno tecnico di farlo (nessuna EDATE/EOMONTH e'
 * coinvolta nella verifica).
 */

import {
  defineTemplate,
  colonna,
  eur,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { DEFAULT_FORMATS } from '../../../engine/numberFormat';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

const MS_PER_DAY = 86_400_000;

/** Giorni dal 30/12/1899 (epoca di Excel) — stessa funzione usata in M1-03 e M0F-09. */
function serialeData(anno: number, mese: number, giorno: number): number {
  return Math.round((Date.UTC(anno, mese - 1, giorno) - Date.UTC(1899, 11, 30)) / MS_PER_DAY);
}

const STILE_INPUT_DATA: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: DEFAULT_FORMATS.data };

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_FY = 'B4'; // EBITDA FY, ultimo anno fiscale intero (dato, bloccato)
const B_H1_CORRENTE = 'B5'; // EBITDA H1 anno corrente (dato, bloccato)
const B_H1_PRECEDENTE = 'B6'; // EBITDA H1 stesso periodo anno precedente (dato, bloccato)
const B_DATA_PRECEDENTE = 'B7'; // Data di chiusura H1 precedente (dato, bloccato)
const B_DATA_CORRENTE = 'B8'; // Data di chiusura H1 corrente (dato, bloccato)

const B_LTM = 'B11'; // T1
const B_GIORNI = 'B12'; // T2

export default defineTemplate({
  id: 'M2-10-LTM',
  module: 'M2',
  title: 'LTM: dodici mesi veri, non un raddoppio',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['qoe.ltm', 'xl.date-functions'],
  prerequisites: ['M2-01-NORMALIZZAZIONE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Anni e data di chiusura semestre: stesso mese/giorno, un anno dopo. --
    const annoPrecedente = r.int(2022, 2025); // ultimo anno fiscale intero disponibile
    const annoCorrente = annoPrecedente + 1;
    const meseChiusura = r.int(1, 12);
    const giornoChiusura = r.int(1, 28);

    const serialePrecedente = serialeData(annoPrecedente, meseChiusura, giornoChiusura);
    const serialeCorrente = serialeData(annoCorrente, meseChiusura, giornoChiusura);
    const giorniLTM = serialeCorrente - serialePrecedente; // sempre 365 o 366, mai altro

    // --- EBITDA: FY plausibile, poi le due meta' d'anno come frazioni del FY. --
    const fyEbitda = r.int(4000, 20000) * 1000; // € 4,0m - € 20,0m

    // H1 precedente come quota del FY: un semestre "tipico" pesa circa meta'
    // dell'anno, ma la stagionalita' lo sposta in un intervallo plausibile.
    const frazioneH1Precedente = triangular(r, 0.35, 0.48, 0.65);
    const h1Precedente = roundTo(frazioneH1Precedente * fyEbitda, 500);

    // H1 corrente come crescita/calo rispetto allo stesso periodo dell'anno
    // prima: puo' essere sopra o sotto, cosi' l'LTM a volte supera il FY e a
    // volte lo sottopassa — non e' un fatto scontato per chi impara.
    const fattoreCrescita = triangular(r, 0.75, 1.05, 1.35);
    const h1Corrente = roundTo(fattoreCrescita * h1Precedente, 500);

    const ltm = fyEbitda + h1Corrente - h1Precedente;
    const raddoppioNaive = h1Corrente * 2;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_LTM} calcola l'EBITDA LTM (Last Twelve Months): il FY dell'ultimo anno fiscale intero ` +
        `(${B_FY}) piu' l'H1 dell'anno corrente (${B_H1_CORRENTE}) MENO l'H1 dello stesso periodo ` +
        `dell'anno precedente (${B_H1_PRECEDENTE}). Il FY include gia' quei sei mesi: se non li togli, li ` +
        'conti due volte. Formula: FY + H1 corrente - H1 precedente.',
      target: `Model!${B_LTM}`,
      atteso: ltm,
      referenzia: [B_FY, B_H1_CORRENTE, B_H1_PRECEDENTE],
      senzaLiteral: [],
      skills: ['qoe.ltm'],
      minKeystrokes: 10,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_GIORNI} verifica che la finestra LTM copra davvero 12 mesi: sottrai la data di chiusura ` +
        `dell'H1 precedente (${B_DATA_PRECEDENTE}) dalla data di chiusura dell'H1 corrente ` +
        `(${B_DATA_CORRENTE}). Usa la sottrazione diretta fra le due celle-data — niente EDATE, EOMONTH ` +
        "o YEARFRAC qui, la sottrazione basta ed e' piu' sicura. Il risultato deve essere 365 o 366 " +
        "(a seconda che un 29 febbraio cada dentro la finestra), mai un numero diverso: se non torna " +
        "cosi', le due date di partenza non coprono davvero un anno esatto.",
      target: `Model!${B_GIORNI}`,
      atteso: giorniLTM,
      referenzia: [B_DATA_PRECEDENTE, B_DATA_CORRENTE],
      senzaLiteral: [],
      skills: ['qoe.ltm', 'xl.date-functions'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-10-LTM',
      seed: rng.seed,
      brief: [
        '## LTM: dodici mesi veri, non un raddoppio',
        '',
        "Un compratore non negozia mai sull'ultimo bilancio annuale chiuso (puo' avere fino a 18 mesi di " +
          "dati ormai vecchi) ne' su una proiezione ottenuta raddoppiando l'ultimo semestre disponibile. " +
          "Usa l'**LTM** (*Last Twelve Months*): gli ultimi 12 mesi REALMENTE osservati, ricostruiti " +
          "sommando e sottraendo pezzi di bilanci gia' pubblicati.",
        '',
        '> **EBITDA LTM = FY (ultimo anno fiscale intero) + H1 corrente − H1 precedente**',
        '',
        "Il FY piu' recente include gia', al suo interno, i sei mesi di \"H1 precedente\" (lo stesso " +
          "periodo dell'anno prima, gia' chiuso dentro quel FY). Sommare H1 corrente senza togliere H1 " +
          "precedente conterebbe quei sei mesi DUE VOLTE — la sottrazione non e' un dettaglio tecnico, e' " +
          "cio' che evita il doppio conteggio.",
        '',
        `**Perche' non basta raddoppiare l'H1 corrente per stimare l'anno?** Perche' un business ` +
          "stagionale — retail con il Black Friday e il Natale, turismo con l'estate — non distribuisce " +
          "l'EBITDA in modo uniforme fra i due semestri. Qui, per esempio, l'H1 corrente vale " +
          `${eur(h1Corrente)}: raddoppiarlo darebbe ${eur(raddoppioNaive)}, un numero ben diverso ` +
          `dall'LTM vero (che dovrai calcolare tu). Se il semestre forte dell'anno e' quello NON ancora ` +
          "osservato, il raddoppio SOTTOSTIMA l'anno; se e' quello gia' passato, lo SOVRASTIMA. L'LTM " +
          "aggira il problema perche' non proietta nulla: usa solo dati gia' realmente accaduti.",
        '',
        `**I dati.** Il ${giornoChiusura}/${meseChiusura}/${annoPrecedente} si e' chiuso l'H1 ` +
          `dell'anno precedente, e il FY ${annoPrecedente} (l'intero anno fiscale, gia' pubblicato) ha ` +
          `fatto ${eur(fyEbitda)} di EBITDA. Il ${giornoChiusura}/${meseChiusura}/${annoCorrente} ` +
          `si e' chiuso l'H1 corrente, con un EBITDA di ${eur(h1Corrente)}. Lo stesso semestre dell'anno ` +
          `precedente (gia' incluso dentro il FY ${annoPrecedente}) aveva fatto ${eur(h1Precedente)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['LTM (Last Twelve Months) e calendarizzazione'], { style: STILE_TITOLO }),
            riga('A3', ['Dati storici'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                `EBITDA FY ${annoPrecedente} (ultimo anno fiscale intero), €`,
                `EBITDA H1 ${annoCorrente} (primi 6 mesi dell'anno corrente), €`,
                `EBITDA H1 ${annoPrecedente} (stesso periodo dell'anno precedente), €`,
                `Data di chiusura H1 ${annoPrecedente}`,
                `Data di chiusura H1 ${annoCorrente} (12 mesi dopo)`,
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_FY, content: fyEbitda, style: STILE_INPUT, locked: true },
              { ref: B_H1_CORRENTE, content: h1Corrente, style: STILE_INPUT, locked: true },
              { ref: B_H1_PRECEDENTE, content: h1Precedente, style: STILE_INPUT, locked: true },
            ],
            [
              {
                ref: B_DATA_PRECEDENTE,
                content: `=DATE(${annoPrecedente},${meseChiusura},${giornoChiusura})`,
                style: STILE_INPUT_DATA,
                locked: true,
              },
              {
                ref: B_DATA_CORRENTE,
                content: `=DATE(${annoCorrente},${meseChiusura},${giornoChiusura})`,
                style: STILE_INPUT_DATA,
                locked: true,
              },
            ],

            riga('A10', ['Calcolo LTM'], { style: STILE_TITOLO }),
            colonna(
              'A11',
              [
                'EBITDA LTM (Last Twelve Months), €',
                'Giorni coperti dalla finestra LTM (deve essere 365 o 366)',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_LTM, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_GIORNI, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 440, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_FY}+${B_H1_CORRENTE}-${B_H1_PRECEDENTE}: FY piu' H1 corrente, meno H1 precedente (gia' ` +
            "contato dentro il FY).",
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_DATA_CORRENTE}-${B_DATA_PRECEDENTE}: sottrazione diretta fra le due date di chiusura, ` +
            `nessuna funzione data (qui vale ${giorniLTM} giorni).`,
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${B_LTM}`,
    };
  },
});
