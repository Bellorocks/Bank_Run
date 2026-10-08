/**
 * M3 · 04 — Capex di mantenimento vs capex di crescita.
 *
 * M3-03 ha insegnato che una variazione del NWC assorbe o libera cassa, sopra
 * e sotto il flusso di cassa operativo "lordo" (skill nwc.fcf-impact). Questo
 * livello resta sulla stessa linea — quanta cassa resta davvero disponibile —
 * ma sposta l'attenzione dal circolante agli investimenti in immobilizzazioni
 * (capex): non tutto il capex e' della stessa natura.
 *
 * Il capex TOTALE speso in un anno si scompone in due parti con un significato
 * economico opposto:
 *   - capex di MANTENIMENTO: sostituisce cio' che si consuma (macchinari che si
 *     usurano, impianti che invecchiano). Non e' discrezionale: serve solo per
 *     restare fermi, a parita' di capacita' produttiva. Se lo si taglia, prima
 *     o poi la capacita' produttiva si deteriora.
 *   - capex di CRESCITA: espande la capacita' produttiva (nuovi impianti,
 *     nuove linee, nuova capacita' che prima non c'era). E' discrezionale: si
 *     fa se e quando il ritorno atteso lo giustifica, e si puo' tagliare senza
 *     danneggiare l'attivita' esistente.
 *
 * La distinzione conta perche' un capex totale alto non dice, da solo, se
 * un'azienda sta semplicemente "stando ferma" (tutto mantenimento) o sta
 * investendo per crescere (una fetta di crescita) — due letture del free cash
 * flow molto diverse per chi valuta l'azienda.
 *
 * PROXY DICHIARATO (non un'identita' contabile): non esiste quasi mai una riga
 * di bilancio che separi le due componenti, quindi si usa una convenzione
 * comune e ragionevole: nel lungo periodo il capex di mantenimento tende a
 * convergere verso l'ammortamento (D&A) dell'anno, perche' l'ammortamento
 * misura proprio il consumo degli asset esistenti che il mantenimento deve
 * rimpiazzare. E' un'approssimazione, non un'uguaglianza contabile — ma e'
 * quella che si usa in pratica quando il dettaglio non e' disponibile.
 *
 *   Capex di mantenimento (stimato) = D&A dell'anno
 *   Capex di crescita = Capex totale - Capex di mantenimento
 *
 * Geometria fissa: nessuna riga dipende dal seed, quindi i riferimenti di
 * cella sono letterali per costruzione, come negli altri livelli di M3.
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
const B_CAPEX_TOTALE = 'B4'; // Capex totale dell'anno (dato, bloccato)
const B_DA = 'B5'; // D&A dell'anno, proxy del capex di mantenimento minimo (dato, bloccato)

const B_CAPEX_MANT = 'B8'; // T1
const B_CAPEX_CRESCITA = 'B9'; // T2

export default defineTemplate({
  id: 'M3-04-CAPEXMAINTENANCEGROWTH',
  module: 'M3',
  title: 'Capex di mantenimento vs capex di crescita',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 220,
  skills: ['nwc.capex'],
  prerequisites: ['M3-03-NWCEFCF'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // D&A dell'anno: proxy del capex di mantenimento "minimo necessario".
    // Valore plausibile per una PMI/mid-cap, in migliaia.
    const da = r.int(300, 3000) * 1000;

    // Capex totale: sempre superiore al D&A (fattore 1,05x - 2,50x), cosi' il
    // capex di crescita risultante e' sempre positivo — a volte una fetta
    // piccola (azienda che investe soprattutto per stare ferma), a volte una
    // fetta grande (azienda in forte espansione). Arrotondato a multipli di
    // 1.000.
    const fattoreCapex = 1.05 + r.next() * 1.45; // 1,05x - 2,50x
    const capexTotale = roundTo(da * fattoreCapex, 1000);

    // Valori attesi, calcolati con la STESSA algebra dei due task.
    const capexMantenimento = da;
    const capexCrescita = capexTotale - capexMantenimento;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_CAPEX_MANT} stima il capex di MANTENIMENTO dell'anno usando la convenzione dichiarata ` +
        `nel brief: nel lungo periodo il capex di mantenimento tende a convergere verso l'ammortamento ` +
        `(D&A) dell'anno, quindi usa direttamente il D&A (${B_DA}) come stima. Non e' una legge contabile, ` +
        "e' un'approssimazione ragionevole quando il dettaglio non c'e'.",
      target: `Model!${B_CAPEX_MANT}`,
      atteso: capexMantenimento,
      referenzia: [B_DA],
      senzaLiteral: [],
      skills: ['nwc.capex'],
      minKeystrokes: 3,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_CAPEX_CRESCITA} calcola il capex di CRESCITA: capex totale dell'anno (${B_CAPEX_TOTALE}) ` +
        `meno il capex di mantenimento appena stimato (${B_CAPEX_MANT}). Attenzione a come lo leggi: un ` +
        "capex di crescita alto NON e' di per se' un problema — e' discrezionale, e va giudicato in base " +
        'al ritorno atteso di quell\'espansione, non temuto in quanto numero grande. Il capex di ' +
        "mantenimento, al contrario, non e' negoziabile: tagliarlo non riduce la crescita futura, riduce " +
        "la capacita' produttiva che l'azienda ha gia' oggi.",
      target: `Model!${B_CAPEX_CRESCITA}`,
      atteso: capexCrescita,
      referenzia: [B_CAPEX_TOTALE, B_CAPEX_MANT],
      senzaLiteral: [],
      skills: ['nwc.capex'],
      minKeystrokes: 7,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M3-04-CAPEXMAINTENANCEGROWTH',
      seed: rng.seed,
      brief: [
        '## Capex di mantenimento vs capex di crescita: non tutto il capex e\' uguale',
        '',
        "In M3-03 hai visto come una variazione del NWC assorbe o libera cassa attorno al flusso di " +
          "cassa operativo. Restiamo sul tema \"quanta cassa resta davvero disponibile\", ma spostandoci " +
          "dal circolante agli investimenti in immobilizzazioni (capex).",
        '',
        "Il capex TOTALE speso in un anno non e' un blocco unico: si scompone in due parti con un " +
          "significato economico opposto.",
        '',
        "- **Capex di mantenimento**: sostituisce cio' che si consuma (macchinari che si usurano, " +
          "impianti che invecchiano). Non e' discrezionale — serve solo per restare fermi, a parita' di " +
          "capacita' produttiva.",
        "- **Capex di crescita**: espande la capacita' produttiva (nuovi impianti, nuove linee). E' " +
          "discrezionale — si fa se e quando il ritorno atteso lo giustifica.",
        '',
        "**Il proxy che userai (dichiarato, non un'identita' contabile):** quasi mai il bilancio separa " +
          "le due componenti. La convenzione comune e ragionevole e' che nel lungo periodo il capex di " +
          "mantenimento tende a convergere verso l'ammortamento (D&A) dell'anno, perche' il D&A misura " +
          "proprio il consumo degli asset esistenti che il mantenimento deve rimpiazzare. E' " +
          "un'approssimazione, non un'uguaglianza — ma e' quella che si usa quando il dettaglio non e' " +
          "disponibile.",
        '',
        '> **Capex di mantenimento (stimato) = D&A dell\'anno**',
        '> **Capex di crescita = Capex totale − Capex di mantenimento**',
        '',
        `Capex totale dell'anno (dato): ${eur(capexTotale)}. D&A dell'anno (dato): ${eur(da)}.`,
        '',
        "Stima prima il capex di mantenimento, poi ricava per differenza il capex di crescita. Un capex " +
          "di crescita alto non e' un allarme: e' opzionale e va valutato sul ritorno atteso. Il capex di " +
          "mantenimento, invece, non si negozia.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Capex di mantenimento vs capex di crescita'], {
              style: STILE_TITOLO,
            }),

            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                "Capex totale dell'anno, €",
                "D&A dell'anno (proxy del capex di mantenimento), €",
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_CAPEX_TOTALE, content: capexTotale, style: STILE_INPUT, locked: true },
              { ref: B_DA, content: da, style: STILE_INPUT, locked: true },
            ],

            riga('A7', ['Scomposizione del capex'], { style: STILE_TITOLO }),
            colonna(
              'A8',
              [
                'Capex di mantenimento (stimato), €',
                'Capex di crescita, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_CAPEX_MANT, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_CAPEX_CRESCITA, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_DA}: il capex di mantenimento stimato e' semplicemente il D&A dell'anno, per la ` +
            "convenzione dichiarata nel brief.",
          8,
          'T1',
        ),
        hint(
          'H2',
          `=${B_CAPEX_TOTALE}-${B_CAPEX_MANT}: capex totale meno capex di mantenimento. Quello che ` +
            "resta e' la fetta discrezionale, spesa per crescere.",
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_CAPEX_MANT}`,
    };
  },
});
