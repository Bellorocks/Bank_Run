/**
 * M4 · 06 — Minorities e partecipazioni non consolidate: l'ultimo aggiustamento del bridge.
 *
 * M4-05 ha chiuso il bridge fino al pezzo debt-like/cash-like:
 *
 *   Equity Value (grezzo) = Enterprise Value - Net Debt (base) - Σ debt-like +
 *                           Σ cash-like
 *
 * Questo livello aggiunge l'ULTIMO pezzo, quello legato al consolidamento —
 * lo stesso argomento di M1-12 (minorities e metodo del patrimonio netto),
 * qui riletto dal lato dell'Equity Value invece che del Conto Economico:
 *
 *   Equity Value (di pertinenza del gruppo) = Equity Value (grezzo)
 *                                              - Minorities
 *                                              + Partecipazioni non consolidate
 *
 * PERCHE' OGNUNA VA COME VA (dichiarato qui, non lasciato implicito):
 *
 *   - **Minorities** (quota di terzi in una controllata consolidata
 *     integralmente): l'Enterprise Value e i multipli di partenza sono
 *     costruiti su un EBITDA/EBIT che include GIA' il 100% della controllata
 *     (esattamente come in M1-12, Scenario A — la si consolida per intero e
 *     POI si toglie la fetta dei terzi). Quel 100% include quindi anche il
 *     valore che spetta ai terzi, non al gruppo. Il valore delle minorities
 *     SI SOTTRAE dall'Equity Value grezzo: e' valore reale, ma non appartiene
 *     a chi sta comprando la quota del gruppo.
 *   - **Partecipazioni non consolidate** (partecipate valutate con il metodo
 *     del patrimonio netto, come in M1-12 Scenario B): il gruppo non le
 *     controlla, quindi non le consolida mai riga per riga — il loro
 *     EBITDA/EBIT NON e' dentro l'Enterprise Value di partenza. Il loro
 *     valore e' comunque reale e appartiene al gruppo (e' un asset in
 *     bilancio, il valore di carico della partecipazione), quindi SI SOMMA:
 *     senza questo pezzo, l'Equity Value dimenticherebbe un pezzo di
 *     patrimonio del tutto legittimo.
 *
 * In una riga: le minorities sono valore INCLUSO nell'EV di partenza ma NON
 * di pertinenza del gruppo (si toglie); le partecipazioni non consolidate
 * sono valore DI pertinenza del gruppo ma NON incluso nell'EV di partenza
 * (si aggiunge). Le due voci si muovono in direzioni opposte per motivi
 * opposti — e' il punto che il livello vuole far fissare.
 *
 * T2 ripete lo schema gia' visto in M2-01/M2-12: un'aggiustamento va sempre
 * letto anche in proporzione, non solo in valore assoluto, per dare al
 * giocatore un senso di materialita' — qui l'impatto netto dei due
 * aggiustamenti (partecipazioni meno minorities) sull'Equity Value grezzo.
 *
 * Geometria fissa: nessuna riga dipende dal seed (tre dati, due task, niente
 * tabelle da classificare), quindi i riferimenti sotto sono letterali per
 * costruzione, come in m1/12-minorities.ts.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
  eur,
  pct,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EQV_GREZZO = 'B4'; // Equity Value grezzo dal bridge (dato, bloccato)
const B_MINORITIES = 'B5'; // Valore stimato delle minorities (dato, bloccato)
const B_PARTECIPAZIONI = 'B6'; // Valore delle partecipazioni non consolidate (dato, bloccato)

const B_EQV_GRUPPO = 'B9'; // T1
const B_IMPATTO_PCT = 'B10'; // T2

export default defineTemplate({
  id: 'M4-06-MINORITIESBRIDGE',
  module: 'M4',
  get title() {
    return tx('M4-06-MINORITIESBRIDGE.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['ev.minorities'],
  prerequisites: ['M4-05-BRIDGECOMPLETO'],

  generate: (rng) => {
    const rBase = rng.fork('base');
    const rMinorities = rng.fork('minorities');
    const rPartecipazioni = rng.fork('partecipazioni');

    // Equity Value grezzo dal bridge: dato bloccato, autosufficiente (nessuna
    // cella live condivisa con M4-05 — qui e' semplicemente il punto di
    // partenza di QUESTO livello).
    const equityValueGrezzo = rBase.int(15_000, 90_000) * 1000;

    // Minorities e partecipazioni sono generate come FRAZIONE dell'Equity
    // Value grezzo (non come importi assoluti indipendenti): garantisce che
    // restino sempre in una proporzione plausibile rispetto al numero di
    // partenza, qualunque combinazione esca dal seed — esattamente come la
    // rettifica di M2-01 e' generata come frazione dell'EBITDA riportato.
    // Le minorities sono tipicamente il pezzo piu' rilevante dei due (una
    // quota di terzi in una controllata puo' pesare parecchio), le
    // partecipazioni non consolidate tendono a essere piu' contenute (un
    // valore di carico, non un intero business consolidato) — da qui i due
    // range diversi.
    const fracMinorities = triangular(rMinorities, 0.03, 0.08, 0.18);
    const minoritiesValue = roundTo(fracMinorities * equityValueGrezzo, 5_000);

    const fracPartecipazioni = triangular(rPartecipazioni, 0.01, 0.05, 0.12);
    const partecipazioniValue = roundTo(fracPartecipazioni * equityValueGrezzo, 5_000);

    const equityValueGruppo = equityValueGrezzo - minoritiesValue + partecipazioniValue;
    const impattoNettoPct = (partecipazioniValue - minoritiesValue) / equityValueGrezzo;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M4-06-MINORITIESBRIDGE.2', { B_EQV_GRUPPO, B_EQV_GREZZO, B_MINORITIES, B_PARTECIPAZIONI }),
      target: `Model!${B_EQV_GRUPPO}`,
      atteso: equityValueGruppo,
      referenzia: [B_EQV_GREZZO, B_MINORITIES, B_PARTECIPAZIONI],
      senzaLiteral: [],
      skills: ['ev.minorities'],
      minKeystrokes: 14,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M4-06-MINORITIESBRIDGE.3', { B_IMPATTO_PCT, B_PARTECIPAZIONI, B_MINORITIES, B_EQV_GREZZO }),
      target: `Model!${B_IMPATTO_PCT}`,
      atteso: impattoNettoPct,
      referenzia: [B_PARTECIPAZIONI, B_MINORITIES, B_EQV_GREZZO],
      senzaLiteral: [],
      skills: ['ev.minorities'],
      minKeystrokes: 16,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M4-06-MINORITIESBRIDGE',
      seed: rng.seed,
      brief: [tx('M4-06-MINORITIESBRIDGE.4', { p0: eur(equityValueGrezzo), p1: eur(minoritiesValue), p2: eur(partecipazioniValue) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M4-06-MINORITIESBRIDGE.5')], { style: STILE_TITOLO }),

            riga('A3', [tx('M4-06-MINORITIESBRIDGE.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M4-06-MINORITIESBRIDGE.7'),
                tx('M4-06-MINORITIESBRIDGE.8'),
                tx('M4-06-MINORITIESBRIDGE.9'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EQV_GREZZO, content: equityValueGrezzo, style: STILE_INPUT, locked: true },
              { ref: B_MINORITIES, content: minoritiesValue, style: STILE_INPUT, locked: true },
              { ref: B_PARTECIPAZIONI, content: partecipazioniValue, style: STILE_INPUT, locked: true },
            ],

            riga('A8', [tx('M4-06-MINORITIESBRIDGE.10')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M4-06-MINORITIESBRIDGE.11'),
                tx('M4-06-MINORITIESBRIDGE.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EQV_GRUPPO, content: null, locked: false, style: STILE_TOTALE }],
            [{ ref: B_IMPATTO_PCT, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 460, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M4-06-MINORITIESBRIDGE.13', { B_EQV_GREZZO, B_MINORITIES, B_PARTECIPAZIONI }),
          14,
          'T1',
        ),
        hint(
          'H2',
          tx('M4-06-MINORITIESBRIDGE.14', { B_PARTECIPAZIONI, B_MINORITIES, B_EQV_GREZZO, p3: pct(impattoNettoPct) }),
          14,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 130 }),
      startAt: `Model!${B_EQV_GRUPPO}`,
    };
  },
});
