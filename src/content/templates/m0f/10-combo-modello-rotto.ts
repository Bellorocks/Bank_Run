/**
 * M0-F · 10 — [COMBO] Il modello rotto: ricostruire con l'audit.
 *
 * Livello di chiusura di tutto M0 (spec §5, ultima riga della sezione M0):
 * "ricostruire un modello rotto usando solo gli strumenti di audit". Combina
 * xl.trace e xl.f9 (M0-D), xl.errors (M0-D, ma qui capovolto: NESSUno dei tre
 * numeri sospetti produce un errore Excel — sono silenziosi, il tipo peggiore),
 * xl.model-audit e xl.sanity-checks (M0-F).
 *
 * Il foglio e' un mini bridge Ricavi -> EBITDA -> EBIT su tre anni, GIA'
 * costruito, con OTTO celle-formula bloccate (B9:B16). Tre di loro sono rotte,
 * ciascuna con un errore diverso preso dallo spec §11 (che questo livello
 * anticipa in miniatura):
 *
 *  - B10 "Ricavi anno 2": un NUMERO BATTUTO A MANO al posto della formula
 *    (=B9*(1+B3)). E' il valore "in mezzo a una riga di proiezione" che
 *    l'analista ha incollato invece di calcolare — sembra un anno senza
 *    crescita, non un errore.
 *  - B13 "EBITDA anno 3 normalizzato": SEGNO INVERTITO. I costi one-off in B5
 *    hanno gia' abbassato l'EBITDA grezzo (B12); normalizzare vuol dire
 *    restituirli (+B5), la formula li sottrae una seconda volta (-B5).
 *  - B14 "EBIT anno 3": RIFERIMENTO A RIGA SBAGLIATA, off-by-one. Dovrebbe
 *    partire dall'EBITDA gia' normalizzato (B13, la riga subito sopra) ma
 *    salta a B12 (EBITDA grezzo, una riga piu' in alto) — esattamente il
 *    pattern "=B4 invece di =B5" dello spec.
 *
 * Nessun errore e' rilevabile guardando il valore da solo: tutti e tre
 * producono numeri dello stesso ordine di grandezza di quelli corretti. Il
 * valore "corretto" richiesto in ciascun task NON e' quello che risulterebbe
 * ricalcolando quella riga a partire dai valori (sbagliati) effettivamente
 * presenti nel foglio: e' quello che il modello COMPLETO, coerente, avrebbe
 * prodotto — calcolato qui una volta sola, con la stessa aritmetica che il
 * giocatore userebbe in Excel (par. "il valore atteso va calcolato con le
 * stesse operazioni", vedi contratto del batch). E' cosi' che si audita un
 * modello vero: si ricostruisce la catena giusta, non si accetta la catena
 * rotta come base di partenza.
 *
 * La regola d'oro (spec §14, "non rivelare dove sono gli errori") vale per il
 * BRIEF: elenca i tre nomi di riga sospetti (e' li' che il revisore del caso
 * li ha segnalati) ma mai la natura del difetto ne' il valore corretto. La
 * natura del difetto emerge solo negli hint, a pagamento in XP, come in ogni
 * altro livello del batch.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  eur,
  pct,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
export default defineTemplate({
  id: 'M0F-10-COMBOAUDIT',
  module: 'M0-F',
  get title() {
    return tx('M0F-10-COMBOAUDIT.title');
  },
  rank: 3,
  mode: 'BOSS',
  combo: true,
  estimatedSeconds: 480,
  skills: ['xl.trace', 'xl.f9', 'xl.errors', 'xl.model-audit', 'xl.sanity-checks'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ricaviBase = roundTo(triangular(r, 3_000_000, 6_000_000, 12_000_000), 50_000);
    const crescita = roundTo(triangular(r, 0.03, 0.06, 0.10), 0.001);
    const margine = roundTo(triangular(r, 0.15, 0.20, 0.28), 0.001);
    const costiOneOff = roundTo(triangular(r, 80_000, 200_000, 450_000), 5_000);
    const da = roundTo(triangular(r, 150_000, 350_000, 700_000), 5_000);
    const aliquota = roundTo(triangular(r, 0.24, 0.28, 0.32), 0.001);

    // La catena COME DOVREBBE ESSERE, ricalcolata da zero: e' l'unica fonte
    // di verita' per i tre valori attesi, non i valori (sbagliati) che il
    // foglio produrra' davvero quando HyperFormula lo calcola.
    const ricaviAnno1 = ricaviBase * (1 + crescita);
    const ricaviAnno2Corretto = ricaviAnno1 * (1 + crescita);
    const ricaviAnno3Corretto = ricaviAnno2Corretto * (1 + crescita);
    const ebitdaAnno3GrezzoCorretto = ricaviAnno3Corretto * margine;
    const ebitdaAnno3NormalizzatoCorretto = ebitdaAnno3GrezzoCorretto + costiOneOff;
    const ebitAnno3Corretto = ebitdaAnno3NormalizzatoCorretto - da;

    // Il numero battuto a mano al posto della formula: l'analista ha
    // "dimenticato" la crescita e ha ributtato giu' l'anno precedente,
    // arrotondato come si arrotonda un numero incollato al volo.
    const ricaviAnno2Hardcoded = roundTo(ricaviAnno1, 1000);

    const tasks = [
      {
        id: 'T1',
        prompt:
          tx('M0F-10-COMBOAUDIT.2'),
        targetCell: 'Model!D10',
        check: [
          {
            kind: 'value' as const,
            expected: ricaviAnno2Corretto,
            message:
              tx('M0F-10-COMBOAUDIT.3'),
          },
        ],
        skills: ['xl.model-audit', 'xl.errors'],
        minKeystrokes: 10,
      },
      {
        id: 'T2',
        prompt:
          tx('M0F-10-COMBOAUDIT.4'),
        targetCell: 'Model!D13',
        check: [
          {
            kind: 'value' as const,
            expected: ebitdaAnno3NormalizzatoCorretto,
            message:
              tx('M0F-10-COMBOAUDIT.5'),
          },
        ],
        skills: ['xl.model-audit', 'xl.f9'],
        minKeystrokes: 10,
      },
      {
        id: 'T3',
        prompt:
          tx('M0F-10-COMBOAUDIT.6'),
        targetCell: 'Model!D14',
        check: [
          {
            kind: 'value' as const,
            expected: ebitAnno3Corretto,
            message:
              tx('M0F-10-COMBOAUDIT.7'),
          },
        ],
        skills: ['xl.trace', 'xl.sanity-checks'],
        minKeystrokes: 10,
      },
    ];

    const brief = [tx('M0F-10-COMBOAUDIT.8', { p0: eur(ricaviBase), p1: pct(crescita), p2: pct(margine), p3: eur(costiOneOff), p4: eur(da), p5: pct(aliquota) })].join('\n');

    return {
      templateId: 'M0F-10-COMBOAUDIT',
      seed: rng.seed,
      brief,
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0F-10-COMBOAUDIT.9')], { style: STILE_TITOLO }),

            colonna(
              'A2',
              [
                tx('M0F-10-COMBOAUDIT.10'),
                tx('M0F-10-COMBOAUDIT.11'),
                tx('M0F-10-COMBOAUDIT.12'),
                tx('M0F-10-COMBOAUDIT.13'),
                tx('M0F-10-COMBOAUDIT.14'),
                tx('M0F-10-COMBOAUDIT.15'),
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[ricaviBase]], { style: STILE_INPUT }),
            blocco('B3', [[crescita]], { style: STILE_INPUT_PCT }),
            blocco('B4', [[margine]], { style: STILE_INPUT_PCT }),
            blocco('B5', [[costiOneOff]], { style: STILE_INPUT }),
            blocco('B6', [[da]], { style: STILE_INPUT }),
            blocco('B7', [[aliquota]], { style: STILE_INPUT_PCT }),

            riga('D8', [tx('M0F-10-COMBOAUDIT.16')], { style: STILE_TITOLO }),

            colonna(
              'A9',
              [
                tx('M0F-10-COMBOAUDIT.17'),
                tx('M0F-10-COMBOAUDIT.18'),
                tx('M0F-10-COMBOAUDIT.19'),
                tx('M0F-10-COMBOAUDIT.20'),
                tx('M0F-10-COMBOAUDIT.21'),
                tx('M0F-10-COMBOAUDIT.22'),
                tx('M0F-10-COMBOAUDIT.23'),
                tx('M0F-10-COMBOAUDIT.24'),
              ],
              { style: STILE_ETICHETTA },
            ),
            // Otto celle-formula, TUTTE bloccate, TUTTE con lo stesso stile:
            // il numero battuto a mano in B10 deve essere visivamente
            // indistinguibile da una formula vera. Si scopre solo aprendola.
            blocco(
              'B9',
              [
                ['=B2*(1+B3)'],
                [ricaviAnno2Hardcoded], // BUG: valore battuto a mano, non "=B9*(1+B3)"
                ['=B10*(1+B3)'],
                ['=B11*B4'],
                ['=B12-B5'], // BUG: segno invertito, dovrebbe essere "=B12+B5"
                ['=B12-B6'], // BUG: riga sbagliata (off-by-one), dovrebbe essere "=B13-B6"
                ['=B14*B7'],
                ['=B14-B15'],
              ],
              { style: STILE_FORMULA },
            ),

            areaLibera(['D10', 'D13', 'D14']),
          ],
          {
            colWidths: { A: 340, B: 130, C: 40, D: 170 },
            frozenRows: 1,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H0',
          tx('M0F-10-COMBOAUDIT.25'),
          5,
        ),
        hint(
          'H1',
          tx('M0F-10-COMBOAUDIT.26'),
          15,
          'T1',
        ),
        hint(
          'H2',
          tx('M0F-10-COMBOAUDIT.27'),
          15,
          'T2',
        ),
        hint(
          'H3',
          tx('M0F-10-COMBOAUDIT.28'),
          15,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 130 }),
      startAt: 'Model!D10',
    };
  },
});
