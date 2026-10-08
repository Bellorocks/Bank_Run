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

import { contentNumberLocale, tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0A-07-PERCENTUALI',
  module: 'M0-A',
  get title() {
    return tx('M0A-07-PERCENTUALI.title');
  },
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
          tx('M0A-07-PERCENTUALI.2', { p0: pct(targetMargine) }),
        targetCell: 'Model!B2',
        check: [
          {
            kind: 'value' as const,
            expected: targetMargine,
            message:
              tx('M0A-07-PERCENTUALI.3', { trappolaEsempio }),
          },
          {
            kind: 'numberFormat' as const,
            expected: '0%',
            accept: ['0.0%', '0.00%', '0.000%', '0.0000%'],
            message: tx('M0A-07-PERCENTUALI.4'),
          },
        ],
        skills: ['xl.percentages'],
        minKeystrokes: 5,
      },
      taskFormula({
        id: 'T2',
        prompt:
          tx('M0A-07-PERCENTUALI.5'),
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
      brief: [tx('M0A-07-PERCENTUALI.6', { p0: pct(targetMargine), p1: num100(targetMargine), trappolaEsempio, p3: eur(ricavi), p4: eur(utile) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0A-07-PERCENTUALI.7')], { style: STILE_TITOLO }),
            blocco('A2', [[tx('M0A-07-PERCENTUALI.8')]], { style: STILE_ETICHETTA }),
            riga('A4', [tx('M0A-07-PERCENTUALI.9')], { style: STILE_TITOLO }),
            blocco(
              'A5',
              [[tx('M0A-07-PERCENTUALI.14')], [tx('M0A-07-PERCENTUALI.10')], [tx('M0A-07-PERCENTUALI.11')]],
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
          tx('M0A-07-PERCENTUALI.12', { p0: num100(targetMargine) }),
          6,
          'T1',
        ),
        hint('H2', tx('M0A-07-PERCENTUALI.13'), 6, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: 'Model!B2',
    };
  },
});

/** Le cifre della percentuale senza il simbolo %, cosi' come le legge chi cade nella trappola. */
function num100(frazione: number): string {
  return (frazione * 100).toLocaleString(contentNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
