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

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBITDA_RIP = 'B4'; // EBITDA riportato (dato, bloccato)
const B_CAPITALIZZATO = 'B5'; // Quota capitalizzata impropriamente quest'anno (dato, bloccato)
const B_CONTRIBUTO = 'B6'; // Contributo pubblico one-off (dato, bloccato)

const B_RETTIFICA = 'B9'; // T1: rettifica netta
const B_EBITDA_NORM = 'B10'; // T2: EBITDA normalizzato

export default defineTemplate({
  id: 'M2-07-CAPITALIZZAZIONEIMPROPRIA',
  module: 'M2',
  title: 'Capitalizzazione impropria: il costo che non e\' sparito',
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
        `In ${B_RETTIFICA} calcola la rettifica netta, sommando DUE componenti che vanno TOLTE entrambe ` +
        `dall'EBITDA riportato (rettifica negativa su entrambe): la quota capitalizzata impropriamente ` +
        `quest'anno (${eur(capitalizzatoImpropriamente)}, in ${B_CAPITALIZZATO}) — un costo che avrebbe ` +
        "dovuto interamente pesare a Conto Economico e invece e' stato iscritto come immobilizzazione " +
        `immateriale, quindi ha gonfiato l'EBITDA riportato — e il contributo pubblico one-off ` +
        `(${eur(contributoPubblico)}, in ${B_CONTRIBUTO}), un provento non ricorrente che ha gonfiato ` +
        "l'EBITDA riportato allo stesso modo. Non compensarle: sono due rettifiche NEGATIVE che si " +
        'sommano, non una positiva e una negativa — cambia segno alla somma delle due, non a una sola.',
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
        `In ${B_EBITDA_NORM} calcola l'EBITDA normalizzato: l'EBITDA riportato (${B_EBITDA_RIP}) piu' la ` +
        `rettifica netta che hai appena calcolato (${B_RETTIFICA}, gia' negativa). Non ricostruire le due ` +
        "componenti qui: la rettifica netta le contiene gia' entrambe.",
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
      brief: [
        "## Capitalizzare non e' sempre legittimo",
        '',
        "In M1 hai visto un'azienda spostare legittimamente una quota di spesa R&D dal Conto Economico " +
          "allo Stato Patrimoniale, secondo criteri OIC verificabili: fattibilita' tecnica dimostrabile, " +
          "intenzione e capacita' di completare il progetto, benefici economici futuri attendibili. Qui la " +
          "stessa mossa contabile — capitalizzare un costo invece di spesarlo — e' stata fatta SENZA " +
          "nessuna di queste giustificazioni: un costo che secondo le regole avrebbe dovuto interamente " +
          "pesare a Conto Economico e' stato invece iscritto come immobilizzazione immateriale. Il costo " +
          "non e' sparito, e' stato nascosto sotto la riga — e l'EBITDA riportato ne esce artificialmente " +
          "piu' alto.",
        '',
        `Qui sotto trovi l'EBITDA riportato (${eur(ebitdaRiportato)}) e due voci da rettificare, entrambe ` +
          'con lo STESSO segno:',
        '',
        `- **quota capitalizzata impropriamente** (${eur(capitalizzatoImpropriamente)}): un costo che ` +
          "avrebbe dovuto stare interamente a Conto Economico e non ci sta — l'EBITDA riportato e' PIU' " +
          "ALTO di quanto dovrebbe essere. Si TOGLIE: rettifica **negativa**.",
        `- **contributo pubblico one-off** (${eur(contributoPubblico)}): un provento non ricorrente, ` +
          "incassato una tantum e contabilizzato come provento operativo, che non si ripetera' negli anni " +
          "futuri. Come ogni provento one-off gia' visto in questo modulo, ha gonfiato l'EBITDA riportato: " +
          "si TOGLIE anche questo. Rettifica **negativa**.",
        '',
        "**Attenzione**: le due rettifiche hanno motivazioni diverse (una e' un costo nascosto, l'altra " +
          "un provento che non si ripetera') ma lo STESSO segno. Non compensarle tra loro: si sommano " +
          "entrambe con segno negativo, e la rettifica netta e' piu' grande di ciascuna delle due prese " +
          'singolarmente.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Capitalizzazione impropria di un costo'], { style: STILE_TITOLO }),
            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'EBITDA riportato (da bilancio), €',
                "Quota capitalizzata impropriamente quest'anno (avrebbe dovuto essere a CE), €",
                'Contributo pubblico one-off, contabilizzato come provento operativo, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_CAPITALIZZATO, content: capitalizzatoImpropriamente, style: STILE_INPUT, locked: true },
              { ref: B_CONTRIBUTO, content: contributoPubblico, style: STILE_INPUT, locked: true },
            ],

            riga('A8', ['Normalizzazione'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              ['Rettifica netta (entrambe le componenti tolte), €', 'EBITDA normalizzato, €'],
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
          `=-(${B_CAPITALIZZATO}+${B_CONTRIBUTO}): entrambe le voci hanno gonfiato l'EBITDA riportato, ` +
            "quindi entrambe si tolgono. Sommale prima, poi cambia segno all'intera somma — non sottrarre " +
            "l'una dall'altra.",
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_EBITDA_RIP}+${B_RETTIFICA}: la rettifica netta e' gia' negativa, quindi sommarla riduce ` +
            "l'EBITDA riportato.",
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: `Model!${B_RETTIFICA}`,
    };
  },
});
