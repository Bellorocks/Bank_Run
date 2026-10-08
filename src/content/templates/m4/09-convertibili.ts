/**
 * M4 · 09 — Bond convertibili: la diluizione condizionata, l'if-converted test.
 *
 * M4-08 ha insegnato il Treasury Stock Method sulle opzioni/warrant: quelle
 * diluiscono SEMPRE (finche' sono in the money), e la sola domanda e' di
 * quanto, al netto del riacquisto ipotetico finanziato dallo strike incassato.
 *
 * Il bond convertibile e' un altro animale. Non c'e' nessuno strike da
 * incassare e nessun riacquisto: il detentore ha in mano un titolo di debito
 * che puo' scegliere di convertire in azioni, oppure no. La domanda non e'
 * "quanta diluizione netta", e' "c'e' diluizione del tutto?" — una domanda
 * SI/NO che dipende da un solo confronto:
 *
 *   SI CONVERTE (e quindi si diluisce) SOLO SE il valore di mercato delle
 *   azioni ottenute dalla conversione supera il valore nominale del bond.
 *
 * Se conviene convertire, il detentore rinuncia al rimborso del nominale (e
 * alle cedole future) in cambio di azioni che valgono di piu': il bond esce
 * dal debito e diventa capitale, e le nuove azioni diluiscono gli azionisti
 * esistenti. Se NON conviene, il detentore tiene il bond fino a scadenza e
 * si fa rimborsare il nominale: resta debito, punto — zero diluizione, non
 * una diluizione "ridotta" come nel TSM. E' un evento binario, non un
 * aggiustamento continuo: da qui il bisogno di un IF, non di una formula.
 *
 * I TRE PASSI (i tre task di questo livello):
 *
 *   1. Azioni potenziali da conversione: quante azioni nascerebbero SE tutto
 *      il bond venisse convertito. E' un dato meccanico del regolamento del
 *      prestito — il rapporto di conversione (azioni per ogni €1.000 di
 *      nominale) e' fissato all'emissione, non dipende dal prezzo di mercato.
 *   2. Valore di mercato di quelle azioni, al prezzo CORRENTE dell'azione
 *      (non al prezzo di emissione, non al valore nominale del bond): e'
 *      il termine di paragone che decide se conviene convertire.
 *   3. Diluizione EFFETTIVA (if-converted test): SE il valore di mercato
 *      delle azioni supera il valore nominale del bond, il detentore
 *      converte e la diluizione e' pari alle azioni potenziali; ALTRIMENTI
 *      non converte, il bond resta debito, e la diluizione e' zero. Nessuna
 *      via di mezzo: o tutto (le azioni potenziali) o niente.
 *
 * VINCOLO SUL GENERATORE: il prezzo corrente per azione va generato intorno
 * al prezzo di conversione implicito (valore nominale / azioni potenziali)
 * in modo che circa META' dei seed risultino in the money (si converte) e
 * l'altra meta' out of the money (non si converte) — altrimenti l'IF del
 * giocatore verrebbe esercitato sempre nello stesso ramo e l'altro non
 * verrebbe mai messo alla prova. Il margine (8%-40% sopra la soglia se in
 * the money, 7%-40% sotto se out of the money) e un piccolo clamp di
 * sicurezza dopo l'arrotondamento a 0,50 garantiscono che l'esito NON cambi
 * per un effetto collaterale dell'arrotondamento del prezzo visualizzato.
 *
 * Geometria fissa: nessuna riga dipende dal seed (tre dati, tre task in
 * cascata), quindi i riferimenti sotto sono letterali per costruzione, come
 * in m4/07-treasury-stock.ts.
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
  num,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
// Stili locali: il prezzo corrente per azione va a due decimali (un formato
// non coperto da STILE_INPUT, che e' senza decimali), e il valore di mercato
// delle azioni da conversione (T2) puo' avere centesimi perche' e' un
// prodotto con un fattore a due decimali.
const STILE_INPUT_PREZZO: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0.00' };
const STILE_FORMULA_EURO: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0.00' };

// --- Geometria fissa: non dipende dal seed. --------------------------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3; // "Dati del bond convertibile"
const ROW_NOMINALE = 4;
const ROW_RAPPORTO = 5;
const ROW_PREZZO = 6;

const ROW_SEZ2 = 8; // "If-converted test"
const ROW_T1 = 9;
const ROW_T2 = 10;
const ROW_T3 = 11;

const B_NOMINALE = `B${ROW_NOMINALE}`;
const B_RAPPORTO = `B${ROW_RAPPORTO}`;
const B_PREZZO = `B${ROW_PREZZO}`;
const B_T1 = `B${ROW_T1}`;
const B_T2 = `B${ROW_T2}`;
const B_T3 = `B${ROW_T3}`;

export default defineTemplate({
  id: 'M4-09-CONVERTIBILI',
  module: 'M4',
  get title() {
    return tx('M4-09-CONVERTIBILI.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['ev.dilution'],
  prerequisites: ['M4-08-WARRANT'],

  generate: (rng) => {
    const rDati = rng.fork('dati');
    const rPrezzo = rng.fork('prezzo');

    // Valore nominale del bond convertibile (dato, bloccato): multiplo di
    // 1.000.000, cosi' che valoreNominale/1000 sia SEMPRE un intero esatto —
    // niente code binarie quando il giocatore scrive la formula del passo 1.
    const valoreNominale = rDati.int(5, 60) * 1_000_000;

    // Rapporto di conversione (dato, bloccato): azioni ricevute per ogni
    // €1.000 di nominale convertito. E' una clausola del regolamento del
    // prestito, fissata all'emissione — non dipende dal prezzo di mercato.
    const rapportoConversione = rDati.int(15, 45);

    const azioniPotenziali = (valoreNominale / 1000) * rapportoConversione;

    // Prezzo di conversione IMPLICITO: il prezzo per azione al quale il
    // valore di mercato delle azioni ottenute eguaglia esattamente il
    // nominale del bond. Non e' un dato scritto sul foglio (il giocatore non
    // lo vede come cella a se'): e' solo la soglia che usiamo qui per
    // pilotare in the money / out of the money.
    const prezzoConversione = valoreNominale / azioniPotenziali; // = 1000 / rapportoConversione

    // Circa meta' dei seed in the money, meta' out of the money: l'IF del
    // task 3 deve essere davvero messo alla prova in entrambe le direzioni.
    const inTheMoney = rPrezzo.bool();

    let prezzoCorrente: number;
    if (inTheMoney) {
      // 8%-40% sopra la soglia, moda al +18%: margine ampio, non un pareggio
      // appena percettibile.
      const fattore = triangular(rPrezzo, 1.08, 1.18, 1.4);
      prezzoCorrente = roundTo(prezzoConversione * fattore, 0.5);
      // Clamp di sicurezza: se l'arrotondamento a 0,50 avesse per assurdo
      // riportato il prezzo sotto la soglia (o esattamente sopra di poco),
      // lo spinge di un ulteriore mezzo euro sopra la soglia VERA (non
      // arrotondata), restando comunque sulla griglia da 0,50.
      if (prezzoCorrente <= prezzoConversione) prezzoCorrente += 0.5;
    } else {
      // 7%-40% sotto la soglia, moda al -18%: stesso margine, direzione
      // opposta.
      const fattore = triangular(rPrezzo, 0.6, 0.82, 0.93);
      prezzoCorrente = roundTo(prezzoConversione * fattore, 0.5);
      if (prezzoCorrente >= prezzoConversione) prezzoCorrente -= 0.5;
    }

    const valoreMercatoConversione = azioniPotenziali * prezzoCorrente; // T2
    const diluizioneEffettiva = valoreMercatoConversione > valoreNominale ? azioniPotenziali : 0; // T3

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M4-09-CONVERTIBILI.2', { B_T1, B_RAPPORTO, B_NOMINALE }),
      target: `Model!${B_T1}`,
      atteso: azioniPotenziali,
      referenzia: [B_NOMINALE, B_RAPPORTO],
      senzaLiteral: [1000],
      skills: ['ev.dilution'],
      minKeystrokes: 15,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M4-09-CONVERTIBILI.3', { B_T2, B_T1, B_PREZZO }),
      target: `Model!${B_T2}`,
      atteso: valoreMercatoConversione,
      referenzia: [B_T1, B_PREZZO],
      senzaLiteral: [],
      skills: ['ev.dilution'],
      minKeystrokes: 6,
    });

    const t3: Task = {
      id: 'T3',
      prompt:
        tx('M4-09-CONVERTIBILI.4', { B_T3, B_T2, B_NOMINALE, B_T1 }),
      targetCell: `Model!${B_T3}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: diluizioneEffettiva },
        { kind: 'mustReference', cells: [B_T1, B_T2, B_NOMINALE] },
        { kind: 'mustUseFunction', functions: ['IF'] },
        { kind: 'mustNotContainLiteral', except: [0] },
      ],
      skills: ['ev.dilution'],
      minKeystrokes: 18,
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M4-09-CONVERTIBILI',
      seed: rng.seed,
      brief: [tx('M4-09-CONVERTIBILI.5', { p0: eur(valoreNominale), p1: num(rapportoConversione), p2: eur(prezzoCorrente, 2) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M4-09-CONVERTIBILI.6')], { style: STILE_TITOLO }),

            riga(`A${ROW_SEZ1}`, [tx('M4-09-CONVERTIBILI.7')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_NOMINALE}`,
              [
                tx('M4-09-CONVERTIBILI.8'),
                tx('M4-09-CONVERTIBILI.9'),
                tx('M4-09-CONVERTIBILI.10'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_NOMINALE, content: valoreNominale, style: STILE_INPUT, locked: true }],
            [{ ref: B_RAPPORTO, content: rapportoConversione, style: STILE_INPUT, locked: true }],
            [{ ref: B_PREZZO, content: prezzoCorrente, style: STILE_INPUT_PREZZO, locked: true }],

            riga(`A${ROW_SEZ2}`, [tx('M4-09-CONVERTIBILI.11')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_T1}`,
              [
                tx('M4-09-CONVERTIBILI.12'),
                tx('M4-09-CONVERTIBILI.13'),
                tx('M4-09-CONVERTIBILI.14'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_T1, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_T2, content: null, locked: false, style: STILE_FORMULA_EURO }],
            [{ ref: B_T3, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 460, B: 150 }, frozenRows: ROW_SEZ1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M4-09-CONVERTIBILI.15', { B_NOMINALE, B_RAPPORTO }),
          12,
          'T1',
        ),
        hint(
          'H2',
          tx('M4-09-CONVERTIBILI.16', { B_T1, B_PREZZO }),
          10,
          'T2',
        ),
        hint(
          'H3',
          tx('M4-09-CONVERTIBILI.17', { B_T2, B_NOMINALE, B_T1 }),
          14,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 150 }),
      startAt: `Model!${B_T1}`,
    };
  },
});
