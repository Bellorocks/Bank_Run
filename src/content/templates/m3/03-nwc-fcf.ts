/**
 * M3 · 03 — NWC e Free Cash Flow: l'effetto della variazione sulla cassa.
 *
 * In M1-07 la variazione del Capitale Circolante Netto (ΔCCN) arrivava gia'
 * come un unico numero con segno, pronto per essere sottratto nel flusso di
 * cassa operativo — una semplificazione dichiarata esplicitamente in quel
 * livello. In M3-01 e M3-02 il NWC e' stato smontato e rimontato piu' volte
 * (dalle tre poste commerciali, poi in giorni con DSO/DIO/DPO): quella parte
 * e' gia' acquisita (skill nwc.cycle), non si ripete qui.
 *
 * Questo livello fa il passo che M1-07 dava per scontato: PARTE da un NWC di
 * apertura e uno di chiusura (dati, bloccati — costruirli da crediti/
 * rimanenze/debiti e' gia' stato esercitato nei due livelli precedenti) e
 * COSTRUISCE davvero la ΔNWC, poi la applica a un flusso di cassa operativo
 * "lordo" per arrivare al flusso operativo netto dell'effetto NWC. E' lo
 * stesso identico segno di M1-07: qui semplicemente lo si dimostra da capo,
 * partendo da un livello di dettaglio in piu' a monte (due NWC, non un delta
 * gia' pronto), invece di limitarsi a citarlo.
 *
 *   ΔNWC = NWC di chiusura - NWC di apertura
 *   Flusso di cassa operativo, netto dell'effetto NWC = Flusso lordo - ΔNWC
 *
 * CONVENZIONE DI SEGNO (identica a M1-07, ribadita qui, non reinventata):
 *   - ΔNWC positiva = il NWC e' AUMENTATO, ha ASSORBITO cassa (si sottrae).
 *   - ΔNWC negativa = il NWC e' DIMINUITO, ha LIBERATO cassa (sottrarre un
 *     negativo la restituisce, cioe' il flusso netto sale sopra il lordo).
 *
 * Geometria fissa: nessuna riga dipende dal seed (nessuno shuffle di voci),
 * quindi i riferimenti di cella sono letterali per costruzione, come in
 * M3-01 e M3-02.
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
import { roundTo } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_NWC_APERTURA = 'B4'; // NWC di apertura del periodo (dato, bloccato)
const B_NWC_CHIUSURA = 'B5'; // NWC di chiusura del periodo (dato, bloccato)
const B_FLUSSO_LORDO = 'B6'; // Flusso di cassa operativo lordo, prima dell'effetto NWC (dato, bloccato)

const B_DNWC = 'B9'; // T1
const B_FLUSSO_NETTO = 'B10'; // T2

export default defineTemplate({
  id: 'M3-03-NWCEFCF',
  module: 'M3',
  get title() {
    return tx('M3-03-NWCEFCF.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['nwc.fcf-impact'],
  prerequisites: ['M3-02-DSODIODPO'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // NWC di apertura: un valore plausibile per una PMI/mid-cap, in migliaia.
    const nwcApertura = r.int(400, 2500) * 1000;

    // NWC di chiusura: fatto crescere (o ridursi) rispetto all'apertura con un
    // fattore indipendente, cosi' la ΔNWC risultante non ha un segno fisso fra
    // un seed e l'altro — a volte assorbe cassa, a volte ne libera, esattamente
    // come succede in un modello vero. Arrotondato a multipli di 1.000.
    const fattoreCrescita = 0.75 + r.next() * 0.65; // 0,75x - 1,40x
    const nwcChiusura = roundTo(nwcApertura * fattoreCrescita, 1000);

    // Flusso di cassa operativo lordo, prima dell'effetto NWC: generato con un
    // proprio range indipendente, abbastanza ampio da restare positivo (o
    // comunque plausibile) anche quando la ΔNWC assorbe una fetta di cassa.
    const flussoLordo = r.int(800, 6000) * 1000;

    // Valori attesi, calcolati con la STESSA algebra dei due task.
    const deltaNWC = nwcChiusura - nwcApertura;
    const flussoNetto = flussoLordo - deltaNWC;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M3-03-NWCEFCF.2', { B_DNWC, B_NWC_CHIUSURA, B_NWC_APERTURA }),
      target: `Model!${B_DNWC}`,
      atteso: deltaNWC,
      referenzia: [B_NWC_APERTURA, B_NWC_CHIUSURA],
      senzaLiteral: [],
      skills: ['nwc.fcf-impact'],
      minKeystrokes: 9,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M3-03-NWCEFCF.3', { B_FLUSSO_NETTO, B_FLUSSO_LORDO, B_DNWC }),
      target: `Model!${B_FLUSSO_NETTO}`,
      atteso: flussoNetto,
      referenzia: [B_FLUSSO_LORDO, B_DNWC],
      senzaLiteral: [],
      skills: ['nwc.fcf-impact'],
      minKeystrokes: 7,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M3-03-NWCEFCF',
      seed: rng.seed,
      brief: [tx('M3-03-NWCEFCF.4', { p0: eur(nwcApertura), p1: eur(nwcChiusura), p2: eur(flussoLordo) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M3-03-NWCEFCF.5')], {
              style: STILE_TITOLO,
            }),

            riga('A3', [tx('M3-03-NWCEFCF.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M3-03-NWCEFCF.7'),
                tx('M3-03-NWCEFCF.8'),
                tx('M3-03-NWCEFCF.9'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_NWC_APERTURA, content: nwcApertura, style: STILE_INPUT, locked: true },
              { ref: B_NWC_CHIUSURA, content: nwcChiusura, style: STILE_INPUT, locked: true },
              { ref: B_FLUSSO_LORDO, content: flussoLordo, style: STILE_INPUT, locked: true },
            ],

            riga('A8', [tx('M3-03-NWCEFCF.10')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M3-03-NWCEFCF.11'),
                tx('M3-03-NWCEFCF.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_DNWC, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_FLUSSO_NETTO, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M3-03-NWCEFCF.13', { B_NWC_CHIUSURA, B_NWC_APERTURA }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M3-03-NWCEFCF.14', { B_FLUSSO_LORDO, B_DNWC }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 65 }),
      startAt: `Model!${B_DNWC}`,
    };
  },
});
