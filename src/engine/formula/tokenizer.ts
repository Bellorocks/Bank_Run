/**
 * Lexer per formule Excel.
 *
 * Vincolo duro, da cui discende quasi ogni scelta di questo file:
 *   tokenize(s).map(t => t.text).join('') === s
 * ricostruzione carattere per carattere. F4 fa chirurgia sul testo originale e
 * la barra della formula colora sotto-stringhe: se il lexer perdesse anche solo
 * uno spazio, entrambi sballerebbero gli offset. Per questo gli spazi bianchi
 * sono token veri e i caratteri non riconosciuti diventano token `unknown`
 * invece di far fallire la tokenizzazione.
 */

import { parseCellRef, parseRangeRef, type ParsedRangeRef, type ParsedRef } from '../address';

export type TokenType =
  /** Il `=` che apre la formula. Solo il primo carattere significativo puo' esserlo. */
  | 'assign'
  | 'number'
  | 'string'
  | 'bool'
  | 'error'
  /** Riferimento a cella singola, eventualmente qualificato: `D24`, `$B$5`, `'Deal Model'!A1`. */
  | 'cell'
  /** Riferimento a range: `A1:B10`, `A:A`, `3:3`, `Model!A1:A5`. */
  | 'range'
  /** Nome definito (named range) o identificatore non riconosciuto come riferimento. */
  | 'name'
  /** Nome seguito da `(`: e' una chiamata di funzione. */
  | 'func'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
  /** `:` rimasto isolato, es. `INDEX(...):INDEX(...)`. I range compatti sono gia' un token `range`. */
  | 'colon'
  | 'ws'
  | 'unknown';

export interface Token {
  readonly type: TokenType;
  /** Testo ESATTO occupato dal token nella stringa originale. */
  readonly text: string;
  /** Offset iniziale, incluso. */
  readonly start: number;
  /** Offset finale, escluso. */
  readonly end: number;
  /** Valore numerico, solo per `number`. */
  readonly num?: number;
  /** Contenuto della stringa gia' de-escapato (`""` -> `"`), solo per `string`. */
  readonly str?: string;
  /** Solo per `bool`. */
  readonly bool?: boolean;
  /** Solo per `cell`. */
  readonly cell?: ParsedRef;
  /** Solo per `range`. */
  readonly range?: ParsedRangeRef;
  /** Stringa non chiusa a fine input: la barra della formula deve poterlo segnalare mentre si digita. */
  readonly unterminated?: boolean;
}

/** Valori di errore riconosciuti come literal. Ordinati per lunghezza decrescente: il match e' greedy. */
export const ERROR_LITERALS: readonly string[] = [
  '#GETTING_DATA',
  '#CONNECT!',
  '#BLOCKED!',
  '#UNKNOWN!',
  '#VALUE!',
  '#CYCLE!',
  '#SPILL!',
  '#FIELD!',
  '#DIV/0!',
  '#NAME?',
  '#NULL!',
  '#CALC!',
  '#BUSY!',
  '#REF!',
  '#NUM!',
  '#N/A',
];

/** Operatori binari/postfissi a due caratteri. Vanno provati prima di quelli a un carattere. */
const TWO_CHAR_OPS = ['<=', '>=', '<>'] as const;
const ONE_CHAR_OPS = '+-*/^&=<>%';

// Le lettere accentate sono ammesse nei nomi: i livelli hanno etichette italiane
// e un named range puo' chiamarsi `Perdita_Città`.
const LETTER = String.raw`A-Za-z_À-ɏ`;
const NAME_START_RE = new RegExp(`[${LETTER}\\\\]`);
const NAME_CHAR_RE = new RegExp(`[${LETTER}0-9_.?\\\\]`);

const SHEET_SRC = String.raw`(?:(?:'(?:[^']|'')+'|[${LETTER}][${LETTER}0-9.]*)!)?`;
const CELL_SRC = String.raw`\$?[A-Za-z]{1,3}\$?[0-9]{1,7}`;
const COL_SRC = String.raw`\$?[A-Za-z]{1,3}`;
const ROW_SRC = String.raw`\$?[0-9]{1,7}`;

// Sticky: la posizione viene imposta con lastIndex, cosi' non si scansiona a vuoto.
const RE_RANGE_CELLS = new RegExp(`${SHEET_SRC}${CELL_SRC}:${CELL_SRC}`, 'y');
const RE_RANGE_COLS = new RegExp(`${SHEET_SRC}${COL_SRC}:${COL_SRC}`, 'y');
const RE_RANGE_ROWS = new RegExp(`${SHEET_SRC}${ROW_SRC}:${ROW_SRC}`, 'y');
const RE_CELL = new RegExp(`${SHEET_SRC}${CELL_SRC}`, 'y');
const RE_NUMBER = /(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/y;
const RE_NAME = new RegExp(`[${LETTER}\\\\][${LETTER}0-9_.?\\\\]*`, 'y');
const RE_WS = /[ \t\r\n]+/y;

/**
 * Forma che un riferimento condivide con un nome di funzione: solo lettere e
 * cifre, niente `$` e niente prefisso foglio. `LOG10` e' il caso reale.
 */
const RE_BARE_CELL = /^[A-Za-z]{1,3}[0-9]{1,7}$/;

function matchSticky(re: RegExp, src: string, at: number): string | undefined {
  re.lastIndex = at;
  const m = re.exec(src);
  return m ? m[0] : undefined;
}

/**
 * Un riferimento non puo' essere seguito da un carattere di nome o da `$`:
 * `A1B` e' un named range, non la cella A1 seguita da B.
 */
function refBoundaryOk(src: string, end: number): boolean {
  if (end >= src.length) return true;
  const c = src.charAt(end);
  return c !== '$' && !NAME_CHAR_RE.test(c);
}

interface RefMatch {
  readonly type: 'cell' | 'range';
  readonly text: string;
  readonly cell?: ParsedRef;
  readonly range?: ParsedRangeRef;
}

/**
 * Prova a riconoscere un riferimento a partire da `at`, dal piu' lungo al piu' corto.
 *
 * Il controllo finale passa da `parseCellRef`/`parseRangeRef`, quindi la validita'
 * dei LIMITI e' decisa la': `XFE1` e `A1048577` hanno la forma di un riferimento
 * ma escono dal foglio, e in Excel sono infatti nomi definiti legittimi. Qui
 * degradano a `name`, che e' esattamente cio' che serve.
 */
function tryReference(src: string, at: number): RefMatch | undefined {
  for (const re of [RE_RANGE_CELLS, RE_RANGE_COLS, RE_RANGE_ROWS]) {
    const text = matchSticky(re, src, at);
    if (text === undefined || !refBoundaryOk(src, at + text.length)) continue;
    const range = parseRangeRef(text);
    if (range) return { type: 'range', text, range };
  }
  const text = matchSticky(RE_CELL, src, at);
  if (text !== undefined && refBoundaryOk(src, at + text.length)) {
    // `LOG10(100)`: `LOG10` ha la forma di una cella (colonna LOG, riga 10) ma la
    // `(` che segue ne fa una chiamata di funzione, come in Excel. Senza questo
    // controllo `=LOG10(100)` non parsifica e `shiftFormula` copiando la formula
    // in giu' riscriverebbe il NOME DELLA FUNZIONE in `LOG11`.
    // Il filtro e' volutamente stretto: solo la forma nuda lettere+cifre, perche'
    // `$B$2` e `Model!A1` non possono essere nomi di funzione, e solo con la `(`
    // immediatamente attaccata, cosi' l'intersezione da spazio (`=A1 (B1:B5)`)
    // resta quella che era.
    if (RE_BARE_CELL.test(text) && src.charAt(at + text.length) === '(') return undefined;
    const cell = parseCellRef(text);
    if (cell) return { type: 'cell', text, cell };
  }
  return undefined;
}

/** Dopo il nome puo' esserci spazio prima della parentesi: in Excel `=SUM (A1:A2)` calcola. */
function isFunctionCallAhead(src: string, at: number): boolean {
  let j = at;
  while (j < src.length && /[ \t\r\n]/.test(src.charAt(j))) j++;
  return src.charAt(j) === '(';
}

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  /** Serve a distinguere il `=` di apertura formula dall'operatore di confronto. */
  let seenSignificant = false;

  const push = (t: Token): void => {
    out.push(t);
    if (t.type !== 'ws') seenSignificant = true;
    i = t.end;
  };

  while (i < src.length) {
    const c = src.charAt(i);

    // --- spazi bianchi (conservati: sono anche l'operatore di intersezione) ---
    const ws = matchSticky(RE_WS, src, i);
    if (ws !== undefined) {
      push({ type: 'ws', text: ws, start: i, end: i + ws.length });
      continue;
    }

    // --- stringa ---
    if (c === '"') {
      let j = i + 1;
      let value = '';
      let closed = false;
      while (j < src.length) {
        if (src.charAt(j) === '"') {
          if (src.charAt(j + 1) === '"') {
            value += '"';
            j += 2;
            continue;
          }
          j += 1;
          closed = true;
          break;
        }
        value += src.charAt(j);
        j += 1;
      }
      push({
        type: 'string',
        text: src.slice(i, j),
        start: i,
        end: j,
        str: value,
        ...(closed ? {} : { unterminated: true }),
      });
      continue;
    }

    // --- errori ---
    if (c === '#') {
      const upper = src.slice(i, i + 14).toUpperCase();
      const lit = ERROR_LITERALS.find((e) => upper.startsWith(e));
      if (lit) {
        push({
          type: 'error',
          text: src.slice(i, i + lit.length),
          start: i,
          end: i + lit.length,
          str: lit,
        });
        continue;
      }
      push({ type: 'unknown', text: c, start: i, end: i + 1 });
      continue;
    }

    // --- riferimenti ---
    // Vanno tentati PRIMA dei numeri: `3:3` e' un riferimento a riga intera e
    // comincia con una cifra, quindi il ramo numerico se lo mangerebbe.
    if (c === '$' || c === "'" || NAME_START_RE.test(c) || (c >= '0' && c <= '9')) {
      const ref = tryReference(src, i);
      if (ref) {
        push({
          type: ref.type,
          text: ref.text,
          start: i,
          end: i + ref.text.length,
          ...(ref.cell ? { cell: ref.cell } : {}),
          ...(ref.range ? { range: ref.range } : {}),
        });
        continue;
      }
    }

    // --- numeri ---
    if ((c >= '0' && c <= '9') || (c === '.' && /[0-9]/.test(src.charAt(i + 1)))) {
      const text = matchSticky(RE_NUMBER, src, i);
      if (text !== undefined) {
        push({ type: 'number', text, start: i, end: i + text.length, num: Number(text) });
        continue;
      }
    }

    // --- nomi, funzioni, booleani ---
    if (NAME_START_RE.test(c)) {
      const text = matchSticky(RE_NAME, src, i) ?? c;
      const end = i + text.length;
      const upper = text.toUpperCase();
      if ((upper === 'TRUE' || upper === 'FALSE') && !isFunctionCallAhead(src, end)) {
        push({ type: 'bool', text, start: i, end, bool: upper === 'TRUE' });
        continue;
      }
      push({
        type: isFunctionCallAhead(src, end) ? 'func' : 'name',
        text,
        start: i,
        end,
      });
      continue;
    }

    // --- operatori e punteggiatura ---
    const two = src.slice(i, i + 2);
    if ((TWO_CHAR_OPS as readonly string[]).includes(two)) {
      push({ type: 'op', text: two, start: i, end: i + 2 });
      continue;
    }
    if (c === '=' && !seenSignificant) {
      push({ type: 'assign', text: c, start: i, end: i + 1 });
      continue;
    }
    if (ONE_CHAR_OPS.includes(c)) {
      push({ type: 'op', text: c, start: i, end: i + 1 });
      continue;
    }
    if (c === '(') {
      push({ type: 'lparen', text: c, start: i, end: i + 1 });
      continue;
    }
    if (c === ')') {
      push({ type: 'rparen', text: c, start: i, end: i + 1 });
      continue;
    }
    if (c === ',') {
      push({ type: 'comma', text: c, start: i, end: i + 1 });
      continue;
    }
    if (c === ':') {
      push({ type: 'colon', text: c, start: i, end: i + 1 });
      continue;
    }

    push({ type: 'unknown', text: c, start: i, end: i + 1 });
  }

  return out;
}

/** Vero se il token puo' CHIUDERE un operando (serve a riconoscere l'intersezione da spazio). */
export function isOperandEnd(t: Token): boolean {
  switch (t.type) {
    case 'number':
    case 'string':
    case 'bool':
    case 'error':
    case 'cell':
    case 'range':
    case 'name':
    case 'rparen':
      return true;
    default:
      return false;
  }
}

/** Vero se il token puo' APRIRE un operando. */
export function isOperandStart(t: Token): boolean {
  switch (t.type) {
    case 'number':
    case 'string':
    case 'bool':
    case 'error':
    case 'cell':
    case 'range':
    case 'name':
    case 'func':
    case 'lparen':
      return true;
    default:
      return false;
  }
}

/** I token che il parser puo' ignorare. Oggi solo gli spazi bianchi. */
export function isTrivia(t: Token): boolean {
  return t.type === 'ws';
}
