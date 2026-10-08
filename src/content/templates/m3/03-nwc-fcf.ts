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

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_NWC_APERTURA = 'B4'; // NWC di apertura del periodo (dato, bloccato)
const B_NWC_CHIUSURA = 'B5'; // NWC di chiusura del periodo (dato, bloccato)
const B_FLUSSO_LORDO = 'B6'; // Flusso di cassa operativo lordo, prima dell'effetto NWC (dato, bloccato)

const B_DNWC = 'B9'; // T1
const B_FLUSSO_NETTO = 'B10'; // T2

export default defineTemplate({
  id: 'M3-03-NWCEFCF',
  module: 'M3',
  title: "NWC e Free Cash Flow: l'effetto della variazione sulla cassa",
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
        `In ${B_DNWC} calcola la variazione del NWC (ΔNWC) nel periodo: NWC di chiusura ` +
        `(${B_NWC_CHIUSURA}) meno NWC di apertura (${B_NWC_APERTURA}). Attenzione all'ordine: chiusura ` +
        'meno apertura, non il contrario — e\' il segno che nel prossimo task decide se il NWC ha ' +
        'assorbito o liberato cassa.',
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
        `In ${B_FLUSSO_NETTO} calcola il flusso di cassa operativo NETTO dell'effetto NWC: flusso lordo ` +
        `(${B_FLUSSO_LORDO}) meno la ΔNWC appena calcolata (${B_DNWC}). E' esattamente lo stesso segno ` +
        "gia' usato in M1-07 per la ΔCCN: una ΔNWC POSITIVA significa che il NWC e' aumentato e ha " +
        'ASSORBITO cassa, quindi si sottrae dal flusso lordo. Una ΔNWC NEGATIVA significa che il NWC e\' ' +
        'diminuito e ha LIBERATO cassa: sottrarre un numero negativo la restituisce, e il flusso netto ' +
        "risulta piu' alto di quello lordo. Non e' un segno nuovo da imparare: e' lo stesso di sempre.",
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
      brief: [
        '## NWC e Free Cash Flow: la variazione che mangia (o libera) cassa',
        '',
        "In M1-07 la variazione del Capitale Circolante Netto (ΔCCN) arrivava gia' come un unico numero " +
          "con segno, pronto per essere sottratto nel flusso di cassa operativo — una semplificazione " +
          "dichiarata in quel livello. In M3-01 e M3-02 hai gia' imparato a costruire il NWC da crediti, " +
          "rimanenze e debiti commerciali, e a leggerlo in giorni con DSO/DIO/DPO: quella parte non si " +
          "ripete qui. Questo livello fa il passo che M1-07 dava per scontato: partire da un NWC di " +
          "APERTURA e uno di CHIUSURA del periodo, e costruire davvero la loro differenza.",
        '',
        '> **ΔNWC = NWC di chiusura − NWC di apertura**',
        '> **Flusso di cassa operativo, netto dell\'effetto NWC = Flusso lordo − ΔNWC**',
        '',
        "**Il segno, di nuovo, non e' nuovo.** Un NWC che AUMENTA durante il periodo ha ASSORBITO cassa: " +
          "l'azienda ha \"congelato\" piu' soldi in crediti e magazzino di quanti ne abbia liberati dai " +
          "debiti verso i fornitori — per questo la ΔNWC si SOTTRAE dal flusso lordo. Un NWC che DIMINUISCE " +
          "ha LIBERATO cassa: sottrarre una ΔNWC negativa la restituisce, e il flusso netto risulta piu' " +
          "alto di quello lordo. E' esattamente il segno gia' usato in M1-07 per la ΔCCN: qui lo dimostri " +
          "da capo, partendo da un livello di dettaglio in piu' a monte, invece di limitarti a citarlo.",
        '',
        `NWC di apertura del periodo: ${eur(nwcApertura)}. NWC di chiusura del periodo: ` +
          `${eur(nwcChiusura)}. Flusso di cassa operativo lordo dell'anno, PRIMA dell'effetto del NWC: ` +
          `${eur(flussoLordo)}.`,
        '',
        "Calcola prima la ΔNWC, poi usala per arrivare al flusso di cassa operativo netto dell'effetto " +
          'NWC. Due passi, un solo segno da rispettare per entrambi.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ["NWC e Free Cash Flow: l'effetto della variazione sulla cassa"], {
              style: STILE_TITOLO,
            }),

            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'NWC di apertura del periodo, €',
                'NWC di chiusura del periodo, €',
                "Flusso di cassa operativo lordo dell'anno (prima dell'effetto NWC), €",
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_NWC_APERTURA, content: nwcApertura, style: STILE_INPUT, locked: true },
              { ref: B_NWC_CHIUSURA, content: nwcChiusura, style: STILE_INPUT, locked: true },
              { ref: B_FLUSSO_LORDO, content: flussoLordo, style: STILE_INPUT, locked: true },
            ],

            riga('A8', ['Effetto del NWC sul flusso di cassa'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'Variazione del NWC nel periodo (ΔNWC), €',
                "Flusso di cassa operativo, netto dell'effetto NWC, €",
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
          `=${B_NWC_CHIUSURA}-${B_NWC_APERTURA}: NWC di chiusura meno NWC di apertura, in quest'ordine.`,
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_FLUSSO_LORDO}-${B_DNWC}: flusso lordo meno la ΔNWC. Se la ΔNWC e' negativa, sottrarla ` +
            'aumenta il flusso netto rispetto al lordo.',
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 65 }),
      startAt: `Model!${B_DNWC}`,
    };
  },
});
