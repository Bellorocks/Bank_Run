import { HyperFormula } from 'hyperformula';
import { beforeAll, describe, expect, it } from 'vitest';

import { childrenOf, flattenAst, type FormulaNode } from './ast';
import { parseFormula, type ParseErrorCode } from './parser';

// ---------------------------------------------------------------------------
// Strumenti di verifica
// ---------------------------------------------------------------------------

/**
 * Rende l'albero in una s-expression completamente parentesizzata.
 * Le attese nei test sono scritte A MANO leggendo Excel, non ricavate da questa
 * funzione: serve solo a rendere leggibile il confronto.
 */
function shape(src: string): string {
  const { ast } = parseFormula(src);
  return ast ? render(ast) : 'UNDEFINED';
}

function render(n: FormulaNode): string {
  switch (n.kind) {
    case 'NumberLit':
      return n.text;
    case 'StringLit':
      return JSON.stringify(n.value);
    case 'BoolLit':
      return n.value ? 'TRUE' : 'FALSE';
    case 'ErrorLit':
      return n.value;
    case 'CellRef':
    case 'RangeRef':
      return n.text;
    case 'NamedRef':
      return `name:${n.name}`;
    case 'FunctionCall':
      return `${n.nameUpper}(${n.args.map(render).join('|')})`;
    case 'BinaryOp':
      return `(${render(n.left)} ${n.op === ' ' ? 'ISECT' : n.op} ${render(n.right)})`;
    case 'UnaryOp':
      return `(${n.op}u ${render(n.operand)})`;
    case 'Percent':
      return `(${render(n.operand)} %)`;
    case 'Paren':
      return `[${render(n.inner)}]`;
    case 'Missing':
      return '_';
  }
}

/**
 * Interprete minimo sull'AST, per le sole formule di soli literal.
 *
 * Non sa NULLA di precedenze: applica gli operatori nell'ordine in cui l'albero
 * li ha annidati. E' proprio questo che rende il confronto con HyperFormula una
 * verifica vera della tabella delle precedenze del parser.
 */
function evaluate(n: FormulaNode): number | string | boolean {
  switch (n.kind) {
    case 'NumberLit':
      return n.value;
    case 'StringLit':
      return n.value;
    case 'BoolLit':
      return n.value;
    case 'Paren':
      return evaluate(n.inner);
    case 'Percent':
      return num(evaluate(n.operand)) / 100;
    case 'UnaryOp':
      return n.op === '-' ? -num(evaluate(n.operand)) : num(evaluate(n.operand));
    case 'BinaryOp': {
      const a = evaluate(n.left);
      const b = evaluate(n.right);
      switch (n.op) {
        case '+':
          return num(a) + num(b);
        case '-':
          return num(a) - num(b);
        case '*':
          return num(a) * num(b);
        case '/':
          return num(a) / num(b);
        case '^':
          return Math.pow(num(a), num(b));
        case '&':
          return `${scalarToText(a)}${scalarToText(b)}`;
        case '=':
          return a === b;
        case '<>':
          return a !== b;
        case '<':
          return a < b;
        case '>':
          return a > b;
        case '<=':
          return a <= b;
        case '>=':
          return a >= b;
        default:
          throw new Error(`operatore non valutabile: ${n.op}`);
      }
    }
    default:
      throw new Error(`nodo non valutabile: ${n.kind}`);
  }
}

function num(v: number | string | boolean): number {
  return typeof v === 'number' ? v : Number(v);
}

function scalarToText(v: number | string | boolean): string {
  return typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v);
}

let engine: HyperFormula;
let sheetId: number;

beforeAll(() => {
  engine = HyperFormula.buildFromArray([[]], { licenseKey: 'gpl-v3' });
  sheetId = engine.getSheetId('Sheet1') as number;
});

/** Valore che il motore VERO da' alla formula. */
function hfValue(formula: string): unknown {
  return engine.calculateFormula(formula, sheetId);
}

function codes(src: string): ParseErrorCode[] {
  return parseFormula(src).errors.map((e) => e.code);
}

// ---------------------------------------------------------------------------
// Precedenze e associativita', verificate contro il motore
// ---------------------------------------------------------------------------

describe('parser — precedenze verificate contro HyperFormula', () => {
  // [formula, forma attesa scritta a mano, valore atteso scritto a mano]
  const cases: Array<[string, string, number | string | boolean]> = [
    ['=1+2*3', '(1 + (2 * 3))', 7],
    ['=1*2+3', '((1 * 2) + 3)', 5],
    ['=8/4/2', '((8 / 4) / 2)', 1],
    ['=10-2-3', '((10 - 2) - 3)', 5],
    ['=2-3+4', '((2 - 3) + 4)', 3],
    // Il quirk piu' famoso: in Excel il meno unario lega PIU' forte di `^`,
    // quindi -2^2 vale +4, non -4.
    ['=-2^2', '((-u 2) ^ 2)', 4],
    ['=-2^-2', '((-u 2) ^ (-u 2))', 0.25],
    ['=2^-2', '(2 ^ (-u 2))', 0.25],
    // `^` associa a SINISTRA in Excel: 2^3^2 = (2^3)^2 = 64, non 2^(3^2) = 512.
    ['=2^3^2', '((2 ^ 3) ^ 2)', 64],
    ['=1/2^2', '(1 / (2 ^ 2))', 0.25],
    // Percentuale postfissa: lega piu' forte di tutti gli operatori binari.
    ['=2*3%', '(2 * (3 %))', 0.06],
    ['=100%*2', '((100 %) * 2)', 2],
    ['=0-1%', '(0 - (1 %))', -0.01],
    ['=2^3%', '(2 ^ (3 %))', 1.0210121257071934],
    ['=-3%^2', '(((-u 3) %) ^ 2)', 0.0009],
    // Concatenazione: piu' debole dell'aritmetica, piu' forte dei confronti.
    ['=1&2+3', '(1 & (2 + 3))', '15'],
    ['=1&2&3', '((1 & 2) & 3)', '123'],
    ['="a"&"b"="ab"', '(("a" & "b") = "ab")', true],
    // Confronti: il gradino piu' basso, e associano a sinistra.
    ['=1+1=2', '((1 + 1) = 2)', true],
    ['=1+2<4-1', '((1 + 2) < (4 - 1))', false],
    ['=1<=1', '(1 <= 1)', true],
    ['=3<>3', '(3 <> 3)', false],
    ['=2--2', '(2 - (-u 2))', 4],
    ['=2*-3', '(2 * (-u 3))', -6],
    ['=--3', '(-u (-u 3))', 3],
    ['=+3', '(+u 3)', 3],
    ['=-(2+3)', '(-u [(2 + 3)])', -5],
    ['=(1+2)*3', '([(1 + 2)] * 3)', 9],
  ];

  it.each(cases)('%s ha la forma attesa', (src, expected) => {
    expect(shape(src)).toBe(expected);
  });

  it.each(cases)('%s vale quanto dice HyperFormula', (src, _shape, expected) => {
    const mine = evaluate(parseFormula(src).ast as FormulaNode);
    const theirs = hfValue(src);
    // Prima l'attesa scritta a mano, poi il motore: se sbagliassero entrambi
    // allo stesso modo il test lo direbbe comunque.
    if (typeof expected === 'number') {
      expect(mine as number).toBeCloseTo(expected, 12);
      expect(theirs as number).toBeCloseTo(expected, 9);
    } else {
      expect(mine).toBe(expected);
      expect(theirs).toBe(expected);
    }
  });

  it('la percentuale doppia non e" parsificata come operatore binario', () => {
    // HyperFormula 3.4.0 rifiuta `=50%%`, Excel no: vale 50/100/100.
    expect(shape('=50%%')).toBe('((50 %) %)');
    expect(evaluate(parseFormula('=50%%').ast as FormulaNode)).toBeCloseTo(0.005, 12);
  });
});

// ---------------------------------------------------------------------------
// Operatori di riferimento
// ---------------------------------------------------------------------------

describe('parser — operatori di riferimento', () => {
  // HyperFormula 3.4.0 non implementa ne' l'intersezione da spazio ne' l'unione
  // con la virgola (restituisce un errore di parsing), quindi qui le attese sono
  // ricavate solo dalla semantica Excel.
  it('lo spazio fra due riferimenti e" l"operatore di intersezione', () => {
    expect(shape('=A1:A5 A3:C3')).toBe('(A1:A5 ISECT A3:C3)');
    expect(shape('=SUM(A1:A5 A3:C3)')).toBe('SUM((A1:A5 ISECT A3:C3))');
  });

  it('lo spazio davanti a un operatore binario NON e" intersezione', () => {
    expect(shape('=1 + 2')).toBe('(1 + 2)');
    expect(shape('=A1 -B1')).toBe('(A1 - B1)');
    expect(shape('=A1  *  B1')).toBe('(A1 * B1)');
  });

  it('l"intersezione lega piu" forte dell"aritmetica', () => {
    expect(shape('=A1:A5 B1:B5+1')).toBe('((A1:A5 ISECT B1:B5) + 1)');
  });

  it('gli offset dell"operatore di intersezione coprono lo spazio', () => {
    const { ast } = parseFormula('=A1:A5  B1:B5');
    expect(ast?.kind).toBe('BinaryOp');
    if (ast?.kind !== 'BinaryOp') throw new Error('atteso BinaryOp');
    expect(ast.op).toBe(' ');
    expect(ast.opStart).toBe(6);
    expect(ast.opEnd).toBe(8);
  });

  it('la virgola FUORI da una funzione e" unione, dentro e" separatore', () => {
    expect(shape('=(A1,B2)')).toBe('[(A1 , B2)]');
    expect(shape('=SUM((A1,B2))')).toBe('SUM([(A1 , B2)])');
    // Dentro la lista argomenti la stessa virgola separa: due argomenti, non una unione.
    expect(shape('=SUM(A1,B2)')).toBe('SUM(A1|B2)');
  });

  it('`:` fra due celle compatte e" gia" un range, non un albero di operatori', () => {
    expect(shape('=A1:B2')).toBe('A1:B2');
    const { ast } = parseFormula('=A1:B2');
    expect(ast?.kind).toBe('RangeRef');
  });

  it('`:` resta un operatore quando i due estremi non formano un range compatto', () => {
    expect(shape('=Sheet1!A1:Sheet1!B2')).toBe('(Sheet1!A1 : Sheet1!B2)');
    expect(shape('=A1:INDEX(A1:A10,3)')).toBe('(A1 : INDEX(A1:A10|3))');
  });

  it('gli spazi attorno al `:` degradano il range ad albero di operatori', () => {
    // Limite noto e voluto: `makeRange` ricompone un RangeRef solo se la fetta di
    // sorgente fra i due estremi e' essa stessa un range scrivibile.
    expect(shape('=A1 : B2')).toBe('(A1 : B2)');
  });
});

// ---------------------------------------------------------------------------
// Funzioni
// ---------------------------------------------------------------------------

describe('parser — chiamate di funzione', () => {
  it('funzione senza argomenti', () => {
    expect(shape('=NOW()')).toBe('NOW()');
    const { ast } = parseFormula('=NOW()');
    if (ast?.kind !== 'FunctionCall') throw new Error('attesa FunctionCall');
    expect(ast.args).toHaveLength(0);
    expect(codes('=NOW()')).toEqual([]);
  });

  it('argomento omesso in mezzo: legale in Excel, nessun errore di sintassi', () => {
    expect(shape('=SUM(A1,,A3)')).toBe('SUM(A1|_|A3)');
    expect(codes('=SUM(A1,,A3)')).toEqual([]);
  });

  it('argomento omesso in coda e in testa', () => {
    expect(shape('=IF(A1,,0)')).toBe('IF(A1|_|0)');
    expect(shape('=VLOOKUP(A1,B:C,2,)')).toBe('VLOOKUP(A1|B:C|2|_)');
    expect(shape('=IF(,1,0)')).toBe('IF(_|1|0)');
    expect(codes('=VLOOKUP(A1,B:C,2,)')).toEqual([]);
  });

  it('solo virgole: tutti argomenti mancanti, ancora senza errori', () => {
    expect(shape('=SUM(,)')).toBe('SUM(_|_)');
    expect(codes('=SUM(,)')).toEqual([]);
  });

  it('il nome conserva le maiuscole scritte ma espone nameUpper per il confronto', () => {
    const { ast } = parseFormula('=sUm(A1)');
    if (ast?.kind !== 'FunctionCall') throw new Error('attesa FunctionCall');
    expect(ast.name).toBe('sUm');
    expect(ast.nameUpper).toBe('SUM');
  });

  it('lo spazio fra nome e parentesi non rompe la chiamata', () => {
    expect(shape('=SUM (A1:A2)')).toBe('SUM(A1:A2)');
    expect(codes('=SUM (A1:A2)')).toEqual([]);
  });

  it('funzioni annidate su piu" livelli', () => {
    expect(shape('=IF(AND(A1>0,B1>0),MAX(C1:C9),0)')).toBe(
      'IF(AND((A1 > 0)|(B1 > 0))|MAX(C1:C9)|0)',
    );
  });

  it('LOG10 e" una funzione, non la cella LOG10 — regressione', () => {
    // `LOG10` ha la forma di un riferimento (colonna LOG, riga 10): senza il
    // controllo sulla `(` il lexer lo classificava come cella e la formula non
    // parsificava affatto.
    expect(shape('=LOG10(100)')).toBe('LOG10(100)');
    expect(codes('=LOG10(100)')).toEqual([]);
    expect(hfValue('=LOG10(100)')).toBe(2);
  });

  it('LOG10 senza parentesi resta un riferimento di cella, come in Excel', () => {
    const { ast } = parseFormula('=LOG10');
    expect(ast?.kind).toBe('CellRef');
  });
});

// ---------------------------------------------------------------------------
// Literal e riferimenti primari
// ---------------------------------------------------------------------------

describe('parser — operandi primari', () => {
  it('numeri: decimali, notazione scientifica, punto iniziale', () => {
    const { ast } = parseFormula('=1.50');
    if (ast?.kind !== 'NumberLit') throw new Error('atteso NumberLit');
    // Il valore e' normalizzato ma il TESTO resta quello scritto: serve al grader
    // per distinguere `1.50` da `1.5` quando conta la formattazione.
    expect(ast.value).toBe(1.5);
    expect(ast.text).toBe('1.50');
    expect(shape('=.5e-3')).toBe('.5e-3');
  });

  it('stringhe: apici raddoppiati de-escapati, delimitatori inclusi nello span', () => {
    const src = '="dice ""ciao"""';
    const { ast } = parseFormula(src);
    if (ast?.kind !== 'StringLit') throw new Error('atteso StringLit');
    expect(ast.value).toBe('dice "ciao"');
    expect(src.slice(ast.start, ast.end)).toBe('"dice ""ciao"""');
    // La stringa vuota resta una stringa, non diventa un operando mancante.
    expect(shape('=""')).toBe('""');
  });

  it('booleani ed errori', () => {
    expect(shape('=TRUE')).toBe('TRUE');
    expect(shape('=false')).toBe('FALSE');
    expect(shape('=#DIV/0!')).toBe('#DIV/0!');
    // La forma canonica dell'errore e' maiuscola anche se scritta minuscola.
    expect(shape('=#n/a')).toBe('#N/A');
  });

  it('un riferimento fuori dai limiti del foglio e" un nome definito', () => {
    // XFD e' l'ultima colonna e 1048576 l'ultima riga: oltre, in Excel, la
    // stringa e' un nome perfettamente legale.
    expect(shape('=XFE1')).toBe('name:XFE1');
    expect(shape('=A1048577')).toBe('name:A1048577');
    expect(shape('=XFD1048576')).toBe('XFD1048576');
  });

  it('nome foglio quotato, con spazio, con apostrofo interno e con `!` interno', () => {
    const a = parseFormula("='Deal Model'!A1").ast;
    if (a?.kind !== 'CellRef') throw new Error('attesa CellRef');
    expect(a.ref.sheet).toBe('Deal Model');

    const b = parseFormula("='O''Brien'!$B$5").ast;
    if (b?.kind !== 'CellRef') throw new Error('attesa CellRef');
    expect(b.ref.sheet).toBe("O'Brien");
    expect(b.ref.rowAbs).toBe(true);
    expect(b.ref.colAbs).toBe(true);

    // Il `!` dentro il nome quotato non deve essere scambiato per il separatore.
    const c = parseFormula("='Q1!draft'!A1:B2").ast;
    if (c?.kind !== 'RangeRef') throw new Error('atteso RangeRef');
    expect(c.range.sheet).toBe('Q1!draft');
  });

  it('colonna e riga intere', () => {
    const col = parseFormula('=SUM(A:A)').ast;
    if (col?.kind !== 'FunctionCall') throw new Error('attesa FunctionCall');
    const arg = col.args[0];
    if (arg.kind !== 'RangeRef') throw new Error('atteso RangeRef');
    expect(arg.range.wholeColumn).toBe(true);
    expect(shape('=SUM(3:3)')).toBe('SUM(3:3)');
  });
});

// ---------------------------------------------------------------------------
// Recupero dagli errori: il parser NON deve mai lanciare
// ---------------------------------------------------------------------------

describe('parser — recupero dagli errori', () => {
  it('formula vuota e solo `=` non producono albero ne" errori', () => {
    expect(parseFormula('')).toMatchObject({ ast: undefined, errors: [] });
    expect(parseFormula('=')).toMatchObject({ ast: undefined, errors: [] });
    expect(parseFormula('   ')).toMatchObject({ ast: undefined, errors: [] });
    expect(parseFormula('=   ')).toMatchObject({ ast: undefined, errors: [] });
  });

  it('parentesi non chiusa: albero parziale piu" errore', () => {
    expect(codes('=(1+2')).toEqual(['missing-paren']);
    expect(shape('=(1+2')).toBe('[(1 + 2)]');
    expect(codes('=SUM(A1')).toEqual(['missing-paren']);
    expect(shape('=SUM(A1')).toBe('SUM(A1)');
  });

  it('parentesi chiusa in eccesso: testo in eccesso segnalato', () => {
    expect(codes('=A1)')).toEqual(['unexpected-token']);
    expect(codes('=SUM(A1))')).toEqual(['unexpected-token']);
    // L'albero utile resta comunque disponibile per la colorazione.
    expect(shape('=SUM(A1))')).toBe('SUM(A1)');
  });

  it('virgolette non chiuse: la stringa arriva comunque all"albero', () => {
    expect(codes('="abc')).toEqual(['unterminated-string']);
    const { ast } = parseFormula('="abc');
    if (ast?.kind !== 'StringLit') throw new Error('atteso StringLit');
    expect(ast.value).toBe('abc');
  });

  it('operando mancante a fine formula', () => {
    expect(codes('=1+')).toEqual(['unexpected-end']);
    expect(shape('=1+')).toBe('(1 + _)');
  });

  it('operatore senza operando sinistro', () => {
    expect(codes('=*3')).toEqual(['unexpected-token', 'unexpected-token']);
    expect(parseFormula('=*3').ast).toBeDefined();
  });

  it('virgola isolata e parentesi isolata non fanno esplodere nulla', () => {
    expect(codes('=,')).toEqual(['missing-operand', 'unexpected-end']);
    expect(codes('=)')).toEqual(['missing-operand', 'unexpected-token']);
  });

  it('gli errori portano posizioni dentro la sorgente', () => {
    const { errors } = parseFormula('=SUM(A1');
    expect(errors).toHaveLength(1);
    expect(errors[0].start).toBe(1);
    expect(errors[0].end).toBe(7);
  });

  it('formula lunghissima annidata: nessuno stack overflow', () => {
    const depth = 150;
    const parens = `=${'('.repeat(depth)}1${')'.repeat(depth)}`;
    expect(() => parseFormula(parens)).not.toThrow();
    expect(parseFormula(parens).errors).toEqual([]);

    const calls = `=${'SUM('.repeat(depth)}A1${')'.repeat(depth)}`;
    expect(() => parseFormula(calls)).not.toThrow();
    expect(parseFormula(calls).errors).toEqual([]);

    const chain = `=${Array.from({ length: 500 }, (_, k) => `A${k + 1}`).join('+')}`;
    expect(parseFormula(chain).errors).toEqual([]);
  });

  it('property: nessun input, per quanto sgangherato, fa lanciare il parser', () => {
    // PRNG deterministico: un fallimento deve essere riproducibile.
    let seed = 0x51f3a7;
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const pool = [
      'A1', '$B$2', 'A1:B2', 'A:A', '3:3', "'My Sheet'!X9", 'SUM', 'IF(', 'TRUE',
      '1', '.5', '"t"', '"', '#REF!', '+', '-', '*', '/', '^', '&', '=', '<>', '<=',
      '%', '(', ')', ',', ':', ' ', '  ', '@', '~', ';', '!', '\\', '€',
    ];
    for (let iter = 0; iter < 3000; iter++) {
      const len = 1 + Math.floor(rnd() * 12);
      let src = rnd() < 0.5 ? '=' : '';
      for (let k = 0; k < len; k++) src += pool[Math.floor(rnd() * pool.length)];
      expect(() => parseFormula(src), `input: ${JSON.stringify(src)}`).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Posizioni: F9 e la colorazione tagliano il testo con questi offset
// ---------------------------------------------------------------------------

describe('parser — offset dei nodi', () => {
  const sources = [
    '=A1+B1',
    '=SUM(A1:A5)/B1',
    '=IF(A1>0,"si","no")',
    '=-A1*(B1+2)%',
    "='Deal Model'!$B$5*(1+Growth)",
    '=SUM(A1,,A3)',
    '=A1:A5 B1:B5',
    '=#REF!+1',
  ];

  it.each(sources)('ogni nodo di %j sta dentro il padre e dentro la sorgente', (src) => {
    const { ast } = parseFormula(src);
    expect(ast).toBeDefined();
    for (const n of flattenAst(ast)) {
      expect(n.start).toBeGreaterThanOrEqual(0);
      expect(n.end).toBeLessThanOrEqual(src.length);
      expect(n.end).toBeGreaterThanOrEqual(n.start);
      for (const child of childrenOf(n)) {
        expect(child.start).toBeGreaterThanOrEqual(n.start);
        expect(child.end).toBeLessThanOrEqual(n.end);
      }
    }
  });

  it('il testo dei riferimenti coincide con la fetta di sorgente', () => {
    const src = "='Deal Model'!$B$5+SUM(A1:A5)";
    for (const n of flattenAst(parseFormula(src).ast)) {
      if (n.kind === 'CellRef' || n.kind === 'RangeRef') {
        expect(src.slice(n.start, n.end)).toBe(n.text);
      }
    }
  });

  it('offset esatti su una formula semplice', () => {
    const nodes = flattenAst(parseFormula('=SUM(A1)').ast).map((n) => [n.kind, n.start, n.end]);
    expect(nodes).toEqual([
      ['FunctionCall', 1, 8],
      ['CellRef', 5, 7],
    ]);
  });

  it('nameStart/nameEnd isolano il nome della funzione', () => {
    const { ast } = parseFormula('=  SUMIFS(A1:A5,B1:B5,">0")');
    if (ast?.kind !== 'FunctionCall') throw new Error('attesa FunctionCall');
    expect('=  SUMIFS(A1:A5,B1:B5,">0")'.slice(ast.nameStart, ast.nameEnd)).toBe('SUMIFS');
  });

  it('opStart/opEnd isolano l"operatore binario', () => {
    const src = '=A1<>B1';
    const { ast } = parseFormula(src);
    if (ast?.kind !== 'BinaryOp') throw new Error('atteso BinaryOp');
    expect(src.slice(ast.opStart, ast.opEnd)).toBe('<>');
  });

  it('il `=` iniziale non entra nell"albero', () => {
    expect(parseFormula('=A1').ast?.start).toBe(1);
    // Senza `=` la radice parte davvero da 0.
    expect(parseFormula('A1').ast?.start).toBe(0);
  });

  it('Percent e Paren inglobano il proprio delimitatore', () => {
    expect(flattenAst(parseFormula('=50%').ast).map((n) => [n.kind, n.start, n.end])).toEqual([
      ['Percent', 1, 4],
      ['NumberLit', 1, 3],
    ]);
    expect(flattenAst(parseFormula('=(A1)').ast).map((n) => [n.kind, n.start, n.end])).toEqual([
      ['Paren', 1, 5],
      ['CellRef', 2, 4],
    ]);
  });

  it('il segnaposto di argomento omesso e" largo zero e sta dove manca l"argomento', () => {
    const missing = flattenAst(parseFormula('=SUM(A1,,A3)').ast).filter((n) => n.kind === 'Missing');
    expect(missing).toHaveLength(1);
    expect(missing[0].start).toBe(8);
    expect(missing[0].end).toBe(8);
  });

  it('i token grezzi e la sorgente sono restituiti insieme all"albero', () => {
    const r = parseFormula('=A1+1');
    expect(r.source).toBe('=A1+1');
    expect(r.tokens.map((t) => t.text).join('')).toBe('=A1+1');
  });
});
