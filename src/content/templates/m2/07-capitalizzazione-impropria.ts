/**
 * M2 · 07 — Capitalizzazione impropria: quando spostare un costo e' scorretto.
 *
 * Terzo template "one-off" del modulo, e il caso SPECULARE di M1-06
 * (capitalizzazione dei costi di sviluppo). Li' un'azienda spostava
 * legittimamente una quota di spesa R&D dal Conto Economico allo Stato
 * Patrimoniale, secondo criteri OIC verificabili. Qui la stessa mossa
 * contabile — capitalizzare invece di spesare — e' fatta SENZA una
 * giustificazione legittima: un costo che avrebbe dovuto interamente pesare
 * a Conto Economico e' stato iscritto come immobilizzazione immateriale.
 * L'effetto sui numeri e' identico (l'EBITDA riportato si gonfia), ma qui
 * non c'e' nessun criterio OIC a giustificarlo: e' un artificio contabile, e
 * un QoE lo deve smontare esattamente come smonterebbe un costo one-off
 * spesato normalmente.
 *
 * Il livello somma DUE componenti eterogenee in un'unica rettifica netta,
 * entrambe con lo STESSO segno (negativo) ma per motivazioni diverse:
 *   - la quota capitalizzata impropriamente: andrebbe stata a CE, quindi
 *     l'EBITDA riportato e' PIU' ALTO di quanto dovrebbe — si TOGLIE.
 *   - un contributo pubblico one-off (incassato una tantum, contabilizzato
 *     come provento operativo): e' un provento non ricorrente che ha
 *     gonfiato l'EBITDA riportato — si TOGLIE anche questo, stessa
 *     meccanica del "provento one-off si toglie" gia' introdotta in M2-01,
 *     ma qui applicata insieme a un secondo termine di segno uguale, non
 *     opposto: la trappola non e' il segno di un singolo termine, e' capire
 *     che sommare due "meno" da' un "meno" piu' grande, non una
 *     compensazione.
 *
 * Geometria fissa: nessuna riga dipende dal seed.
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
  eur,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBITDA_RIP = 'B4'; // EBITDA riportato (dato, bloccato)
const B_CAPITALIZZATO = 'B5'; // Quota capitalizzata impropriamente quest'anno (dato, bloccato)
const B_CONTRIBUTO = 'B6'; // Contributo pubblico one-off (dato, bloccato)

const B_RETTIFICA = 'B9'; // T1: rettifica netta
const B_EBITDA_NORM = 'B10'; // T2: EBITDA normalizzato

export default defineTemplate({
  id: 'M2-07-CAPITALIZZAZIONEIMPROPRIA',
  module: 'M2',
  get title() {
    return tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 220,
  skills: ['qoe.one-off'],
  prerequisites: ['M2-01-NORMALIZZAZIONE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBITDA "come riportato" in bilancio: un numero plausibile a scatti di 1.000.
    const ebitdaRiportato = r.int(1200, 5000) * 1000;

    // Quota capitalizzata impropriamente: una frazione contenuta dell'EBITDA
    // riportato, cosi' che l'effetto sia visibile ma mai assurdo.
    const capFrazione = triangular(r, 0.03, 0.08, 0.18);
    const capitalizzatoImpropriamente = roundTo(capFrazione * ebitdaRiportato, 500);

    // Contributo pubblico one-off: importo indipendente, a scatti di 500.
    const contributoPubblico = roundTo(r.int(20, 180) * 1000 * (0.7 + 0.6 * r.next()), 500);

    const rettificaNetta = -(capitalizzatoImpropriamente + contributoPubblico);
    const ebitdaNormalizzato = ebitdaRiportato + rettificaNetta;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.2', { B_RETTIFICA, p1: eur(capitalizzatoImpropriamente), B_CAPITALIZZATO, p3: eur(contributoPubblico), B_CONTRIBUTO }),
      target: `Model!${B_RETTIFICA}`,
      atteso: rettificaNetta,
      referenzia: [B_CAPITALIZZATO, B_CONTRIBUTO],
      senzaLiteral: [],
      skills: ['qoe.one-off'],
      minKeystrokes: 8,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.3', { B_EBITDA_NORM, B_EBITDA_RIP, B_RETTIFICA }),
      target: `Model!${B_EBITDA_NORM}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, B_RETTIFICA],
      senzaLiteral: [],
      skills: ['qoe.one-off'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-07-CAPITALIZZAZIONEIMPROPRIA',
      seed: rng.seed,
      brief: [tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.4', { p0: eur(ebitdaRiportato), p1: eur(capitalizzatoImpropriamente), p2: eur(contributoPubblico) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.5')], { style: STILE_TITOLO }),
            riga('A3', [tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.7'),
                tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.8'),
                tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.9'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_CAPITALIZZATO, content: capitalizzatoImpropriamente, style: STILE_INPUT, locked: true },
              { ref: B_CONTRIBUTO, content: contributoPubblico, style: STILE_INPUT, locked: true },
            ],

            riga('A8', [tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.14')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.10'), tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.11')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_RETTIFICA, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_EBITDA_NORM, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 480, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.12', { B_CAPITALIZZATO, B_CONTRIBUTO }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M2-07-CAPITALIZZAZIONEIMPROPRIA.13', { B_EBITDA_RIP, B_RETTIFICA }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: `Model!${B_RETTIFICA}`,
    };
  },
});
