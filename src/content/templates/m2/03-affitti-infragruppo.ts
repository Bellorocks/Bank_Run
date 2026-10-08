/**
 * M2 · 03 — Affitto infragruppo sopra mercato: seconda poste correlata.
 *
 * Secondo template della skill "poste infragruppo" (qoe.related-party): stesso
 * pattern di M2-02 (compenso amministratore fuori mercato), scenario diverso —
 * un canone di affitto pagato a una parte correlata invece di un compenso. Chi
 * ha gia' visto M2-02 deve riconoscere la STRUTTURA del ragionamento (un costo
 * pagato a una parte correlata, confrontato con un benchmark di mercato, e
 * rettificato per la differenza), non ripetere lo stesso testo con nomi diversi.
 *
 * A differenza di M2-02 — che mette alla prova ENTRAMBE le direzioni del segno
 * (sopra e sotto mercato) — qui lo scenario resta in UNA sola direzione: il
 * canone pagato e' sempre sopra il canone di mercato. La doppia direzione l'ha
 * gia' insegnata M2-02; qui l'obiettivo e' consolidare il pattern su un secondo
 * caso reale, non ripetere la lezione sul segno.
 *
 * Scenario: l'azienda opera in un immobile di proprieta' di una societa'
 * immobiliare della stessa famiglia proprietaria (parte correlata) e le paga un
 * canone annuo. Un canone di mercato per un immobile equivalente nella stessa
 * zona (benchmark indipendente) e' piu' basso: l'azienda sta pagando un
 * sovrapprezzo alla parte correlata, che si scarica interamente sui costi e
 * quindi sgonfia l'EBITDA riportato. E' un costo non di mercato: si RIAGGIUNGE,
 * rettifica positiva — esattamente come un costo one-off, anche se qui la causa
 * non e' l'eccezionalita' dell'evento ma il fatto che il prezzo pagato non e'
 * un prezzo di mercato.
 *
 * Due task, stessa struttura di M2-02:
 *   T1: rettifica = canone pagato - canone di mercato (sempre positiva, per
 *       costruzione: il canone pagato e' sempre generato sopra il benchmark).
 *   T2: EBITDA normalizzato = EBITDA riportato + T1.
 *
 * Geometria fissa: nessuna riga dipende dal seed (nessuno shuffle), quindi gli
 * indirizzi di cella qui sotto sono literal per costruzione.
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
const B_CANONE_PAGATO = 'B5'; // Canone pagato alla parte correlata (dato, bloccato)
const B_CANONE_MERCATO = 'B6'; // Canone di mercato, benchmark indipendente (dato, bloccato)

const B_RETTIFICA = 'B9'; // T1
const B_EBITDA_NORM = 'B10'; // T2

export default defineTemplate({
  id: 'M2-03-AFFITTIINFRAGRUPPO',
  module: 'M2',
  title: 'Affitto infragruppo sopra mercato',
  rank: 1,
  mode: 'PRACTICE',
  estimatedSeconds: 200,
  skills: ['qoe.related-party'],
  prerequisites: ['M2-01-NORMALIZZAZIONE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBITDA "come riportato" in bilancio, a scatti di 1.000.
    const ebitdaRiportato = r.int(800, 4000) * 1000;

    // Canone di mercato: benchmark indipendente per un immobile equivalente
    // nella stessa zona. Ordine di grandezza plausibile per l'immobile
    // operativo di una PMI mid-market.
    const canoneMercato = r.int(80, 400) * 1000;

    // Sovrapprezzo pagato alla parte correlata: SEMPRE positivo per
    // costruzione (min > 0), a differenza di M2-02 che copre anche il caso
    // opposto. Triangolare: un sovrapprezzo contenuto e' il caso piu' comune,
    // ma capita anche di arrivare quasi a raddoppiare il canone di mercato.
    const sovrapprezzoFrazione = triangular(r, 0.1, 0.3, 0.9);
    const canonePagato = canoneMercato + roundTo(sovrapprezzoFrazione * canoneMercato, 500);

    const rettifica = canonePagato - canoneMercato;
    const ebitdaNormalizzato = ebitdaRiportato + rettifica;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_RETTIFICA} calcola la rettifica per l'affitto infragruppo: il canone pagato alla parte ` +
        `correlata (${B_CANONE_PAGATO}) meno il canone di mercato per un immobile equivalente nella stessa ` +
        `zona (${B_CANONE_MERCATO}). L'azienda paga piu' del prezzo di mercato a una parte correlata: la ` +
        "differenza e' un costo fuori mercato che ha gonfiato i costi (quindi sgonfiato l'EBITDA riportato), " +
        'percio\' si RIAGGIUNGE con segno positivo.',
      target: `Model!${B_RETTIFICA}`,
      atteso: rettifica,
      referenzia: [B_CANONE_PAGATO, B_CANONE_MERCATO],
      senzaLiteral: [],
      skills: ['qoe.related-party'],
      minKeystrokes: 8,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_EBITDA_NORM} calcola l'EBITDA normalizzato: l'EBITDA riportato (${B_EBITDA_RIP}) piu' la ` +
        `rettifica per l'affitto infragruppo che hai gia' calcolato in ${B_RETTIFICA}. Non ricalcolare la ` +
        "differenza da capo — usa il risultato che hai gia' scritto.",
      target: `Model!${B_EBITDA_NORM}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, B_RETTIFICA],
      senzaLiteral: [],
      skills: ['qoe.related-party'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-03-AFFITTIINFRAGRUPPO',
      seed: rng.seed,
      brief: [
        '## Un affitto pagato alla famiglia proprietaria',
        '',
        "L'azienda non e' proprietaria dell'immobile in cui opera: lo affitta da una societa' immobiliare " +
          "della stessa famiglia proprietaria — una parte correlata. Quando chi incassa il canone e chi lo " +
          "paga fanno capo alle stesse persone, il prezzo pagato non e' garantito essere un prezzo di " +
          "mercato: puo' essere stato fissato per spostare valore da un'entita' all'altra, non per riflettere " +
          "cosa costerebbe davvero affittare quell'immobile da un terzo indipendente.",
        '',
        `Qui l'EBITDA riportato e' ${eur(ebitdaRiportato)}. L'azienda paga ${eur(canonePagato)} l'anno di ` +
          `canone alla parte correlata; un canone di mercato per un immobile equivalente nella stessa zona ` +
          `— stimato da un benchmark indipendente — sarebbe di ${eur(canoneMercato)}. La differenza e' un ` +
          "sovrapprezzo che l'azienda paga solo perche' il proprietario dell'immobile e' anche il proprietario " +
          "dell'azienda: un compratore esterno, che rinegozierebbe il contratto a condizioni di mercato, non " +
          "sosterrebbe quel costo in piu'.",
        '',
        "Come in ogni rettifica QoE, il segno segue la regola generale: un costo fuori mercato, gia' dentro " +
          "l'EBITDA riportato, ha gonfiato i costi (quindi sgonfiato l'EBITDA riportato) — si RIAGGIUNGE, " +
          'rettifica **positiva**.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Affitto infragruppo sopra mercato'], { style: STILE_TITOLO }),
            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'EBITDA riportato (da bilancio), €',
                "Canone di affitto pagato alla parte correlata, €/anno",
                'Canone di mercato per un immobile equivalente, stessa zona, €/anno',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_CANONE_PAGATO, content: canonePagato, style: STILE_INPUT, locked: true },
              { ref: B_CANONE_MERCATO, content: canoneMercato, style: STILE_INPUT, locked: true },
            ],

            riga('A8', ['Normalizzazione'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                "Rettifica: sovrapprezzo pagato sull'affitto infragruppo, €",
                'EBITDA normalizzato, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_RETTIFICA, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_EBITDA_NORM, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 440, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_CANONE_PAGATO}-${B_CANONE_MERCATO}: canone pagato meno canone di mercato. Qui vale sempre ` +
            "un numero positivo, perche' il canone pagato e' sopra mercato.",
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_EBITDA_RIP}+${B_RETTIFICA}: EBITDA riportato piu' la rettifica gia' calcolata sopra.`,
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 40 }),
      startAt: `Model!${B_RETTIFICA}`,
    };
  },
});
