/**
 * M1 · 12 — Minorities e metodo del patrimonio netto.
 *
 * Due meccaniche di consolidamento DISTINTE, e il livello esiste apposta per
 * evitare che il giocatore le confonda (e' l'errore concettuale piu' comune
 * su questo argomento):
 *
 *  - CONTROLLATA (Scenario A): il gruppo la controlla, quindi la consolida
 *    al 100% linea per linea — l'utile consolidato del gruppo include GIA'
 *    tutto l'utile della controllata, non solo la quota di proprieta'. Dopo
 *    aver consolidato al 100%, si "TOGLIE" la fetta che spetta ai terzi
 *    (minority interest / quota di terzi) per arrivare all'utile di
 *    pertinenza del gruppo.
 *
 *  - PARTECIPATA (Scenario B, metodo del patrimonio netto / equity method):
 *    il gruppo NON la controlla (quota sotto la soglia di controllo), quindi
 *    NON la consolida mai linea per linea. In bilancio compare come una
 *    singola riga di partecipazione, il cui valore di carico si aggiorna
 *    ogni anno: SALE per la quota di utile maturato (il gruppo si e'
 *    arricchito anche se non ha incassato nulla), SCENDE per i dividendi
 *    incassati (un dividendo, in questo metodo, e' un disinvestimento della
 *    partecipazione — un rientro di cassa che riduce cio' che resta "dentro"
 *    la partecipazione — non un provento a Conto Economico).
 *
 * Due scenari indipendenti, `rng.fork` separato per ciascuno cosi' che
 * cambiare la scala dell'uno non sposti di un euro l'altro (stessa
 * precauzione di m1/04-fondi-rischi-tfr.ts).
 *
 * DERIVAZIONE ALGEBRICA DEI TRE TASK — scritta per esteso prima di generare
 * un numero, cosi' il test di fedelta' verifica la stessa formula che il
 * giocatore deve scrivere.
 *
 *   Scenario A (controllata):
 *     T1  QuotaTerzi        = UtileControllata × (1 - PercentualeGruppoA)
 *     T2  QuotaGruppo       = UtileConsolidato - QuotaTerzi
 *
 *   Scenario B (partecipata, equity method):
 *     T3  CaricoFinale      = CaricoIniziale + (UtilePartecipata × PercentualeGruppoB) - Dividendi
 *
 * Nessun controllo di quadratura in questo livello: sono tre calcoli diretti,
 * non uno schema che deve chiudere a zero.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  pct,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------

// Scenario A — controllata consolidata integralmente.
const A_UTILE_CTRL = 'B4'; // Utile della controllata (100%)
const A_PCT_GRUPPO = 'B5'; // % posseduta dal gruppo
const A_UTILE_CONS = 'B6'; // Utile consolidato del gruppo (include gia' la controllata al 100%)
const A_QUOTA_TERZI = 'B8'; // T1
const A_QUOTA_GRUPPO = 'B9'; // T2

// Scenario B — partecipata non controllata, metodo del patrimonio netto.
const B_CARICO0 = 'B13'; // Valore di carico iniziale della partecipazione
const B_PCT_GRUPPO = 'B14'; // % posseduta dal gruppo (sotto la soglia di controllo)
const B_UTILE_PART = 'B15'; // Utile della partecipata nell'anno
const B_DIVIDENDI = 'B16'; // Dividendi ricevuti dalla partecipata nell'anno
const B_CARICO_FIN = 'B18'; // T3

export default defineTemplate({
  id: 'M1-12-MINORITIES',
  module: 'M1',
  get title() {
    return tx('M1-12-MINORITIES.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['acc.minorities'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    // --- Scenario A: controllata consolidata integralmente. -----------------
    const rA = rng.fork('controllata');
    const percentualeGruppoA = roundTo(triangular(rA, 0.6, 0.75, 0.9), 0.01);
    const utileControllata = roundTo(triangular(rA, 400_000, 900_000, 2_000_000), 5_000);
    // L'utile consolidato include gia' il 100% della controllata, quindi e'
    // sempre maggiore dell'utile della controllata stessa: si genera come
    // "resto del gruppo" (le altre linee consolidate) sommato all'utile
    // della controllata al 100%, cosi' il numero e' sempre coerente.
    const restoGruppoA = roundTo(triangular(rA, 500_000, 1_500_000, 4_000_000), 5_000);
    const utileConsolidato = utileControllata + restoGruppoA;

    const quotaTerzi = utileControllata * (1 - percentualeGruppoA);
    const quotaGruppo = utileConsolidato - quotaTerzi;

    // --- Scenario B: partecipata non controllata, equity method. ------------
    const rB = rng.fork('partecipata');
    const percentualeGruppoB = roundTo(triangular(rB, 0.2, 0.3, 0.4), 0.01);
    const caricoIniziale = roundTo(triangular(rB, 300_000, 800_000, 1_800_000), 5_000);
    const utilePartecipata = roundTo(triangular(rB, 100_000, 400_000, 900_000), 5_000);
    // I dividendi ricevuti non possono superare la quota di utile maturata
    // nell'anno piu' il carico iniziale (altrimenti il carico finale
    // diventerebbe negativo, un caso che il metodo del patrimonio netto non
    // contempla in un esercizio didattico): li si genera come una frazione
    // della quota di utile spettante al gruppo.
    const quotaUtilePartecipata = utilePartecipata * percentualeGruppoB;
    const dividendiRicevuti = roundTo(triangular(rB, 0, quotaUtilePartecipata * 0.4, quotaUtilePartecipata * 0.9), 1_000);

    const caricoFinale = caricoIniziale + quotaUtilePartecipata - dividendiRicevuti;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M1-12-MINORITIES.2', { A_QUOTA_TERZI, A_UTILE_CTRL, A_PCT_GRUPPO }),
      target: `Model!${A_QUOTA_TERZI}`,
      atteso: quotaTerzi,
      referenzia: [A_UTILE_CTRL, A_PCT_GRUPPO],
      skills: ['acc.minorities'],
      minKeystrokes: 14,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M1-12-MINORITIES.3', { A_QUOTA_GRUPPO, A_UTILE_CONS, A_QUOTA_TERZI }),
      target: `Model!${A_QUOTA_GRUPPO}`,
      atteso: quotaGruppo,
      referenzia: [A_UTILE_CONS, A_QUOTA_TERZI],
      skills: ['acc.minorities'],
      minKeystrokes: 8,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M1-12-MINORITIES.4', { B_CARICO_FIN, B_PCT_GRUPPO, B_CARICO0, B_UTILE_PART, B_DIVIDENDI }),
      target: `Model!${B_CARICO_FIN}`,
      atteso: caricoFinale,
      referenzia: [B_CARICO0, B_UTILE_PART, B_PCT_GRUPPO, B_DIVIDENDI],
      skills: ['acc.minorities'],
      minKeystrokes: 20,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-12-MINORITIES',
      seed: rng.seed,
      brief: [tx('M1-12-MINORITIES.5', { p0: eur(utileControllata), p1: pct(percentualeGruppoA), p2: eur(utileConsolidato), p3: eur(caricoIniziale), p4: pct(percentualeGruppoB), p5: eur(utilePartecipata), p6: eur(dividendiRicevuti) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M1-12-MINORITIES.6')], { style: STILE_TITOLO }),

            riga('A3', [tx('M1-12-MINORITIES.7')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M1-12-MINORITIES.8'),
                tx('M1-12-MINORITIES.9'),
                tx('M1-12-MINORITIES.10'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: A_UTILE_CTRL, content: utileControllata, style: STILE_INPUT, locked: true },
              { ref: A_PCT_GRUPPO, content: percentualeGruppoA, style: STILE_INPUT_PCT, locked: true },
              { ref: A_UTILE_CONS, content: utileConsolidato, style: STILE_INPUT, locked: true },
            ],
            riga('A7', [tx('M1-12-MINORITIES.11')], { style: STILE_ETICHETTA }),
            colonna('A8', [tx('M1-12-MINORITIES.12'), tx('M1-12-MINORITIES.13')], {
              style: STILE_ETICHETTA,
            }),
            [{ ref: A_QUOTA_TERZI, content: null, locked: false, style: STILE_TOTALE }],
            [{ ref: A_QUOTA_GRUPPO, content: null, locked: false, style: STILE_TOTALE }],

            riga('A12', [tx('M1-12-MINORITIES.14')], { style: STILE_TITOLO }),
            colonna(
              'A13',
              [
                tx('M1-12-MINORITIES.15'),
                tx('M1-12-MINORITIES.16'),
                tx('M1-12-MINORITIES.17'),
                tx('M1-12-MINORITIES.18'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_CARICO0, content: caricoIniziale, style: STILE_INPUT, locked: true },
              { ref: B_PCT_GRUPPO, content: percentualeGruppoB, style: STILE_INPUT_PCT, locked: true },
              { ref: B_UTILE_PART, content: utilePartecipata, style: STILE_INPUT, locked: true },
              { ref: B_DIVIDENDI, content: dividendiRicevuti, style: STILE_INPUT, locked: true },
            ],
            [
              {
                ref: 'A18',
                content: tx('M1-12-MINORITIES.19'),
                locked: true,
                style: STILE_ETICHETTA,
              },
            ],
            [{ ref: B_CARICO_FIN, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M1-12-MINORITIES.20', { A_UTILE_CTRL, A_PCT_GRUPPO }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M1-12-MINORITIES.21', { A_UTILE_CONS, A_QUOTA_TERZI }),
          8,
          'T2',
        ),
        hint(
          'H3',
          tx('M1-12-MINORITIES.22', { B_CARICO0, B_UTILE_PART, B_PCT_GRUPPO, B_DIVIDENDI }),
          15,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${A_QUOTA_TERZI}`,
    };
  },
});
