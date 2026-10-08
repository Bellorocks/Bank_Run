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

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_FY = 'B4'; // EBITDA ultimo FY del peer, chiuso a giugno (dato, bloccato)
const B_H2_CORRENTE = 'B5'; // EBITDA H2 anno FY, luglio-dicembre (dato, bloccato)
const B_H2_PRECEDENTE = 'B6'; // EBITDA H2 anno FY-1, luglio-dicembre (dato, bloccato)

const B_CALENDARIZZATO = 'B9'; // T1
const B_DIFF_PCT = 'B10'; // T2

export default defineTemplate({
  id: 'M5-03-CALENDARIZZAZIONE',
  module: 'M5',
  title: 'Calendarizzazione: allineare un peer al fiscal year del target',
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
        `Il target chiude l'esercizio a dicembre (anno solare); questo peer chiude invece a giugno. ` +
        `Prima di poter usare il suo EBITDA in un multiplo comparabile devi allinearlo allo stesso ` +
        `periodo del target: la calendarizzazione. In ${B_CALENDARIZZATO} calcola l'EBITDA calendarizzato ` +
        `del peer, cioe' il suo EBITDA sull'anno SOLARE ${annoFY} (gennaio-dicembre): l'EBITDA dell'ultimo ` +
        `fiscal year chiuso a giugno (${B_FY}) piu' l'H2 dell'anno corrente, luglio-dicembre ${annoFY} ` +
        `(${B_H2_CORRENTE}), MENO l'H2 dello stesso periodo dell'anno precedente, luglio-dicembre ` +
        `${annoPrecedente} (${B_H2_PRECEDENTE}). Il FY chiuso a giugno include gia' al suo interno quei ` +
        `sei mesi di luglio-dicembre ${annoPrecedente}: e' la stessa tecnica dell'LTM (M2-10), qui ` +
        "riapplicata per allineare un peer al calendario del target invece che per ricostruire dodici " +
        'mesi veri. Formula: FY + H2 corrente - H2 precedente.',
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
        `In ${B_DIFF_PCT} calcola la differenza percentuale fra l'EBITDA calendarizzato appena ottenuto ` +
        `(${B_CALENDARIZZATO}) e l'EBITDA del fiscal year ORIGINALE del peer, non calendarizzato (${B_FY}): ` +
        `(${B_CALENDARIZZATO} - ${B_FY}) / ${B_FY}. Questo numero mostra quanto conta l'allineamento: se il ` +
        "business del peer e' stagionale, o sta crescendo (o calando) rapidamente fra i due semestri, il " +
        "FY grezzo e il dato calendarizzato possono discostarsi parecchio. Usare il FY grezzo per il " +
        "multiplo — saltando la calendarizzazione — vorrebbe dire confrontare col target una base che " +
        "copre un periodo diverso di sei mesi: piu' questa percentuale e' grande, piu' quell'errore " +
        'sarebbe costoso.',
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
      brief: [
        '## Calendarizzazione: allineare un peer al fiscal year del target',
        '',
        "Non tutte le comparable chiudono l'esercizio nello stesso mese. Il target di questa " +
          "valutazione chiude a **dicembre** (anno solare); il peer che stai analizzando chiude invece a " +
          '**giugno**. Applicare direttamente il suo EBITDA di ultimo fiscal year a un multiplo ' +
          "comparabile significherebbe confrontare due periodi che non coincidono per sei mesi interi. " +
          "Prima di calcolare qualunque multiplo, il dato del peer va allineato allo stesso periodo " +
          "solare del target: questo si chiama **calendarizzazione**.",
        '',
        "E' la stessa tecnica esatta gia' vista per l'LTM (M2): **FY + periodo corrente − periodo " +
          "corrispondente dell'anno precedente**. Li' serviva a ricostruire dodici mesi realmente " +
          "osservati per un solo business; qui la riapplichi per far coincidere il calendario di un " +
          "peer con quello del target, cambia lo scopo ma non l'aritmetica.",
        '',
        `**I dati.** Il fiscal year del peer si e' chiuso a giugno ${annoFY} con un EBITDA di ` +
          `${eur(fyEbitda)}. Da allora si sono chiusi altri sei mesi: l'H2 ${annoFY} (luglio-dicembre, ` +
          `non ancora incluso in quel FY) ha fatto ${eur(h2Corrente)} di EBITDA. Lo stesso semestre ` +
          `dell'anno precedente — l'H2 ${annoPrecedente} (luglio-dicembre), gia' incluso dentro il FY ` +
          `chiuso a giugno — aveva fatto ${eur(h2Precedente)}.`,
        '',
        `**Perche' non basta prendere il FY cosi' com'e'?** Il FY chiuso a giugno ${annoFY} copre ` +
          `luglio ${annoPrecedente} - giugno ${annoFY}: sei mesi dell'anno ${annoPrecedente} e sei mesi ` +
          `dell'anno ${annoFY}. Il target, invece, ragiona per anno solare (gennaio-dicembre). Se il peer ` +
          `sta crescendo (o calando) fra i due semestri di luglio-dicembre, il FY grezzo racconta un ` +
          "periodo diverso da quello del target — e un multiplo costruito su basi non allineate non e' " +
          'davvero comparabile.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Calendarizzazione di un peer con fiscal year end diverso'], { style: STILE_TITOLO }),
            riga('A3', ["Dati storici del peer (fiscal year end: giugno)"], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                `EBITDA ultimo FY del peer, chiuso a giugno ${annoFY}, €`,
                `EBITDA H2 ${annoFY} (luglio-dicembre, non ancora nel FY), €`,
                `EBITDA H2 ${annoPrecedente} (luglio-dicembre, gia' incluso nel FY), €`,
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_FY, content: fyEbitda, style: STILE_INPUT, locked: true },
              { ref: B_H2_CORRENTE, content: h2Corrente, style: STILE_INPUT, locked: true },
              { ref: B_H2_PRECEDENTE, content: h2Precedente, style: STILE_INPUT, locked: true },
            ],

            riga('A8', ['Calendarizzazione (allineamento all\'anno solare del target)'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                `EBITDA calendarizzato del peer, anno solare ${annoFY}, €`,
                "Differenza % vs EBITDA FY originale (non calendarizzato)",
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
          `=${B_FY}+${B_H2_CORRENTE}-${B_H2_PRECEDENTE}: FY chiuso a giugno, piu' H2 corrente, meno H2 ` +
            "precedente (gia' contato dentro il FY) — esattamente lo schema dell'LTM di M2-10.",
          10,
          'T1',
        ),
        hint(
          'H2',
          `=(${B_CALENDARIZZATO}-${B_FY})/${B_FY}: quanto si sposta l'EBITDA una volta allineato ` +
            "all'anno solare del target, in percentuale del FY originale.",
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_CALENDARIZZATO}`,
    };
  },
});
