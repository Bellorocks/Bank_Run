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

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBITDA_RIP = 'B4'; // EBITDA riportato (dato, bloccato)
const B_COMP_PAGATO = 'B5'; // Compenso pagato all'amministratore/socio (dato, bloccato)
const B_COMP_MERCATO = 'B6'; // Compenso "di mercato" per un ruolo equivalente (dato, bloccato)

const B_RETTIFICA = 'B9'; // T1: rettifica con segno
const B_EBITDA_NORM = 'B12'; // T2: EBITDA normalizzato

export default defineTemplate({
  id: 'M2-02-COMPENSOAMMINISTRATORE',
  module: 'M2',
  title: "Compenso amministratore: la rettifica cambia segno",
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
      ? `In questo caso il socio SI PAGA PIU' del mercato (${eur(compensoPagato)} contro un benchmark di ` +
        `${eur(compensoMercato)}): il sovra-compenso di ${eur(scostamento)} e' un costo gonfiato che ha ` +
        "sgonfiato l'EBITDA riportato. Si RIAGGIUNGE: rettifica POSITIVA."
      : `In questo caso il socio SI PAGA MENO del mercato (${eur(compensoPagato)} contro un benchmark di ` +
        `${eur(compensoMercato)}): il costo del lavoro e' sotto-stimato di ${eur(scostamento)}, e questo ha ` +
        "GONFIATO artificialmente l'EBITDA riportato. Un compratore dovra' assumere un manager vero pagandolo " +
        "al prezzo di mercato: l'EBITDA va RIDOTTO di conseguenza. Rettifica NEGATIVA.";

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_RETTIFICA} calcola la rettifica CON SEGNO per il compenso amministratore: compenso pagato ` +
        `(${B_COMP_PAGATO}) meno compenso di mercato (${B_COMP_MERCATO}). ${spiegazioneCaso} Nota bene: la ` +
        "formula e' sempre la stessa (pagato meno mercato) — e' il segno del RISULTATO a cambiare a seconda " +
        "di chi si sotto- o sovra-paga, non la formula.",
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
        `In ${B_EBITDA_NORM} calcola l'EBITDA normalizzato: l'EBITDA riportato (${B_EBITDA_RIP}) piu' la ` +
        `rettifica appena calcolata (${B_RETTIFICA}). Riusa il risultato di ${B_RETTIFICA} cosi' com'e' — con ` +
        "il suo segno, positivo o negativo che sia — non ricalcolare la differenza da capo.",
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
      brief: [
        '## Una rettifica di parte correlata puo\' andare in entrambe le direzioni',
        '',
        "Il compenso pagato all'amministratore/socio e' la prima posta che un QoE controlla: e' una " +
          "spesa di parte correlata, decisa da chi controlla l'azienda, non dal mercato. Il confronto " +
          "e' sempre con un **compenso di mercato**: quanto costerebbe assumere un manager esterno per " +
          "lo stesso ruolo.",
        '',
        "La rettifica ha SEMPRE la stessa formula — compenso pagato meno compenso di mercato — ma il " +
          "SEGNO del risultato dipende da chi si sotto- o sovra-paga, e va capito prima di scriverla:",
        '',
        "- se il compenso pagato e' SOPRA il mercato, il sovra-compenso ha gonfiato i costi (quindi " +
          "sgonfiato l'EBITDA riportato): si RIAGGIUNGE, rettifica **positiva**.",
        "- se il compenso pagato e' SOTTO il mercato, il costo del lavoro e' sotto-stimato e ha GONFIATO " +
          "l'EBITDA riportato: un compratore dovra' pagare un manager vero al prezzo di mercato, quindi " +
          "l'EBITDA va RIDOTTO. Rettifica **negativa** — e' il caso meno intuitivo, tipico delle aziende " +
          "familiari dove il fondatore si sotto-paga, ma altrettanto reale del primo.",
        '',
        `L'EBITDA riportato di questa azienda e' ${eur(ebitdaRiportato)}. ${spiegazioneCaso}`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ["Compenso amministratore: rettifica di parte correlata"], { style: STILE_TITOLO }),
            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'EBITDA riportato (da bilancio), €',
                "Compenso pagato all'amministratore/socio, €",
                'Compenso "di mercato" per un ruolo equivalente (benchmark esterno), €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_COMP_PAGATO, content: compensoPagato, style: STILE_INPUT, locked: true },
              { ref: B_COMP_MERCATO, content: compensoMercato, style: STILE_INPUT, locked: true },
            ],

            riga('A8', ['Rettifica di parte correlata'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              ['Rettifica compenso amministratore (con segno), €'],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_RETTIFICA, content: null, locked: false, style: STILE_FORMULA }],

            riga('A11', ['Normalizzazione'], { style: STILE_TITOLO }),
            colonna(
              'A12',
              ['EBITDA normalizzato, €'],
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
          `=${B_COMP_PAGATO}-${B_COMP_MERCATO}: compenso pagato meno compenso di mercato. Il segno del ` +
            `risultato (qui ${eur(rettifica)}) ti dice da solo se e' un addback o una riduzione: non ` +
            "deciderlo tu a priori, lascia che sia la formula a determinarlo.",
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_EBITDA_RIP}+${B_RETTIFICA}: EBITDA riportato piu' la rettifica gia' calcolata, con il suo ` +
            "segno. Se la rettifica e' negativa, sommarla la sottrae automaticamente.",
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: `Model!${B_RETTIFICA}`,
    };
  },
});
