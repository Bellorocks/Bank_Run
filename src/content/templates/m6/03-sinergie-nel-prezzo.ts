/**
 * M6 · 03 — Le sinergie gia' regalate nel prezzo.
 *
 * IL PUNTO DIDATTICO: M6-02 ha isolato il premio di controllo come UN numero.
 * Qui quel numero si scompone in due pezzi che NON sono la stessa cosa:
 *
 *  - il premio di CONTROLLO PURO: quanto un compratore paga tipicamente solo
 *    per il diritto di comandare — nominare il management, decidere la
 *    strategia, disporre della cassa — SENZA aspettarsi sinergie particolari
 *    da quella specifica combinazione. E' un benchmark osservabile su un
 *    insieme di operazioni comparabili "generiche";
 *
 *  - il premio da SINERGIE ATTESE: la parte del premio TOTALE pagato in un
 *    deal specifico che ECCEDE quel benchmark. E' la quota che il compratore
 *    ha "regalato" al venditore scommettendo di riuscire a realizzare
 *    sinergie sufficienti a ripagarla (sinergie di costo da integrazione,
 *    cross-selling, potere di prezzo maggiore) — sinergie che, al momento
 *    della firma, sono ancora una PROMESSA, non un fatto.
 *
 * Il deal di questo livello ha SEMPRE un premio totale pagato superiore al
 * benchmark di controllo puro (vincolo costruito nel generatore, non solo
 * osservato): altrimenti il compratore non starebbe scommettendo su nessuna
 * sinergia, il che renderebbe l'esercizio vuoto.
 *
 * T2 rende il punto didattico concreto in euro: il premio da sinergie, preso
 * da solo, e' solo una percentuale astratta. Moltiplicato per l'equity value
 * del target prima del deal diventa un NUMERO CHE FA MALE se le sinergie non
 * si materializzano — e' esattamente quanto il compratore ha pagato IN PIU'
 * rispetto a quanto l'azienda valeva per lui, sperando di recuperarlo dopo
 * il closing.
 *
 * Tutti i dati (equity value pre-deal, premio totale pagato, benchmark di
 * controllo puro) arrivano gia' pronti come DATO bloccato, come nel resto del
 * modulo M6: nessuna cella di questo livello dipende da un template diverso.
 * L'equity value pre-deal riusa la distribuzione di `revenue()` di
 * `rng/finance.ts` come generico generatore di un importo plausibile da
 * mid-market (mediana 8m, range 1,5m-150m) — non rappresenta ricavi, e' solo
 * la forma statistica giusta per un ordine di grandezza "azienda vera".
 *
 * Geometria fissa: nessuna posizione dipende dal seed.
 */

import {
  defineTemplate,
  colonna,
  eur,
  eurM,
  foglio,
  hint,
  par,
  pct,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { STEP_RATE, revenue } from '../../../rng/finance';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EQUITY_PRE = 'B4'; // Equity value del target, PRIMA del deal (dato, bloccato)
const B_PREMIO_TOTALE = 'B5'; // Premio di controllo TOTALE pagato nel deal (dato, bloccato)
const B_PREMIO_PURO = 'B6'; // Benchmark di controllo puro, senza sinergie particolari (dato, bloccato)

const B_PREMIO_SINERGIE = 'B9'; // T1
const B_SINERGIE_EUR = 'B10'; // T2

export default defineTemplate({
  id: 'M6-03-SINERGIENELPREZZO',
  module: 'M6',
  get title() {
    return tx('M6-03-SINERGIENELPREZZO.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['prec.synergies-in-price'],
  prerequisites: ['M6-02-PREMIOCONTROLLO'],

  generate: (rng) => {
    const r = rng.fork('deal');

    // --- Equity value pre-deal: importo plausibile da mid-market, stessa
    // distribuzione di `revenue()` riusata come generico generatore di
    // ordine di grandezza (vedi commento di testa). -------------------------
    const equityPre = revenue(r);

    // --- Benchmark di controllo puro: quanto si paga tipicamente SOLO per
    // il diritto di comandare, in operazioni comparabili senza sinergie
    // particolari attese. Range 10%-22%, moda 15%. --------------------------
    const premioPuroFrazione = triangular(r, 0.10, 0.15, 0.22);

    // --- Incremento da sinergie attese: SEMPRE positivo e con un pavimento
    // (3pp) ampiamente sopra il rumore di arrotondamento (0,1pp), cosi' il
    // vincolo "premio totale > benchmark puro" resta vero anche dopo che i
    // due valori vengono arrotondati e scritti in foglio INDIPENDENTEMENTE
    // l'uno dall'altro come due dati bloccati distinti. Range 3pp-20pp,
    // moda 10pp: e' la quota di premio che il compratore ha scommesso di
    // recuperare in sinergie. ------------------------------------------------
    const sinergieFrazioneGenerata = triangular(r, 0.03, 0.10, 0.20);

    const premioPuro = roundTo(premioPuroFrazione, STEP_RATE);
    const premioTotale = roundTo(premioPuroFrazione + sinergieFrazioneGenerata, STEP_RATE);

    // Valori "veri" usati come atteso nei task: ricalcolati dai DATI
    // effettivamente scritti in foglio (dopo l'arrotondamento), non dai
    // parametri intermedi di generazione.
    const premioSinergie = premioTotale - premioPuro;
    const sinergieEuro = premioSinergie * equityPre;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M6-03-SINERGIENELPREZZO.2', { B_PREMIO_SINERGIE, B_PREMIO_TOTALE, B_PREMIO_PURO }),
      target: `Model!${B_PREMIO_SINERGIE}`,
      atteso: premioSinergie,
      referenzia: [B_PREMIO_TOTALE, B_PREMIO_PURO],
      senzaLiteral: [],
      skills: ['prec.synergies-in-price'],
      minKeystrokes: 8,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M6-03-SINERGIENELPREZZO.3', { B_SINERGIE_EUR, B_PREMIO_SINERGIE, B_EQUITY_PRE }),
      target: `Model!${B_SINERGIE_EUR}`,
      atteso: sinergieEuro,
      referenzia: [B_PREMIO_SINERGIE, B_EQUITY_PRE],
      senzaLiteral: [],
      skills: ['prec.synergies-in-price'],
      minKeystrokes: 10,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M6-03-SINERGIENELPREZZO',
      seed: rng.seed,
      brief: [tx('M6-03-SINERGIENELPREZZO.4', { p0: eurM(equityPre), p1: pct(premioTotale), p2: pct(premioPuro) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M6-03-SINERGIENELPREZZO.5')], { style: STILE_TITOLO }),
            riga('A3', [tx('M6-03-SINERGIENELPREZZO.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M6-03-SINERGIENELPREZZO.7'),
                tx('M6-03-SINERGIENELPREZZO.8'),
                tx('M6-03-SINERGIENELPREZZO.9'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EQUITY_PRE, content: equityPre, style: STILE_INPUT, locked: true }],
            [{ ref: B_PREMIO_TOTALE, content: premioTotale, style: STILE_INPUT_PCT, locked: true }],
            [{ ref: B_PREMIO_PURO, content: premioPuro, style: STILE_INPUT_PCT, locked: true }],

            riga('A8', [tx('M6-03-SINERGIENELPREZZO.10')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M6-03-SINERGIENELPREZZO.11'),
                tx('M6-03-SINERGIENELPREZZO.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_PREMIO_SINERGIE, content: null, locked: false, style: STILE_FORMULA_PCT }],
            [{ ref: B_SINERGIE_EUR, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M6-03-SINERGIENELPREZZO.13', { B_PREMIO_TOTALE, B_PREMIO_PURO, p2: pct(premioSinergie) }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M6-03-SINERGIENELPREZZO.14', { B_PREMIO_SINERGIE, B_EQUITY_PRE, p2: eur(sinergieEuro) }),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${B_PREMIO_SINERGIE}`,
    };
  },
});
