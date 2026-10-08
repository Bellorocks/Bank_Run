/**
 * M4 · 07 — Treasury Stock Method: la diluizione netta da opzioni "in the money".
 *
 *   Equity Value = Enterprise Value - Net Debt (base) - Σ debt-like items +
 *                  Σ cash-like items - Minorities + Partecipazioni non consolidate
 *
 * Questo livello lascia il bridge per un attimo e affronta il pezzo successivo
 * della catena: quante azioni ci sono davvero, per passare da Equity Value a
 * Prezzo per azione. Le opzioni su azioni assegnate ai dipendenti (stock
 * option plan) sono un caso classico di diluizione POTENZIALE: se il prezzo
 * corrente dell'azione e' sopra lo strike price (l'opzione e' "in the money"),
 * i detentori hanno convenienza a esercitarle, e l'azienda deve emettere nuove
 * azioni per loro. Ma trattare l'intero numero di opzioni come nuove azioni
 * pure e semplici sovrastima la diluizione: e' qui che entra il Treasury
 * Stock Method (TSM).
 *
 * LA LOGICA DEL TSM, IN TRE PASSI (i tre task di questo livello):
 *
 *   1. Se tutte le opzioni in the money venissero esercitate, l'azienda
 *      incasserebbe un provento ipotetico: numero opzioni × strike price.
 *      Questo e' denaro vero che entra in cassa, non un dettaglio contabile —
 *      e' il prezzo che ciascun detentore paga per ricevere l'azione.
 *   2. Il TSM assume — per convenzione, non perche' l'azienda lo faccia
 *      davvero ogni volta — che quel provento venga IMMEDIATAMENTE
 *      reimpiegato per riacquistare azioni proprie sul mercato aperto, al
 *      prezzo CORRENTE dell'azione (non allo strike price: sul mercato si
 *      paga il prezzo di mercato). Il numero di azioni riacquistabili e'
 *      quindi provento ipotetico / prezzo corrente.
 *   3. La diluizione NETTA e' il numero di opzioni esercitate meno le azioni
 *      che il riacquisto "assorbe": una parte delle nuove azioni emesse viene
 *      compensata dal riacquisto, quindi la diluizione netta e' SEMPRE minore
 *      del numero lordo di opzioni. Non e' un'approssimazione che puo' andare
 *      in un senso o nell'altro: finche' lo strike price e' positivo (e per
 *      costruzione un'opzione "in the money" ha sempre strike < prezzo
 *      corrente, quindi le azioni riacquistabili sono sempre un numero
 *      positivo minore del numero di opzioni), il TSM produce SEMPRE una
 *      diluizione netta strettamente minore del numero lordo di opzioni.
 *      Solo nel caso limite di uno strike pari a zero la diluizione netta
 *      coinciderebbe col numero lordo (il "riacquisto" varrebbe zero azioni,
 *      perche' non ci sarebbe alcun provento da reimpiegare) — un caso che
 *      questo livello esclude sempre per costruzione, perche' un'opzione con
 *      strike zero non ha piu' nulla da insegnare sul metodo.
 *
 * VINCOLO SUL GENERATORE: lo strike price deve SEMPRE essere strettamente
 * minore del prezzo corrente (altrimenti l'opzione non sarebbe "in the
 * money" e l'intero esercizio non avrebbe senso economico: nessuno esercita
 * un'opzione per pagare piu' di quanto valga l'azione sul mercato). Lo strike
 * e' generato come frazione del prezzo corrente (30%-80%), mai come valore
 * indipendente: cosi' l'ordine e' garantito per costruzione, non verificato
 * a posteriori.
 *
 * Geometria: fissa, non dipende dal seed (nessuna tabella a righe variabili
 * in questo livello), ma tutti i riferimenti sono comunque scritti come
 * variabili derivate dalle costanti di riga, mai come letterali sparsi nel
 * codice.
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
  STILE_TITOLO,
  eur,
  num,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

// Stili locali: i valori di questo livello sono prezzi per azione (due
// decimali) e conteggi di azioni potenzialmente frazionari (il TSM non
// arrotonda le azioni riacquistabili a un intero — e' un modello, non un
// ordine di borsa reale), formati non coperti dagli stili pronti.
const STILE_INPUT_PREZZO: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0.00' };
const STILE_INPUT_CONTEGGIO: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0' };
const STILE_FORMULA_EURO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0' };
const STILE_FORMULA_AZIONI: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0.0' };
const STILE_TOTALE_AZIONI: CellStyle = {
  fontColor: MODEL_COLORS.formula,
  bold: true,
  numFmt: '#,##0.0',
  borders: { top: { style: 'thin' } },
};

// --- Geometria fissa: non dipende dal seed. --------------------------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3; // "Dati di base"
const ROW_PREZZO = 4;
const ROW_OPZIONI = 5;
const ROW_STRIKE = 6;

const ROW_SEZ2 = 8; // "Treasury Stock Method"
const ROW_T1 = 9;
const ROW_T2 = 10;
const ROW_T3 = 11;

const B_PREZZO = `B${ROW_PREZZO}`;
const B_OPZIONI = `B${ROW_OPZIONI}`;
const B_STRIKE = `B${ROW_STRIKE}`;
const B_T1 = `B${ROW_T1}`;
const B_T2 = `B${ROW_T2}`;
const B_T3 = `B${ROW_T3}`;

export default defineTemplate({
  id: 'M4-07-TREASURYSTOCK',
  module: 'M4',
  title: 'Treasury Stock Method: la diluizione netta da opzioni',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['ev.options'],
  prerequisites: ['M4-05-BRIDGECOMPLETO'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Prezzo corrente per azione (dato, bloccato): tipico range small/mid-cap.
    const prezzoCorrente = roundTo(triangular(r, 8, 22, 60), 0.5);

    // Strike price come FRAZIONE del prezzo corrente (30%-80%): garantisce
    // per costruzione strike < prezzo corrente, mai verificato a posteriori.
    // Il margine (max 80%, mai 100%) lascia sempre almeno il 20% di "sconto"
    // implicito, cosi' l'opzione e' inequivocabilmente in the money anche
    // dopo l'arrotondamento a 0,50 sotto.
    const fracStrike = triangular(r, 0.3, 0.5, 0.8);
    let strikePrice = roundTo(prezzoCorrente * fracStrike, 0.5);
    // Clamp di sicurezza: anche nel caso limite in cui l'arrotondamento
    // porti lo strike a toccare il prezzo corrente, lo strike resta
    // strettamente sotto (mai un'opzione "at the money" o "out of the
    // money" in questo livello).
    strikePrice = Math.min(strikePrice, prezzoCorrente - 0.5);

    // Numero di opzioni in the money (dato, bloccato): un pacchetto tipico
    // di stock option plan, in centinaia di migliaia.
    const numeroOpzioni = r.int(200, 2000) * 1000;

    const proventiIpotetici = numeroOpzioni * strikePrice;
    const azioniRiacquistabili = proventiIpotetici / prezzoCorrente;
    const diluizioneNetta = numeroOpzioni - azioniRiacquistabili;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_T1} calcola i proventi ipotetici da esercizio: se tutti i detentori esercitassero le ` +
        `loro opzioni in the money (${B_OPZIONI}), pagherebbero all'azienda lo strike price (${B_STRIKE}) ` +
        "per ciascuna azione ricevuta. Il provento ipotetico e' quindi numero opzioni moltiplicato per " +
        "strike price: denaro vero che entrerebbe in cassa, non un dettaglio contabile — e' il punto di " +
        'partenza dell\'intero Treasury Stock Method.',
      target: `Model!${B_T1}`,
      atteso: proventiIpotetici,
      referenzia: [B_OPZIONI, B_STRIKE],
      senzaLiteral: [],
      skills: ['ev.options'],
      minKeystrokes: 8,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_T2} calcola quante azioni l'azienda potrebbe riacquistare sul mercato aperto usando ` +
        `esattamente i proventi ipotetici appena calcolati (${B_T1}). Il Treasury Stock Method assume che ` +
        "quel denaro venga reimpiegato SUBITO per riacquistare azioni proprie AL PREZZO CORRENTE " +
        `(${B_PREZZO}) — non allo strike price: sul mercato aperto si paga il prezzo di mercato, non lo ` +
        "sconto che aveva il detentore dell'opzione. Le azioni riacquistabili sono quindi il provento " +
        'ipotetico diviso il prezzo corrente.',
      target: `Model!${B_T2}`,
      atteso: azioniRiacquistabili,
      referenzia: [B_T1, B_PREZZO],
      senzaLiteral: [],
      skills: ['ev.options'],
      minKeystrokes: 6,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In ${B_T3} chiudi il Treasury Stock Method e calcola la diluizione NETTA: il numero di opzioni ` +
        `esercitate (${B_OPZIONI}) meno le azioni che il riacquisto ipotetico appena calcolato "assorbe" ` +
        `(${B_T2}). Il risultato e' il numero di azioni NUOVE che restano davvero in circolazione dopo ` +
        "il riacquisto — ed e' SEMPRE minore del numero lordo di opzioni: parte delle azioni emesse per " +
        "l'esercizio viene compensata dal riacquisto finanziato dallo stesso esercizio. Solo se lo strike " +
        "price fosse zero il riacquisto varrebbe zero azioni e la diluizione netta coinciderebbe col " +
        "numero lordo; qui lo strike e' sempre positivo (e sempre sotto il prezzo corrente, altrimenti " +
        "l'opzione non sarebbe in the money), quindi la diluizione netta e' sempre strettamente inferiore " +
        'al numero di opzioni di partenza.',
      target: `Model!${B_T3}`,
      atteso: diluizioneNetta,
      referenzia: [B_OPZIONI, B_T2],
      senzaLiteral: [],
      skills: ['ev.options'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M4-07-TREASURYSTOCK',
      seed: rng.seed,
      brief: [
        '## Treasury Stock Method: la diluizione netta da opzioni',
        '',
        "Per passare da Equity Value a Prezzo per azione serve il numero di azioni fully diluted — non " +
          "solo quelle gia' in circolazione, ma anche quelle che potrebbero nascere dall'esercizio di " +
          'opzioni assegnate ai dipendenti. Un\'opzione e\' **"in the money"** quando lo strike price ' +
          "(il prezzo a cui il detentore puo' comprare l'azione) e' SOTTO il prezzo corrente di mercato: " +
          "in quel caso conviene esercitarla, e l'azienda deve emettere una nuova azione per ciascuna " +
          'opzione esercitata.',
        '',
        "Trattare l'intero numero di opzioni come nuove azioni pure e semplici, pero', sovrastima la " +
          "diluizione: il **Treasury Stock Method (TSM)** corregge il conto assumendo che il denaro " +
          "incassato dall'esercizio venga subito reimpiegato per riacquistare azioni proprie sul mercato, " +
          "riducendo la diluizione netta:",
        '',
        '1. **Proventi ipotetici** = numero opzioni × strike price — il denaro che entrerebbe in cassa se ' +
          'tutte venissero esercitate.',
        "2. **Azioni riacquistabili** = proventi ipotetici / prezzo CORRENTE dell'azione — quante azioni " +
          "quel denaro puo' comprare sul mercato aperto (al prezzo di mercato, non allo strike).",
        '3. **Diluizione netta** = numero opzioni - azioni riacquistabili — le nuove azioni che restano ' +
          'davvero in circolazione dopo il riacquisto.',
        '',
        `Il prezzo corrente per azione, gia' dato, e' ${eur(prezzoCorrente, 2)}; le opzioni in the money ` +
          `sono ${num(numeroOpzioni)}, con uno strike price di ${eur(strikePrice, 2)} — sempre sotto il ` +
          "prezzo corrente, altrimenti l'opzione non sarebbe in the money e nessuno la eserciterebbe. " +
          'Segui i tre passi in cascata: proventi ipotetici, azioni riacquistabili, diluizione netta.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, ['Treasury Stock Method: la diluizione netta da opzioni'], {
              style: STILE_TITOLO,
            }),

            riga(`A${ROW_SEZ1}`, ['Dati di base'], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_PREZZO}`,
              ['Prezzo corrente per azione, €', 'Numero opzioni in the money', 'Strike price, €'],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_PREZZO, content: prezzoCorrente, style: STILE_INPUT_PREZZO, locked: true }],
            [{ ref: B_OPZIONI, content: numeroOpzioni, style: STILE_INPUT_CONTEGGIO, locked: true }],
            [{ ref: B_STRIKE, content: strikePrice, style: STILE_INPUT_PREZZO, locked: true }],

            riga(`A${ROW_SEZ2}`, ['Treasury Stock Method'], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_T1}`,
              [
                'Proventi ipotetici da esercizio, €',
                'Azioni riacquistabili al prezzo corrente',
                'Diluizione netta (TSM)',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_T1, content: null, locked: false, style: STILE_FORMULA_EURO }],
            [{ ref: B_T2, content: null, locked: false, style: STILE_FORMULA_AZIONI }],
            [{ ref: B_T3, content: null, locked: false, style: STILE_TOTALE_AZIONI }],
          ],
          { colWidths: { A: 440, B: 150 }, frozenRows: ROW_SEZ1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_OPZIONI}*${B_STRIKE}: numero opzioni moltiplicato per lo strike price.`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_T1}/${B_PREZZO}: proventi ipotetici divisi per il prezzo corrente dell'azione.`,
          10,
          'T2',
        ),
        hint(
          'H3',
          `=${B_OPZIONI}-${B_T2}: numero di opzioni meno le azioni riacquistabili appena calcolate.`,
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_T1}`,
    };
  },
});
