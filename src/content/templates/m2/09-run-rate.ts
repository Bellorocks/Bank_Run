/**
 * M2 · 09 — Run-rate legittimo vs pro-forma aspirazionale.
 *
 * Introduce la skill `qoe.run-rate`, distinta dalla `qoe.one-off` dei quattro
 * template precedenti (M2-05..M2-08): li' il problema era isolare/segnare una
 * rettifica gia' avvenuta, qui il problema e' un altro — QUANDO e' legittimo
 * annualizzare un effetto che nell'EBITDA riportato compare solo in parte.
 *
 *  - **Run-rate legittimo**: un'azione GIA' ESEGUITA durante l'anno (una sede
 *    chiusa, un contratto rinegoziato) ha un effetto pieno che esiste gia', a
 *    regime — nell'EBITDA riportato ne compare pero' solo la quota dei mesi
 *    trascorsi dall'esecuzione, perche' l'azione non era attiva dal 1/1.
 *    Annualizzare quell'effetto non e' inventarsi nulla: e' mostrare l'effetto
 *    vero di una decisione gia' presa.
 *  - **Pro-forma aspirazionale**: un risparmio SPERATO da un piano non ancora
 *    approvato. Non e' ancora successo e potrebbe non succedere mai: un QoE
 *    serio non lo include, in nessuna forma.
 *
 * Il mese di esecuzione dell'azione (2-10) esclude deliberatamente il valore
 * che produrrebbe mesi-trascorsi = 6 (mese 7): con l'esecuzione esattamente a
 * meta' anno, raddoppiare ingenuamente l'effetto parziale ("e' meta' anno,
 * quindi raddoppio") darebbe per caso il risultato giusto. Escludendo quel
 * punto, il trucco del raddoppio smette di funzionare per costruzione, e resta
 * solo la formula corretta: pieno meno gia'-contabilizzato.
 *
 * Convenzione di conteggio mesi (dichiarata a runtime, non lasciata implicita):
 * l'azione e' attiva dal mese di esecuzione INCLUSO fino a fine anno, quindi
 * "mesi gia' trascorsi" = 13 - meseEsecuzione. E' un dato diretto (come da
 * spec del task, per non mescolare aritmetica di calendario con la logica di
 * QoE che il livello vuole isolare), non dedotto da una formula di date.
 *
 * Il risparmio sperato aspirazionale e' un secondo importo dato, deliberato
 * distrattore: non compare in nessuna `referenzia`, e sommarlo per errore
 * cambia il valore atteso di T1 (check `value` lo boccia comunque, anche se
 * per assurdo qualcuno inventasse una formula che referenzia B5 e B7 e ci
 * infila dentro anche B10).
 *
 * Geometria fissa: nessuna riga dipende dal seed.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  num,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

const MESI_ITALIANI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
] as const;

const AZIONI = [
  'la chiusura di una sede secondaria',
  'la rinegoziazione di un contratto di fornitura chiave',
] as const;

// Mesi di esecuzione ammessi: 2-10, ESCLUSO 7 (produrrebbe mesi-trascorsi = 6,
// esattamente meta' anno — il caso in cui raddoppiare ingenuamente l'effetto
// parziale darebbe per caso il risultato corretto).
const MESI_ESECUZIONE_AMMESSI = [2, 3, 4, 5, 6, 8, 9, 10] as const;

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBITDA_RIP = 'B4'; // EBITDA riportato (dato, bloccato)
const B_RISPARMIO_MENSILE = 'B5'; // risparmio mensile dell'azione gia' eseguita (dato, bloccato)
const B_AZIONE_DESCR = 'B6'; // descrizione testuale dell'azione e del mese di esecuzione (informativo)
const B_MESI_TRASCORSI = 'B7'; // mesi gia' trascorsi dall'esecuzione (inclusa) a fine anno (dato, bloccato)

const B_RISPARMIO_SPERATO = 'B10'; // distrattore: pro-forma aspirazionale, NON va usato

const B_RETTIFICA = 'B13'; // T1
const B_EBITDA_NORM = 'B14'; // T2

export default defineTemplate({
  id: 'M2-09-RUNRATE',
  module: 'M2',
  title: 'Run-rate vs pro-forma: annualizzare solo cio\' che e\' gia\' successo',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['qoe.run-rate'],
  prerequisites: ['M2-05-ONEOFFLEGALI', 'M2-06-PLUSMINUSVALENZE', 'M2-07-CAPITALIZZAZIONEIMPROPRIA', 'M2-08-EFFETTICAMBIO'],

  generate: (rng) => {
    const rAzione = rng.fork('azione');
    const azioneLabel = rAzione.pick(AZIONI);

    const rTempo = rng.fork('tempistica');
    const meseEsecuzione = rTempo.pick(MESI_ESECUZIONE_AMMESSI);
    const meseNome = MESI_ITALIANI[meseEsecuzione - 1];
    // L'azione e' attiva dal mese di esecuzione (incluso) a fine anno.
    const mesiTrascorsi = 13 - meseEsecuzione;

    const r = rng.fork('dati');
    const ebitdaRiportato = r.int(800, 4000) * 1000;
    // Risparmio mensile come frazione dell'EBITDA riportato: dato direttamente
    // come importo mensile, mai come "annuo diviso 12" da dedurre.
    const risparmioMensile = roundTo(triangular(r, 0.002, 0.004, 0.008) * ebitdaRiportato, 100);

    const rAspir = rng.fork('aspirazionale');
    const risparmioSperato = roundTo(triangular(rAspir, 0.001, 0.004, 0.01) * ebitdaRiportato, 500);

    // Effetto gia' contabilizzato nell'anno: risparmio mensile per i mesi in
    // cui l'azione era gia' attiva. Il run-rate corretto e' il pieno annuo.
    const effettoGiaContabilizzato = risparmioMensile * mesiTrascorsi;
    const rettifica = risparmioMensile * 12 - effettoGiaContabilizzato;
    const ebitdaNormalizzato = ebitdaRiportato + rettifica;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_RETTIFICA} calcola la rettifica di run-rate: il risparmio annualizzato PIENO ` +
        `(${B_RISPARMIO_MENSILE} × 12) meno l'effetto gia' contabilizzato nell'EBITDA riportato ` +
        `(${B_RISPARMIO_MENSILE} × mesi gia' trascorsi, ${B_MESI_TRASCORSI}) — cioe' la parte mancante ` +
        "dell'effetto pieno che ancora non e' dentro l'EBITDA riportato, da AGGIUNGERE. NON usare in " +
        `nessun modo ${B_RISPARMIO_SPERATO}: quel risparmio e' solo sperato da un piano non ancora ` +
        "approvato, non un'azione gia' eseguita — un QoE serio lo scarta sempre, non lo annualizza.",
      target: `Model!${B_RETTIFICA}`,
      atteso: rettifica,
      referenzia: [B_RISPARMIO_MENSILE, B_MESI_TRASCORSI],
      senzaLiteral: [12],
      skills: ['qoe.run-rate'],
      minKeystrokes: 14,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_EBITDA_NORM} calcola l'EBITDA normalizzato: l'EBITDA riportato (${B_EBITDA_RIP}) piu' la ` +
        `rettifica di run-rate appena calcolata (${B_RETTIFICA}).`,
      target: `Model!${B_EBITDA_NORM}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, B_RETTIFICA],
      senzaLiteral: [],
      skills: ['qoe.run-rate'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-09-RUNRATE',
      seed: rng.seed,
      brief: [
        "## Run-rate: annualizzare solo cio' che e' gia' successo",
        '',
        'Un QoE serio distingue due cose che si assomigliano ma non sono la stessa cosa:',
        '',
        "- **Run-rate legittimo** — un'azione GIA' ESEGUITA durante l'anno (una sede chiusa, un " +
          "contratto rinegoziato). Il suo effetto pieno esiste gia', a regime: nell'EBITDA riportato ne " +
          "compare pero' solo una PARTE, perche' l'azione non era attiva fin dal 1° gennaio. " +
          "Annualizzarla e' legittimo: non si inventa nulla, si mostra solo l'effetto vero di una " +
          'decisione gia\' presa.',
        "- **Pro-forma aspirazionale** — un risparmio SPERATO da un piano non ancora approvato. Non e' " +
          "ancora successo, e potrebbe non succedere mai: un QoE serio non lo include, in nessuna forma.",
        '',
        `**L'azione.** Quest'anno l'azienda ha completato ${azioneLabel}, a ${meseNome}. Il risparmio di ` +
          `costi generato e' di ${eur(risparmioMensile)} al MESE (dato direttamente: non serve dedurlo ` +
          "da un risparmio annuo).",
        '',
        `Da ${meseNome} (incluso) a fine anno sono trascorsi ${num(mesiTrascorsi)} mesi: e' la parte ` +
          `dell'anno in cui il risparmio e' GIA' dentro l'EBITDA riportato di ${eur(ebitdaRiportato)}. I ` +
          "mesi PRIMA dell'esecuzione non hanno beneficiato del risparmio — quella parte mancante e' " +
          'esattamente cio\' che la rettifica di run-rate deve aggiungere.',
        '',
        `**Attenzione, un dato-trappola.** Il management ha anche indicato un risparmio aggiuntivo ` +
          `sperato di ${eur(risparmioSperato)}, da un piano di efficientamento che il CdA non ha ancora ` +
          "approvato. Non e' un'azione eseguita: e' un'aspirazione manageriale. NON entra in nessuna " +
          "formula di questo livello — e' qui apposta perche' tu impari a riconoscerlo e scartarlo.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Run-rate: annualizzare un\'azione gia\' eseguita'], { style: STILE_TITOLO }),

            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'EBITDA riportato (da bilancio), €',
                "Risparmio mensile generato dall'azione gia' eseguita, €/mese",
                "Azione gia' eseguita durante l'anno",
                "Mesi gia' trascorsi dall'esecuzione (inclusa) a fine anno",
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_RISPARMIO_MENSILE, content: risparmioMensile, style: STILE_INPUT, locked: true },
            ],
            [{ ref: B_AZIONE_DESCR, content: `${azioneLabel}, a ${meseNome}`, style: STILE_ETICHETTA, locked: true }],
            [{ ref: B_MESI_TRASCORSI, content: mesiTrascorsi, style: STILE_INPUT, locked: true }],

            riga('A9', ["Attenzione — un dato che NON devi usare"], { style: STILE_TITOLO }),
            colonna(
              'A10',
              ["Risparmio aggiuntivo sperato da un piano di efficientamento NON ancora approvato dal CdA, €"],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_RISPARMIO_SPERATO, content: risparmioSperato, style: STILE_INPUT, locked: true }],

            riga('A12', ['Normalizzazione'], { style: STILE_TITOLO }),
            colonna(
              'A13',
              [
                "Rettifica run-rate: parte mancante dell'effetto pieno, da aggiungere, €",
                'EBITDA normalizzato, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_RETTIFICA, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_EBITDA_NORM, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 480, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_RISPARMIO_MENSILE}*12-${B_RISPARMIO_MENSILE}*${B_MESI_TRASCORSI}: il risparmio ` +
            "annualizzato pieno meno quanto e' gia' dentro l'EBITDA riportato per i mesi gia' trascorsi " +
            "dall'esecuzione. Non tocca mai il dato sperato in B10.",
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_EBITDA_RIP}+${B_RETTIFICA}: EBITDA riportato piu' la rettifica di run-rate appena ` +
            'calcolata.',
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!${B_RETTIFICA}`,
    };
  },
});
