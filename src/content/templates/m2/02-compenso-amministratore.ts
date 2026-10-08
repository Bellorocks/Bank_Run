/**
 * M2 · 02 — Compenso amministratore: una rettifica di parte correlata puo'
 * andare in ENTRAMBE le direzioni.
 *
 * Primo dei tre template sulle poste infragruppo/parti correlate del modulo
 * (compenso amministratore, affitti, costi personali — uno per template).
 * Riusa il pattern di m2/01 (EBITDA normalizzato = EBITDA riportato + Σ
 * rettifiche) ma lo mette alla prova sul punto piu' controintuitivo: il segno
 * di una rettifica di parte correlata NON e' sempre positivo.
 *
 * IL PUNTO DIDATTICO:
 *
 *   Rettifica (con segno) = compenso pagato all'amministratore/socio
 *                          - compenso "di mercato" per un ruolo equivalente
 *
 *   - se il socio si paga PIU' del mercato (compenso pagato > mercato), il
 *     sovra-compenso e' un costo gonfiato-ad-arte che ha sgonfiato l'EBITDA
 *     riportato: la rettifica e' POSITIVA, si riaggiunge (caso "intuitivo",
 *     identico nella forma a m2/01).
 *   - se il socio si paga MENO del mercato (compenso pagato < mercato),
 *     l'EBITDA riportato e' artificialmente GONFIATO da un costo del lavoro
 *     sotto-stimato: un compratore che dovra' assumere un manager vero,
 *     pagandolo al prezzo di mercato, deve vedere l'EBITDA RIDOTTO di
 *     conseguenza. La rettifica e' NEGATIVA (caso meno intuitivo, ma reale —
 *     tipico delle aziende familiari dove il fondatore si sotto-paga).
 *
 * In entrambi i casi la STESSA formula (pagato - mercato) produce il segno
 * corretto: non serve una formula diversa a seconda del caso, e il livello lo
 * dice esplicitamente per rompere l'abitudine "rettifica = sempre +".
 *
 * Circa meta' dei seed genera il caso sopra-mercato, meta' il caso
 * sotto-mercato (rng.bool(0.5) su uno stream dedicato): il brief e i prompt
 * si adattano al caso realmente generato, cosi' lo studente legge sempre la
 * spiegazione pertinente al proprio numero, non un testo generico.
 *
 * Geometria fissa: nessuna riga dipende dal seed (nessuno shuffle), quindi i
 * riferimenti di cella qui sotto sono letterali per costruzione.
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
const B_COMP_PAGATO = 'B5'; // Compenso pagato all'amministratore/socio (dato, bloccato)
const B_COMP_MERCATO = 'B6'; // Compenso "di mercato" per un ruolo equivalente (dato, bloccato)

const B_RETTIFICA = 'B9'; // T1: rettifica con segno
const B_EBITDA_NORM = 'B12'; // T2: EBITDA normalizzato

export default defineTemplate({
  id: 'M2-02-COMPENSOAMMINISTRATORE',
  module: 'M2',
  get title() {
    return tx('M2-02-COMPENSOAMMINISTRATORE.title');
  },
  rank: 1,
  mode: 'PRACTICE',
  estimatedSeconds: 200,
  skills: ['qoe.related-party'],
  prerequisites: ['M2-01-NORMALIZZAZIONE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBITDA "come riportato" in bilancio: un numero plausibile a scatti di 1.000.
    const ebitdaRiportato = r.int(800, 4000) * 1000;

    // Compenso "di mercato": il benchmark esterno per un ruolo equivalente in
    // un'azienda comparabile, a scatti di 1.000.
    const compensoMercato = r.int(80, 300) * 1000;

    // Circa meta' dei seed sopra mercato, meta' sotto: lo stream e' dedicato
    // cosi' la scelta non dipende dall'ordine delle altre estrazioni.
    const sopraMercato = r.bool(0.5);

    // Lo scostamento come frazione del compenso di mercato: mai cosi' grande
    // da rendere il compenso pagato irrealistico (max 70% del benchmark).
    const scostamentoFrazione = triangular(r, 0.1, 0.3, 0.7);
    const scostamento = roundTo(scostamentoFrazione * compensoMercato, 500);

    const compensoPagato = sopraMercato
      ? compensoMercato + scostamento
      : compensoMercato - scostamento;

    // La STESSA formula produce il segno giusto in entrambi i casi.
    const rettifica = compensoPagato - compensoMercato;
    const ebitdaNormalizzato = ebitdaRiportato + rettifica;

    const spiegazioneCaso = sopraMercato
      ? tx('M2-02-COMPENSOAMMINISTRATORE.2', { p0: eur(compensoPagato), p1: eur(compensoMercato), p2: eur(scostamento) })
      : tx('M2-02-COMPENSOAMMINISTRATORE.3', { p0: eur(compensoPagato), p1: eur(compensoMercato), p2: eur(scostamento) });

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M2-02-COMPENSOAMMINISTRATORE.4', { B_RETTIFICA, B_COMP_PAGATO, B_COMP_MERCATO, spiegazioneCaso }),
      target: `Model!${B_RETTIFICA}`,
      atteso: rettifica,
      referenzia: [B_COMP_PAGATO, B_COMP_MERCATO],
      senzaLiteral: [],
      skills: ['qoe.related-party'],
      minKeystrokes: 6,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M2-02-COMPENSOAMMINISTRATORE.5', { B_EBITDA_NORM, B_EBITDA_RIP, B_RETTIFICA }),
      target: `Model!${B_EBITDA_NORM}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, B_RETTIFICA],
      senzaLiteral: [],
      skills: ['qoe.related-party'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-02-COMPENSOAMMINISTRATORE',
      seed: rng.seed,
      brief: [tx('M2-02-COMPENSOAMMINISTRATORE.6', { p0: eur(ebitdaRiportato), spiegazioneCaso })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M2-02-COMPENSOAMMINISTRATORE.7')], { style: STILE_TITOLO }),
            riga('A3', [tx('M2-02-COMPENSOAMMINISTRATORE.8')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M2-02-COMPENSOAMMINISTRATORE.9'),
                tx('M2-02-COMPENSOAMMINISTRATORE.10'),
                tx('M2-02-COMPENSOAMMINISTRATORE.11'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_COMP_PAGATO, content: compensoPagato, style: STILE_INPUT, locked: true },
              { ref: B_COMP_MERCATO, content: compensoMercato, style: STILE_INPUT, locked: true },
            ],

            riga('A8', [tx('M2-02-COMPENSOAMMINISTRATORE.12')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [tx('M2-02-COMPENSOAMMINISTRATORE.13')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_RETTIFICA, content: null, locked: false, style: STILE_FORMULA }],

            riga('A11', [tx('M2-02-COMPENSOAMMINISTRATORE.17')], { style: STILE_TITOLO }),
            colonna(
              'A12',
              [tx('M2-02-COMPENSOAMMINISTRATORE.14')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EBITDA_NORM, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M2-02-COMPENSOAMMINISTRATORE.15', { B_COMP_PAGATO, B_COMP_MERCATO, p2: eur(rettifica) }),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M2-02-COMPENSOAMMINISTRATORE.16', { B_EBITDA_RIP, B_RETTIFICA }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: `Model!${B_RETTIFICA}`,
    };
  },
});
