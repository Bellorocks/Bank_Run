/**
 * M1 · 03 — Ratei e risconti: competenza economica vs manifestazione finanziaria.
 *
 * Due scenari, uno per direzione del disallineamento fra cassa e competenza:
 *  - SCENARIO 1 (risconto attivo): la cassa si e' gia' mossa (premio pagato per
 *    intero), ma una parte del costo appartiene all'esercizio SUCCESSIVO — va
 *    "rinviata" in avanti.
 *  - SCENARIO 2 (rateo passivo): la competenza e' gia' maturata (il servizio e'
 *    stato reso), ma la cassa non si e' ancora mossa (nessuna fattura ricevuta) —
 *    il costo va "riconosciuto" ora, per intero pro rata temporis.
 *
 * Le date sono SEMPRE costruite con `DATE(anno,mese,giorno)` dentro la formula
 * (classe di bug #4 del progetto), mai come stringa letterale. Il conteggio dei
 * giorni fra due date usa la sottrazione diretta fra celle-data (`=B7-B5`), che a
 * differenza di EDATE/EOMONTH e YEARFRAC in base 30/360 e' sicura per qualunque
 * giorno del mese — non serve confinare i giorni generati a 1-28 per la
 * sottrazione in se', ma lo si fa comunque qui perche' le date "calcolate" (fine
 * polizza, fine periodo di competenza) sono ottenute sommando mesi a una data di
 * partenza con la STESSA regola di EDATE (stesso giorno, mese+N): quell'addizione
 * si fa in JS al momento della generazione, e per restare corretta senza dover
 * riprodurre in JS l'overflow di fine mese di EDATE, il giorno generato resta
 * SEMPRE 1-28 (stesso accorgimento, stesso motivo, di M0F-09-FUNZIONIDATA).
 *
 * VINCOLO VERIFICATO NEL GENERATORE, non lasciato al caso: la polizza dello
 * scenario 1 attraversa SEMPRE il capodanno dell'anno di pagamento (altrimenti
 * non ci sarebbe alcun risconto). Lo si garantisce scegliendo la durata N in mesi
 * non da un range fisso 6-24, ma da [max(6, 13-mese), 24]: qualunque sia il mese
 * di inizio polizza, la durata minima ammessa e' sempre quella che porta la fine
 * polizza oltre il 31/12 dell'anno di partenza. Lo scenario 2 non ha bisogno
 * dello stesso accorgimento: un periodo di competenza di 12 mesi pieni che inizia
 * in un punto qualsiasi dell'anno finisce SEMPRE nell'anno successivo (nel caso
 * limite di inizio 1/1, finisce comunque un giorno dopo il 31/12), quindi il
 * rateo e' garantito strutturalmente, non per scelta di range.
 */

import { defineTemplate, blocco, colonna, foglio, hint, par, taskFormula, STILE_ETICHETTA, STILE_FORMULA, STILE_INPUT, STILE_TITOLO } from '../../authoring';
import { DEFAULT_FORMATS } from '../../../engine/numberFormat';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

import { contentNumberLocale, tx } from '../../../i18n/content';
const MS_PER_DAY = 86_400_000;

/** Giorni dal 30/12/1899 (epoca di Excel) — stessa funzione usata in M0F-09-FUNZIONIDATA. */
function serialeData(anno: number, mese: number, giorno: number): number {
  return Math.round((Date.UTC(anno, mese - 1, giorno) - Date.UTC(1899, 11, 30)) / MS_PER_DAY);
}

/** Somma `delta` mesi mantenendo lo stesso giorno: sicuro perche' il giorno e' sempre 1-28. */
function sommaMesi(anno: number, mese: number, giorno: number, delta: number): { anno: number; mese: number; giorno: number } {
  const meseIndice0 = mese - 1 + delta;
  return { anno: anno + Math.floor(meseIndice0 / 12), mese: (((meseIndice0 % 12) + 12) % 12) + 1, giorno };
}

const STILE_INPUT_DATA: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: DEFAULT_FORMATS.data };

export default defineTemplate({
  id: 'M1-03-RATEIRISCONTI',
  module: 'M1',
  get title() {
    return tx('M1-03-RATEIRISCONTI.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 320,
  skills: ['acc.accruals', 'xl.date-functions'],
  prerequisites: ['M1-01-SCHEMACEE'],

  generate: (rng) => {
    // --- Scenario 1: risconto attivo (cassa gia' mossa, competenza futura). --
    const r1 = rng.fork('risconto');
    const premio = r1.int(4, 36) * 500; // 2.000 - 18.000, step 500
    const anno1 = r1.int(2022, 2026);
    const mese1 = r1.int(1, 12);
    const giorno1 = r1.int(1, 28);
    const minMesiPolizza = Math.max(6, 13 - mese1); // garantisce l'attraversamento del capodanno
    const mesiPolizza = r1.int(minMesiPolizza, 24);
    const finePolizza = sommaMesi(anno1, mese1, giorno1, mesiPolizza);

    const serialeInizioPolizza = serialeData(anno1, mese1, giorno1);
    const serialeFinePolizza = serialeData(finePolizza.anno, finePolizza.mese, finePolizza.giorno);
    const serialeFineAnno1 = serialeData(anno1, 12, 31);

    const giorniTotaliPolizza = serialeFinePolizza - serialeInizioPolizza;
    const giorniCompetenzaFutura = serialeFinePolizza - serialeFineAnno1;
    const attesoRisconto = (premio * giorniCompetenzaFutura) / giorniTotaliPolizza;

    // --- Scenario 2: rateo passivo (competenza gia' maturata, cassa non ancora mossa). --
    const r2 = rng.fork('rateo');
    const costoAnnuo = r2.int(3, 24) * 500; // 1.500 - 12.000, step 500
    const anno2 = r2.int(2022, 2026);
    const mese2 = r2.int(1, 12);
    const giorno2 = r2.int(1, 28);
    const fineCompetenza = sommaMesi(anno2, mese2, giorno2, 12);

    const serialeInizioPrestazione = serialeData(anno2, mese2, giorno2);
    const serialeFineCompetenza = serialeData(fineCompetenza.anno, fineCompetenza.mese, fineCompetenza.giorno);
    const serialeFineAnno2 = serialeData(anno2, 12, 31);

    const giorniMaturati = serialeFineAnno2 - serialeInizioPrestazione;
    const giorniTotaliCompetenza = serialeFineCompetenza - serialeInizioPrestazione;
    const attesoRateo = (costoAnnuo * giorniMaturati) / giorniTotaliCompetenza;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M1-03-RATEIRISCONTI.2'),
      target: 'Model!B10',
      atteso: attesoRisconto,
      referenzia: ['B4', 'B5', 'B7', 'B8'],
      senzaLiteral: [],
      skills: ['acc.accruals', 'xl.date-functions'],
      minKeystrokes: 20,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M1-03-RATEIRISCONTI.3'),
      target: 'Model!B19',
      atteso: attesoRateo,
      referenzia: ['B14', 'B15', 'B16', 'B17'],
      senzaLiteral: [],
      skills: ['acc.accruals', 'xl.date-functions'],
      minKeystrokes: 20,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M1-03-RATEIRISCONTI',
      seed: rng.seed,
      brief: [tx('M1-03-RATEIRISCONTI.4', { giorno1, mese1, anno1, p3: premio.toLocaleString(contentNumberLocale()), mesiPolizza, giorno2, mese2, anno2, p8: costoAnnuo.toLocaleString(contentNumberLocale()) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            blocco('A1', [[tx('M1-03-RATEIRISCONTI.5')]], { style: STILE_TITOLO }),

            blocco('A3', [[tx('M1-03-RATEIRISCONTI.6')]], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M1-03-RATEIRISCONTI.7'),
                tx('M1-03-RATEIRISCONTI.8'),
                tx('M1-03-RATEIRISCONTI.9'),
                tx('M1-03-RATEIRISCONTI.10'),
                tx('M1-03-RATEIRISCONTI.11'),
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B4', [[premio]], { style: STILE_INPUT }),
            blocco('B5', [[`=DATE(${anno1},${mese1},${giorno1})`]], { style: STILE_INPUT_DATA }),
            blocco('B6', [[mesiPolizza]], { style: STILE_INPUT }),
            blocco('B7', [[`=DATE(${finePolizza.anno},${finePolizza.mese},${finePolizza.giorno})`]], { style: STILE_INPUT_DATA }),
            blocco('B8', [[`=DATE(${anno1},12,31)`]], { style: STILE_INPUT_DATA }),
            colonna('A10', [tx('M1-03-RATEIRISCONTI.12')], { style: STILE_ETICHETTA }),
            [{ ref: 'B10', content: null, locked: false, style: STILE_FORMULA }],

            blocco('A13', [[tx('M1-03-RATEIRISCONTI.13')]], { style: STILE_TITOLO }),
            colonna(
              'A14',
              [
                tx('M1-03-RATEIRISCONTI.14'),
                tx('M1-03-RATEIRISCONTI.15'),
                tx('M1-03-RATEIRISCONTI.16'),
                tx('M1-03-RATEIRISCONTI.17'),
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B14', [[costoAnnuo]], { style: STILE_INPUT }),
            blocco('B15', [[`=DATE(${anno2},${mese2},${giorno2})`]], { style: STILE_INPUT_DATA }),
            blocco('B16', [[`=DATE(${fineCompetenza.anno},${fineCompetenza.mese},${fineCompetenza.giorno})`]], { style: STILE_INPUT_DATA }),
            blocco('B17', [[`=DATE(${anno2},12,31)`]], { style: STILE_INPUT_DATA }),
            colonna('A19', [tx('M1-03-RATEIRISCONTI.18')], { style: STILE_ETICHETTA }),
            [{ ref: 'B19', content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 420, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M1-03-RATEIRISCONTI.19'), 10, 'T1'),
        hint('H2', tx('M1-03-RATEIRISCONTI.20'), 10, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: 'Model!B10',
    };
  },
});
