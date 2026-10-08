/**
 * AST delle formule Excel.
 *
 * Ogni nodo conserva `start`/`end` (offset nella stringa ORIGINALE, `end` escluso):
 * e' quello che permette a F9 di isolare un frammento e alla barra della formula
 * di colorare il testo giusto senza doverlo ri-serializzare.
 */

import type { ParsedRangeRef, ParsedRef } from '../address';

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '&'
  | '='
  | '<>'
  | '<'
  | '>'
  | '<='
  | '>='
  /** Operatore di range. */
  | ':'
  /** Intersezione: in Excel si scrive con uno spazio. */
  | ' '
  /** Unione: la virgola FUORI dalla lista argomenti di una funzione. */
  | ',';

export type UnaryOperator = '+' | '-';

interface NodeBase {
  readonly start: number;
  readonly end: number;
}

export interface NumberLit extends NodeBase {
  readonly kind: 'NumberLit';
  readonly value: number;
  /** Testo com'e' stato scritto: `1.50` e `1.5` valgono uguale ma non si scrivono uguale. */
  readonly text: string;
}

export interface StringLit extends NodeBase {
  readonly kind: 'StringLit';
  /** Contenuto gia' de-escapato. */
  readonly value: string;
}

export interface BoolLit extends NodeBase {
  readonly kind: 'BoolLit';
  readonly value: boolean;
}

export interface ErrorLit extends NodeBase {
  readonly kind: 'ErrorLit';
  /** Forma canonica maiuscola, es. `#REF!`. */
  readonly value: string;
}

export interface CellRefNode extends NodeBase {
  readonly kind: 'CellRef';
  readonly ref: ParsedRef;
  /** Testo esatto del riferimento, `$` e prefisso foglio compresi. */
  readonly text: string;
}

export interface RangeRefNode extends NodeBase {
  readonly kind: 'RangeRef';
  readonly range: ParsedRangeRef;
  readonly text: string;
  /** Vero se il range nasce dall'operatore `:` fra due sotto-espressioni (`A1:INDEX(...)`). */
  readonly synthetic?: boolean;
}

export interface NamedRefNode extends NodeBase {
  readonly kind: 'NamedRef';
  readonly name: string;
}

export interface FunctionCallNode extends NodeBase {
  readonly kind: 'FunctionCall';
  /** Nome come scritto dall'utente; usa `nameUpper` per confrontare. */
  readonly name: string;
  readonly nameUpper: string;
  readonly args: readonly FormulaNode[];
  readonly nameStart: number;
  readonly nameEnd: number;
}

export interface BinaryOpNode extends NodeBase {
  readonly kind: 'BinaryOp';
  readonly op: BinaryOperator;
  readonly left: FormulaNode;
  readonly right: FormulaNode;
  readonly opStart: number;
  readonly opEnd: number;
}

export interface UnaryOpNode extends NodeBase {
  readonly kind: 'UnaryOp';
  readonly op: UnaryOperator;
  readonly operand: FormulaNode;
}

export interface PercentNode extends NodeBase {
  readonly kind: 'Percent';
  readonly operand: FormulaNode;
}

export interface ParenNode extends NodeBase {
  readonly kind: 'Paren';
  readonly inner: FormulaNode;
}

/**
 * Segnaposto per un operando assente. Due usi:
 *  - argomento omesso, che in Excel e' legale (`=IF(A1,,0)`);
 *  - recupero da errore di sintassi, per restituire comunque un albero parziale
 *    mentre l'utente sta ancora digitando.
 */
export interface MissingNode extends NodeBase {
  readonly kind: 'Missing';
}

export type FormulaNode =
  | NumberLit
  | StringLit
  | BoolLit
  | ErrorLit
  | CellRefNode
  | RangeRefNode
  | NamedRefNode
  | FunctionCallNode
  | BinaryOpNode
  | UnaryOpNode
  | PercentNode
  | ParenNode
  | MissingNode;

/** Figli diretti, in ordine di apparizione nel testo. */
export function childrenOf(node: FormulaNode): readonly FormulaNode[] {
  switch (node.kind) {
    case 'FunctionCall':
      return node.args;
    case 'BinaryOp':
      return [node.left, node.right];
    case 'UnaryOp':
      return [node.operand];
    case 'Percent':
      return [node.operand];
    case 'Paren':
      return [node.inner];
    default:
      return [];
  }
}

/** Visita in pre-ordine. `visit` puo' restituire `false` per potare il sotto-albero. */
export function walkAst(
  node: FormulaNode | undefined,
  visit: (n: FormulaNode, parent: FormulaNode | undefined) => void | boolean,
  parent?: FormulaNode,
): void {
  if (!node) return;
  if (visit(node, parent) === false) return;
  for (const child of childrenOf(node)) walkAst(child, visit, node);
}

/** Tutti i nodi dell'albero, in pre-ordine. */
export function flattenAst(node: FormulaNode | undefined): FormulaNode[] {
  const out: FormulaNode[] = [];
  walkAst(node, (n) => {
    out.push(n);
  });
  return out;
}

/** Larghezza del nodo nel testo sorgente. */
export function nodeSpan(node: FormulaNode): number {
  return node.end - node.start;
}
