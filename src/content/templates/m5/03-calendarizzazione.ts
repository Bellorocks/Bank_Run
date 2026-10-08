/**
 * M5 · 03 — Calendarizzazione di un peer con fiscal year end diverso.
 *
 * IL PUNTO DIDATTICO: due comparable non condividono sempre lo stesso anno
 * fiscale. Il target di questo esercizio chiude l'esercizio a dicembre (anno
 * solare, calendar year); il peer scelto per il comp set chiude invece a
 * giugno. Applicare direttamente l'EBITDA dell'ultimo fiscal year del peer al
 * multiplo comparabile significherebbe confrontare due periodi che non
 * coincidono per sei mesi: prima di calcolare un qualunque multiplo, il dato
 * del peer va ALLINEATO all'anno solare del target. Questo si chiama
 * "calendarizzazione".
 *
 * E' la STESSA TECNICA ESATTA gia' insegnata in M2-10 per l'LTM (FY + periodo
 * corrente - periodo corrispondente dell'anno precedente), qui riapplicata al
 * contesto dei comps invece che a quello del QoE: cambia lo scopo (allineare
 * un peer al target, non ricostruire dodici mesi veri per un solo business),
 * ma l'aritmetica e la logica del "non contare due volte" sono identiche.
 *
 * Il fiscal year del peer, chiuso a giugno dell'anno FY, copre luglio
 * dell'anno FY-1 - giugno dell'anno FY. Quel FY include gia', al suo interno,
 * i sei mesi luglio-dicembre dell'anno FY-1 ("H2 precedente"): sono la prima
 * meta' del FY stesso. Non include invece i sei mesi luglio-dicembre
 * dell'anno FY ("H2 corrente"), perche' il FY si e' gia' chiuso a giugno.
 * Per ottenere l'EBITDA dell'intero anno SOLARE FY (gennaio-dicembre, lo
 * stesso periodo su cui chiude il target):
 *
 *   EBITDA calendarizzato = FY (chiuso a giugno) + H2 corrente - H2 precedente
 *
 * Sottraendo H2 precedente si toglie dal FY i sei mesi che gia' vi erano
 * inclusi (luglio-dicembre FY-1), lasciando gennaio-giugno FY; sommando H2
 * corrente si aggiungono i sei mesi luglio-dicembre FY, non ancora coperti
 * dal FY. Il risultato copre esattamente gennaio-dicembre FY: lo stesso anno
 * solare del target. Saltare la sottrazione (sommare solo H2 corrente sopra
 * il FY) non produrrebbe un doppio conteggio come in M2-10, ma un periodo di
 * 18 mesi invece di 12 — un errore diverso nella forma ma identico nella
 * causa: non aver riconosciuto quali mesi il FY copre gia' davvero.
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
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_FY = 'B4'; // EBITDA ultimo FY del peer, chiuso a giugno (dato, bloccato)
const B_H2_CORRENTE = 'B5'; // EBITDA H2 anno FY, luglio-dicembre (dato, bloccato)
const B_H2_PRECEDENTE = 'B6'; // EBITDA H2 anno FY-1, luglio-dicembre (dato, bloccato)

const B_CALENDARIZZATO = 'B9'; // T1
const B_DIFF_PCT = 'B10'; // T2

export default defineTemplate({
  id: 'M5-03-CALENDARIZZAZIONE',
  module: 'M5',
  get title() {
    return tx('M5-03-CALENDARIZZAZIONE.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['comps.calendarization'],
  prerequisites: ['M5-02-LTMNTM'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Anno di chiusura del FY del peer (sempre a giugno) e i due anni
    // coinvolti nel semestre luglio-dicembre. ------------------------------
    const annoFY = r.int(2023, 2026);
    const annoPrecedente = annoFY - 1;

    // --- EBITDA: FY plausibile, poi i due semestri come frazioni/crescita,
    // stesso schema generativo di M2-10-LTM. --------------------------------
    const fyEbitda = r.int(4000, 20000) * 1000; // € 4,0m - € 20,0m

    // H2 precedente (luglio-dicembre FY-1, gia' incluso dentro il FY) come
    // quota del FY: un semestre "tipico" pesa circa meta' dell'anno, ma la
    // stagionalita' del peer lo sposta in un intervallo plausibile.
    const frazioneH2Precedente = triangular(r, 0.35, 0.5, 0.65);
    const h2Precedente = roundTo(frazioneH2Precedente * fyEbitda, 500);

    // H2 corrente (luglio-dicembre FY, non ancora nel FY) come crescita/calo
    // rispetto allo stesso semestre dell'anno prima: puo' essere sopra o
    // sotto, cosi' il calendarizzato a volte supera il FY originale e a
    // volte lo sottopassa.
    const fattoreCrescita = triangular(r, 0.75, 1.05, 1.35);
    const h2Corrente = roundTo(fattoreCrescita * h2Precedente, 500);

    const calendarizzato = fyEbitda + h2Corrente - h2Precedente;
    const diffPct = (calendarizzato - fyEbitda) / fyEbitda;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M5-03-CALENDARIZZAZIONE.2', { B_CALENDARIZZATO, annoFY, B_FY, B_H2_CORRENTE, annoPrecedente, B_H2_PRECEDENTE }),
      target: `Model!${B_CALENDARIZZATO}`,
      atteso: calendarizzato,
      referenzia: [B_FY, B_H2_CORRENTE, B_H2_PRECEDENTE],
      senzaLiteral: [],
      skills: ['comps.calendarization'],
      minKeystrokes: 10,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M5-03-CALENDARIZZAZIONE.3', { B_DIFF_PCT, B_CALENDARIZZATO, B_FY }),
      target: `Model!${B_DIFF_PCT}`,
      atteso: diffPct,
      referenzia: [B_CALENDARIZZATO, B_FY],
      senzaLiteral: [],
      skills: ['comps.calendarization'],
      minKeystrokes: 10,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M5-03-CALENDARIZZAZIONE',
      seed: rng.seed,
      brief: [tx('M5-03-CALENDARIZZAZIONE.4', { annoFY, p1: eur(fyEbitda), p2: eur(h2Corrente), annoPrecedente, p4: eur(h2Precedente) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M5-03-CALENDARIZZAZIONE.5')], { style: STILE_TITOLO }),
            riga('A3', [tx('M5-03-CALENDARIZZAZIONE.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M5-03-CALENDARIZZAZIONE.7', { annoFY }),
                tx('M5-03-CALENDARIZZAZIONE.8', { annoFY }),
                tx('M5-03-CALENDARIZZAZIONE.9', { annoPrecedente }),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_FY, content: fyEbitda, style: STILE_INPUT, locked: true },
              { ref: B_H2_CORRENTE, content: h2Corrente, style: STILE_INPUT, locked: true },
              { ref: B_H2_PRECEDENTE, content: h2Precedente, style: STILE_INPUT, locked: true },
            ],

            riga('A8', [tx('M5-03-CALENDARIZZAZIONE.10')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M5-03-CALENDARIZZAZIONE.11', { annoFY }),
                tx('M5-03-CALENDARIZZAZIONE.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_CALENDARIZZATO, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_DIFF_PCT, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 460, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M5-03-CALENDARIZZAZIONE.13', { B_FY, B_H2_CORRENTE, B_H2_PRECEDENTE }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M5-03-CALENDARIZZAZIONE.14', { B_CALENDARIZZATO, B_FY }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_CALENDARIZZATO}`,
    };
  },
});
