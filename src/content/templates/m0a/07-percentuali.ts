/**
 * M0-A · 07 — Percentuali: la cella che moltiplica per cento due volte.
 *
 * Il punto didattico e' un fatto scomodo di Excel: una cella formattata come
 * percentuale non "legge" quello che scrivi come una percentuale. Legge un
 * numero puro e lo MOSTRA moltiplicato per cento. Se dentro c'e' gia' 0,15 e
 * il formato e' `0.0%`, sullo schermo compare 15%. Ma se scrivi tu stesso "15"
 * pensando "il margine e' 15 per cento", quello che finisce nella cella e' il
 * numero 15 — e il formato lo moltiplica ANCHE lui per cento. Risultato:
 * 1500%, visibile, ridicolo, e la ragione per cui questo errore va fatto una
 * volta sola, qui, con qualcuno che lo spiega prima che capiti.
 *
 * T1 e' la trappola tale e quale: batti la frazione (0,124), non il numero
 * che leggi nel testo (12,4). T2 e' il caso gemello e piu' comune nella
 * pratica: la percentuale non nasce da un numero battuto ma da una divisione
 * fra due celle (utile / ricavi), e li' l'errore del 1500% non puo' capitare
 * perche' e' Excel stesso a fare i conti.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  eur,
  pct,
} from '../../authoring';
import { SECTORS, ebitdaMargin, revenue } from '../../../rng/finance';

export default defineTemplate({
  id: 'M0A-07-PERCENTUALI',
  module: 'M0-A',
  title: 'Il 1500% che non esiste',
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 150,
  skills: ['xl.percentages'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const settore = rng.fork('settore').pick(SECTORS);

    // Il margine obiettivo: un numero che il giocatore legge nel brief e deve
    // ribattere come frazione, non come "il numero della percentuale".
    const targetMargine = ebitdaMargin(rng.fork('target'), settore);

    // I dati del trimestre: ricavi e utile, da cui il margine realizzato nasce
    // come rapporto (T2), non come cifra da trascrivere.
    const ricavi = Math.round(revenue(rng.fork('ricavi-trimestre')) / 4);
    const marginRealizzatoGrezzo = ebitdaMargin(rng.fork('realizzato'), settore);
    const utile = Math.round(ricavi * marginRealizzatoGrezzo);
    const margineRealizzato = utile / ricavi;

    const trappolaEsempio = pct(targetMargine * 100); // cosa compare se si sbaglia

    const tasks = [
      {
        id: 'T1',
        prompt:
          `In B2 scrivi il margine obiettivo fissato dal CdA: ${pct(targetMargine)}. La cella e' gia' ` +
          "formattata come percentuale: scrivi la FRAZIONE che quel numero rappresenta, non le cifre " +
          "che leggi nel testo.",
        targetCell: 'Model!B2',
        check: [
          {
            kind: 'value' as const,
            expected: targetMargine,
            message:
              `Se in B2 compare un numero enorme (tipo ${trappolaEsempio}) hai scritto le cifre della ` +
              "percentuale invece della frazione: la cella e' gia' in formato percentuale e moltiplica " +
              "per cento quello che trova. Scrivi lo zero virgola davanti.",
          },
        ],
        skills: ['xl.percentages'],
        minKeystrokes: 5,
      },
      taskFormula({
        id: 'T2',
        prompt:
          "In B7 calcola il margine realizzato nel trimestre appena chiuso: utile operativo diviso " +
          "ricavi. Non stimarlo e non batterlo a mano: fai fare la divisione a Excel, e lascia che sia " +
          "il formato percentuale a mostrartela gia' pronta.",
        target: 'Model!B7',
        atteso: margineRealizzato,
        referenzia: ['B6', 'B5'],
        senzaLiteral: [],
        skills: ['xl.percentages'],
        minKeystrokes: 6,
      }),
    ];

    return {
      templateId: 'M0A-07-PERCENTUALI',
      seed: rng.seed,
      brief: [
        '## La trappola del 1500%',
        '',
        'Una cella formattata come percentuale non capisce "per cento": capisce solo un numero, e lo',
        '**moltiplica per cento quando lo disegna a schermo**. Se dentro c\'e\' scritto 0,15, il formato',
        'mostra 15%. Fin qui tutto bene.',
        '',
        'Il problema e\' quando sei TU a battere il numero. Se pensi "il margine e\' 15 per cento" e scrivi',
        'letteralmente `15`, in quella cella finisce il numero 15 — e il formato lo moltiplica ANCHE lui',
        'per cento. Risultato: **1500%**, scritto a schermo, sotto i tuoi occhi. Non e\' un errore che si',
        'nasconde: e\' un errore che si vede benissimo, ed e\' per questo che quasi tutti lo fanno una volta',
        'e poi mai piu\'.',
        '',
        `Qui la trappola e\' impostata cosi\': il CdA ha fissato per il prossimo anno un margine EBITDA`,
        `obiettivo del **${pct(targetMargine)}**. La cella B2 e\' gia\' formattata come percentuale. Se scrivi`,
        `"${num100(targetMargine)}" pensando al numero che hai appena letto, Excel te lo restituisce come`,
        `${trappolaEsempio}. Devi scrivere la **frazione**: zero virgola, poi le cifre.`,
        '',
        '## Quando la percentuale nasce da una formula',
        '',
        'C\'e\' un secondo modo, molto piu\' comune nei modelli veri, in cui una percentuale finisce in una',
        'cella: non battuta a mano, ma **calcolata come rapporto fra due altre celle**. Il trimestre',
        `appena chiuso ha fatturato ${eur(ricavi)} di ricavi e ${eur(utile)} di utile operativo. Il margine`,
        'realizzato e\' quel rapporto — e siccome e\' Excel a farlo, la trappola del 1500% qui non puo\'',
        'capitare: la divisione produce gia\' la frazione giusta.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Margini in percentuale'], { style: STILE_TITOLO }),
            blocco('A2', [['Margine EBITDA obiettivo (deciso dal CdA)']], { style: STILE_ETICHETTA }),
            riga('A4', ['Trimestre appena chiuso'], { style: STILE_TITOLO }),
            blocco(
              'A5',
              [['Ricavi'], ['Utile operativo'], ["Margine realizzato (utile / ricavi)"]],
              { style: STILE_ETICHETTA },
            ),
            blocco('B5', [[ricavi], [utile]], { style: STILE_INPUT }),
            [
              { ref: 'B2', content: null, style: STILE_INPUT_PCT, locked: false },
              { ref: 'B7', content: null, style: STILE_FORMULA_PCT, locked: false },
            ],
          ],
          { colWidths: { A: 320, B: 130 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          "B2 e' gia' in formato percentuale: non scrivere le cifre che leggi nel brief, scrivi la " +
            'frazione. "Zero virgola" e poi le cifre, senza il simbolo %.',
          6,
          'T1',
        ),
        hint('H2', "Non serve calcolare a mente: in B7 scrivi =B6/B5 e lascia fare il formato.", 6, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: 'Model!B2',
    };
  },
});

/** Le cifre della percentuale senza il simbolo %, cosi' come le legge chi cade nella trappola. */
function num100(frazione: number): string {
  return (frazione * 100).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
