/**
 * M0-C · 05 — OFFSET e i range dinamici.
 *
 * Il punto didattico e' spostarsi da un punto fermo (l'ancora) invece di cercare
 * un valore. INDEX/MATCH risponde a "dov'e' questo dato?"; OFFSET risponde a
 * "cosa c'e' a N righe da qui?" — ed e' proprio quel "N" che deve venire da una
 * cella, non da un numero scritto in formula: e' la differenza fra una formula
 * che regge solo per questo seed e una che regge quando N cambia (T2 lo verifica
 * con un secondo parametro, per assicurarsi che non sia rimasta memorizzata la
 * prima risposta).
 *
 * Il brief include anche il prezzo da pagare: OFFSET e' una funzione volatile,
 * si ricalcola sempre. Non e' solo un elogio della funzione — e' lo stesso
 * spirito di onesta' tecnica di M0B-04-IFERROR ("non ovunque per abitudine").
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  num,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

const SERIE = [
  "la filiale di Bologna",
  'il negozio di Torino Centro',
  "l'area vendite Nord-Est",
  'la divisione export',
  'il punto vendita di Bari',
  "il canale e-commerce",
  "l'agenzia di Verona",
] as const;

const HEADER_ROW = 3;
const DATA_START = 4;

export default defineTemplate({
  id: 'M0C-05-OFFSET',
  module: 'M0-C',
  title: 'OFFSET: il valore che si sposta',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.offset'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');
    const filiale = r.pick(SERIE);

    const periodi = r.int(8, 10);

    // Serie mensile plausibile: un primo valore, poi una passeggiata casuale
    // limitata (mai un balzo assurdo da un mese al successivo).
    const valori: number[] = [];
    let v = roundTo(triangular(r, 180_000, 320_000, 650_000), 1000);
    valori.push(v);
    for (let i = 1; i < periodi; i++) {
      const variazione = triangular(r, -0.09, 0.015, 0.13);
      v = roundTo(v * (1 + variazione), 1000);
      valori.push(v);
    }

    // Due parametri distinti: se il secondo task tornasse a dare la risposta
    // del primo, vorrebbe dire che lo studente ha scritto -N a mano invece di
    // leggerlo dalla cella.
    const nIndietro = r.int(2, periodi - 3);
    let mIndietro = r.int(1, periodi - 1);
    while (mIndietro === nIndietro) mIndietro = r.int(1, periodi - 1);

    const dataEndRow = DATA_START + periodi - 1;
    const paramNRow = dataEndRow + 2;
    const t1Row = paramNRow + 2;
    const paramMRow = t1Row + 2;
    const t2Row = paramMRow + 2;

    const ancoraRef = `B${dataEndRow}`;
    const paramNRef = `B${paramNRow}`;
    const t1TargetRef = `B${t1Row}`;
    const paramMRef = `B${paramMRow}`;
    const t2TargetRef = `B${t2Row}`;

    const meseLabels = Array.from({ length: periodi }, (_, i) =>
      i === periodi - 1 ? `Mese ${i + 1} — l'ultimo dato (l'ancora)` : `Mese ${i + 1}`,
    );

    const expected1 = valori[periodi - 1 - nIndietro];
    const expected2 = valori[periodi - 1 - mIndietro];

    const t1: Task = {
      id: 'T1',
      prompt:
        `In ${t1TargetRef} recupera il fatturato di ${nIndietro} mesi prima dell'ultimo dato: parti ` +
        `dall'ancora in ${ancoraRef} e usa OFFSET per spostarti indietro del numero di mesi scritto ` +
        `in ${paramNRef}. Il segno meno davanti al riferimento, non un numero battuto a mano: se quel ` +
        'parametro cambiasse, la formula deve seguirlo.',
      targetCell: `Model!${t1TargetRef}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: expected1,
          message:
            `Il valore non torna: deve essere il fatturato di ${ancoraRef} spostato indietro di quanto ` +
            `dice ${paramNRef}, non un altro mese della serie.`,
        },
        { kind: 'mustReference', cells: [ancoraRef, paramNRef] },
        { kind: 'mustUseFunction', functions: ['OFFSET'] },
        { kind: 'mustNotContainLiteral', except: [0] },
      ],
      skills: ['xl.offset'],
      minKeystrokes: 20,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        `Fai lo stesso in ${t2TargetRef}, ma con un numero di mesi diverso: leggilo da ${paramMRef}, ` +
        `non da ${paramNRef}. Se la formula che scrivi qui desse lo stesso risultato di prima anche ` +
        `cambiando parametro, vorrebbe dire che il "${nIndietro}" del task precedente e' rimasto ` +
        "scritto in chiaro invece che nella cella.",
      targetCell: `Model!${t2TargetRef}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: expected2,
          message: `Il valore non torna con ${mIndietro} mesi indietro da ${ancoraRef}.`,
        },
        { kind: 'mustReference', cells: [ancoraRef, paramMRef] },
        { kind: 'mustUseFunction', functions: ['OFFSET'] },
        { kind: 'mustNotContainLiteral', except: [0] },
      ],
      skills: ['xl.offset'],
      minKeystrokes: 20,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0C-05-OFFSET',
      seed: rng.seed,
      brief: [
        '## OFFSET: il valore che si sposta da un punto fermo',
        '',
        `Hai il fatturato mensile di ${filiale}, per gli ultimi ${periodi} mesi: da Mese 1 (il piu\'`,
        `vecchio) fino a Mese ${periodi} (il piu\' recente). Quest\'ultimo, in ${ancoraRef}, e\' la tua`,
        '**ancora**: il punto fermo da cui contare all\'indietro.',
        '',
        '`OFFSET(riferimento, righe, colonne)` non cerca un valore come INDEX/MATCH: si **sposta**,',
        'letteralmente, di un certo numero di righe e colonne a partire dal riferimento che gli dai.',
        'Righe positive scendono, righe negative salgono; colonne positive vanno a destra, negative a',
        'sinistra. Per tornare indietro nel tempo lungo una colonna, il numero di righe dev\'essere',
        'negativo.',
        '',
        `Il numero di mesi da contare all\'indietro non va scritto dentro la formula: e\' gia\' in`,
        `${paramNRef}. Leggilo da li\', con il segno meno davanti — e\' la differenza fra una formula`,
        'che funziona solo per questo caso e una che funziona anche il giorno in cui quel numero',
        'cambia. In un modello vero cambia spesso.',
        '',
        'Nota tecnica, non solo elogio della funzione: OFFSET e\' **volatile**. Excel la ricalcola a',
        'ogni modifica del foglio, anche quando nessuno dei suoi argomenti e\' cambiato. Su una tabella',
        'piccola come questa non se ne accorge nessuno; su un modello con centinaia di OFFSET e\'',
        'spesso la prima causa quando il ricalcolo comincia a rallentare. Usala quando ti serve',
        'davvero un riferimento che si sposta, non come sostituto automatico di INDEX/MATCH.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Serie storica: fatturato mensile'], { style: STILE_TITOLO }),
            riga(`A${HEADER_ROW}`, ['Mese', 'Fatturato (€)'], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, meseLabels, { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, valori, { style: STILE_INPUT }),
            blocco(`A${paramNRow}`, [["Quanti mesi prima dell'ultimo dato (N)"]], { style: STILE_ETICHETTA }),
            blocco(`B${paramNRow}`, [[nIndietro]], { style: STILE_INPUT }),
            blocco(`A${t1Row}`, [['Valore di N mesi fa (OFFSET)']], { style: STILE_ETICHETTA }),
            blocco(`A${paramMRow}`, [['E se il numero di mesi fosse M?']], { style: STILE_ETICHETTA }),
            blocco(`B${paramMRow}`, [[mIndietro]], { style: STILE_INPUT }),
            blocco(`A${t2Row}`, [['Valore di M mesi fa (stessa logica)']], { style: STILE_ETICHETTA }),
            areaLibera([t1TargetRef, t2TargetRef]),
          ],
          { colWidths: { A: 320, B: 150 }, frozenRows: HEADER_ROW },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `OFFSET(${ancoraRef}, -${paramNRef}, 0): il primo argomento e' il punto fermo, il secondo di quante righe spostarsi (negativo per salire), il terzo di quante colonne (qui 0, restiamo nella stessa colonna).`,
          12,
          'T1',
        ),
        hint('H2', `Il numero di mesi viene da ${paramNRef}, non da ${num(nIndietro)} scritto a mano.`, 8, 'T1'),
        hint('H3', `Stessa struttura del task precedente, ma il riferimento al numero di mesi deve puntare a ${paramMRef}, non a ${paramNRef}.`, 8, 'T2'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!${t1TargetRef}`,
    };
  },
});
