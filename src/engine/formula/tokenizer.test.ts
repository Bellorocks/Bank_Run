import { describe, expect, it } from 'vitest';

import { tokenize, type Token, type TokenType } from './tokenizer';

/** Tipi dei token significativi, per asserzioni compatte. */
function kinds(src: string): TokenType[] {
  return tokenize(src)
    .filter((t) => t.type !== 'ws')
    .map((t) => t.type);
}

function texts(src: string): string[] {
  return tokenize(src)
    .filter((t) => t.type !== 'ws')
    .map((t) => t.text);
}

function find(src: string, type: TokenType): Token | undefined {
  return tokenize(src).find((t) => t.type === type);
}

describe('tokenizer — ricostruzione esatta', () => {
  const samples = [
    '',
    '=',
    '=A1',
    '=  A1  +  B2  ',
    '=SUM(A1:A10)/COUNT(A1:A10)',
    "='Deal Model'!$B$5*(1+Growth)",
    '=IF(A1>0,"si","no")',
    '=IF(A1>0,"dice ""ciao""","")',
    '=#REF!+#DIV/0!-#N/A',
    '=-2^2',
    '=.5e-3+1.5E3',
    '=A:A 3:3',
    '=SUM((A1,B2))',
    '=1%%',
    '=@$~unknown',
    '=SUM(A1:A5 A3:A7)',
    '=Model!D24-Model!D25',
  ];

  it.each(samples)('join(text) ricostruisce %j', (src) => {
    expect(
      tokenize(src)
        .map((t) => t.text)
        .join(''),
    ).toBe(src);
  });

  it('gli offset sono contigui e coerenti con la sorgente', () => {
    for (const src of samples) {
      let pos = 0;
      for (const t of tokenize(src)) {
        expect(t.start).toBe(pos);
        expect(t.end).toBe(t.start + t.text.length);
        expect(src.slice(t.start, t.end)).toBe(t.text);
        pos = t.end;
      }
      expect(pos).toBe(src.length);
    }
  });

  // Property-based: la ricostruzione carattere per carattere e' il contratto su
  // cui poggiano F4 (chirurgia sul testo) e la colorazione dei riferimenti.
  // Un solo carattere perso e tutti gli offset a valle sballano.
  it('property: join(text) === input su input casuali', () => {
    // PRNG deterministico: un fallimento deve essere riproducibile.
    let seed = 0x2f6e2b1;
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const pool = [
      'A1', '$B$2', 'C$3', '$D4', 'A1:B2', 'A:A', '3:3', "'My Sheet'!X9", 'Model!D24',
      'SUM', 'IF', 'TRUE', 'FALSE', 'Growth', '_xlfn.XLOOKUP',
      '1', '0.5', '.5', '1.5e3', '1e-9', '12345678901',
      '"testo"', '"con ""apici"""', '""',
      '#REF!', '#DIV/0!', '#N/A', '#NAME?', '#VALUE!', '#NUM!', '#NULL!', '#CYCLE!',
      '+', '-', '*', '/', '^', '&', '=', '<>', '<', '>', '<=', '>=', '%',
      '(', ')', ',', ':', ' ', '  ', '\t', '\n',
      '@', '~', '[', ']', '{', '}', ';', '!', '?', '\\', '€',
    ];
    for (let iter = 0; iter < 800; iter++) {
      const len = 1 + Math.floor(rnd() * 12);
      let src = rnd() < 0.5 ? '=' : '';
      for (let k = 0; k < len; k++) src += pool[Math.floor(rnd() * pool.length)];
      const joined = tokenize(src)
        .map((t) => t.text)
        .join('');
      expect(joined).toBe(src);
    }
  });
});

describe('tokenizer — numeri', () => {
  it('riconosce interi, decimali, notazione scientifica e il punto iniziale', () => {
    expect(find('=1.5e3', 'number')?.num).toBe(1500);
    expect(find('=.5', 'number')?.num).toBe(0.5);
    expect(find('=1.5E-3', 'number')?.num).toBeCloseTo(0.0015, 12);
    // In Excel `=1.` e' un numero valido e vale 1.
    expect(find('=1.', 'number')?.num).toBe(1);
  });

  it('il segno NON fa parte del numero: e" un operatore unario', () => {
    expect(kinds('=-5')).toEqual(['assign', 'op', 'number']);
  });

  it('un esponente incompleto lascia fuori la "e", che diventa un nome', () => {
    expect(kinds('=1e')).toEqual(['assign', 'number', 'name']);
  });
});

describe('tokenizer — stringhe', () => {
  it('de-escapa i doppi apici raddoppiati', () => {
    const t = find('="dice ""ciao"""', 'string');
    expect(t?.str).toBe('dice "ciao"');
    expect(t?.text).toBe('"dice ""ciao"""');
  });

  it('segnala la stringa non chiusa senza perdere caratteri', () => {
    const t = find('="apert', 'string');
    expect(t?.unterminated).toBe(true);
    expect(t?.text).toBe('"apert');
  });
});

describe('tokenizer — booleani ed errori', () => {
  it('TRUE/FALSE sono literal, ma TRUE() e" una funzione', () => {
    expect(find('=TRUE', 'bool')?.bool).toBe(true);
    expect(find('=false', 'bool')?.bool).toBe(false);
    expect(kinds('=TRUE()')).toEqual(['assign', 'func', 'lparen', 'rparen']);
  });

  it('riconosce tutti gli errori Excel', () => {
    for (const e of ['#REF!', '#VALUE!', '#DIV/0!', '#N/A', '#NAME?', '#NUM!', '#NULL!', '#CYCLE!']) {
      expect(kinds(`=${e}`)).toEqual(['assign', 'error']);
      expect(find(`=${e}`, 'error')?.str).toBe(e);
    }
  });

  it('#NULL! non viene scambiato per #NUM!', () => {
    expect(find('=#NULL!', 'error')?.str).toBe('#NULL!');
    expect(find('=#NUM!', 'error')?.str).toBe('#NUM!');
  });
});

describe('tokenizer — riferimenti', () => {
  it('cella semplice, ancorata e mista', () => {
    expect(find('=A1', 'cell')?.cell).toMatchObject({ row: 0, col: 0, rowAbs: false, colAbs: false });
    expect(find('=$B$5', 'cell')?.cell).toMatchObject({ row: 4, col: 1, rowAbs: true, colAbs: true });
    expect(find('=B$5', 'cell')?.cell).toMatchObject({ rowAbs: true, colAbs: false });
    expect(find('=$B5', 'cell')?.cell).toMatchObject({ rowAbs: false, colAbs: true });
  });

  it('qualificati con foglio, quotato e non', () => {
    expect(find('=Model!D24', 'cell')?.cell).toMatchObject({ sheet: 'Model', row: 23, col: 3 });
    expect(find("='Deal Model'!A1", 'cell')?.cell).toMatchObject({ sheet: 'Deal Model' });
    // Apice raddoppiato dentro il nome del foglio.
    expect(find("='O''Brien'!A1", 'cell')?.cell).toMatchObject({ sheet: "O'Brien" });
  });

  it('un range e" un token solo, cosi" F4 lo cicla tutto insieme', () => {
    expect(kinds('=SUM(A1:B10)')).toEqual(['assign', 'func', 'lparen', 'range', 'rparen']);
    expect(find('=SUM(A1:B10)', 'range')?.range).toMatchObject({
      start: { row: 0, col: 0 },
      end: { row: 9, col: 1 },
    });
  });

  it('colonna intera e riga intera', () => {
    expect(find('=SUM(A:A)', 'range')?.range).toMatchObject({ wholeColumn: true });
    // `3:3` comincia con una cifra: il ramo dei riferimenti va tentato PRIMA
    // di quello dei numeri, altrimenti verrebbe letto come `3`, `:`, `3`.
    expect(kinds('=SUM(3:3)')).toEqual(['assign', 'func', 'lparen', 'range', 'rparen']);
    expect(find('=SUM(3:3)', 'range')?.range).toMatchObject({ wholeRow: true });
  });

  it('un riferimento fuori dai limiti del foglio e" un NOME, non un riferimento', () => {
    // Quirk Excel vero: XFD e' l'ultima colonna, quindi `XFE1` non e' una cella
    // ed e' un nome definito perfettamente legale. Stessa cosa per A1048577,
    // una riga oltre il fondo del foglio.
    expect(kinds('=XFE1')).toEqual(['assign', 'name']);
    expect(kinds('=A1048577')).toEqual(['assign', 'name']);
    expect(kinds('=XFD1048576')).toEqual(['assign', 'cell']);
  });

  it('A1B e" un nome, non la cella A1 seguita da B', () => {
    expect(texts('=A1B')).toEqual(['=', 'A1B']);
    expect(kinds('=A1B')).toEqual(['assign', 'name']);
  });

  it('il `:` resta un operatore quando i due estremi non formano un range compatto', () => {
    // `Sheet1!A1:Sheet1!B2`: il prefisso foglio ripetuto non e' un range unico.
    expect(kinds('=Sheet1!A1:Sheet1!B2')).toEqual(['assign', 'cell', 'colon', 'cell']);
    expect(kinds('=INDEX(A:A,1):INDEX(A:A,5)')).toContain('colon');
  });
});

describe('tokenizer — operatori e spazi', () => {
  it('gli operatori a due caratteri vincono su quelli a uno', () => {
    expect(texts('=A1<>B1')).toEqual(['=', 'A1', '<>', 'B1']);
    expect(texts('=A1<=B1')).toEqual(['=', 'A1', '<=', 'B1']);
    expect(texts('=A1>=B1')).toEqual(['=', 'A1', '>=', 'B1']);
  });

  it('il primo `=` e" apertura formula, i successivi sono confronto', () => {
    expect(kinds('=A1=B1')).toEqual(['assign', 'cell', 'op', 'cell']);
    // Senza `=` iniziale il primo `=` resta un confronto? No: e' comunque il
    // primo carattere significativo, quindi apre la formula.
    expect(kinds('A1=B1')).toEqual(['cell', 'op', 'cell']);
  });

  it('gli spazi sono token conservati', () => {
    const ws = tokenize('=A1  +  B1').filter((t) => t.type === 'ws');
    expect(ws.map((t) => t.text)).toEqual(['  ', '  ']);
  });

  it('caratteri non riconosciuti diventano token unknown invece di far fallire il lexer', () => {
    expect(kinds('=A1 @ B1')).toEqual(['assign', 'cell', 'unknown', 'cell']);
  });
});
