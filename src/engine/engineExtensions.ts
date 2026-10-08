/**
 * Estensioni del motore per colmare due differenze di HyperFormula rispetto a Excel.
 *
 * 1. OFFSET con argomenti dinamici. Il parser di HyperFormula tratta OFFSET come
 *    una costruzione sintattica e pretende numeri letterali come spostamento
 *    ("Second argument to OFFSET is not a static number"). In Excel
 *    `=OFFSET(B12,-B14,0)` e' la forma normale. Qui OFFSET viene instradato a un
 *    plugin volatile, `XOFFSET`, che valuta gli argomenti a runtime. La
 *    traduzione e' confinata al bordo del `Workbook`: tutto il resto del gioco
 *    (barra della formula, grader, export) vede sempre `OFFSET`.
 *
 * 2. I letterali booleani nudi. `=IF(A1>0,TRUE,FALSE)` restituiva #NAME? perche'
 *    HyperFormula conosce solo le funzioni TRUE() e FALSE(). Due named expression
 *    globali li rendono validi come in Excel.
 */

import {
  CellError,
  ErrorType,
  FunctionArgumentType,
  FunctionPlugin,
  HyperFormula,
} from 'hyperformula';

const ENGINE_OFFSET = 'XOFFSET';

/* eslint-disable @typescript-eslint/no-explicit-any -- l'API dei plugin espone tipi interni non esportati */
class DynamicOffsetPlugin extends FunctionPlugin {
  xoffset(ast: any, state: any): any {
    const args = ast.args as any[];
    if (args.length < 3 || args.length > 5) {
      return new CellError(ErrorType.NA, 'OFFSET: servono da 3 a 5 argomenti');
    }
    const refAst = args[0];
    if (refAst.type !== 'CELL_REFERENCE') {
      return new CellError(ErrorType.VALUE, 'OFFSET: il primo argomento deve essere una cella');
    }
    const base = refAst.reference.toSimpleCellAddress(state.formulaAddress);
    const asNumber = (a: any): number | CellError => {
      if (a === undefined || a.type === 'EMPTY') return 0;
      const v = this.evaluateAst(a, state);
      if (v instanceof CellError) return v;
      if (typeof v === 'number') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      return new CellError(ErrorType.VALUE, 'OFFSET: righe e colonne devono essere numeri');
    };
    const rows = asNumber(args[1]);
    if (rows instanceof CellError) return rows;
    const cols = asNumber(args[2]);
    if (cols instanceof CellError) return cols;
    for (const extra of args.slice(3)) {
      const size = asNumber(extra);
      if (size instanceof CellError) return size;
      if (Math.trunc(size) !== 1) {
        return new CellError(ErrorType.VALUE, 'OFFSET: qui sono supportati solo spostamenti su una singola cella');
      }
    }
    const target = {
      sheet: base.sheet,
      row: base.row + Math.trunc(rows),
      col: base.col + Math.trunc(cols),
    };
    if (target.row < 0 || target.col < 0) {
      return new CellError(ErrorType.REF, 'OFFSET: la cella di arrivo e\' fuori dal foglio');
    }
    return (this as any).dependencyGraph.getCellValue(target);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

(DynamicOffsetPlugin as unknown as { implementedFunctions: unknown }).implementedFunctions = {
  [ENGINE_OFFSET]: {
    method: 'xoffset',
    doesNotNeedArgumentsToBeComputed: true,
    isVolatile: true,
    parameters: [
      { argumentType: FunctionArgumentType.NOERROR },
      { argumentType: FunctionArgumentType.NUMBER },
      { argumentType: FunctionArgumentType.NUMBER },
      { argumentType: FunctionArgumentType.NUMBER, optionalArg: true },
      { argumentType: FunctionArgumentType.NUMBER, optionalArg: true },
    ],
  },
};

let registered = false;

/** Registra il plugin una volta sola: la registrazione in HyperFormula e' globale. */
export function registerEngineExtensions(): void {
  if (registered) return;
  registered = true;
  const translation = { [ENGINE_OFFSET]: ENGINE_OFFSET };
  HyperFormula.registerFunctionPlugin(DynamicOffsetPlugin as never, {
    enGB: translation,
    enUS: translation,
  } as never);
}

/** Named expression per i booleani nudi. Va chiamata subito dopo la costruzione del motore. */
export function addBooleanNames(hf: HyperFormula): void {
  for (const [name, expr] of [['TRUE', '=TRUE()'], ['FALSE', '=FALSE()']] as const) {
    if (!hf.isItPossibleToAddNamedExpression(name, expr)) continue;
    hf.addNamedExpression(name, expr);
  }
}

/** Sostituisce un nome di funzione fuori dalle stringhe letterali, rispettando i confini di parola. */
function renameFunction(formula: string, from: string, to: string): string {
  if (!formula.startsWith('=')) return formula;
  const upper = formula.toUpperCase();
  if (!upper.includes(`${from}(`)) return formula;
  let out = '';
  let inString = false;
  for (let i = 0; i < formula.length; i++) {
    const ch = formula[i];
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (!inString && upper.startsWith(`${from}(`, i)) {
      const prev = i > 0 ? formula[i - 1] : '';
      if (!/[A-Za-z0-9_.$]/.test(prev)) {
        out += to;
        i += from.length - 1;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

/** Testo come lo scrive l'utente -> testo per il motore. */
export function toEngineFormula(text: string): string {
  return renameFunction(text, 'OFFSET', ENGINE_OFFSET);
}

/** Testo del motore -> testo da mostrare all'utente e da dare al grader. */
export function fromEngineFormula(text: string): string {
  return renameFunction(text, ENGINE_OFFSET, 'OFFSET');
}
