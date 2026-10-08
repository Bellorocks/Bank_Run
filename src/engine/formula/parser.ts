/**
 * Parser a precedence climbing (Pratt) per formule Excel.
 *
 * Due cose contano piu' della bellezza dell'albero:
 *
 * 1. Le PRECEDENZE devono essere quelle di Excel, non quelle della matematica.
 *    In Excel `-2^2` fa 4, perche' la negazione unaria lega piu' forte
 *    dell'elevamento a potenza; e `2^3^2` fa 64, perche' `^` associa a SINISTRA.
 *    Entrambe verificate contro HyperFormula in `parser.test.ts`.
 *
 * 2. Il parser NON lancia mai. La barra della formula evidenzia mentre si digita,
 *    e mentre si digita la formula e' quasi sempre incompleta: si restituisce
 *    l'albero parziale piu' l'elenco degli errori.
 *
 * Tabella delle precedenze, dalla piu' alta (i numeri sono binding power):
 *   `:` 80  >  spazio (intersezione) 70  >  `,` (unione) 60  >  unario 50  >
 *   `%` 45  >  `^` 40  >  `*` `/` 30  >  `+` `-` 20  >  `&` 15  >  confronti 10
 */

import type {
  BinaryOperator,
  FormulaNode,
  FunctionCallNode,
  UnaryOperator,
} from './ast';
import { parseRangeRef } from '../address';
import { isOperandStart, tokenize, type Token } from './tokenizer';

export type ParseErrorCode =
  | 'unexpected-token'
  | 'unexpected-end'
  | 'missing-paren'
  | 'unterminated-string'
  | 'missing-operand';

export interface ParseError {
  readonly code: ParseErrorCode;
  readonly message: string;
  readonly start: number;
  readonly end: number;
}

export interface ParseResult {
  /** `undefined` solo se non c'e' proprio nulla da parsificare (stringa vuota o soli spazi). */
  readonly ast: FormulaNode | undefined;
  readonly errors: readonly ParseError[];
  readonly tokens: readonly Token[];
  /** Testo di partenza, comodo per chi poi taglia sotto-stringhe con gli offset dei nodi. */
  readonly source: string;
}

const BP_RANGE = 80;
const BP_INTERSECT = 70;
const BP_UNION = 60;
const BP_UNARY = 50;
const BP_PERCENT = 45;
const BP_POWER = 40;
const BP_MULDIV = 30;
const BP_ADDSUB = 20;
const BP_CONCAT = 15;
const BP_COMPARE = 10;

function infixBindingPower(op: string): number | undefined {
  switch (op) {
    case '^':
      return BP_POWER;
    case '*':
    case '/':
      return BP_MULDIV;
    case '+':
    case '-':
      return BP_ADDSUB;
    case '&':
      return BP_CONCAT;
    case '=':
    case '<>':
    case '<':
    case '>':
    case '<=':
    case '>=':
      return BP_COMPARE;
    default:
      return undefined;
  }
}

class FormulaParser {
  private i = 0;

  readonly errors: ParseError[] = [];

  constructor(
    private readonly toks: readonly Token[],
    private readonly src: string,
  ) {}

  // -- utilita' di scansione -------------------------------------------------

  private at(k = 0): Token | undefined {
    return this.toks[this.i + k];
  }

  /** Primo token significativo non consumato, se ne resta qualcuno. */
  leftover(): Token | undefined {
    for (let k = this.i; k < this.toks.length; k++) {
      const t = this.toks[k];
      if (t.type !== 'ws') return t;
    }
    return undefined;
  }

  /** Salta gli spazi bianchi; restituisce true se ne ha saltato almeno uno. */
  private skipWs(): boolean {
    let seen = false;
    while (this.i < this.toks.length && this.toks[this.i].type === 'ws') {
      seen = true;
      this.i += 1;
    }
    return seen;
  }

  private error(code: ParseErrorCode, message: string, start: number, end: number): void {
    this.errors.push({ code, message, start, end });
  }

  private endOfInput(): number {
    return this.src.length;
  }

  private missingAt(pos: number): FormulaNode {
    return { kind: 'Missing', start: pos, end: pos };
  }

  // -- espressioni -----------------------------------------------------------

  /**
   * @param minBp  binding power minimo che un operatore infisso deve avere per essere assorbito
   * @param allowUnion  se falso, `,` e' un separatore di argomenti e non l'operatore di unione
   */
  parseExpression(minBp: number, allowUnion: boolean): FormulaNode {
    let left = this.parseUnary(allowUnion);

    for (;;) {
      const save = this.i;
      const hadWs = this.skipWs();
      const t = this.at();
      if (!t) {
        this.i = save;
        break;
      }

      // `%` postfisso
      if (t.type === 'op' && t.text === '%' && BP_PERCENT >= minBp) {
        this.i += 1;
        left = { kind: 'Percent', operand: left, start: left.start, end: t.end };
        continue;
      }

      if (t.type === 'colon' && BP_RANGE >= minBp) {
        this.i += 1;
        const right = this.parseExpression(BP_RANGE + 1, allowUnion);
        left = this.makeRange(left, right, t);
        continue;
      }

      if (t.type === 'comma' && allowUnion && BP_UNION >= minBp) {
        this.i += 1;
        const right = this.parseExpression(BP_UNION + 1, allowUnion);
        left = this.makeBinary(',', left, right, t);
        continue;
      }

      if (t.type === 'op') {
        const bp = infixBindingPower(t.text);
        // `>= minBp` con destra a `bp + 1` => associativita' a SINISTRA per tutti
        // gli operatori, `^` compreso: in Excel `2^3^2` fa 64, non 512.
        if (bp !== undefined && bp >= minBp) {
          this.i += 1;
          const right = this.parseExpression(bp + 1, allowUnion);
          left = this.makeBinary(t.text as BinaryOperator, left, right, t);
          continue;
        }
      }

      // Intersezione: uno spazio fra due espressioni che producono riferimenti.
      // Si accetta solo se cio' che segue puo' davvero aprire un operando,
      // altrimenti `1 + 2` verrebbe letto come intersezione fra 1 e (+2).
      if (hadWs && BP_INTERSECT >= minBp && isOperandStart(t)) {
        const wsTok = this.toks[save];
        const right = this.parseExpression(BP_INTERSECT + 1, allowUnion);
        left = {
          kind: 'BinaryOp',
          op: ' ',
          left,
          right,
          opStart: wsTok.start,
          opEnd: t.start,
          start: left.start,
          end: right.end,
        };
        continue;
      }

      this.i = save;
      break;
    }

    return left;
  }

  private makeBinary(
    op: BinaryOperator,
    left: FormulaNode,
    right: FormulaNode,
    opTok: Token,
  ): FormulaNode {
    return {
      kind: 'BinaryOp',
      op,
      left,
      right,
      opStart: opTok.start,
      opEnd: opTok.end,
      start: left.start,
      end: right.end,
    };
  }

  /**
   * `A1:B2` arriva gia' fuso in un solo token dal lexer; qui si gestisce il caso
   * in cui `:` resta un operatore vero (`Sheet1!A1:Sheet1!B2`, `A1:INDEX(...)`).
   * Se entrambi i lati sono celle si ricostruisce un RangeRef, perche' il grader
   * ragiona su range e non su alberi di operatori.
   */
  private makeRange(left: FormulaNode, right: FormulaNode, opTok: Token): FormulaNode {
    if (left.kind === 'CellRef' && right.kind === 'CellRef') {
      const text = this.src.slice(left.start, right.end);
      const parsed = parseRangeRef(text);
      if (parsed) {
        return {
          kind: 'RangeRef',
          range: parsed,
          text,
          synthetic: true,
          start: left.start,
          end: right.end,
        };
      }
      // Fogli diversi ai due estremi: `parseRangeRef` non lo copre, si tiene
      // l'albero con l'operatore e il grader lo vedra' come tale.
    }
    return this.makeBinary(':', left, right, opTok);
  }

  private parseUnary(allowUnion: boolean): FormulaNode {
    this.skipWs();
    const t = this.at();
    if (t && t.type === 'op' && (t.text === '-' || t.text === '+')) {
      this.i += 1;
      const operand = this.parseExpression(BP_UNARY, allowUnion);
      return {
        kind: 'UnaryOp',
        op: t.text as UnaryOperator,
        operand,
        start: t.start,
        end: operand.end,
      };
    }
    return this.parsePrimary(allowUnion);
  }

  // `allowUnion` viaggia lungo tutta la catena di discesa ricorsiva ma non serve
  // a questo livello: gli operandi primari non contengono mai una unione.
  private parsePrimary(_allowUnion: boolean): FormulaNode {
    this.skipWs();
    const t = this.at();
    if (!t) {
      const pos = this.endOfInput();
      this.error('unexpected-end', 'Formula incompleta', pos, pos);
      return this.missingAt(pos);
    }

    switch (t.type) {
      case 'number':
        this.i += 1;
        return {
          kind: 'NumberLit',
          value: t.num ?? Number(t.text),
          text: t.text,
          start: t.start,
          end: t.end,
        };
      case 'string':
        this.i += 1;
        if (t.unterminated) {
          this.error('unterminated-string', 'Stringa non chiusa', t.start, t.end);
        }
        return { kind: 'StringLit', value: t.str ?? '', start: t.start, end: t.end };
      case 'bool':
        this.i += 1;
        return { kind: 'BoolLit', value: t.bool === true, start: t.start, end: t.end };
      case 'error':
        this.i += 1;
        return {
          kind: 'ErrorLit',
          value: (t.str ?? t.text).toUpperCase(),
          start: t.start,
          end: t.end,
        };
      case 'cell':
        this.i += 1;
        // Il token e' un riferimento valido per costruzione: `cell` c'e' sempre.
        return { kind: 'CellRef', ref: t.cell!, text: t.text, start: t.start, end: t.end };
      case 'range':
        this.i += 1;
        return { kind: 'RangeRef', range: t.range!, text: t.text, start: t.start, end: t.end };
      case 'name':
        this.i += 1;
        return { kind: 'NamedRef', name: t.text, start: t.start, end: t.end };
      case 'func':
        return this.parseFunctionCall(t);
      case 'lparen': {
        this.i += 1;
        const inner = this.parseExpression(0, true);
        this.skipWs();
        const close = this.at();
        if (close && close.type === 'rparen') {
          this.i += 1;
          return { kind: 'Paren', inner, start: t.start, end: close.end };
        }
        this.error('missing-paren', 'Manca la parentesi chiusa', t.start, inner.end);
        return { kind: 'Paren', inner, start: t.start, end: inner.end };
      }
      default: {
        // `)` e `,` non vengono consumati: appartengono al chiamante, che sa
        // come recuperare. Tutto il resto si consuma per garantire progresso.
        if (t.type === 'rparen' || t.type === 'comma') {
          this.error('missing-operand', `Manca un operando prima di "${t.text}"`, t.start, t.end);
          return this.missingAt(t.start);
        }
        this.i += 1;
        this.error('unexpected-token', `Token inatteso "${t.text}"`, t.start, t.end);
        return this.missingAt(t.start);
      }
    }
  }

  private parseFunctionCall(nameTok: Token): FormulaNode {
    this.i += 1;
    this.skipWs();
    const open = this.at();
    if (!open || open.type !== 'lparen') {
      // Non dovrebbe accadere: il lexer marca `func` solo se `(` segue.
      this.error('unexpected-token', 'Attesa "(" dopo il nome di funzione', nameTok.start, nameTok.end);
      return { kind: 'NamedRef', name: nameTok.text, start: nameTok.start, end: nameTok.end };
    }
    this.i += 1;

    const args: FormulaNode[] = [];
    let end = open.end;

    this.skipWs();
    if (this.at()?.type === 'rparen') {
      end = this.at()!.end;
      this.i += 1;
    } else {
      for (;;) {
        this.skipWs();
        const next = this.at();
        // Argomento omesso: `=IF(A1,,0)` e' legale in Excel e vale FALSE/0.
        // Non e' un errore di sintassi, quindi non se ne registra uno.
        if (next && (next.type === 'comma' || next.type === 'rparen')) {
          args.push(this.missingAt(next.start));
        } else {
          args.push(this.parseExpression(0, false));
        }

        this.skipWs();
        const sep = this.at();
        if (sep && sep.type === 'comma') {
          this.i += 1;
          continue;
        }
        if (sep && sep.type === 'rparen') {
          end = sep.end;
          this.i += 1;
          break;
        }
        const pos = sep ? sep.start : this.endOfInput();
        this.error('missing-paren', 'Manca la parentesi chiusa', nameTok.start, pos);
        end = pos;
        break;
      }
    }

    const call: FunctionCallNode = {
      kind: 'FunctionCall',
      name: nameTok.text,
      nameUpper: nameTok.text.toUpperCase(),
      args,
      nameStart: nameTok.start,
      nameEnd: nameTok.end,
      start: nameTok.start,
      end,
    };
    return call;
  }
}

/**
 * Parsifica una formula. Il `=` iniziale e' opzionale ed e' escluso dall'albero:
 * la radice comincia dal primo carattere dell'espressione vera.
 */
export function parseFormula(text: string): ParseResult {
  const tokens = tokenize(text);
  // Il `=` di apertura non e' un operatore: si scarta prima di parsificare.
  const body = tokens[0]?.type === 'assign' ? tokens.slice(1) : tokens;

  const parser = new FormulaParser(body, text);
  const hasContent = body.some((t) => t.type !== 'ws');
  if (!hasContent) {
    return { ast: undefined, errors: [], tokens, source: text };
  }

  const ast = parser.parseExpression(0, true);

  // Avanzi non consumati: succede con `=A1)` o `=SUM(A1))`.
  const leftover = parser.leftover();
  if (leftover) {
    parser.errors.push({
      code: 'unexpected-token',
      message: `Testo in eccesso a partire da "${leftover.text}"`,
      start: leftover.start,
      end: text.length,
    });
  }

  return { ast, errors: parser.errors, tokens, source: text };
}
