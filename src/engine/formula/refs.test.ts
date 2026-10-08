import { describe, expect, it } from 'vitest';

import { LAST_COL, LAST_ROW } from '../address';
import { parseFormula } from './parser';
import {
  assignRefColors,
  collectFunctions,
  collectNumericLiterals,
  collectRefs,
  collectRefsFromText,
  formulasEquivalent,
  isWholeSheetSpan,
  normalizeForComparison,
  referencesCell,
  shiftFormula,
} from './refs';

function ast(src: string) {
  return parseFormula(src).ast;
}

function refTexts(src: string): string[] {
  return collectRefsFromText(src).map((r) => r.text);
}

// ---------------------------------------------------------------------------
// collectRefs
// ---------------------------------------------------------------------------

describe('collectRefs — tutti i tipi di riferimento', () => {
  it('cella relativa, assoluta e mista', () => {
    const refs = collectRefsFromText('=A1+$B$2+C$3+$D4');
    expect(refs.map((r) => r.text)).toEqual(['A1', '$B$2', 'C$3', '$D4']);
    expect(refs.map((r) => r.kind)).toEqual(['cell', 'cell', 'cell', 'cell']);
    expect(refs[0].anchors).toEqual({
      startRowAbs: false,
      startColAbs: false,
      endRowAbs: false,
      endColAbs: false,
    });
    expect(refs[1].anchors).toEqual({
      startRowAbs: true,
      startColAbs: true,
      endRowAbs: true,
      endColAbs: true,
    });
    expect(refs[2].anchors.startRowAbs).toBe(true);
    expect(refs[2].anchors.startColAbs).toBe(false);
    expect(refs[3].anchors.startRowAbs).toBe(false);
    expect(refs[3].anchors.startColAbs).toBe(true);
  });

  it('l"area di una cella e" il rettangolo 1x1 in coordinate 0-based', () => {
    const [r] = collectRefsFromText('=D24');
    expect(r.area).toEqual({ top: 23, left: 3, bottom: 23, right: 3 });
    expect(r.wholeColumn).toBe(false);
    expect(r.wholeRow).toBe(false);
  });

  it('range: area normalizzata anche se scritto al contrario', () => {
    const [dritto] = collectRefsFromText('=SUM(A1:C5)');
    expect(dritto.area).toEqual({ top: 0, left: 0, bottom: 4, right: 2 });
    const [storto] = collectRefsFromText('=SUM(C5:A1)');
    // Il testo resta quello scritto, l'area no: `top<=bottom` sempre.
    expect(storto.text).toBe('C5:A1');
    expect(storto.area).toEqual({ top: 0, left: 0, bottom: 4, right: 2 });
  });

  it('colonna intera e riga intera coprono tutto il foglio in una direzione', () => {
    const [col] = collectRefsFromText('=SUM(B:B)');
    expect(col.wholeColumn).toBe(true);
    expect(col.area).toEqual({ top: 0, left: 1, bottom: LAST_ROW, right: 1 });

    const [row] = collectRefsFromText('=SUM(3:3)');
    expect(row.wholeRow).toBe(true);
    expect(row.area).toEqual({ top: 2, left: 0, bottom: 2, right: LAST_COL });
  });

  it('riferimenti qualificati con foglio, quotato e non', () => {
    const refs = collectRefsFromText("=Model!D24+'Deal Model'!A1:B2");
    expect(refs.map((r) => r.sheet)).toEqual(['Model', 'Deal Model']);
    expect(refs.map((r) => r.kind)).toEqual(['cell', 'range']);
  });

  it('nome foglio con apostrofo interno', () => {
    const [r] = collectRefsFromText("='O''Brien'!$B$5");
    expect(r.sheet).toBe("O'Brien");
    expect(r.text).toBe("'O''Brien'!$B$5");
  });

  it('un riferimento senza foglio non espone la chiave sheet', () => {
    const [r] = collectRefsFromText('=A1');
    expect(r.sheet).toBeUndefined();
  });

  it('i riferimenti escono in ordine di apparizione nel testo', () => {
    expect(refTexts('=SUM(Z9,A1)+M5')).toEqual(['Z9', 'A1', 'M5']);
  });

  it('gli offset ritagliano esattamente il riferimento nella sorgente', () => {
    const src = "=SUM('Deal Model'!A1:B2,C3)";
    for (const r of collectRefsFromText(src)) {
      expect(src.slice(r.start, r.end)).toBe(r.text);
    }
  });

  it('un range non viene contato anche come due celle', () => {
    // `A1:B2` e' un nodo solo: se il grader vedesse anche A1 e B2 conterebbe
    // tre riferimenti dove ce n'e' uno.
    expect(refTexts('=SUM(A1:B2)')).toEqual(['A1:B2']);
  });

  it('quel che sembra un riferimento dentro una stringa non e" un riferimento', () => {
    expect(refTexts('=IF(A1,"vedi B7","")')).toEqual(['A1']);
  });

  it('i nomi definiti e i riferimenti fuori foglio non sono riferimenti', () => {
    expect(refTexts('=Growth*XFE1+A1048577')).toEqual([]);
  });

  it('collectRefs su albero indefinito restituisce lista vuota', () => {
    expect(collectRefs(undefined)).toEqual([]);
    expect(collectRefs(ast('='))).toEqual([]);
  });

  it('i riferimenti sopravvivono a una formula sintatticamente rotta', () => {
    // La barra della formula colora mentre si digita: l'albero e' quasi sempre
    // incompleto e i riferimenti devono uscire lo stesso.
    expect(refTexts('=SUM(A1:A5)+B')).toEqual(['A1:A5']);
    expect(refTexts('=SUM(A1,')).toEqual(['A1']);
  });
});

// ---------------------------------------------------------------------------
// collectFunctions
// ---------------------------------------------------------------------------

describe('collectFunctions', () => {
  it('maiuscolo, senza duplicati, in ordine di prima apparizione', () => {
    expect(collectFunctions(ast('=iferror(SUM(A1:A5)/sum(B1:B5),0)'))).toEqual([
      'IFERROR',
      'SUM',
    ]);
  });

  it('nessuna funzione, albero assente', () => {
    expect(collectFunctions(ast('=A1+1'))).toEqual([]);
    expect(collectFunctions(undefined)).toEqual([]);
  });

  it('LOG10 e" una funzione, non un riferimento — regressione', () => {
    expect(collectFunctions(ast('=LOG10(A1)'))).toEqual(['LOG10']);
    expect(refTexts('=LOG10(A1)')).toEqual(['A1']);
  });

  it('TRUE() e" una funzione, TRUE da solo no', () => {
    expect(collectFunctions(ast('=TRUE()'))).toEqual(['TRUE']);
    expect(collectFunctions(ast('=TRUE'))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// collectNumericLiterals
// ---------------------------------------------------------------------------

describe('collectNumericLiterals', () => {
  it('valore, testo e posizione di ogni literal', () => {
    const lits = collectNumericLiterals(ast('=A1*1.50+2'));
    expect(lits.map((l) => [l.value, l.text])).toEqual([
      [1.5, '1.50'],
      [2, '2'],
    ]);
    expect('=A1*1.50+2'.slice(lits[0].start, lits[0].end)).toBe('1.50');
  });

  it('negated distingue il meno unario dalla sottrazione', () => {
    const lits = collectNumericLiterals(ast('=-1+2-3'));
    expect(lits.map((l) => [l.value, l.negated])).toEqual([
      [1, true],
      [2, false],
      // `-3` qui e' una sottrazione fra 2 e 3, non un literal negativo.
      [3, false],
    ]);
  });

  it('negated vale anche in mezzo a una formula', () => {
    expect(collectNumericLiterals(ast('=A1*-1')).map((l) => l.negated)).toEqual([true]);
    expect(collectNumericLiterals(ast('=SUM(A1,-2)')).map((l) => l.negated)).toEqual([true]);
  });

  it('i numeri dentro le stringhe non sono literal numerici', () => {
    expect(collectNumericLiterals(ast('="12 mesi"&3')).map((l) => l.value)).toEqual([3]);
  });

  it('la percentuale non nasconde il literal', () => {
    expect(collectNumericLiterals(ast('=A1*8%')).map((l) => [l.value, l.negated])).toEqual([
      [8, false],
    ]);
  });

  it('nessun literal, albero assente', () => {
    expect(collectNumericLiterals(ast('=SUM(A1:A5)'))).toEqual([]);
    expect(collectNumericLiterals(undefined)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// referencesCell
// ---------------------------------------------------------------------------

describe('referencesCell', () => {
  const model = ast('=SUM(Model!A1:B2)+Other!D24+D9');

  it('riferimento diretto', () => {
    expect(referencesCell(ast('=D9*2'), 'D9')).toBe(true);
    expect(referencesCell(ast('=D9*2'), 'D10')).toBe(false);
  });

  it('gli ancoraggi del target sono ignorati', () => {
    expect(referencesCell(ast('=$D$9'), 'D9')).toBe(true);
    expect(referencesCell(ast('=D9'), '$D$9')).toBe(true);
  });

  it('per default un range che contiene la cella basta', () => {
    expect(referencesCell(model, 'Model!B1')).toBe(true);
  });

  it('con allowViaRange:false serve il riferimento puntuale', () => {
    expect(referencesCell(model, 'Model!B1', { allowViaRange: false })).toBe(false);
    expect(referencesCell(model, 'Other!D24', { allowViaRange: false })).toBe(true);
  });

  it('colonna intera contiene qualunque riga di quella colonna', () => {
    const wholeCol = ast('=SUM(A:A)');
    expect(referencesCell(wholeCol, 'A5')).toBe(true);
    expect(referencesCell(wholeCol, 'B5')).toBe(false);
    expect(referencesCell(wholeCol, 'A5', { allowViaRange: false })).toBe(false);
  });

  it('contextSheet decide a chi punta un riferimento non qualificato', () => {
    expect(referencesCell(model, 'D9', { contextSheet: 'Model' })).toBe(true);
    expect(referencesCell(model, 'Other!D9', { contextSheet: 'Model' })).toBe(false);
    // Il confronto fra nomi foglio e' case-insensitive, come in Excel.
    expect(referencesCell(model, 'D9', { contextSheet: 'MODEL' })).toBe(true);
  });

  it('senza contextSheet resta permissivo, per non bocciare una risposta giusta', () => {
    // `Other!D24` e `D24`: senza sapere su che foglio vive la formula non si puo'
    // escludere che coincidano.
    expect(referencesCell(model, 'D24')).toBe(true);
    expect(referencesCell(model, 'D24', { contextSheet: 'Model' })).toBe(false);
  });

  it('target non parsificabile o non puntuale: falso, mai eccezione', () => {
    expect(referencesCell(model, 'ZZZZ1')).toBe(false);
    expect(referencesCell(model, 'A1:B2')).toBe(false);
    expect(referencesCell(model, '')).toBe(false);
    expect(referencesCell(undefined, 'A1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// assignRefColors
// ---------------------------------------------------------------------------

describe('assignRefColors', () => {
  const refs = collectRefsFromText('=A1+$A$1+B2+A1+Model!A1');

  it('stessa area, stesso colore: gli ancoraggi non contano', () => {
    expect(assignRefColors(refs).map((r) => r.colorIndex)).toEqual([0, 0, 1, 0, 2]);
  });

  it('gli indici seguono l"ordine di prima apparizione', () => {
    expect(assignRefColors(collectRefsFromText('=Z9+A1+Z9')).map((r) => r.colorIndex)).toEqual([
      0, 1, 0,
    ]);
  });

  it('lo stesso foglio scritto in modo diverso non cambia colore', () => {
    // Il prefisso quotato e' solo sintassi: l'area e' la stessa.
    const same = collectRefsFromText("=Model!A1+'Model'!A1");
    expect(assignRefColors(same).map((r) => r.colorIndex)).toEqual([0, 0]);
  });

  it('un range e la sua cella singola equivalente condividono l"area', () => {
    expect(assignRefColors(collectRefsFromText('=A1+A1:A1')).map((r) => r.colorIndex)).toEqual([
      0, 0,
    ]);
  });

  it('con una tavolozza finita gli indici ciclano', () => {
    expect(assignRefColors(refs, 2).map((r) => r.colorIndex)).toEqual([0, 0, 1, 0, 0]);
    expect(assignRefColors(refs, 1).map((r) => r.colorIndex)).toEqual([0, 0, 0, 0, 0]);
  });

  it('e" stabile: due chiamate danno lo stesso risultato', () => {
    expect(assignRefColors(refs).map((r) => r.colorIndex)).toEqual(
      assignRefColors(refs).map((r) => r.colorIndex),
    );
  });

  it('conserva tutti i campi dell"occorrenza', () => {
    const [first] = assignRefColors(refs);
    expect(first.text).toBe('A1');
    expect(first.area).toEqual({ top: 0, left: 0, bottom: 0, right: 0 });
  });
});

// ---------------------------------------------------------------------------
// shiftFormula
// ---------------------------------------------------------------------------

describe('shiftFormula', () => {
  it('trasla i relativi e lascia fermi gli assoluti', () => {
    expect(shiftFormula('=$A1+A$1+$A$1+A1', 2, 3)).toBe('=$A3+D$1+$A$1+D3');
  });

  it('fill down e fill right elementari', () => {
    expect(shiftFormula('=A1*B1', 1, 0)).toBe('=A2*B2');
    expect(shiftFormula('=A1*B1', 0, 1)).toBe('=B1*C1');
    expect(shiftFormula('=SUM(A1:A5)', 3, 0)).toBe('=SUM(A4:A8)');
  });

  it('delta nullo: la formula torna identica, byte per byte', () => {
    const src = '=  sum( a1 , 2 )  ';
    expect(shiftFormula(src, 0, 0)).toBe(src);
  });

  it('fuori dai limiti del foglio diventa #REF!', () => {
    expect(shiftFormula('=A1+$A$1+XFD1', -1, 0)).toBe('=#REF!+$A$1+#REF!');
    expect(shiftFormula('=XFD1+A1', 0, 1)).toBe('=#REF!+B1');
    expect(shiftFormula('=A1', 0, -1)).toBe('=#REF!');
    expect(shiftFormula('=XFD1048576', 1, 0)).toBe('=#REF!');
  });

  it('un range che sborda diventa #REF! per intero, non a meta"', () => {
    // Excel non spezza un range: se un estremo esce, tutto il riferimento salta.
    expect(shiftFormula('=SUM(A1:B2)', -1, 0)).toBe('=SUM(#REF!)');
    expect(shiftFormula('=SUM(A1:B2)', 0, -1)).toBe('=SUM(#REF!)');
  });

  it('colonna intera non si muove in verticale, riga intera non si muove in orizzontale', () => {
    expect(shiftFormula('=SUM(A:A)+SUM(3:3)', 2, 3)).toBe('=SUM(D:D)+SUM(5:5)');
    expect(shiftFormula('=SUM(A:A)', 100, 0)).toBe('=SUM(A:A)');
    expect(shiftFormula('=SUM(3:3)', 0, 100)).toBe('=SUM(3:3)');
  });

  it('NON tocca i numeri dentro le stringhe letterali', () => {
    expect(shiftFormula('=IF(A1,"riga 3 di A1","B7")', 2, 0)).toBe('=IF(A3,"riga 3 di A1","B7")');
  });

  it('NON tocca i nomi di funzione — regressione LOG10', () => {
    // `LOG10` ha la forma della cella (colonna LOG, riga 10): prima della
    // correzione al lexer, copiare la formula in giu' la trasformava in `LOG11`.
    expect(shiftFormula('=LOG10(A1)', 1, 0)).toBe('=LOG10(A2)');
    expect(shiftFormula('=LOG10(A1)', 0, 1)).toBe('=LOG10(B1)');
    expect(shiftFormula('=SUM(A1)+MAX(B1)', 1, 0)).toBe('=SUM(A2)+MAX(B2)');
  });

  it('NON tocca i nomi definiti, nemmeno quelli a forma di riferimento', () => {
    expect(shiftFormula('=XFE1+Growth+A1048577', 1, 0)).toBe('=XFE1+Growth+A1048577');
  });

  it('conserva maiuscole della funzione, spazi e struttura del testo', () => {
    expect(shiftFormula('=sum( a1 , b1 )', 1, 0)).toBe('=sum( A2 , B2 )');
  });

  it('segue il foglio qualificato', () => {
    expect(shiftFormula("='Deal Model'!A1+Model!B2", 1, 0)).toBe("='Deal Model'!A2+Model!B3");
  });

  it('andata e ritorno riportano alla formula di partenza', () => {
    const src = '=SUM($B$4:D9)*Model!E2';
    expect(shiftFormula(shiftFormula(src, 5, 5), -5, -5)).toBe(src);
  });

  it('funziona anche senza il `=` iniziale', () => {
    expect(shiftFormula('A1+B1', 1, 0)).toBe('A2+B2');
  });
});

// ---------------------------------------------------------------------------
// normalizeForComparison / formulasEquivalent
// ---------------------------------------------------------------------------

describe('normalizeForComparison', () => {
  it('toglie il `=` iniziale e gli spazi non significativi', () => {
    expect(normalizeForComparison('=  SUM( A1 , B1 )  ')).toBe('SUM(A1,B1)');
    expect(normalizeForComparison('SUM(A1,B1)')).toBe('SUM(A1,B1)');
  });

  it('conserva lo spazio quando e" l"operatore di intersezione', () => {
    expect(normalizeForComparison('=A1:A5   B1:B5')).toBe('A1:A5 B1:B5');
    // Dopo un nome di funzione lo spazio e' solo cosmetico.
    expect(normalizeForComparison('=SUM (A1)')).toBe('SUM(A1)');
  });

  it('mette in maiuscolo cio" che in Excel e" case-insensitive', () => {
    expect(normalizeForComparison('=sum(a1:b2)*growth')).toBe('SUM(A1:B2)*GROWTH');
    expect(normalizeForComparison('=true')).toBe('TRUE');
    expect(normalizeForComparison('=#n/a')).toBe('#N/A');
  });

  it('normalizza i literal numerici ma non il contenuto delle stringhe', () => {
    expect(normalizeForComparison('=1.50')).toBe('1.5');
    expect(normalizeForComparison('=1e3')).toBe('1000');
    expect(normalizeForComparison('="Ciao"')).toBe('"Ciao"');
  });

  it('gli ancoraggi restano visibili: sono struttura, non forma', () => {
    expect(normalizeForComparison('=$A$1')).toBe('$A$1');
    expect(normalizeForComparison('=A1')).toBe('A1');
  });
});

describe('formulasEquivalent', () => {
  const equivalenti: Array<[string, string]> = [
    ['=SUM(A1:B2)', '=sum(a1:b2)'],
    ['=SUM(A1)', 'SUM(A1)'],
    ['= SUM ( A1 , 2 )', '=SUM(A1,2)'],
    ['=A1*1.50', '=A1*1.5'],
    ['=A1*1000', '=A1*1e3'],
    ["='Model'!A1", '=Model!A1'],
    ['=A1:A5  B1:B5', '=A1:A5 B1:B5'],
    ['=IF(A1,,0)', '=IF(A1,,0)'],
  ];

  it.each(equivalenti)('%s equivale a %s', (a, b) => {
    expect(formulasEquivalent(a, b)).toBe(true);
  });

  const diverse: Array<[string, string]> = [
    ['=A1+B1', '=B1+A1'],
    ['=A1', '=$A$1'],
    ['="Ciao"', '="ciao"'],
    ['=SUM(A1:A5)', '=SUM(A1:A6)'],
    ['=A1:A5 B1:B5', '=A1:A5,B1:B5'],
    ['=SUM(A1,B1)', '=SUM(A1)'],
  ];

  it.each(diverse)('%s NON equivale a %s', (a, b) => {
    expect(formulasEquivalent(a, b)).toBe(false);
  });
});

describe('isWholeSheetSpan', () => {
  it('riconosce colonna e riga intera, e nient"altro', () => {
    const [col] = collectRefsFromText('=SUM(A:A)');
    const [row] = collectRefsFromText('=SUM(3:3)');
    const [box] = collectRefsFromText('=SUM(A1:B2)');
    expect(isWholeSheetSpan(col.area)).toBe(true);
    expect(isWholeSheetSpan(row.area)).toBe(true);
    expect(isWholeSheetSpan(box.area)).toBe(false);
  });
});
