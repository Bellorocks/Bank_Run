/**
 * M0-B · 04 — IFERROR: intercettare l'errore senza nasconderlo sotto il tappeto.
 *
 * Il punto didattico e' in due parti, e serve entrambe o non insegna niente:
 *  - T1 e' il caso in cui l'errore e' legittimo (una quantita' a zero fa esplodere
 *    una divisione) e IFERROR serve DAVVERO, ma il valore alternativo dev'essere
 *    una stima difendibile — il prezzo di listino gia' in tabella — non uno zero
 *    buttato li' per far sparire il cancelletto rosso;
 *  - T2 e' il caso gemello in cui il denominatore non e' mai zero: avvolgere
 *    comunque la formula in IFERROR non e' prudenza, e' nascondere un errore
 *    futuro che quella formula dovrebbe invece segnalare.
 *
 * Senza il secondo task il livello insegnerebbe "metti sempre IFERROR", che e'
 * esattamente l'abitudine dannosa da cui lo skill xl.iferror mette in guardia.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

const LINEE = [
  'Guarnizioni idrauliche',
  'Flange in acciaio inox',
  'Cuscinetti a sfera',
  'Raccordi filettati',
  'Valvole a sfera in ottone',
  'Connettori elettrici industriali',
  'Profili in alluminio estruso',
  'Componenti in gomma tecnica',
] as const;

const MOTIVI_FERMO = [
  "revisione qualita' programmata",
  'fermo macchina per manutenzione straordinaria',
  'lancio rimandato al mese prossimo',
  'sciopero del reparto produzione',
] as const;

export default defineTemplate({
  id: 'M0B-04-IFERROR',
  module: 'M0-B',
  title: "L'errore che non si nasconde",
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 210,
  skills: ['xl.iferror', 'xl.div-guard'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const idx1 = r.int(0, LINEE.length - 1);
    let idx2 = r.int(0, LINEE.length - 1);
    while (idx2 === idx1) idx2 = r.int(0, LINEE.length - 1);
    const linea1 = LINEE[idx1];
    const linea2 = LINEE[idx2];
    const motivo = r.pick(MOTIVI_FERMO);

    // Linea 1: produzione ferma questo mese. Il costo di produzione (spese fisse
    // gia' sostenute) non e' zero, ma le unita' prodotte si': B4/C4 esplode.
    const costo1 = roundTo(triangular(r, 12_000, 28_000, 65_000), 10);
    const quantita1 = 0;
    const listino1 = roundTo(triangular(r, 25, 70, 180), 0.5);

    // Linea 2: mese normale, il denominatore non e' mai zero.
    const costo2 = roundTo(triangular(r, 20_000, 55_000, 140_000), 10);
    const quantita2 = r.int(60, 900);
    const listino2 = roundTo(triangular(r, 25, 70, 180), 0.5);
    const costoUnitario2 = costo2 / quantita2;

    const t1: Task = {
      id: 'T1',
      prompt:
        `In E4 calcola il costo unitario della linea "${linea1}": costo di produzione diviso ` +
        `unita' prodotte. Questo mese la produzione e' ferma (${motivo}): il denominatore e' zero ` +
        "e la divisione diretta esplode in #DIV/0!. Non lasciare l'errore a vista e non spegnerlo " +
        "con uno zero a caso: intercettalo e, quando fallisce, usa il prezzo di listino gia' in D4 " +
        'come stima del costo — e\' l\'unico numero difendibile che hai finche\' non arrivano dati veri.',
      targetCell: 'Model!E4',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: listino1,
          message:
            "Il valore non corrisponde al prezzo di listino: quando la divisione fallisce, IFERROR deve restituire D4, non un numero scritto a mano.",
        },
        { kind: 'mustReference', cells: ['B4', 'C4', 'D4'] },
        { kind: 'mustUseFunction', functions: ['IFERROR'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.iferror', 'xl.div-guard'],
      minKeystrokes: 18,
    };

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In E5 calcola il costo unitario della linea "${linea2}" allo stesso modo: costo di ` +
        "produzione diviso unita' prodotte. Qui pero' il denominatore non e' mai zero: guardalo " +
        "prima di scrivere la formula. Avvolgere comunque la divisione in IFERROR non e' prudenza, " +
        'e\' un modo per non accorgersi il giorno in cui quella cella dovesse davvero rompersi.',
      target: 'Model!E5',
      atteso: costoUnitario2,
      referenzia: ['B5', 'C5'],
      senzaLiteral: [],
      skills: ['xl.arithmetic'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M0B-04-IFERROR',
      seed: rng.seed,
      brief: [
        "## Non nascondere l'errore sotto il tappeto",
        '',
        "Due linee di produzione dello stesso stabilimento. Per ciascuna vuoi il **costo unitario**:",
        'costo di produzione diviso unita\' prodotte. E\' il numero che dice se il prezzo di vendita',
        'copre davvero i costi.',
        '',
        `Sulla linea **${linea1}** questo mese non e\' uscito nessun pezzo (${motivo}), ma il costo di`,
        `produzione — ${eur(costo1)}, personale e ammortamenti gia\' sostenuti — c\'e\' comunque.`,
        'Dividerlo per zero unita\' produce `#DIV/0!`. Scriverci sopra uno zero a mano lo farebbe',
        'sparire dalla vista, ma un modello che nasconde i suoi errori e\' peggio di uno che li mostra:',
        'quel numero finto finirebbe in un totale, e nessuno saprebbe piu\' da dove viene.',
        '',
        "**`IFERROR(formula, valore_se_errore)`** intercetta l'errore e lo sostituisce con qualcosa",
        'di scelto da te — non con qualcosa di nascosto da Excel. Qui il prezzo di listino, gia\'',
        'in tabella, e\' l\'unica stima difendibile del costo quando non hai produzione da dividere.',
        '',
        `Sulla linea **${linea2}** invece il mese e\' stato normale: le unita\' prodotte non sono mai`,
        'zero. IFERROR li\' non protegge da niente, aggiunge solo un valore di fallback che non',
        'scattera\' mai — finche\' un giorno, per un motivo che non hai previsto, scattera\' senza che',
        'tu te ne accorga. Si usa IFERROR dove un errore e\' un\'ipotesi reale, non ovunque per abitudine.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Costo unitario di produzione'], { style: STILE_TITOLO }),
            riga(
              'A3',
              ['Linea di prodotto', 'Costo di produzione (€)', "Unita' prodotte (pz)", 'Prezzo di listino (€/pz)', 'Costo unitario (€/pz)'],
              { style: STILE_TITOLO },
            ),
            colonna('A4', [linea1, linea2], { style: STILE_ETICHETTA }),
            colonna('B4', [costo1, costo2], { style: STILE_INPUT }),
            colonna('C4', [quantita1, quantita2], { style: STILE_INPUT }),
            colonna('D4', [listino1, listino2], { style: { ...STILE_INPUT, numFmt: '#,##0.0' } }),
            areaLibera(['E4', 'E5']),
          ],
          { colWidths: { A: 230, B: 170, C: 150, D: 160, E: 160 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          "IFERROR(B4/C4, D4): il primo argomento e' la formula che puo' fallire, il secondo e' cosa restituire quando fallisce davvero.",
          10,
          'T1',
        ),
        hint('H2', "Il fallback deve venire da D4, non da un numero scritto a mano: e' quello il prezzo che difendi in riunione.", 8, 'T1'),
        hint('H3', "B5/C5, senza IFERROR: qui il denominatore non e' mai zero, non c'e' errore da intercettare.", 6, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: 'Model!E4',
    };
  },
});
