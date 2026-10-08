/**
 * M0-D · 02 — Numeri importati come testo.
 *
 * Il punto didattico: una cifra che "sembra" un numero non lo e' per forza. Un
 * export dal gestionale porta dentro Excel valori con una virgola delle migliaia
 * che il foglio non riconosce, o con uno spazio invisibile in coda — e in
 * entrambi i casi la cella resta TESTO, allineata a sinistra invece che a
 * destra. SUM e COUNT la saltano senza mostrare nessun errore: il totale
 * torna un numero plausibile, solo sbagliato. E' l'errore silenzioso piu'
 * pericoloso del modulo, perche' non lascia traccia rossa in nessuna cella.
 *
 * T1 fa toccare con mano il sintomo: la somma "vera" e' quella che SUM produce
 * davvero sui dati sporchi, non quella che sommerebbe una calcolatrice.
 * T2 rende visibile la causa: COUNT conta solo i numeri veri, COUNTA (gia'
 * calcolata accanto, per confronto diretto) conta tutto cio' che non e' vuoto.
 * La differenza fra le due e' la prova che manca qualcosa nel totale.
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
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

const FORNITORI = [
  'Metalsider Srl',
  'Trans Log Spa',
  'OfficeMax Forniture',
  'Adriatica Elettroforniture',
  'GreenPack Imballaggi',
  'Cantina Sociale del Nord',
  'TechService Informatica',
  'Rossi Componenti Srl',
  'Nordest Logistica',
  'Bianchi Utensileria',
] as const;

const RIGHE = 7;

/** Formatta un intero con la virgola delle migliaia, come lo scriverebbe un gestionale anglosassone. */
function conVirgole(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default defineTemplate({
  id: 'M0D-02-TESTOCOMENUMERO',
  module: 'M0-D',
  title: 'Il numero che non e\' un numero',
  rank: 2,
  mode: 'AUDIT',
  estimatedSeconds: 210,
  skills: ['xl.text-numbers', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const fornitori = r.shuffle([...FORNITORI]).slice(0, RIGHE);

    const importi: number[] = [];
    for (let i = 0; i < RIGHE; i++) {
      importi.push(roundTo(triangular(r, 1200, 5000, 45000), 10));
    }

    // Esattamente 3 righe su 7 arrivano sporche dal gestionale: abbastanza per
    // rompere il totale in modo evidente, non cosi' tante da rendere il foglio
    // illeggibile.
    const indiciSporchi = new Set(r.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 3));

    // Per ogni riga sporca: o la virgola delle migliaia (il foglio usa il punto
    // come separatore decimale, quindi la virgola non e' un carattere numerico
    // valido) o uno spazio finale invisibile. Entrambi bastano a far restare la
    // cella testo.
    const tipoSporco = new Map<number, 'virgola' | 'spazio'>();
    for (const i of indiciSporchi) {
      tipoSporco.set(i, r.bool() ? 'virgola' : 'spazio');
    }

    // Zero-width space (U+200B): invisibile a schermo, ma resta un carattere
    // testuale a tutti gli effetti. Un trailing space vero (o tab, o
    // non-breaking space) NON basta a rompere il riconoscimento: HyperFormula
    // lo scarta durante il parsing numerico e la cella torna un numero vero,
    // il che vanificherebbe l'intero esercizio (verificato empiricamente: uno
    // spazio, anche non-breaking, in coda a "23400" viene convertito comunque
    // in 23400 numerico). Lo zero-width space e' l'unico "spazio invisibile"
    // che il motore non digerisce.
    const ZWSP = String.fromCharCode(0x200b);

    const colonnaB: (string | number)[] = importi.map((v, i) => {
      const tipo = tipoSporco.get(i);
      if (tipo === 'virgola') return conVirgole(v);
      if (tipo === 'spazio') return `${Math.round(v)}${ZWSP}`;
      return v;
    });

    const sommaVera = importi.reduce((acc, v, i) => (indiciSporchi.has(i) ? acc : acc + v), 0);
    const numeriVeri = RIGHE - indiciSporchi.size;

    const t1: Task = {
      id: 'T1',
      prompt:
        'In B12 somma tutta la colonna degli importi in B4:B10, con un\'unica formula, senza farlo a mano voce ' +
        'per voce. Prima di scriverla, guarda bene la colonna: non tutte le celle sono allineate allo stesso ' +
        "modo. Il totale che ottieni e' quello vero da consegnare, anche se non coincide con la somma che " +
        'faresti a mente sommando le cifre a vista.',
      targetCell: 'Model!B12',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: sommaVera,
          message:
            "Il totale non e' quello che produce SUM su B4:B10. Alcune celle di quella colonna sono testo, " +
            "non numeri: SUM le salta senza segnalare nulla, e il totale vero e' piu' basso di quanto sembri.",
        },
        {
          kind: 'mustReference',
          cells: ['B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10'],
        },
        { kind: 'mustUseFunction', functions: ['SUM'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.text-numbers', 'xl.aggregates'],
      minKeystrokes: 13,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        'In B14 conta quante celle di B4:B10 sono davvero numeri: serve una funzione diversa da quella gia\' ' +
        'usata in B13. Il testo, come nella somma qui sopra, resta fuori dal conteggio senza nessun errore: ' +
        "e' il modo per sapere QUANTI importi sono davvero finiti nel totale che hai appena calcolato. Non " +
        'usare COUNTA: quella la trovi gia\' calcolata in B13, giusto per il confronto — conta tutto cio\' che ' +
        "non e' vuoto, testo compreso, ed e' per questo che non basta da sola a dirti quanti numeri veri hai.",
      targetCell: 'Model!B14',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: numeriVeri,
          message:
            "Il conteggio non torna. COUNT deve contare solo le celle che sono numeri veri, non tutte le celle piene.",
        },
        {
          kind: 'mustReference',
          cells: ['B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10'],
        },
        { kind: 'mustUseFunction', functions: ['COUNT'] },
        { kind: 'mustNotUseFunction', functions: ['COUNTA'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.text-numbers', 'xl.aggregates'],
      minKeystrokes: 15,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0D-02-TESTOCOMENUMERO',
      seed: rng.seed,
      brief: [
        '## Il numero che non e\' un numero',
        '',
        'Sette fatture fornitore, esportate dal gestionale nel foglio **Model**. Colonna degli importi in euro,',
        'colonna B. A occhio sembra una tabella normale: sette cifre, una sotto l\'altra.',
        '',
        'Non lo e\'. Un export porta dentro Excel anche i difetti del sistema di partenza: una cifra scritta',
        'con la virgola delle migliaia (`12,500` — ma qui il punto e\' il separatore decimale, quindi quella',
        'virgola non e\' un carattere che Excel riconosce come numero) o con uno spazio finale invisibile',
        'restano **testo**, non numeri. Non c\'e\' nessun cancelletto rosso a segnalarlo: l\'unico indizio e\'',
        'l\'allineamento della cella. I numeri veri si allineano a destra. Il testo si allinea a sinistra.',
        'Guarda la colonna B prima di scrivere qualunque formula.',
        '',
        `Gli importi generati vanno dai ${eur(Math.min(...importi))} ai ${eur(Math.max(...importi))} circa.`,
        'Alcune di queste cifre — non ti diciamo quali, e\' il punto dell\'audit — sono testo travestito da numero.',
        '',
        '**SUM** e **COUNT** condividono la stessa regola: contano solo cio\' che e\' davvero un numero.',
        'Il testo lo saltano, in silenzio. Il totale che otterrai in B12 e\' quello REALE, non quello che',
        'ti aspetteresti sommando le sette cifre a vista.',
        '',
        'In B13 trovi gia\' calcolato **COUNTA** sulla stessa colonna: conta ogni cella non vuota, testo',
        'compreso. Tocca a te, in B14, calcolare **COUNT**: quante di quelle sette celle sono numeri veri.',
        'La differenza fra B13 e B14 e\' la prova in cifra di quante fatture ti mancano nel totale.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ["Fatture fornitore — export dal gestionale"], { style: STILE_TITOLO }),
            riga('A3', ['Fornitore', 'Importo (€)'], { style: STILE_TITOLO }),
            colonna('A4', fornitori, { style: STILE_ETICHETTA }),
            colonna('B4', colonnaB, { style: { ...STILE_INPUT, numFmt: '#,##0' } }),
            blocco('A12', [['Totale (SUM)']], { style: STILE_ETICHETTA }),
            blocco('A13', [['Celle non vuote (COUNTA) — per confronto']], { style: STILE_ETICHETTA }),
            blocco('B13', [['=COUNTA(B4:B10)']], { style: STILE_FORMULA }),
            blocco('A14', [['Numeri veri (COUNT)']], { style: STILE_ETICHETTA }),
            areaLibera(['B12', 'B14']),
          ],
          { colWidths: { A: 260, B: 150 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          "Guarda l'allineamento della colonna B: le celle testo si spostano a sinistra, i numeri veri restano a destra. E' l'unico indizio visibile.",
          8,
        ),
        hint('H2', '=SUM(B4:B10). Le celle testo restano fuori dal totale senza nessun errore: e\' normale, e\' il fenomeno che stai osservando.', 10, 'T1'),
        hint(
          'H3',
          '=COUNT(B4:B10) conta solo i numeri veri. COUNTA(B4:B10), gia\' in B13, conta anche il testo: confronta i due valori per capire quante celle sono sporche.',
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: 'Model!B12',
    };
  },
});
