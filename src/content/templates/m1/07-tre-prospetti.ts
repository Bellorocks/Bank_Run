/**
 * M1 · 07 — Tre prospetti (Conto Economico -> Stato Patrimoniale -> Rendiconto
 * Finanziario), con il balance check obbligatorio.
 *
 * QUESTO E' IL LIVELLO [COMBO] del primo blocco di M1: mette insieme la
 * lettura del CE (M1-01/02), la competenza economica (M1-03), le poste
 * a movimentazione (M1-04), il collegamento costo/magazzino (M1-05) e la
 * capitalizzazione (M1-06) in un unico gesto — collegare i tre prospetti e
 * dimostrare che quadrano. Nessun calcolo iterativo o circolare qui: e'
 * pura algebra lineare, un solo giro di formule dall'alto al basso.
 *
 * SEMPLIFICAZIONE DICHIARATA — la variazione del Capitale Circolante Netto
 * arriva gia' come UN numero con segno (non crediti/rimanenze/debiti da
 * ricostruire separatamente: quello e' il modulo M3). Allo stesso modo, il
 * "Totale attivita' non monetarie di fine anno" arriva gia' calcolato: il
 * punto del livello e' il collegamento CE-SP-CF, non la ricostruzione
 * integrale dello stato patrimoniale.
 *
 * CONVENZIONE DI SEGNO (il punto piu' delicato di tutto il livello, ripetuto
 * nel brief e in ogni prompt che la tocca):
 *   - ΔCCN: positivo = il CCN e' AUMENTATO, ha ASSORBITO cassa (si sottrae
 *     nel flusso operativo). Negativo = il CCN e' diminuito, ha LIBERATO
 *     cassa (sottrarre un negativo lo aggiunge).
 *   - ΔDebito finanziario netto: positivo = piu' debito acceso che rimborsato,
 *     cassa IN. Negativo = rimborsi netti, cassa OUT.
 *   - Capex e Dividendi arrivano gia' come numeri POSITIVI che rappresentano
 *     un esborso: nel flusso si sottraggono (Capex) o si tolgono al netto del
 *     nuovo debito (Dividendi).
 *
 * DERIVAZIONE ALGEBRICA DEI CINQUE TASK — la scrivo qui per esteso, PRIMA di
 * generare un numero, esattamente come fatto per il solver di m0f/04 (li' era
 * un punto fisso; qui e' solo sostituzione).
 *
 *   T1  FCO (flusso operativo)      = UtileNetto + D&A - ΔCCN
 *   T2  FCI (flusso investimenti)   = -Capex
 *   T3  FCF (flusso finanziamento)  = ΔDebito - Dividendi
 *   T4  CassaFinale                 = CassaIniziale + FCO + FCI + FCF
 *
 *   T5  CONTROLLO DI QUADRATURA — l'identita' di stato patrimoniale applicata
 *       a inizio e fine anno. Lo stato patrimoniale finale deve pareggiare:
 *
 *         Attivo finale  = CassaFinale + AttivitaNonMonetarieFinali
 *         Passivo finale = PNFinale + DebitoFinale
 *
 *       dove, con l'unico movimento di patrimonio netto ammesso in questo
 *       livello (utile dell'anno meno dividendi distribuiti, nessun aumento
 *       di capitale):
 *
 *         PNFinale     = PNIniziale + UtileNetto - Dividendi
 *         DebitoFinale = DebitoIniziale + ΔDebito
 *
 *       Il controllo e' Attivo finale - Passivo finale, che DEVE fare zero:
 *
 *         T5 = (CassaFinale + AttNonMon) - (PNIniziale + UtileNetto - Dividendi
 *                                            + DebitoIniziale + ΔDebito)
 *
 *       Perche' faccia ESATTAMENTE zero per ogni seed, "AttivitaNonMonetarie-
 *       Finali" non e' generato a caso: e' DERIVATO nel generate() risolvendo
 *       la stessa identita' al contrario —
 *
 *         AttNonMon = PNIniziale + UtileNetto - Dividendi + DebitoIniziale
 *                     + ΔDebito - CassaFinale
 *
 *       — e poi dato al giocatore come un numero gia' pronto (e' cosi' che il
 *       brief lo presenta: "gia' calcolato", non "da ricostruire"). Il
 *       giocatore non vede questa derivazione: vede solo che, se ha collegato
 *       bene i tre prospetti, il controllo torna zero. Verificato a mano e
 *       poi con un test di fedelta' su piu' seed prima di consegnare.
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
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
  eur,
} from '../../authoring';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_UN = 'B4'; // Utile netto dell'esercizio
const B_DA = 'B5'; // D&A dell'anno
const B_DCCN = 'B6'; // Variazione del CCN (con segno)
const B_CAPEX = 'B7'; // Capex dell'anno (esborso, positivo)
const B_DDEBITO = 'B8'; // Variazione del debito finanziario netto (con segno)
const B_DIV = 'B9'; // Dividendi distribuiti (esborso, positivo)
const B_CASSA0 = 'B10'; // Cassa iniziale
const B_ATTNONMON = 'B11'; // Totale attivita' non monetarie di fine anno (dato)
const B_PN0 = 'B12'; // Patrimonio netto iniziale
const B_DEBITO0 = 'B13'; // Debito finanziario iniziale

const B_FCO = 'B16'; // T1
const B_FCI = 'B17'; // T2
const B_FCF = 'B18'; // T3
const B_CASSAFIN = 'B19'; // T4

const B_CHECK = 'B22'; // T5 — controllo di quadratura

export default defineTemplate({
  id: 'M1-07-TREPROSPETTI',
  module: 'M1',
  get title() {
    return tx('M1-07-TREPROSPETTI.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 420,
  skills: ['acc.three-statement'],
  prerequisites: [
    'M1-02-RICLASSIFICAZIONE',
    'M1-03-RATEIRISCONTI',
    'M1-04-FONDIRISCHI',
    'M1-05-RIMANENZE',
    'M1-06-CAPITALIZZAZIONE',
  ],
  combo: true,

  generate: (rng) => {
    const r = rng.fork('dati');

    // Poste dell'anno, in euro, a scatti di 1.000 per restare leggibili.
    const utileNetto = r.int(80, 600) * 1000;
    const da = r.int(30, 200) * 1000;
    const deltaCCN = r.int(-150, 150) * 1000; // segno: positivo assorbe cassa
    const capex = r.int(40, 300) * 1000; // esborso, sempre positivo
    const deltaDebito = r.int(-200, 200) * 1000; // segno: positivo = piu' debito
    const dividendi = r.int(0, 150) * 1000; // esborso, sempre positivo (o zero)
    const cassaIniziale = r.int(100, 500) * 1000;
    const patrimonioNettoIniziale = r.int(500, 3000) * 1000;
    const debitoIniziale = r.int(200, 1500) * 1000;

    // I tre flussi e la cassa finale: la STESSA algebra dei task, usata qui
    // per calcolare i numeri attesi in forma chiusa (non un placeholder).
    const fco = utileNetto + da - deltaCCN;
    const fci = -capex;
    const fcf = deltaDebito - dividendi;
    const cassaFinale = cassaIniziale + fco + fci + fcf;

    // Derivato, non casuale: e' il numero che rende il controllo di quadratura
    // esattamente zero per costruzione (vedi commento di testa).
    const attivitaNonMonetarieFinali =
      patrimonioNettoIniziale + utileNetto - dividendi + debitoIniziale + deltaDebito - cassaFinale;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M1-07-TREPROSPETTI.2', { B_FCO, B_UN, B_DA, B_DCCN }),
      target: `Model!${B_FCO}`,
      atteso: fco,
      referenzia: [B_UN, B_DA, B_DCCN],
      senzaLiteral: [],
      skills: ['acc.three-statement'],
      minKeystrokes: 10,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M1-07-TREPROSPETTI.3', { B_FCI, B_CAPEX }),
      target: `Model!${B_FCI}`,
      atteso: fci,
      referenzia: [B_CAPEX],
      senzaLiteral: [],
      skills: ['acc.three-statement'],
      minKeystrokes: 4,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M1-07-TREPROSPETTI.4', { B_FCF, B_DDEBITO, B_DIV }),
      target: `Model!${B_FCF}`,
      atteso: fcf,
      referenzia: [B_DDEBITO, B_DIV],
      senzaLiteral: [],
      skills: ['acc.three-statement'],
      minKeystrokes: 7,
    });

    const t4 = taskFormula({
      id: 'T4',
      prompt:
        tx('M1-07-TREPROSPETTI.5', { B_CASSAFIN, B_CASSA0, B_FCO, B_FCI, B_FCF }),
      target: `Model!${B_CASSAFIN}`,
      atteso: cassaFinale,
      referenzia: [B_CASSA0, B_FCO, B_FCI, B_FCF],
      senzaLiteral: [],
      skills: ['acc.three-statement'],
      minKeystrokes: 15,
    });

    // T5 — il balance check. Scritto a mano (non con taskFormula) perche' un
    // task di quadratura ha bisogno di toleranceMode:'absolute' su un atteso
    // vicino a zero, che taskFormula() non espone.
    const t5: Task = {
      id: 'T5',
      prompt:
        tx('M1-07-TREPROSPETTI.6', { B_CHECK, B_CASSAFIN, B_ATTNONMON, B_PN0, B_UN, B_DIV, B_DEBITO0, B_DDEBITO }),
      targetCell: `Model!${B_CHECK}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: 0,
          toleranceMode: 'absolute',
          tolerance: 0.01,
          message:
            tx('M1-07-TREPROSPETTI.7'),
        },
        {
          kind: 'mustReference',
          cells: [B_CASSAFIN, B_ATTNONMON, B_PN0, B_UN, B_DIV, B_DEBITO0, B_DDEBITO],
        },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['acc.three-statement'],
      minKeystrokes: 40,
    };

    const tasks = [t1, t2, t3, t4, t5];

    return {
      templateId: 'M1-07-TREPROSPETTI',
      seed: rng.seed,
      brief: [tx('M1-07-TREPROSPETTI.8', { p0: eur(utileNetto), p1: eur(da), p2: eur(deltaCCN), p3: eur(capex), p4: eur(deltaDebito), p5: eur(dividendi), p6: eur(cassaIniziale), p7: eur(attivitaNonMonetarieFinali), p8: eur(patrimonioNettoIniziale), p9: eur(debitoIniziale) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M1-07-TREPROSPETTI.9')], { style: STILE_TITOLO }),
            riga('A3', [tx('M1-07-TREPROSPETTI.10')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M1-07-TREPROSPETTI.11'),
                tx('M1-07-TREPROSPETTI.12'),
                tx('M1-07-TREPROSPETTI.13'),
                tx('M1-07-TREPROSPETTI.14'),
                tx('M1-07-TREPROSPETTI.15'),
                tx('M1-07-TREPROSPETTI.16'),
                tx('M1-07-TREPROSPETTI.17'),
                tx('M1-07-TREPROSPETTI.18'),
                tx('M1-07-TREPROSPETTI.19'),
                tx('M1-07-TREPROSPETTI.20'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_UN, content: utileNetto, style: STILE_INPUT, locked: true },
              { ref: B_DA, content: da, style: STILE_INPUT, locked: true },
              { ref: B_DCCN, content: deltaCCN, style: STILE_INPUT, locked: true },
              { ref: B_CAPEX, content: capex, style: STILE_INPUT, locked: true },
              { ref: B_DDEBITO, content: deltaDebito, style: STILE_INPUT, locked: true },
              { ref: B_DIV, content: dividendi, style: STILE_INPUT, locked: true },
              { ref: B_CASSA0, content: cassaIniziale, style: STILE_INPUT, locked: true },
              { ref: B_ATTNONMON, content: attivitaNonMonetarieFinali, style: STILE_INPUT, locked: true },
              { ref: B_PN0, content: patrimonioNettoIniziale, style: STILE_INPUT, locked: true },
              { ref: B_DEBITO0, content: debitoIniziale, style: STILE_INPUT, locked: true },
            ],

            riga('A15', [tx('M1-07-TREPROSPETTI.21')], { style: STILE_TITOLO }),
            colonna(
              'A16',
              [
                tx('M1-07-TREPROSPETTI.22'),
                tx('M1-07-TREPROSPETTI.23'),
                tx('M1-07-TREPROSPETTI.24'),
                tx('M1-07-TREPROSPETTI.25'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_FCO, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_FCI, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_FCF, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_CASSAFIN, content: null, locked: false, style: STILE_FORMULA }],

            riga('A21', [tx('M1-07-TREPROSPETTI.26')], { style: STILE_TITOLO }),
            [
              {
                ref: 'A22',
                content: tx('M1-07-TREPROSPETTI.27'),
                locked: true,
                style: STILE_ETICHETTA,
              },
            ],
            [{ ref: B_CHECK, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 420, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M1-07-TREPROSPETTI.28', { B_UN, B_DA, B_DCCN }),
          10,
          'T1',
        ),
        hint('H2', tx('M1-07-TREPROSPETTI.29', { B_CAPEX }), 8, 'T2'),
        hint(
          'H3',
          tx('M1-07-TREPROSPETTI.30', { B_DDEBITO, B_DIV }),
          8,
          'T3',
        ),
        hint(
          'H4',
          tx('M1-07-TREPROSPETTI.31', { B_CASSA0, B_FCO, B_FCI, B_FCF }),
          10,
          'T4',
        ),
        hint(
          'H5',
          tx('M1-07-TREPROSPETTI.32', { B_CASSAFIN, B_ATTNONMON, B_PN0, B_UN, B_DIV, B_DEBITO0, B_DDEBITO }),
          15,
          'T5',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 140 }),
      startAt: `Model!${B_FCO}`,
    };
  },
});
