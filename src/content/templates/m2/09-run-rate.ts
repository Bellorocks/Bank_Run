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

import { monthName, tx } from '../../../i18n/content';

const AZIONI = () => ([
  tx('M2-09-RUNRATE.1'),
  tx('M2-09-RUNRATE.2'),
] as const);

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
  get title() {
    return tx('M2-09-RUNRATE.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['qoe.run-rate'],
  prerequisites: ['M2-05-ONEOFFLEGALI', 'M2-06-PLUSMINUSVALENZE', 'M2-07-CAPITALIZZAZIONEIMPROPRIA', 'M2-08-EFFETTICAMBIO'],

  generate: (rng) => {
    const rAzione = rng.fork('azione');
    const azioneLabel = rAzione.pick(AZIONI());

    const rTempo = rng.fork('tempistica');
    const meseEsecuzione = rTempo.pick(MESI_ESECUZIONE_AMMESSI);
    const meseNome = monthName(meseEsecuzione);
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
        tx('M2-09-RUNRATE.4', { B_RETTIFICA, B_RISPARMIO_MENSILE, B_MESI_TRASCORSI, B_RISPARMIO_SPERATO }),
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
        tx('M2-09-RUNRATE.5', { B_EBITDA_NORM, B_EBITDA_RIP, B_RETTIFICA }),
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
      brief: [tx('M2-09-RUNRATE.6', { azioneLabel, meseNome, p2: eur(risparmioMensile), p3: num(mesiTrascorsi), p4: eur(ebitdaRiportato), p5: eur(risparmioSperato) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M2-09-RUNRATE.7')], { style: STILE_TITOLO }),

            riga('A3', [tx('M2-09-RUNRATE.8')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M2-09-RUNRATE.9'),
                tx('M2-09-RUNRATE.10'),
                tx('M2-09-RUNRATE.11'),
                tx('M2-09-RUNRATE.12'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true },
              { ref: B_RISPARMIO_MENSILE, content: risparmioMensile, style: STILE_INPUT, locked: true },
            ],
            [{ ref: B_AZIONE_DESCR, content: `${azioneLabel}, a ${meseNome}`, style: STILE_ETICHETTA, locked: true }],
            [{ ref: B_MESI_TRASCORSI, content: mesiTrascorsi, style: STILE_INPUT, locked: true }],

            riga('A9', [tx('M2-09-RUNRATE.13')], { style: STILE_TITOLO }),
            colonna(
              'A10',
              [tx('M2-09-RUNRATE.14')],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_RISPARMIO_SPERATO, content: risparmioSperato, style: STILE_INPUT, locked: true }],

            riga('A12', [tx('M2-09-RUNRATE.19')], { style: STILE_TITOLO }),
            colonna(
              'A13',
              [
                tx('M2-09-RUNRATE.15'),
                tx('M2-09-RUNRATE.16'),
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
          tx('M2-09-RUNRATE.17', { B_RISPARMIO_MENSILE, B_MESI_TRASCORSI }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M2-09-RUNRATE.18', { B_EBITDA_RIP, B_RETTIFICA }),
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!${B_RETTIFICA}`,
    };
  },
});
