/**
 * M3 · 01 — Cos'e' il capitale circolante netto (NWC).
 *
 * Primo template del modulo M3 (Capitale circolante e cassa). In M1-07 la
 * variazione del Capitale Circolante Netto (ΔCCN) arrivava gia' come un unico
 * numero con segno, pronto per il Rendiconto Finanziario — una semplificazione
 * dichiarata esplicitamente in quel livello. Qui si comincia a smontarla: il
 * NWC (Net Working Capital, capitale circolante netto operativo) non arriva
 * piu' bell'e pronto, si COSTRUISCE da tre poste commerciali:
 *
 *   NWC operativo = Crediti commerciali + Rimanenze - Debiti commerciali
 *
 * SEMPLIFICAZIONE DICHIARATA (ripetuta nel brief): questa e' la definizione
 * OPERATIVA/commerciale del capitale circolante, non quella contabile
 * completa (che includerebbe anche ratei, risconti e altre attivita'/
 * passivita' correnti non commerciali). E' la definizione che si usa in
 * pratica quando si parla di "NWC" in un contesto M&A, ed e' quella su cui
 * si costruira' tutto il resto del modulo.
 *
 * Il livello genera le tre poste per due periodi — l'anno corrente e l'anno
 * precedente — e chiede di calcolare il NWC per entrambi, con la STESSA
 * formula applicata a dati diversi (T1 sull'anno corrente, T2 sull'anno
 * precedente). Non si calcola qui la differenza fra i due: e' apposta, serve
 * a preparare il livello successivo (nwc.cycle / M3-02), dove la ΔNWC fra
 * questi due periodi diventera' protagonista — con lo STESSO segno gia'
 * usato in M1-07 (un CCN che aumenta assorbe cassa, non lo si contraddice
 * qui, lo si ribadisce nel brief).
 *
 * Geometria fissa: nessuna riga dipende dal seed (a differenza di m1/01, qui
 * non c'e' alcuno shuffle di voci), quindi i riferimenti di cella sono
 * letterali per costruzione.
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
const B_CREDITI_CORR = 'B4'; // Crediti commerciali, anno corrente (dato, bloccato)
const B_RIMANENZE_CORR = 'B5'; // Rimanenze, anno corrente (dato, bloccato)
const B_DEBITI_CORR = 'B6'; // Debiti commerciali, anno corrente (dato, bloccato)
const B_NWC_CORR = 'B8'; // T1

const B_CREDITI_PREC = 'B12'; // Crediti commerciali, anno precedente (dato, bloccato)
const B_RIMANENZE_PREC = 'B13'; // Rimanenze, anno precedente (dato, bloccato)
const B_DEBITI_PREC = 'B14'; // Debiti commerciali, anno precedente (dato, bloccato)
const B_NWC_PREC = 'B16'; // T2

export default defineTemplate({
  id: 'M3-01-COSAENWC',
  module: 'M3',
  get title() {
    return tx('M3-01-COSAENWC.title');
  },
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 220,
  skills: ['nwc.cycle'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // --- Anno precedente: le tre poste di partenza. -----------------------
    const creditiPrec = r.int(400, 2500) * 1000;
    const rimanenzePrec = r.int(150, 1800) * 1000;
    const debitiPrec = r.int(300, 2200) * 1000;

    // --- Anno corrente: stesse tre poste, fatte "crescere" (o ridursi) da
    // quelle dell'anno precedente con un fattore indipendente per voce, cosi'
    // i due NWC non sono mai identici e la storia resta plausibile (un'unica
    // azienda vista in due anni, non due aziende scorrelate). Arrotondato a
    // multipli di 1.000 per restare leggibile come le altre poste del modulo.
    const fattoreCrescita = () => 0.8 + r.next() * 0.55; // 0,80x - 1,35x
    const creditiCorr = roundTo(creditiPrec * fattoreCrescita(), 1000);
    const rimanenzeCorr = roundTo(rimanenzePrec * fattoreCrescita(), 1000);
    const debitiCorr = roundTo(debitiPrec * fattoreCrescita(), 1000);

    const nwcCorr = creditiCorr + rimanenzeCorr - debitiCorr;
    const nwcPrec = creditiPrec + rimanenzePrec - debitiPrec;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M3-01-COSAENWC.2', { B_NWC_CORR, B_CREDITI_CORR, B_RIMANENZE_CORR, B_DEBITI_CORR }),
      target: `Model!${B_NWC_CORR}`,
      atteso: nwcCorr,
      referenzia: [B_CREDITI_CORR, B_RIMANENZE_CORR, B_DEBITI_CORR],
      senzaLiteral: [],
      skills: ['nwc.cycle'],
      minKeystrokes: 9,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M3-01-COSAENWC.3', { B_NWC_PREC, B_CREDITI_PREC, B_RIMANENZE_PREC, B_DEBITI_PREC }),
      target: `Model!${B_NWC_PREC}`,
      atteso: nwcPrec,
      referenzia: [B_CREDITI_PREC, B_RIMANENZE_PREC, B_DEBITI_PREC],
      senzaLiteral: [],
      skills: ['nwc.cycle'],
      minKeystrokes: 12,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M3-01-COSAENWC',
      seed: rng.seed,
      brief: [tx('M3-01-COSAENWC.4', { p0: eur(creditiCorr), p1: eur(rimanenzeCorr), p2: eur(debitiCorr), p3: eur(creditiPrec), p4: eur(rimanenzePrec), p5: eur(debitiPrec) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M3-01-COSAENWC.5')], { style: STILE_TITOLO }),

            riga('A3', [tx('M3-01-COSAENWC.6')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [tx('M3-01-COSAENWC.7'), tx('M3-01-COSAENWC.16'), tx('M3-01-COSAENWC.8')],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_CREDITI_CORR, content: creditiCorr, style: STILE_INPUT, locked: true },
              { ref: B_RIMANENZE_CORR, content: rimanenzeCorr, style: STILE_INPUT, locked: true },
              { ref: B_DEBITI_CORR, content: debitiCorr, style: STILE_INPUT, locked: true },
            ],
            [{ ref: 'A8', content: tx('M3-01-COSAENWC.9'), locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_NWC_CORR, content: null, locked: false, style: STILE_FORMULA }],

            riga('A11', [tx('M3-01-COSAENWC.10')], { style: STILE_TITOLO }),
            colonna(
              'A12',
              [tx('M3-01-COSAENWC.11'), tx('M3-01-COSAENWC.17'), tx('M3-01-COSAENWC.12')],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_CREDITI_PREC, content: creditiPrec, style: STILE_INPUT, locked: true },
              { ref: B_RIMANENZE_PREC, content: rimanenzePrec, style: STILE_INPUT, locked: true },
              { ref: B_DEBITI_PREC, content: debitiPrec, style: STILE_INPUT, locked: true },
            ],
            [{ ref: 'A16', content: tx('M3-01-COSAENWC.13'), locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_NWC_PREC, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 420, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M3-01-COSAENWC.14', { B_CREDITI_CORR, B_RIMANENZE_CORR, B_DEBITI_CORR }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M3-01-COSAENWC.15', { B_CREDITI_PREC, B_RIMANENZE_PREC, B_DEBITI_PREC }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_NWC_CORR}`,
    };
  },
});
