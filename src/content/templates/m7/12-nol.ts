/**
 * M7 · 12 — NOL (Net Operating Losses): lo scudo fiscale delle perdite pregresse.
 *
 * IL PUNTO DIDATTICO — un'azienda che in anni passati ha accumulato perdite
 * fiscali non le perde: puo' "riportarle a nuovo" (carry-forward) e usarle per
 * ridurre l'imponibile fiscale degli anni futuri, finche' il reddito
 * imponibile lo permette e finche' il monte perdite non si esaurisce. E' uno
 * scudo fiscale vero, esattamente come il D&A o gli interessi passivi: va
 * valorizzato nel FCF perche' riduce le imposte EFFETTIVAMENTE pagate, non
 * quelle "piene" che si otterrebbero applicando l'aliquota al reddito lordo.
 *
 * PERCHE' SERVE UN MIN E NON UNA SOTTRAZIONE SEMPLICE — il NOL utilizzato in
 * un anno non puo' MAI superare due tetti indipendenti:
 *   - non puo' superare il NOL residuo disponibile (non si puo' usare piu'
 *     credito di quanto se ne abbia in cassa fiscale);
 *   - non puo' superare il reddito imponibile ante-NOL dell'anno (non serve
 *     azzerare l'imponibile PIU' di zero: il NOL non genera un rimborso, puo'
 *     solo abbattere le imposte fino a zero).
 * Il NOL utilizzato e' quindi il PIU' PICCOLO fra i due tetti — da qui il MIN.
 * Questo livello genera apposta i dati in modo che, a seconda del seed,
 * capitino ENTRAMBE le direzioni: a volte vince il tetto del NOL residuo (il
 * NOL non basta a coprire tutto il reddito, ne resta poco o nulla), a volte
 * vince il tetto del reddito (il NOL e' piu' che sufficiente, l'imponibile si
 * azzera e una parte del NOL resta disponibile per il futuro).
 *
 * DERIVAZIONE ALGEBRICA DEI DUE TASK:
 *
 *   T1  NolUtilizzato       = MIN(NolResiduoInizioAnno, RedditoImponibileAnteNOL)
 *   T2  ImposteEffettive    = (RedditoImponibileAnteNOL - NolUtilizzato) * AliquotaIRES
 *
 * Per confronto (solo in prosa, non un task): senza NOL l'azienda pagherebbe
 * ImposteSenzaNOL = RedditoImponibileAnteNOL * AliquotaIRES, sempre maggiore o
 * uguale a ImposteEffettive — la differenza fra le due e' il valore dello
 * scudo fiscale del NOL, in euro sonanti.
 *
 * Aliquota fiscale FISSA al 24% (IRES post-2017, dato di legge italiano, mai
 * randomizzata — coerente con m1/09-imposte.ts e con M7-02).
 *
 * GENERAZIONE DATI — a seconda di un bool pescato dal rng, il NOL residuo e'
 * costruito STRETTAMENTE maggiore o STRETTAMENTE minore del reddito
 * imponibile (mai uguale): cosi', su una serie di seed, il MIN di T1 viene
 * davvero messo alla prova in entrambe le direzioni, non solo in una.
 *
 * Geometria fissa: nessuna posizione dipende dal seed, i riferimenti di cella
 * sono letterali per costruzione, come negli altri livelli di M7.
 */

import {
  defineTemplate,
  colonna,
  eur,
  foglio,
  hint,
  par,
  pct,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_NOL = 'B4'; // NOL residuo disponibile a inizio anno (dato, bloccato)
const B_REDD = 'B5'; // Reddito imponibile ante-NOL dell'anno (dato, bloccato)
const B_ALIQ = 'B6'; // Aliquota fiscale, fissa 24% (dato, bloccato)

const B_NOLUSATO = 'B10'; // T1 — NOL utilizzato quest'anno
const B_IMPEFF = 'B11'; // T2 — imposte effettivamente pagate

const ALIQUOTA_FISCALE = 0.24; // dato di legge, non randomizzato

export default defineTemplate({
  id: 'M7-12-NOL',
  module: 'M7',
  get title() {
    return tx('M7-12-NOL.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['dcf.nol'],
  prerequisites: ['M7-02-COSTRUZIONEFCF'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Reddito imponibile ante-NOL dell'anno: un valore plausibile per una mid-cap.
    const redditoImponibile = r.int(200, 900) * 1000;

    // Circa meta' dei seed: NOL residuo MAGGIORE del reddito (l'imponibile si
    // azzera, resta NOL per il futuro). L'altra meta': NOL residuo MINORE del
    // reddito (il NOL si esaurisce, resta imponibile tassabile). Mai uguali.
    const nolMaggioreDelReddito = r.bool(0.5);

    const nolResiduo = nolMaggioreDelReddito
      ? redditoImponibile + r.int(50, 500) * 1000
      : r.int(50, Math.floor(redditoImponibile / 1000) - 50) * 1000;

    // Valori attesi, calcolati con la STESSA algebra dei due task.
    const nolUtilizzato = Math.min(nolResiduo, redditoImponibile);
    const imposteEffettive = (redditoImponibile - nolUtilizzato) * ALIQUOTA_FISCALE;
    const imposteSenzaNOL = redditoImponibile * ALIQUOTA_FISCALE; // solo per la narrazione del brief

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M7-12-NOL.2', { B_NOLUSATO, B_NOL, B_REDD }),
      targetCell: `Model!${B_NOLUSATO}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: nolUtilizzato },
        { kind: 'mustReference', cells: [B_NOL, B_REDD] },
        { kind: 'mustUseFunction', functions: ['MIN'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['dcf.nol'],
      minKeystrokes: 14,
    };

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M7-12-NOL.3', { B_IMPEFF, B_REDD, B_NOLUSATO, B_ALIQ }),
      target: `Model!${B_IMPEFF}`,
      atteso: imposteEffettive,
      referenzia: [B_REDD, B_NOLUSATO, B_ALIQ],
      senzaLiteral: [],
      skills: ['dcf.nol'],
      minKeystrokes: 12,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M7-12-NOL',
      seed: rng.seed,
      brief: [tx('M7-12-NOL.4', { p0: eur(nolResiduo), p1: eur(redditoImponibile), p2: pct(ALIQUOTA_FISCALE), p3: eur(imposteSenzaNOL) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-12-NOL.5')], { style: STILE_TITOLO }),
            riga('A3', [tx('M7-12-NOL.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M7-12-NOL.7'),
                tx('M7-12-NOL.8'),
                tx('M7-12-NOL.9'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_NOL, content: nolResiduo, style: STILE_INPUT, locked: true },
              { ref: B_REDD, content: redditoImponibile, style: STILE_INPUT, locked: true },
              { ref: B_ALIQ, content: ALIQUOTA_FISCALE, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A9', [tx('M7-12-NOL.10')], { style: STILE_TITOLO }),
            colonna(
              'A10',
              [
                tx('M7-12-NOL.11'),
                tx('M7-12-NOL.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_NOLUSATO, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_IMPEFF, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 420, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M7-12-NOL.13', { B_NOL, B_REDD }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M7-12-NOL.14', { B_REDD, B_NOLUSATO, B_ALIQ }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_NOLUSATO}`,
    };
  },
});
