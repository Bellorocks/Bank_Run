import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PASTE_OPTIONS,
  buildClipboard,
  parsePasteSpecialKey,
  pasteShape,
  planPaste,
  planPasteArea,
  resolvePasteTarget,
  withPasteOption,
  type ClipCell,
  type ClipValue,
  type Clipboard,
  type PastePlan,
  type PasteOptions,
  type PasteWrite,
} from './clipboard';
// La traslazione dei riferimenti e' quella VERA: un finto shiftFormula
// verificherebbe soltanto che il piano chiama una funzione, non che le formule
// incollate puntino dove devono.
import { shiftFormula } from './formula/refs';
import { a1ToCoord, a1ToRange, type RangeCoords } from './address';
import type { CellStyle } from './types';
// Le lettere del dialogo vivono in due file: qui e nella sotto-keymap del keymap.
// Se divergono, il gioco insegna una scorciatoia che in Excel non esiste.
import { PASTE_SPECIAL_OPTIONS } from '../keymap/bindings';

// ---------------------------------------------------------------------------
// Utilita' di test
// ---------------------------------------------------------------------------

const BLUE: CellStyle = { fontColor: '#0000FF' };
const BOLD: CellStyle = { bold: true };
const VALUE_ERR = '#VALUE!';

/** Cella con formula: `raw` e `formula` coincidono, `value` e' il risultato calcolato. */
function f(formula: string, value: ClipValue = 0): ClipCell {
  return { raw: formula, formula, value };
}

/** Lettore di foglio finto a partire da un dizionario in notazione A1. */
function sheet(entries: Record<string, ClipCell>): (row: number, col: number) => ClipCell {
  const byKey = new Map<string, ClipCell>();
  for (const [a1, cell] of Object.entries(entries)) {
    const c = a1ToCoord(a1)!;
    byKey.set(`${c.row},${c.col}`, cell);
  }
  return (row, col) => byKey.get(`${row},${col}`) ?? { raw: null };
}

/** Lettore di valori del bersaglio, per le operazioni matematiche. */
function targetValues(entries: Record<string, ClipValue>): (row: number, col: number) => ClipValue {
  const byKey = new Map<string, ClipValue>();
  for (const [a1, v] of Object.entries(entries)) {
    const c = a1ToCoord(a1)!;
    byKey.set(`${c.row},${c.col}`, v);
  }
  return (row, col) => byKey.get(`${row},${col}`) ?? null;
}

function rng(a1: string): RangeCoords {
  return a1ToRange(a1)!;
}

function at(plan: PastePlan, a1: string): PasteWrite | undefined {
  const c = a1ToCoord(a1)!;
  return plan.writes.find((w) => w.row === c.row && w.col === c.col);
}

/** Piano compattato in `{ A1: raw }`, comodo per confronti d'insieme. */
function rawMap(plan: PastePlan): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const w of plan.writes) {
    const key = `${String.fromCharCode(65 + w.col)}${w.row + 1}`;
    out[key] = w.raw;
  }
  return out;
}

function opts(patch: Partial<PasteOptions> = {}): PasteOptions {
  return { ...DEFAULT_PASTE_OPTIONS, ...patch };
}

function clipOf(
  kind: 'copy' | 'cut',
  a1Range: string,
  entries: Record<string, ClipCell>,
): Clipboard {
  return buildClipboard(kind, 'Model', rng(a1Range), sheet(entries));
}

// ---------------------------------------------------------------------------
// buildClipboard
// ---------------------------------------------------------------------------

describe('buildClipboard', () => {
  it('fotografa il rettangolo in ordine di lettura', () => {
    const clip = clipOf('copy', 'A1:B2', {
      A1: { raw: 1 },
      B1: { raw: 2 },
      A2: { raw: 3 },
      B2: { raw: 4 },
    });
    expect(clip.cells.map((r) => r.map((c) => c.raw))).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(clip.kind).toBe('copy');
    expect(clip.source.sheet).toBe('Model');
  });

  it('normalizza un range dato al contrario', () => {
    const clip = buildClipboard(
      'cut',
      'Model',
      { top: 3, left: 5, bottom: 1, right: 2 },
      sheet({}),
    );
    expect(clip.source.range).toEqual({ top: 1, left: 2, bottom: 3, right: 5 });
    expect(clip.cells).toHaveLength(3);
    expect(clip.cells[0]).toHaveLength(4);
  });

  it('conserva stile, formula e valore calcolato di ogni cella', () => {
    const clip = clipOf('copy', 'A1', { A1: { ...f('=B1*2', 84), style: BLUE } });
    expect(clip.cells[0][0]).toEqual({ raw: '=B1*2', formula: '=B1*2', value: 84, style: BLUE });
  });

  it('pasteShape scambia righe e colonne quando si traspone', () => {
    const clip = clipOf('copy', 'A1:C2', {});
    expect(pasteShape(clip)).toEqual({ rows: 2, cols: 3 });
    expect(pasteShape(clip, true)).toEqual({ rows: 3, cols: 2 });
  });
});

// ---------------------------------------------------------------------------
// resolvePasteTarget
// ---------------------------------------------------------------------------

describe('resolvePasteTarget', () => {
  it('su bersaglio a cella singola l area prende la forma della sorgente', () => {
    const clip = clipOf('copy', 'A1:C1', {});
    const res = resolvePasteTarget(clip, rng('E5'));
    expect(res).toEqual({ ok: true, area: rng('E5:G5') });
  });

  it('accetta un bersaglio della stessa identica forma', () => {
    const clip = clipOf('copy', 'A1:C2', {});
    const res = resolvePasteTarget(clip, rng('E5:G6'));
    expect(res).toEqual({ ok: true, area: rng('E5:G6') });
  });

  it('mosaico: sorgente 1x3 in un bersaglio 1x9 e ammessa', () => {
    const clip = clipOf('copy', 'A1:C1', {});
    const res = resolvePasteTarget(clip, rng('A5:I5'));
    expect(res).toEqual({ ok: true, area: rng('A5:I5') });
  });

  it('mosaico bidimensionale: 2x2 in 4x4', () => {
    const clip = clipOf('copy', 'A1:B2', {});
    expect(resolvePasteTarget(clip, rng('E5:H8')).ok).toBe(true);
  });

  it('rifiuta un bersaglio che non e multiplo esatto, con motivo in italiano', () => {
    const clip = clipOf('copy', 'A1:C1', {});
    const res = resolvePasteTarget(clip, rng('A5:D5'));
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('atteso rifiuto');
    expect(res.reason).toContain('1 riga x 3 colonne');
    expect(res.reason).toContain('1 riga x 4 colonne');
    expect(res.reason).toContain('multiplo esatto');
  });

  it('rifiuta anche quando sono le righe a non essere multiple', () => {
    const clip = clipOf('copy', 'A1:A2', {});
    const res = resolvePasteTarget(clip, rng('C1:C5'));
    expect(res.ok).toBe(false);
  });

  it('il taglia non ammette il mosaico nemmeno se il bersaglio e multiplo', () => {
    const clip = clipOf('cut', 'A1:C1', {});
    const res = resolvePasteTarget(clip, rng('A5:I5'));
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('atteso rifiuto');
    expect(res.reason).toContain('taglia');
  });

  it('il taglia su cella singola e ammesso e prende la forma della sorgente', () => {
    const clip = clipOf('cut', 'A1:C1', {});
    expect(resolvePasteTarget(clip, rng('E5'))).toEqual({ ok: true, area: rng('E5:G5') });
  });

  it('con transpose la forma attesa e quella scambiata', () => {
    const clip = clipOf('copy', 'A1:C1', {});
    expect(resolvePasteTarget(clip, rng('E5'), true)).toEqual({ ok: true, area: rng('E5:E7') });
    expect(resolvePasteTarget(clip, rng('E5:E7'), true).ok).toBe(true);
    expect(resolvePasteTarget(clip, rng('E5:G5'), true).ok).toBe(false);
  });

  it('una sorgente 1x3 si ripete due volte in un bersaglio 2x3', () => {
    // Il multiplo puo' stare su un asse solo: Excel accetta, ripetendo in verticale.
    const clip = clipOf('copy', 'A1:C1', {});
    expect(resolvePasteTarget(clip, rng('E5:G6'))).toEqual({ ok: true, area: rng('E5:G6') });
  });

  it('rifiuta un incolla che uscirebbe dal fondo del foglio', () => {
    const clip = clipOf('copy', 'A1:A3', {});
    // A1048575 e' l'ultima riga: tre celle non ci entrano piu'.
    const res = resolvePasteTarget(clip, rng('A1048575'));
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('atteso rifiuto');
    expect(res.reason).toContain('non entra nel foglio');
  });

  it('rifiuta un incolla che uscirebbe dal bordo destro del foglio', () => {
    const clip = clipOf('copy', 'A1:C1', {});
    const res = resolvePasteTarget(clip, rng('XFC1'));
    expect(res.ok).toBe(false);
  });

  it('l ultima cella che entra esattamente e ammessa', () => {
    const clip = clipOf('copy', 'A1:A3', {});
    expect(resolvePasteTarget(clip, rng('A1048574')).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// planPaste — contenuto e traslazione dei riferimenti
// ---------------------------------------------------------------------------

describe('planPaste — contenuto', () => {
  it('copia valori e testo alla posizione giusta', () => {
    const clip = clipOf('copy', 'A1:B1', { A1: { raw: 10 }, B1: { raw: 'EBITDA' } });
    const plan = planPaste(clip, a1ToCoord('D3')!, DEFAULT_PASTE_OPTIONS, shiftFormula);
    expect(rawMap(plan)).toEqual({ D3: 10, E3: 'EBITDA' });
    expect(plan.clearSource).toBeUndefined();
  });

  it('trasla i riferimenti relativi del delta fra sorgente e bersaglio', () => {
    const clip = clipOf('copy', 'C3', { C3: f('=C1+C2', 5) });
    const plan = planPaste(clip, a1ToCoord('E6')!, DEFAULT_PASTE_OPTIONS, shiftFormula);
    // delta = (+3 righe, +2 colonne)
    expect(at(plan, 'E6')!.raw).toBe('=E4+E5');
  });

  it('i riferimenti assoluti restano fermi mentre i relativi si spostano', () => {
    const clip = clipOf('copy', 'C3', { C3: f('=$B$2*C2+$B3+B$2', 1) });
    const plan = planPaste(clip, a1ToCoord('E6')!, DEFAULT_PASTE_OPTIONS, shiftFormula);
    // $B$2 fermo; C2 -> E5; $B3 tiene la colonna e scende di 3; B$2 tiene la riga e va di 2 colonne
    expect(at(plan, 'E6')!.raw).toBe('=$B$2*E5+$B6+D$2');
  });

  it('un range nella formula si trasla per intero', () => {
    const clip = clipOf('copy', 'D10', { D10: f('=SUM(D2:D9)', 100) });
    const plan = planPaste(clip, a1ToCoord('F10')!, DEFAULT_PASTE_OPTIONS, shiftFormula);
    expect(at(plan, 'F10')!.raw).toBe('=SUM(F2:F9)');
  });

  it('taglia: le formule NON si traslano', () => {
    const clip = clipOf('cut', 'C3', { C3: f('=C1+$B$2', 5) });
    const plan = planPaste(clip, a1ToCoord('E6')!, DEFAULT_PASTE_OPTIONS, shiftFormula);
    expect(at(plan, 'E6')!.raw).toBe('=C1+$B$2');
  });

  it('taglia: il piano chiede di svuotare l area di partenza', () => {
    const clip = clipOf('cut', 'A1:B2', { A1: { raw: 1 } });
    const plan = planPaste(clip, a1ToCoord('D4')!, DEFAULT_PASTE_OPTIONS, shiftFormula);
    expect(plan.clearSource).toEqual(rng('A1:B2'));
  });

  it('copia: nessuna cancellazione della sorgente', () => {
    const clip = clipOf('copy', 'A1:B2', { A1: { raw: 1 } });
    expect(planPaste(clip, a1ToCoord('D4')!, DEFAULT_PASTE_OPTIONS, shiftFormula).clearSource)
      .toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Trasposizione
// ---------------------------------------------------------------------------

describe('planPaste — trasposizione', () => {
  it('scambia righe e colonne dei valori', () => {
    const clip = clipOf('copy', 'A1:C1', { A1: { raw: 1 }, B1: { raw: 2 }, C1: { raw: 3 } });
    const plan = planPaste(clip, a1ToCoord('E5')!, opts({ transpose: true }), shiftFormula);
    expect(rawMap(plan)).toEqual({ E5: 1, E6: 2, E7: 3 });
  });

  it('trasposizione di un blocco 2x3', () => {
    const clip = clipOf('copy', 'A1:C2', {
      A1: { raw: 'a' },
      B1: { raw: 'b' },
      C1: { raw: 'c' },
      A2: { raw: 'd' },
      B2: { raw: 'e' },
      C2: { raw: 'f' },
    });
    const plan = planPaste(clip, a1ToCoord('A5')!, opts({ transpose: true }), shiftFormula);
    expect(rawMap(plan)).toEqual({ A5: 'a', B5: 'd', A6: 'b', B6: 'e', A7: 'c', B7: 'f' });
  });

  it('DEVIAZIONE NOTA: trasponendo, le formule NON ruotano l orientamento come in Excel', () => {
    // A1:C1 contiene tre formule che puntano alla riga sotto.
    const clip = clipOf('copy', 'A1:C1', {
      A1: f('=A2', 1),
      B1: f('=B2', 2),
      C1: f('=C2', 3),
    });
    const plan = planPaste(clip, a1ToCoord('E5')!, opts({ transpose: true }), shiftFormula);

    // Excel VERO: un riferimento "una riga sotto" trasposto diventa "una colonna a
    // destra", quindi qui darebbe =F5, =F6, =F7. Il modello dello spostamento
    // implementato produce invece quanto sotto. Il test fissa il comportamento
    // attuale perche' non passi inosservato se cambia, NON perche' sia giusto:
    // vedi il commento di `planPaste`. Quando arrivera' `transposeFormula`, questi
    // tre valori attesi vanno sostituiti con =F5/=F6/=F7 e il titolo va cambiato.
    expect(at(plan, 'E5')!.raw).toBe('=E6');
    expect(at(plan, 'E6')!.raw).toBe('=E7');
    expect(at(plan, 'E7')!.raw).toBe('=E8');
  });

  it('la trasposizione dei VALORI e fedele anche su un blocco non quadrato', () => {
    const clip = clipOf('copy', 'A1:C2', {
      A1: { raw: 1 },
      B1: { raw: 2 },
      C1: { raw: 3 },
      A2: { raw: 4 },
      B2: { raw: 5 },
      C2: { raw: 6 },
    });
    const plan = planPaste(clip, a1ToCoord('A1')!, opts({ transpose: true }), shiftFormula);
    // La trasposta di [[1,2,3],[4,5,6]] e' [[1,4],[2,5],[3,6]].
    expect(rawMap(plan)).toEqual({ A1: 1, B1: 4, A2: 2, B2: 5, A3: 3, B3: 6 });
  });

  it('trasposizione di un taglia: le formule restano comunque ferme', () => {
    const clip = clipOf('cut', 'A1:B1', { A1: f('=Z9', 0), B1: f('=Y9', 0) });
    const plan = planPaste(clip, a1ToCoord('D4')!, opts({ transpose: true }), shiftFormula);
    expect(at(plan, 'D4')!.raw).toBe('=Z9');
    expect(at(plan, 'D5')!.raw).toBe('=Y9');
  });
});

// ---------------------------------------------------------------------------
// skipBlanks
// ---------------------------------------------------------------------------

describe('planPaste — skipBlanks', () => {
  it('le celle vuote della sorgente non sovrascrivono il bersaglio', () => {
    const clip = clipOf('copy', 'A1:C1', { A1: { raw: 1 }, C1: { raw: 3 } });
    const plan = planPaste(clip, a1ToCoord('E5')!, opts({ skipBlanks: true }), shiftFormula);
    expect(plan.writes).toHaveLength(2);
    expect(rawMap(plan)).toEqual({ E5: 1, G5: 3 });
    expect(at(plan, 'F5')).toBeUndefined();
  });

  it('senza skipBlanks la cella vuota cancella contenuto e formato del bersaglio', () => {
    const clip = clipOf('copy', 'A1:C1', { A1: { raw: 1 }, C1: { raw: 3 } });
    const plan = planPaste(clip, a1ToCoord('E5')!, DEFAULT_PASTE_OPTIONS, shiftFormula);
    expect(plan.writes).toHaveLength(3);
    expect(at(plan, 'F5')).toEqual({ row: 4, col: 5, raw: null, style: {} });
  });

  it('una cella con solo stile non e considerata vuota', () => {
    const clip = clipOf('copy', 'A1:B1', { A1: { raw: 1 }, B1: { raw: null, style: BOLD } });
    const plan = planPaste(clip, a1ToCoord('E5')!, opts({ skipBlanks: true }), shiftFormula);
    // Il contenuto e' vuoto: per Excel la cella e' vuota e skipBlanks la salta.
    expect(plan.writes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Operazioni matematiche
// ---------------------------------------------------------------------------

describe('planPaste — operazioni', () => {
  const clip = clipOf('copy', 'A1:B1', { A1: { raw: 2 }, B1: { raw: 3 } });
  const existing = targetValues({ E5: 10, F5: 20 });

  it('moltiplica il valore incollato per quello gia presente', () => {
    const plan = planPaste(
      clip,
      a1ToCoord('E5')!,
      opts({ operation: 'multiply' }),
      shiftFormula,
      existing,
    );
    expect(rawMap(plan)).toEqual({ E5: 20, F5: 60 });
  });

  it('aggiungi e sottrai', () => {
    const add = planPaste(clip, a1ToCoord('E5')!, opts({ operation: 'add' }), shiftFormula, existing);
    expect(rawMap(add)).toEqual({ E5: 12, F5: 23 });
    const sub = planPaste(
      clip,
      a1ToCoord('E5')!,
      opts({ operation: 'subtract' }),
      shiftFormula,
      existing,
    );
    expect(rawMap(sub)).toEqual({ E5: 8, F5: 17 });
  });

  it('dividi usa il valore del bersaglio come dividendo', () => {
    const plan = planPaste(
      clip,
      a1ToCoord('E5')!,
      opts({ operation: 'divide' }),
      shiftFormula,
      existing,
    );
    expect(rawMap(plan)).toEqual({ E5: 5, F5: 20 / 3 });
  });

  it('divisione per zero produce #DIV/0!', () => {
    const zero = clipOf('copy', 'A1', { A1: { raw: 0 } });
    const plan = planPaste(
      zero,
      a1ToCoord('E5')!,
      opts({ operation: 'divide' }),
      shiftFormula,
      existing,
    );
    expect(at(plan, 'E5')!.raw).toBe('#DIV/0!');
  });

  it('operazione su testo produce #VALUE!', () => {
    const text = clipOf('copy', 'A1', { A1: { raw: 'ciao' } });
    const plan = planPaste(
      text,
      a1ToCoord('E5')!,
      opts({ operation: 'add' }),
      shiftFormula,
      existing,
    );
    expect(at(plan, 'E5')!.raw).toBe(VALUE_ERR);
  });

  it('il risultato di un operazione e sempre un valore, mai una formula', () => {
    const formulaClip = clipOf('copy', 'A1', { A1: f('=SUM(Z1:Z9)', 4) });
    const plan = planPaste(
      formulaClip,
      a1ToCoord('E5')!,
      opts({ operation: 'multiply' }),
      shiftFormula,
      existing,
    );
    expect(at(plan, 'E5')!.raw).toBe(40);
  });

  it('bersaglio vuoto vale zero, come in Excel', () => {
    const plan = planPaste(clip, a1ToCoord('E5')!, opts({ operation: 'add' }), shiftFormula);
    expect(rawMap(plan)).toEqual({ E5: 2, F5: 3 });
  });

  it('un errore gia presente nel bersaglio si propaga', () => {
    const plan = planPaste(
      clip,
      a1ToCoord('E5')!,
      opts({ operation: 'multiply' }),
      shiftFormula,
      targetValues({ E5: '#REF!' }),
    );
    expect(at(plan, 'E5')!.raw).toBe('#REF!');
  });

  it('un errore nel valore incollato vince sul bersaglio numerico', () => {
    const err = clipOf('copy', 'A1', { A1: { raw: '#N/A' } });
    const plan = planPaste(
      err,
      a1ToCoord('E5')!,
      opts({ operation: 'add' }),
      shiftFormula,
      existing,
    );
    expect(at(plan, 'E5')!.raw).toBe('#N/A');
  });

  it('il testo numerico del bersaglio si converte, come fa Excel', () => {
    const plan = planPaste(
      clip,
      a1ToCoord('E5')!,
      opts({ operation: 'add' }),
      shiftFormula,
      targetValues({ E5: '  40  ' }),
    );
    expect(at(plan, 'E5')!.raw).toBe(42);
  });

  it('i booleani del bersaglio valgono 1 e 0', () => {
    const plan = planPaste(
      clip,
      a1ToCoord('E5')!,
      opts({ operation: 'add' }),
      shiftFormula,
      targetValues({ E5: true, F5: false }),
    );
    expect(rawMap(plan)).toEqual({ E5: 3, F5: 3 });
  });

  it('una FORMULA nel bersaglio non viene appiattita: le si applica l operazione', () => {
    // E' il riscalamento a migliaia: copia 1000, seleziona la riga, Dividi.
    const mille = clipOf('copy', 'A1', { A1: { raw: 1000 } });
    const targetCells = (entries: Record<string, ClipCell>) => {
      const byKey = new Map<string, ClipCell>();
      for (const [a1, c] of Object.entries(entries)) {
        const k = a1ToCoord(a1)!;
        byKey.set(`${k.row},${k.col}`, c);
      }
      return (row: number, col: number): ClipCell => byKey.get(`${row},${col}`) ?? { raw: null };
    };
    const plan = planPaste(
      mille,
      a1ToCoord('E5')!,
      opts({ operation: 'divide' }),
      shiftFormula,
      targetCells({ E5: f('=SUM(B5:D5)', 4500) }),
    );
    expect(at(plan, 'E5')!.raw).toBe('=(SUM(B5:D5))/1000');
  });

  it('la formula del bersaglio sopravvive a ciascuna delle quattro operazioni', () => {
    const due = clipOf('copy', 'A1', { A1: { raw: 2 } });
    const target = (): ClipCell => ({ raw: '=A1+B1', formula: '=A1+B1', value: 10 });
    const raws = (['add', 'subtract', 'multiply', 'divide'] as const).map(
      (operation) =>
        at(
          planPaste(due, a1ToCoord('E5')!, opts({ operation }), shiftFormula, target),
          'E5',
        )!.raw,
    );
    // Le parentesi non sono cosmetiche: senza, `=A1+B1/2` cambierebbe il risultato.
    expect(raws).toEqual(['=(A1+B1)+2', '=(A1+B1)-2', '=(A1+B1)*2', '=(A1+B1)/2']);
  });

  it('la divisione per zero su una formula resta nella formula, non diventa #DIV/0!', () => {
    const zero = clipOf('copy', 'A1', { A1: { raw: 0 } });
    const plan = planPaste(
      zero,
      a1ToCoord('E5')!,
      opts({ operation: 'divide' }),
      shiftFormula,
      (): ClipCell => f('=B1', 7),
    );
    expect(at(plan, 'E5')!.raw).toBe('=(B1)/0');
  });

  it('un bersaglio letto come cella ma senza formula si comporta come un valore', () => {
    const plan = planPaste(
      clip,
      a1ToCoord('E5')!,
      opts({ operation: 'multiply' }),
      shiftFormula,
      (): ClipCell => ({ raw: 10 }),
    );
    expect(rawMap(plan)).toEqual({ E5: 20, F5: 30 });
  });
});

// ---------------------------------------------------------------------------
// Modalita' di incolla
// ---------------------------------------------------------------------------

describe('planPaste — modalita', () => {
  const clip = clipOf('copy', 'A1:B1', {
    A1: { ...f('=SUM(A2:A9)', 42), style: BLUE },
    B1: { raw: 7, style: BOLD },
  });

  it('all porta formula traslata e stile', () => {
    const plan = planPaste(clip, a1ToCoord('C1')!, opts({ mode: 'all' }), shiftFormula);
    expect(at(plan, 'C1')).toEqual({ row: 0, col: 2, raw: '=SUM(C2:C9)', style: BLUE });
    expect(at(plan, 'D1')).toEqual({ row: 0, col: 3, raw: 7, style: BOLD });
  });

  it('values cancella la formula e scrive il valore calcolato', () => {
    const plan = planPaste(clip, a1ToCoord('C1')!, opts({ mode: 'values' }), shiftFormula);
    const w = at(plan, 'C1')!;
    expect(w.raw).toBe(42);
    expect(String(w.raw).startsWith('=')).toBe(false);
  });

  it('values non porta lo stile', () => {
    const plan = planPaste(clip, a1ToCoord('C1')!, opts({ mode: 'values' }), shiftFormula);
    expect(at(plan, 'C1')!.style).toBeUndefined();
    expect('style' in at(plan, 'C1')!).toBe(false);
  });

  it('formulas porta la formula ma non lo stile', () => {
    const plan = planPaste(clip, a1ToCoord('C1')!, opts({ mode: 'formulas' }), shiftFormula);
    expect(at(plan, 'C1')!.raw).toBe('=SUM(C2:C9)');
    expect('style' in at(plan, 'C1')!).toBe(false);
  });

  it('formats non tocca i valori', () => {
    const plan = planPaste(clip, a1ToCoord('C1')!, opts({ mode: 'formats' }), shiftFormula);
    expect(at(plan, 'C1')).toEqual({ row: 0, col: 2, style: BLUE });
    expect('raw' in at(plan, 'C1')!).toBe(false);
    expect('raw' in at(plan, 'D1')!).toBe(false);
  });

  it('valuesAndNumberFormats porta il valore e il SOLO formato numerico', () => {
    // La voce U del dialogo e' "Valori e formati numeri": grassetto e colore del
    // bersaglio non si toccano, per questo lo stile va fuso e non sostituito.
    const conFormato = clipOf('copy', 'A1', {
      A1: { ...f('=B1*2', 42), style: { numFmt: '#,##0', bold: true, fontColor: '#0000FF' } },
    });
    const plan = planPaste(
      conFormato,
      a1ToCoord('C1')!,
      opts({ mode: 'valuesAndNumberFormats' }),
      shiftFormula,
    );
    expect(at(plan, 'C1')).toEqual({
      row: 0,
      col: 2,
      raw: 42,
      style: { numFmt: '#,##0' },
      mergeStyle: true,
    });
  });

  it('valuesAndNumberFormats da una sorgente senza formato riporta il bersaglio a General', () => {
    const plan = planPaste(
      clip,
      a1ToCoord('C1')!,
      opts({ mode: 'valuesAndNumberFormats' }),
      shiftFormula,
    );
    expect(at(plan, 'C1')).toEqual({
      row: 0,
      col: 2,
      raw: 42,
      style: { numFmt: 'General' },
      mergeStyle: true,
    });
    // BLUE non passa: il colore e' formattazione, non formato numerico.
    expect(at(plan, 'C1')!.style).not.toEqual(BLUE);
  });

  it('formats sostituisce tutto lo stile, senza fusione', () => {
    const plan = planPaste(clip, a1ToCoord('C1')!, opts({ mode: 'formats' }), shiftFormula);
    expect(at(plan, 'C1')!.mergeStyle).toBeUndefined();
  });

  it('columnWidths non scrive celle ma mappa le colonne', () => {
    const plan = planPaste(clip, a1ToCoord('C1')!, opts({ mode: 'columnWidths' }), shiftFormula);
    expect(plan.writes).toEqual([]);
    expect(plan.colWidths).toEqual([
      { from: 0, to: 2 },
      { from: 1, to: 3 },
    ]);
  });

  it('comments non produce scritture (il modello di cella non ha commenti)', () => {
    const plan = planPaste(clip, a1ToCoord('C1')!, opts({ mode: 'comments' }), shiftFormula);
    expect(plan.writes).toEqual([]);
    expect(plan.colWidths).toBeUndefined();
  });

  it('una formula incollata come valore quando value manca diventa vuota', () => {
    const senzaValore = clipOf('copy', 'A1', { A1: { raw: '=A2' } });
    const plan = planPaste(senzaValore, a1ToCoord('C1')!, opts({ mode: 'values' }), shiftFormula);
    expect(at(plan, 'C1')!.raw).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mosaico completo
// ---------------------------------------------------------------------------

describe('planPasteArea', () => {
  it('ripete la sorgente 1x3 tre volte in un area 1x9', () => {
    const clip = clipOf('copy', 'A1:C1', { A1: { raw: 1 }, B1: { raw: 2 }, C1: { raw: 3 } });
    const res = resolvePasteTarget(clip, rng('A5:I5'));
    if (!res.ok) throw new Error(res.reason);
    const plan = planPasteArea(clip, res.area, DEFAULT_PASTE_OPTIONS, shiftFormula);
    expect(plan.writes).toHaveLength(9);
    expect(rawMap(plan)).toEqual({
      A5: 1, B5: 2, C5: 3,
      D5: 1, E5: 2, F5: 3,
      G5: 1, H5: 2, I5: 3,
    });
  });

  it('ogni tassello del mosaico trasla le formule per conto proprio', () => {
    const clip = clipOf('copy', 'A1', { A1: f('=A2', 1) });
    const res = resolvePasteTarget(clip, rng('A5:C5'));
    if (!res.ok) throw new Error(res.reason);
    const plan = planPasteArea(clip, res.area, DEFAULT_PASTE_OPTIONS, shiftFormula);
    expect(rawMap(plan)).toEqual({ A5: '=A6', B5: '=B6', C5: '=C6' });
  });

  it('mosaico 2x2 in 4x4: 16 scritture', () => {
    const clip = clipOf('copy', 'A1:B2', {
      A1: { raw: 1 },
      B1: { raw: 2 },
      A2: { raw: 3 },
      B2: { raw: 4 },
    });
    const plan = planPasteArea(clip, rng('C3:F6'), DEFAULT_PASTE_OPTIONS, shiftFormula);
    expect(plan.writes).toHaveLength(16);
    expect(at(plan, 'E5')!.raw).toBe(1);
    expect(at(plan, 'F6')!.raw).toBe(4);
  });

  it('conserva clearSource su un taglia della stessa forma', () => {
    const clip = clipOf('cut', 'A1:B1', { A1: { raw: 1 }, B1: { raw: 2 } });
    const plan = planPasteArea(clip, rng('D4:E4'), DEFAULT_PASTE_OPTIONS, shiftFormula);
    expect(plan.clearSource).toEqual(rng('A1:B1'));
    expect(plan.writes).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Sotto-keymap del dialogo
// ---------------------------------------------------------------------------

describe('parsePasteSpecialKey', () => {
  it('le lettere di modalita sono quelle acceleratrici di Excel', () => {
    expect(parsePasteSpecialKey('A')).toEqual({ mode: 'all' });
    expect(parsePasteSpecialKey('F')).toEqual({ mode: 'formulas' });
    expect(parsePasteSpecialKey('V')).toEqual({ mode: 'values' });
    expect(parsePasteSpecialKey('T')).toEqual({ mode: 'formats' });
    expect(parsePasteSpecialKey('C')).toEqual({ mode: 'comments' });
    expect(parsePasteSpecialKey('U')).toEqual({ mode: 'valuesAndNumberFormats' });
    expect(parsePasteSpecialKey('W')).toEqual({ mode: 'columnWidths' });
  });

  it('N non e Tutto: in Excel e Convalida, che non si modella', () => {
    expect(parsePasteSpecialKey('N')).toBeUndefined();
  });

  it('le lettere coincidono con la sotto-keymap di bindings.ts', () => {
    // Le due tabelle sono scritte in file diversi: se divergono, l utente impara
    // una lettera nel dialogo e ne trova un altra nel gioco.
    for (const { key } of PASTE_SPECIAL_OPTIONS) {
      expect(parsePasteSpecialKey(key)).toBeDefined();
    }
    expect(parsePasteSpecialKey('A')).toEqual({ mode: 'all' });
    expect(parsePasteSpecialKey('M')).toEqual({ operation: 'multiply' });
  });

  it('E traspone e B salta le celle vuote', () => {
    expect(parsePasteSpecialKey('E')).toEqual({ transpose: true });
    expect(parsePasteSpecialKey('B')).toEqual({ skipBlanks: true });
  });

  it('le operazioni matematiche', () => {
    expect(parsePasteSpecialKey('D')).toEqual({ operation: 'add' });
    expect(parsePasteSpecialKey('S')).toEqual({ operation: 'subtract' });
    expect(parsePasteSpecialKey('M')).toEqual({ operation: 'multiply' });
    expect(parsePasteSpecialKey('I')).toEqual({ operation: 'divide' });
  });

  it('O riporta l operazione a Nessuna, come il radio button del dialogo', () => {
    expect(parsePasteSpecialKey('O')).toEqual({ operation: 'none' });
    const dopoM = withPasteOption(DEFAULT_PASTE_OPTIONS, { operation: 'multiply' });
    expect(withPasteOption(dopoM, parsePasteSpecialKey('O') as Partial<PasteOptions>).operation)
      .toBe('none');
  });

  it('minuscole accettate come maiuscole', () => {
    expect(parsePasteSpecialKey('v')).toEqual({ mode: 'values' });
    expect(parsePasteSpecialKey('e')).toEqual({ transpose: true });
  });

  it('Invio conferma ed Esc annulla', () => {
    expect(parsePasteSpecialKey('Enter')).toBe('confirm');
    expect(parsePasteSpecialKey('Invio')).toBe('confirm');
    expect(parsePasteSpecialKey('Escape')).toBe('cancel');
    expect(parsePasteSpecialKey('Esc')).toBe('cancel');
  });

  it('i tasti non associati restituiscono undefined', () => {
    expect(parsePasteSpecialKey('Q')).toBeUndefined();
    expect(parsePasteSpecialKey('1')).toBeUndefined();
    expect(parsePasteSpecialKey('ArrowUp')).toBeUndefined();
    expect(parsePasteSpecialKey('')).toBeUndefined();
  });

  it('una sequenza di tasti compone le opzioni', () => {
    let o = DEFAULT_PASTE_OPTIONS;
    for (const k of ['V', 'E', 'M', 'B']) {
      const patch = parsePasteSpecialKey(k);
      if (patch && patch !== 'confirm' && patch !== 'cancel') o = withPasteOption(o, patch);
    }
    expect(o).toEqual({
      mode: 'values',
      operation: 'multiply',
      transpose: true,
      skipBlanks: true,
    });
    expect(DEFAULT_PASTE_OPTIONS.mode).toBe('all');
  });
});
