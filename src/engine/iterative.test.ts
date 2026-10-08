/**
 * Test del calcolo iterativo.
 *
 * Regola di questi test: i valori attesi sono calcolati A MANO nel commento sopra
 * ogni caso, risolvendo il punto fisso in forma chiusa. Non sono mai ricalcolati
 * dal codice sotto test — altrimenti il test verificherebbe solo che il solver e'
 * coerente con se stesso, non che risolve il problema giusto.
 */

import { HyperFormula } from 'hyperformula';
import { describe, expect, it } from 'vitest';

import { DEFAULT_ITERATIVE, detectCycleCells, solveIterative } from './iterative';
import type { IterativeConfig } from './iterative';

const HF_CONFIG = { licenseKey: 'gpl-v3' } as const;

/** Config di lavoro: quella di spec §3.1, ma accesa. */
const ON: IterativeConfig = { ...DEFAULT_ITERATIVE, enabled: true };

function build(sheets: Record<string, (string | number | null)[][]>): HyperFormula {
  return HyperFormula.buildFromSheets(sheets, HF_CONFIG);
}

describe('DEFAULT_ITERATIVE', () => {
  it('riproduce i default di spec §3.1: spenta, 100 iterazioni, delta 0,001', () => {
    // Spenta di default e' voluto: con l'iterazione sempre accesa un riferimento
    // circolare accidentale non verrebbe mai mostrato allo studente.
    expect(DEFAULT_ITERATIVE).toEqual({ enabled: false, maxIterations: 100, delta: 0.001 });
  });
});

describe('detectCycleCells', () => {
  it('modello senza cicli: nessuna cella segnalata e il solver non fa nulla', () => {
    const hf = build({ Model: [[10, '=A1*2', '=B1+A1']] });
    try {
      expect(detectCycleCells(hf)).toEqual([]);

      const res = solveIterative(hf, ON);
      expect(res.cycleCells).toEqual([]);
      expect(res.iterations).toBe(0);
      expect(res.values.size).toBe(0);
      // Niente da risolvere e' una convergenza banale, non un fallimento.
      expect(res.converged).toBe(true);
      expect(hf.getCellValue({ sheet: 0, row: 0, col: 2 })).toBe(30);
    } finally {
      hf.destroy();
    }
  });

  it('trova entrambe le celle di un ciclo a due', () => {
    const hf = build({ Model: [['=B1*0.5+10', '=A1+5']] });
    try {
      expect(detectCycleCells(hf)).toEqual(['Model!A1', 'Model!B1']);
    } finally {
      hf.destroy();
    }
  });

  it('include le celle a valle che si limitano a propagare #CYCLE!', () => {
    // C1 non fa parte del ciclo, lo consuma soltanto. HyperFormula le assegna
    // comunque #CYCLE! (come Excel, che la conta fra i riferimenti circolari):
    // congelarla e rivalutarla non sposta il punto fisso e in cambio mette anche
    // il suo valore nel risultato.
    const hf = build({ Model: [['=B1*0.5+10', '=A1+5', '=A1+B1']] });
    try {
      expect(detectCycleCells(hf)).toEqual(['Model!A1', 'Model!B1', 'Model!C1']);
    } finally {
      hf.destroy();
    }
  });

  it('quota i nomi foglio che lo richiedono', () => {
    const hf = build({
      'Deal Model': [['=Inputs!A1*0.5+10']],
      Inputs: [["='Deal Model'!A1+5"]],
    });
    try {
      expect(detectCycleCells(hf)).toEqual(["'Deal Model'!A1", 'Inputs!A1']);
    } finally {
      hf.destroy();
    }
  });
});

describe('solveIterative — ciclo a due celle', () => {
  /**
   * A1 = B1*0,5 + 10 ; B1 = A1 + 5
   * Sostituendo:  A1 = (A1 + 5)*0,5 + 10 = 0,5·A1 + 12,5  =>  0,5·A1 = 12,5  =>  A1 = 25
   * quindi B1 = 30. Soluzione esatta, niente arrotondamenti.
   */
  it('converge alla soluzione analitica A1=25, B1=30', () => {
    const hf = build({ Model: [['=B1*0.5+10', '=A1+5']] });
    try {
      const res = solveIterative(hf, ON);

      expect(res.converged).toBe(true);
      expect(res.maxDelta).toBeLessThan(0.001);
      expect(res.values.get('Model!A1')).toBeCloseTo(25, 2);
      expect(res.values.get('Model!B1')).toBeCloseTo(30, 2);
    } finally {
      hf.destroy();
    }
  });

  it('impiega esattamente 15 sweep: l errore si dimezza a ogni giro', () => {
    // Gauss-Seidel su questo ciclo ha fattore di contrazione 0,5 e parte da 0
    // (partenza a freddo di Excel). Lo scarto massimo dello sweep k vale
    // 15 · 0,5^(k-1): 15, 7,5, 3,75, ... Scende sotto 0,001 per la prima volta a
    // k = 15 (15·0,5^14 = 0,000915...), mentre a k = 14 vale ancora 0,00183.
    // Il conteggio esatto e' l'unica prova che gli aggiornamenti sono immediati
    // (Gauss-Seidel) e non differiti a fine sweep (Jacobi, che qui ci metterebbe di piu').
    const hf = build({ Model: [['=B1*0.5+10', '=A1+5']] });
    try {
      expect(solveIterative(hf, ON).iterations).toBe(15);
    } finally {
      hf.destroy();
    }
  });

  it('tronca a maxIterations se il budget di iterazioni non basta', () => {
    const hf = build({ Model: [['=B1*0.5+10', '=A1+5']] });
    try {
      const res = solveIterative(hf, { enabled: true, maxIterations: 3, delta: 0.001 });
      expect(res.iterations).toBe(3);
      expect(res.converged).toBe(false);
      expect(res.maxDelta).toBeCloseTo(3.75, 10); // 15 · 0,5^2
      // I valori parziali ci sono comunque: A1 dopo 3 sweep vale 21,25.
      expect(res.values.get('Model!A1')).toBeCloseTo(21.25, 10);
    } finally {
      hf.destroy();
    }
  });

  it('non tocca il modello dell utente: le celle restano #CYCLE!', () => {
    const hf = build({ Model: [['=B1*0.5+10', '=A1+5']] });
    try {
      solveIterative(hf, ON);
      const a1 = hf.getCellValue({ sheet: 0, row: 0, col: 0 });
      expect((a1 as { type?: string }).type).toBe('CYCLE');
      expect(hf.getCellFormula({ sheet: 0, row: 0, col: 0 })).toBe('=B1*0.5+10');
    } finally {
      hf.destroy();
    }
  });

  it('con enabled:false rileva i cicli ma non li risolve', () => {
    const hf = build({ Model: [['=B1*0.5+10', '=A1+5']] });
    try {
      const res = solveIterative(hf, DEFAULT_ITERATIVE);
      expect(res.cycleCells).toEqual(['Model!A1', 'Model!B1']);
      expect(res.iterations).toBe(0);
      expect(res.values.size).toBe(0);
      // Cicli presenti e solver spento: il modello resta irrisolto, va detto.
      expect(res.converged).toBe(false);
    } finally {
      hf.destroy();
    }
  });
});

describe('solveIterative — casi limite', () => {
  /** A1 = A1*0,5 + 10  =>  0,5·A1 = 10  =>  A1 = 20. */
  it('risolve l autoriferimento diretto', () => {
    const hf = build({ Model: [['=A1*0.5+10']] });
    try {
      expect(detectCycleCells(hf)).toEqual(['Model!A1']);
      const res = solveIterative(hf, ON);
      expect(res.converged).toBe(true);
      expect(res.values.get('Model!A1')).toBeCloseTo(20, 2);
    } finally {
      hf.destroy();
    }
  });

  /** Stesso punto fisso del ciclo a due celle, ma a cavallo di due fogli. */
  it('risolve un ciclo che attraversa due fogli, con nome da quotare', () => {
    const hf = build({
      'Deal Model': [['=Inputs!A1*0.5+10']],
      Inputs: [["='Deal Model'!A1+5"]],
    });
    try {
      const res = solveIterative(hf, ON);
      expect(res.converged).toBe(true);
      expect(res.values.get("'Deal Model'!A1")).toBeCloseTo(25, 2);
      expect(res.values.get('Inputs!A1')).toBeCloseTo(30, 2);
    } finally {
      hf.destroy();
    }
  });

  /** Con il consumatore a valle: C1 = A1 + B1 = 25 + 30 = 55. */
  it('porta a convergenza anche la cella a valle del ciclo', () => {
    const hf = build({ Model: [['=B1*0.5+10', '=A1+5', '=A1+B1']] });
    try {
      const res = solveIterative(hf, ON);
      expect(res.converged).toBe(true);
      expect(res.values.get('Model!C1')).toBeCloseTo(55, 2);
    } finally {
      hf.destroy();
    }
  });

  /**
   * A1 = B1*2 ; B1 = A1*2 + 1  =>  A1 = 4·A1 + 2, punto fisso A1 = -2/3,
   * ma il fattore di contrazione e' 4 > 1: partendo da 0 l'iterazione se ne
   * allontana, quadruplicando a ogni giro. Deve troncare, non esplodere.
   */
  it('caso divergente: tronca a maxIterations senza sollevare eccezioni', () => {
    const hf = build({ Model: [['=B1*2', '=A1*2+1']] });
    try {
      let res!: ReturnType<typeof solveIterative>;
      expect(() => {
        res = solveIterative(hf, ON);
      }).not.toThrow();

      expect(res.converged).toBe(false);
      expect(res.iterations).toBe(100);
      expect(res.maxDelta).toBeGreaterThan(1);
      // I valori sono esplosi ma restano numeri: nessun NaN nel risultato.
      for (const v of res.values.values()) expect(Number.isNaN(v)).toBe(false);
    } finally {
      hf.destroy();
    }
  });

  it('sanifica una config assurda invece di rompersi', () => {
    const hf = build({ Model: [['=B1*0.5+10', '=A1+5']] });
    try {
      // maxIterations 0 viene alzato a 1 (minimo di Excel): uno sweep si fa comunque.
      const res = solveIterative(hf, { enabled: true, maxIterations: 0, delta: 0.001 });
      expect(res.iterations).toBe(1);
      expect(res.converged).toBe(false);
    } finally {
      hf.destroy();
    }
  });
});

// ---------------------------------------------------------------------------
// Il caso vero: debt schedule LBO con interessi circolari
// ---------------------------------------------------------------------------

/**
 * Mini debt schedule di un periodo, con cash sweep e interessi sul debito MEDIO:
 * e' la circolarita' canonica del modulo M8. La catena e'
 *   interessi -> EBT -> utile netto -> cassa disponibile -> rimborso ->
 *   debito di fine periodo -> debito medio -> interessi.
 *
 * Assumption (numeri mid-market realistici, in milioni):
 *   EBITDA 20,0 · D&A 5,0 · Capex 3,0 · Delta NWC 1,0 · tax rate 24% ·
 *   tasso 6% · debito iniziale 80,0
 *
 * SOLUZIONE ANALITICA (fatta a mano, non ricalcolata dal codice):
 *   EBIT = 20 - 5 = 15
 *   NI   = (15 - I)·0,76
 *   FCF  = NI + D&A - Capex - dNWC = (15 - I)·0,76 + 1 = 12,4 - 0,76·I
 *   R    = FCF  (il sweep e' integrale e minore del debito iniziale)
 *   EoP  = 80 - R = 67,6 + 0,76·I
 *   medio= (80 + EoP)/2 = 73,8 + 0,38·I
 *   I    = 0,06·medio = 4,428 + 0,0228·I   =>   I = 4,428 / 0,9772 = 4,5313140
 * da cui
 *   FCF = rimborso = 8,9562014 · EoP = 71,0437986 · medio = 75,5218993
 *   EBT = 10,4686860 · imposte = 2,5124846 · utile netto = 7,9562014
 *
 * Il fattore di contrazione e' 0,0228: la circolarita' di un LBO vero converge
 * in una manciata di giri, non in cento. E' proprio per questo che in Excel
 * l'iterative calculation e' una spunta e non un problema numerico.
 */
const LBO_SHEET: (string | number | null)[][] = [
  ['EBITDA', 20], // riga 1
  ['D&A', 5], // riga 2
  ['Capex', 3], // riga 3
  ['Delta NWC', 1], // riga 4
  ['Tax rate', 0.24], // riga 5
  ['Tasso interesse', 0.06], // riga 6
  ['Debito iniziale', 80], // riga 7
  [null, null], // riga 8
  ['EBIT', '=B1-B2'], // riga 9
  ['Interessi', '=B6*B18'], // riga 10  <- circolare: legge il debito medio
  ['EBT', '=B9-B10'], // riga 11
  ['Imposte', '=MAX(0,B11*B5)'], // riga 12
  ['Utile netto', '=B11-B12'], // riga 13
  ['Cassa disponibile', '=B13+B2-B3-B4'], // riga 14
  ['Rimborso (cash sweep)', '=MIN(B14,B7)'], // riga 15
  ['Debito inizio periodo', '=B7'], // riga 16
  ['Debito fine periodo', '=B16-B15'], // riga 17
  ['Debito medio', '=(B16+B17)/2'], // riga 18
];

describe('solveIterative — debt schedule LBO con interessi circolari', () => {
  it('converge in molto meno di 100 iterazioni e il debito di fine periodo quadra', () => {
    const hf = build({ Model: LBO_SHEET });
    try {
      // Solo la catena circolare e' segnalata: B9 (EBIT) e B16 (debito iniziale)
      // dipendono da sole assumption e restano fuori.
      expect(detectCycleCells(hf)).toEqual([
        'Model!B10',
        'Model!B11',
        'Model!B12',
        'Model!B13',
        'Model!B14',
        'Model!B15',
        'Model!B17',
        'Model!B18',
      ]);

      const t0 = performance.now();
      const res = solveIterative(hf, ON);
      const ms = performance.now() - t0;
      console.log(`[iterative] LBO debt schedule: ${res.iterations} sweep in ${ms.toFixed(2)} ms`);

      expect(res.converged).toBe(true);
      expect(res.iterations).toBeLessThan(100);
      expect(res.maxDelta).toBeLessThan(0.001);

      const interessi = res.values.get('Model!B10') as number;
      const ebt = res.values.get('Model!B11') as number;
      const imposte = res.values.get('Model!B12') as number;
      const utileNetto = res.values.get('Model!B13') as number;
      const cassa = res.values.get('Model!B14') as number;
      const rimborso = res.values.get('Model!B15') as number;
      const debitoEoP = res.values.get('Model!B17') as number;
      const debitoMedio = res.values.get('Model!B18') as number;

      // Valori attesi: quelli della soluzione in forma chiusa qui sopra.
      expect(interessi).toBeCloseTo(4.5313140, 3);
      expect(ebt).toBeCloseTo(10.4686860, 3);
      expect(imposte).toBeCloseTo(2.5124846, 3);
      expect(utileNetto).toBeCloseTo(7.9562014, 3);
      expect(cassa).toBeCloseTo(8.9562014, 3);
      expect(rimborso).toBeCloseTo(8.9562014, 3);
      expect(debitoEoP).toBeCloseTo(71.0437986, 3);
      expect(debitoMedio).toBeCloseTo(75.5218993, 3);

      // QUADRATURA — le identita' contabili devono valere sui valori finali,
      // non solo "circa". Gauss-Seidel aggiorna in ordine di riga, quindi il
      // debito di fine periodo e' costruito sul rimborso gia' aggiornato: la
      // chiusura del bridge del debito e' esatta a meno dell'arrotondamento.
      // Tolleranza 1e-8 e non zero perche' HyperFormula applica lo smart
      // rounding di Excel ai risultati (`precisionRounding`), quindi il valore
      // che rileggiamo non e' bit-per-bit quello dell'aritmetica IEEE.
      expect(debitoEoP).toBeCloseTo(80 - rimborso, 8);
      expect(debitoMedio).toBeCloseTo((80 + debitoEoP) / 2, 8);
      expect(utileNetto).toBeCloseTo(ebt - imposte, 8);
      expect(cassa).toBeCloseTo(utileNetto + 5 - 3 - 1, 8);
      // Gli interessi sono l'unico anello calcolato sul debito medio dello sweep
      // PRECEDENTE: qui la chiusura vale solo entro la tolleranza di convergenza.
      expect(interessi).toBeCloseTo(0.06 * debitoMedio, 3);
    } finally {
      hf.destroy();
    }
  });

  it('con un tasso piu alto e leva piu alta converge comunque', () => {
    // Stessa struttura, parametri da unitranche: tasso 9%, debito 100, EBITDA 18.
    // I = 0,09·(100 + EoP)/2 con EoP = 100 - FCF, FCF = (13 - I)·0,76 + 1
    //   FCF = 10,88 - 0,76·I ; EoP = 89,12 + 0,76·I ; medio = 94,56 + 0,38·I
    //   I = 8,5104 + 0,0342·I  =>  I = 8,5104/0,9658 = 8,8117623
    //   FCF = 10,88 - 0,76·8,8117623 = 4,1830607 ; EoP = 100 - FCF = 95,8169393
    const hf = build({
      Model: [
        ['EBITDA', 18],
        ['D&A', 5],
        ['Capex', 3],
        ['Delta NWC', 1],
        ['Tax rate', 0.24],
        ['Tasso interesse', 0.09],
        ['Debito iniziale', 100],
        [null, null],
        ['EBIT', '=B1-B2'],
        ['Interessi', '=B6*B18'],
        ['EBT', '=B9-B10'],
        ['Imposte', '=MAX(0,B11*B5)'],
        ['Utile netto', '=B11-B12'],
        ['Cassa disponibile', '=B13+B2-B3-B4'],
        ['Rimborso (cash sweep)', '=MIN(B14,B7)'],
        ['Debito inizio periodo', '=B7'],
        ['Debito fine periodo', '=B16-B15'],
        ['Debito medio', '=(B16+B17)/2'],
      ],
    });
    try {
      const res = solveIterative(hf, ON);
      expect(res.converged).toBe(true);
      expect(res.iterations).toBeLessThan(100);
      expect(res.values.get('Model!B10')).toBeCloseTo(8.8117623, 3);
      expect(res.values.get('Model!B17')).toBeCloseTo(95.8169393, 3);
    } finally {
      hf.destroy();
    }
  });
});
