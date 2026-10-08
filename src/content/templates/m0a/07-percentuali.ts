/**
 * M0-A · 07 — Percentuali: la cella che moltiplica per cento due volte.
 *
 * Una cella in formato percentuale MOSTRA il numero moltiplicato per cento:
 * dentro c'e' 0,15, a schermo 15%. Excel aiuta in due casi (e il motore del
 * gioco fa lo stesso, vedi typedInput.applyPercentEntry): "15%" scritto col
 * simbolo salva 0,15 e mette il formato; "15" scritto in una cella GIA' in
 * percentuale vale 15%. La trappola vera scatta quando il formato arriva
 * DOPO il numero: 15 in una cella normale, poi Ctrl+Maiusc+5, e la cella
 * mostra 1500% perche' dentro c'e' davvero 15.
 *
 * T1: B2 parte senza formato; il giocatore deve ottenere la frazione giusta
 * mostrata come percentuale (valore + formato). T2: la percentuale che nasce
 * da una divisione, dove la trappola non puo' scattare.
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
          `In B2 inserisci il margine obiettivo fissato dal CdA, ${pct(targetMargine)}: dentro la cella deve ` +
          "esserci la frazione giusta, e a schermo deve vedersi come percentuale. B2 per ora non ha formato.",
        targetCell: 'Model!B2',
        check: [
          {
            kind: 'value' as const,
            expected: targetMargine,
            message:
              `Se in B2 compare un numero enorme (tipo ${trappolaEsempio}) hai scritto le cifre e poi ` +
              'applicato il formato: dentro la cella c\'e\' ancora il numero intero. Riscrivilo col simbolo %, ' +
              'oppure come frazione, oppure scrivilo di nuovo adesso che la cella e\' gia\' in percentuale.',
          },
          {
            kind: 'numberFormat' as const,
            expected: '0%',
            accept: ['0.0%', '0.00%', '0.000%', '0.0000%'],
            message: 'Il valore e\' giusto ma la cella non lo mostra come percentuale (Ctrl+Maiusc+5, o scrivilo col %).',
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
        'Una cella in formato percentuale non contiene "per cento": contiene un numero, e lo',
        '**moltiplica per cento quando lo disegna a schermo**. Dentro c\'e\' 0,15, a schermo vedi 15%.',
        '',
        'Excel ti aiuta in due casi:',
        '',
        '- se scrivi `15%` **col simbolo**, salva 0,15 e mette da solo il formato percentuale;',
        '- se la cella e\' **gia\'** in percentuale e scrivi `15`, capisce 15%.',
        '',
        'La trappola scatta quando il formato arriva **dopo**: scrivi `15` in una cella normale, poi premi',
        'Ctrl+Maiusc+5, e la cella mostra **1500%**, perche\' dentro c\'e\' davvero 15. E\' un errore che si',
        'vede benissimo, ed e\' per questo che quasi tutti lo fanno una volta e poi mai piu\'.',
        '',
        `Il CdA ha fissato per il prossimo anno un margine EBITDA obiettivo del **${pct(targetMargine)}**.`,
        `B2 e\' una cella normale, senza formato: se scrivi "${num100(targetMargine)}" e poi la formatti,`,
        `vedrai ${trappolaEsempio}.`,
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
              { ref: 'B2', content: null, style: { fontColor: STILE_INPUT.fontColor }, locked: false },
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
          `Il modo piu' corto: scrivi ${num100(targetMargine)}% col simbolo, e Excel salva la frazione e ` +
            'mette il formato in un colpo solo.',
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
