/**
 * Il grader (spec §4.2).
 *
 * Tre livelli di verifica, tutti eseguiti:
 *   1. numerico    — valore calcolato contro atteso, con tolleranza
 *   2. strutturale — ispezione dell'AST della formula: e' una formula? referenzia
 *                    le celle giuste? contiene numeri magici? gli ancoraggi sono
 *                    quelli richiesti? la riga e' coerente?
 *   3. stilistico  — color coding (dal rank 3 in su) e formati numerici (quando il task li chiede)
 *
 * Il punto politico del modulo: **un numero giusto hardcodato e' un livello
 * fallito**. Se un giorno qualcuno "semplifica" facendo passare il check
 * numerico da solo, il gioco smette di insegnare qualcosa.
 *
 * Regola d'oro del feedback (§4.2): al primo tentativo il grader dice COSA hai
 * sbagliato e di che famiglia e' l'errore, mai DOVE. Il `detail` — quale cella,
 * quale riferimento manca, quale numero hai prodotto — si sblocca dal secondo
 * tentativo. Il debug e' l'esercizio, non un ostacolo all'esercizio.
 */

import { a1ToCoord, a1ToRange, coordToA1, parseCellRef, type CellCoord, type RangeCoords } from '../engine/address';
import { parseFormula } from '../engine/formula/parser';
import {
  collectFunctions,
  collectNumericLiterals,
  collectRefs,
  formulasEquivalent,
  referencesCell,
  shiftFormula,
} from '../engine/formula/refs';
import { formatsEquivalent } from '../engine/numberFormat';
import { iterativeKey } from '../engine/iterative';
import type { Workbook } from '../engine/workbook';
import { classifyFontColor } from '../styles/palette';
import {
  checkFamily,
  DEFAULT_ABSOLUTE_FLOOR,
  DEFAULT_TOLERANCE,
  type Check,
  type CheckFamily,
  type LevelInstance,
  type Task,
} from '../content/types';
import { MESSAGES, firstAttemptSummary, FAMILY_LABEL } from './messages';

import { tr } from '../i18n/ui';
import { displayLocale } from '../i18n/language';
// ---------------------------------------------------------------------------
// Risultati
// ---------------------------------------------------------------------------

export interface CheckResult {
  readonly kind: Check['kind'];
  readonly family: CheckFamily;
  readonly passed: boolean;
  /** Messaggio didattico: sempre visibile, spiega il TIPO di errore. */
  readonly message: string;
  /** Dettaglio che localizza l'errore: visibile solo dal secondo tentativo. */
  readonly detail?: string;
}

export interface TaskResult {
  readonly taskId: string;
  readonly targetCell: string;
  readonly passed: boolean;
  /** Salvata sempre: alimenta la schermata "i tuoi errori ricorrenti" (§10). */
  readonly userFormula?: string;
  readonly userValue: unknown;
  readonly checks: readonly CheckResult[];
  readonly failedFamilies: readonly CheckFamily[];
}

export interface GradeReport {
  readonly passed: boolean;
  readonly tasks: readonly TaskResult[];
  readonly tasksCorrect: number;
  readonly tasksTotal: number;
  readonly summary: string;
  /** Nessun check strutturale fallito: vale il bonus XP "perfect structure" (§6). */
  readonly perfectStructure: boolean;
}

export interface GradeOptions {
  /** 1 = primo tentativo. Da 2 in su il `detail` viene rivelato. */
  readonly attempt?: number;
  /** Attiva i check stilistici. Lo spec li vuole dal rank 3 in su. */
  readonly enforceStyle?: boolean;
  /** Celle in riferimento circolare, chiave `"Foglio!A1"`. Le calcola il chiamante una volta sola. */
  readonly cycleCells?: ReadonlySet<string>;
  /**
   * Confronto fra formati numerici. Iniettato perche' l'equivalenza fra formati
   * Excel e' un problema a se': `formatsEquivalent` di numberFormat.ts si aggancia qui.
   */
  readonly formatComparator?: (a: string, b: string) => boolean;
}

// ---------------------------------------------------------------------------
// Lettura della cella sotto esame
// ---------------------------------------------------------------------------

interface Target {
  readonly sheetName: string;
  readonly sheetId: number;
  /** Cella su cui operano i check di cella singola. Per un bersaglio a range e' l'angolo in alto a sinistra. */
  readonly coord: CellCoord;
  readonly ref: string;
  /** Area completa: coincide con la cella se il bersaglio non e' un range. */
  readonly area: RangeCoords;
}

/**
 * Il `targetCell` di un task puo' essere una cella (`Model!D24`) oppure un range
 * (`Model!C7:F9`): i task di coerenza di riga lavorano per definizione su un'area.
 * Quando e' un range, i check di cella singola si applicano all'angolo in alto a
 * sinistra — che e' la cella che l'utente scrive per prima e da cui copia.
 */
function resolveTarget(wb: Workbook, qualified: string): Target {
  const bang = qualified.lastIndexOf('!');
  if (bang < 0) {
    throw new Error(`targetCell "${qualified}" non e' qualificato col foglio (serve "Foglio!A1")`);
  }
  const sheetName = unquote(qualified.slice(0, bang));
  const cellPart = qualified.slice(bang + 1);
  const area = a1ToRange(cellPart);
  if (!area) throw new Error(`targetCell "${qualified}": "${cellPart}" non e' un riferimento valido`);
  const coord = { row: area.top, col: area.left };
  return {
    sheetName,
    sheetId: wb.sheetId(sheetName),
    coord,
    ref: coordToA1(coord),
    area,
  };
}

function unquote(s: string): string {
  return s.startsWith("'") && s.endsWith("'") ? s.slice(1, -1).replace(/''/g, "'") : s;
}

/** HyperFormula restituisce gli errori come oggetto, non come stringa. */
function isCellError(v: unknown): v is { value: string; type: string } {
  return typeof v === 'object' && v !== null && 'type' in v && 'value' in v;
}

function errorText(v: unknown): string | undefined {
  return isCellError(v) ? String(v.value) : undefined;
}

// ---------------------------------------------------------------------------
// Grader
// ---------------------------------------------------------------------------

export function gradeTask(wb: Workbook, task: Task, opts: GradeOptions = {}): TaskResult {
  const target = resolveTarget(wb, task.targetCell);
  const formula = wb.getFormula(target.sheetId, target.coord);
  const value = wb.getValue(target.sheetId, target.coord);
  const ast = formula ? parseFormula(formula).ast : undefined;

  const results: CheckResult[] = [];
  for (const check of task.check) {
    // La disciplina dei colori conta dal rank 3; il formato numerico, quando un
    // task lo chiede, e' il contenuto stesso del task e si verifica sempre.
    if (check.kind === 'colorDiscipline' && opts.enforceStyle !== true) continue;
    results.push(runCheck(wb, check, { target, formula, value, ast }, opts));
  }

  const failed = results.filter((r) => !r.passed);
  const families = [...new Set(failed.map((r) => r.family))];

  return {
    taskId: task.id,
    targetCell: task.targetCell,
    passed: failed.length === 0,
    ...(formula !== undefined ? { userFormula: formula } : {}),
    userValue: value,
    checks: results,
    failedFamilies: families,
  };
}

export function gradeLevel(
  wb: Workbook,
  instance: LevelInstance,
  opts: GradeOptions = {},
): GradeReport {
  const tasks = instance.tasks.map((t) => gradeTask(wb, t, opts));
  const correct = tasks.filter((t) => t.passed).length;
  const failing = tasks
    .filter((t) => !t.passed)
    .map((t) => ({ taskId: t.taskId, families: [...t.failedFamilies] }));

  const perfectStructure = tasks.every((t) =>
    t.checks.every((c) => c.family !== 'strutturale' || c.passed),
  );

  return {
    passed: correct === tasks.length,
    tasks,
    tasksCorrect: correct,
    tasksTotal: tasks.length,
    summary:
      correct === tasks.length
        ? tr('grade.1', { p0: tasks.length })
        : firstAttemptSummary(failing),
    perfectStructure,
  };
}

// ---------------------------------------------------------------------------
// I singoli check
// ---------------------------------------------------------------------------

interface CellUnderTest {
  readonly target: Target;
  readonly formula: string | undefined;
  readonly value: unknown;
  readonly ast: ReturnType<typeof parseFormula>['ast'];
}

function runCheck(
  wb: Workbook,
  check: Check,
  cell: CellUnderTest,
  opts: GradeOptions,
): CheckResult {
  const family = checkFamily(check.kind);
  const reveal = (opts.attempt ?? 1) >= 2;

  const ok = (): CheckResult => ({ kind: check.kind, family, passed: true, message: '' });
  const ko = (message: string, detail?: string): CheckResult => ({
    kind: check.kind,
    family,
    passed: false,
    message: check.message ?? message,
    ...(reveal && detail !== undefined ? { detail } : {}),
  });

  switch (check.kind) {
    // ---------------------------------------------------------------- numerico
    case 'value': {
      if (check.at !== undefined) {
        // Valore di un'altra cella del bersaglio (tipicamente l'ultima di una
        // riga copiata): e' li' che un ancoraggio mancante smette di nascondersi.
        const coord = a1ToCoord(check.at);
        if (!coord) return ko(MESSAGES.value, tr('grade.2', { p0: check.at }));
        const altrove: Target = { ...cell.target, coord, ref: coordToA1(coord) };
        const { at: _at, ...resto } = check;
        return runCheck(wb, resto, { target: altrove, formula: undefined, value: wb.getValue(cell.target.sheetId, coord), ast: undefined }, opts);
      }
      const err = errorText(cell.value);
      if (err) return ko(tr('grade.3', { p0: MESSAGES.value, err }), `${cell.target.ref} = ${err}`);
      if (typeof cell.value !== 'number') {
        return ko(MESSAGES.value, tr('grade.4', { p0: cell.target.ref, p1: describe(cell.value) }));
      }
      const tol = check.tolerance ?? DEFAULT_TOLERANCE;
      const mode = check.toleranceMode ?? 'hybrid';
      const floor = check.absoluteFloor ?? DEFAULT_ABSOLUTE_FLOOR;
      const diff = Math.abs(cell.value - check.expected);
      const limit =
        mode === 'absolute'
          ? tol
          : mode === 'relative'
            ? tol * Math.abs(check.expected)
            : Math.max(tol * Math.abs(check.expected), floor);

      if (diff <= limit) return ok();

      // Segno invertito: e' un errore diverso da "numero sbagliato", e merita un
      // messaggio diverso — nei modelli e' quasi sempre una convenzione incoerente.
      if (Math.abs(cell.value + check.expected) <= limit && check.expected !== 0) {
        return ko(MESSAGES.valueSignFlipped, tr('grade.atteso', { ref: cell.target.ref, v: fmt(cell.value), e: fmt(check.expected) }));
      }
      const near = diff <= limit * 20;
      return ko(
        near ? MESSAGES.valueClose : MESSAGES.value,
        tr('grade.attesoScarto', { ref: cell.target.ref, v: fmt(cell.value), e: fmt(check.expected), d: fmt(diff) }),
      );
    }

    case 'text': {
      const trim = check.trim !== false;
      const actual = typeof cell.value === 'string' ? cell.value : String(cell.value ?? '');
      const norm = (s: string) => {
        // Un apice iniziale in Excel forza il testo e sparisce dalla cella: chi scrive
        // 'Conto Economico'!B2 vede salvato Conto Economico'!B2. Si confronta senza.
        const senzaApice = s.replace(/^'/, '');
        const t = trim ? senzaApice.trim().replace(/\s+/g, ' ') : senzaApice;
        return check.caseSensitive ? t : t.toLowerCase();
      };
      return norm(actual) === norm(check.expected)
        ? ok()
        : ko(MESSAGES.text, tr('grade.attesoTesto', { ref: cell.target.ref, v: actual, e: check.expected }));
    }

    case 'boolean':
      return cell.value === check.expected
        ? ok()
        : ko(MESSAGES.boolean, tr('grade.atteso', { ref: cell.target.ref, v: describe(cell.value), e: String(check.expected) }));

    case 'noError': {
      // Su un bersaglio a range l'errore puo' nascondersi in qualunque cella, non solo nella prima.
      for (const coord of cellsOf(cell.target.area)) {
        const err = errorText(wb.getValue(cell.target.sheetId, coord));
        if (err) return ko(`${MESSAGES.noError} ${err}.`, `${coordToA1(coord)} = ${err}`);
      }
      return ok();
    }

    // ------------------------------------------------------------ strutturale
    case 'mustBeFormula':
      if (cell.formula !== undefined) return ok();
      if (wb.isEmpty(cell.target.sheetId, cell.target.coord)) {
        return ko(MESSAGES.emptyCell, tr('grade.5', { p0: cell.target.ref }));
      }
      return ko(MESSAGES.mustBeFormula, tr('grade.6', { p0: cell.target.ref, p1: describe(cell.value) }));

    case 'mustReference': {
      if (cell.formula === undefined) return ko(MESSAGES.mustBeFormula, tr('grade.7', { p0: cell.target.ref }));
      const mancanti = check.cells.filter(
        (c) =>
          !referencesCell(cell.ast, c, {
            allowViaRange: check.allowViaRange !== false,
            contextSheet: cell.target.sheetName,
          }),
      );
      return mancanti.length === 0
        ? ok()
        : ko(MESSAGES.mustReference, tr('grade.8', { p0: mancanti.join(', ') }));
    }

    case 'mustNotContainLiteral': {
      if (cell.formula === undefined) {
        // Un valore battuto a mano E' un literal: il check ha comunque senso.
        return typeof cell.value === 'number' && !check.except.includes(cell.value)
          ? ko(MESSAGES.mustNotContainLiteral, tr('grade.9', { p0: cell.target.ref, p1: fmt(cell.value) }))
          : ok();
      }
      const vietati = collectNumericLiterals(cell.ast)
        .map((l) => ({ ...l, effettivo: l.negated ? -l.value : l.value }))
        .filter((l) => !check.except.includes(l.effettivo));
      return vietati.length === 0
        ? ok()
        : ko(
            MESSAGES.mustNotContainLiteral,
            tr('grade.10', { p0: vietati.map((l) => fmt(l.effettivo)).join(', ') }),
          );
    }

    case 'anchoring': {
      if (cell.formula === undefined) return ko(MESSAGES.mustBeFormula, tr('grade.11', { p0: cell.target.ref }));
      const atteso = parseCellRef(check.pattern);
      if (!atteso) return ko(MESSAGES.anchoring, tr('grade.12', { p0: check.pattern }));

      const refs = collectRefs(cell.ast);
      const stessaCella = refs.filter(
        (r) => r.area.top === atteso.row && r.area.left === atteso.col && r.kind === 'cell',
      );
      if (stessaCella.length === 0) {
        return ko(MESSAGES.mustReference, tr('grade.13', { p0: coordToA1({ row: atteso.row, col: atteso.col }) }));
      }
      const corretto = stessaCella.some(
        (r) => r.anchors.startRowAbs === atteso.rowAbs && r.anchors.startColAbs === atteso.colAbs,
      );
      return corretto
        ? ok()
        : ko(MESSAGES.anchoring, tr('grade.14', { p0: stessaCella.map((r) => r.text).join(', '), p1: check.pattern }));
    }

    case 'consistentRow':
      return checkConsistentRow(wb, check.range, cell.target.sheetName, ko, ok);

    case 'noCircular': {
      // La chiave la costruisce iterativeKey, cosi' i nomi foglio con spazi
      // vengono quotati allo stesso modo da entrambe le parti.
      const key = iterativeKey(cell.target.sheetName, cell.target.coord.row, cell.target.coord.col);
      const inCiclo = opts.cycleCells?.has(key) === true || errorText(cell.value) === '#CYCLE!';
      return inCiclo ? ko(MESSAGES.noCircular, tr('grade.15', { p0: cell.target.ref })) : ok();
    }

    case 'requiresCircular': {
      const key = iterativeKey(cell.target.sheetName, cell.target.coord.row, cell.target.coord.col);
      const inCiclo = opts.cycleCells?.has(key) === true || errorText(cell.value) === '#CYCLE!';
      return inCiclo ? ok() : ko(MESSAGES.requiresCircular, tr('grade.16', { p0: cell.target.ref }));
    }

    case 'mustUseFunction': {
      if (cell.formula === undefined) return ko(MESSAGES.mustBeFormula, tr('grade.17', { p0: cell.target.ref }));
      const usate = new Set(collectFunctions(cell.ast));
      const richieste = check.functions.map((f) => f.toUpperCase());
      const soddisfatto =
        check.quantifier === 'all' ? richieste.every((f) => usate.has(f)) : richieste.some((f) => usate.has(f));
      return soddisfatto
        ? ok()
        : ko(
            tr('grade.20', { p0: MESSAGES.mustUseFunction, p1: check.quantifier === 'all' ? tr('grade.18') : tr('grade.19'), p2: richieste.join(', ') }),
            tr('grade.22', { p0: [...usate].join(', ') || tr('grade.21') }),
          );
    }

    case 'mustNotUseFunction': {
      if (cell.formula === undefined) return ok();
      const usate = new Set(collectFunctions(cell.ast));
      const vietate = check.functions.map((f) => f.toUpperCase()).filter((f) => usate.has(f));
      return vietate.length === 0
        ? ok()
        : ko(tr('grade.23', { p0: MESSAGES.mustNotUseFunction, p1: vietate.join(', ') }), `in ${cell.target.ref}`);
    }

    // -------------------------------------------------------------- stilistico
    case 'colorDiscipline': {
      if (wb.isEmpty(cell.target.sheetId, cell.target.coord)) return ok();
      const style = wb.getStyle(cell.target.sheetId, cell.target.coord);
      const ruolo = classifyFontColor(style.fontColor);
      const atteso = expectedColorRole(cell);
      if (ruolo === atteso) return ok();
      return ko(
        MESSAGES.colorDiscipline,
        tr('grade.25', { p0: cell.target.ref, p1: ROLE_LABEL[atteso], p2: ruolo ? ROLE_LABEL[ruolo] : tr('grade.24') }),
      );
    }

    case 'numberFormat': {
      const style = wb.getStyle(cell.target.sheetId, cell.target.coord);
      const actual = style.numFmt ?? 'General';
      const cmp = opts.formatComparator ?? formatsEquivalent;
      return [check.expected, ...(check.accept ?? [])].some((f) => cmp(actual, f))
        ? ok()
        : ko(MESSAGES.numberFormat, tr('grade.26', { p0: cell.target.ref, actual, p2: check.expected }));
    }
  }
}

const ROLE_LABEL: Record<string, string> = {
  input: tr('grade.27'),
  formula: tr('grade.28'),
  crossSheet: tr('grade.29'),
  external: tr('grade.30'),
  locked: tr('grade.31'),
};

function expectedColorRole(cell: CellUnderTest): 'input' | 'formula' | 'crossSheet' {
  if (cell.formula === undefined) return 'input';
  const crossSheet = collectRefs(cell.ast).some(
    (r) => r.sheet !== undefined && r.sheet.toLowerCase() !== cell.target.sheetName.toLowerCase(),
  );
  return crossSheet ? 'crossSheet' : 'formula';
}

/**
 * Coerenza di riga: la stessa formula, correttamente traslata, su tutto il range.
 *
 * E' il check che intercetta l'errore silenzioso piu' costoso dei modelli veri:
 * una cella toccata a mano in mezzo a una riga, che nessuno vede finche' non e'
 * tardi. Prende come riferimento la PRIMA cella non vuota del range e verifica
 * che ogni altra sia il suo shift.
 */
function checkConsistentRow(
  wb: Workbook,
  rangeSpec: string,
  contextSheet: string,
  ko: (m: string, d?: string) => CheckResult,
  ok: () => CheckResult,
): CheckResult {
  const bang = rangeSpec.lastIndexOf('!');
  const sheetName = bang >= 0 ? unquote(rangeSpec.slice(0, bang)) : contextSheet;
  const rangePart = bang >= 0 ? rangeSpec.slice(bang + 1) : rangeSpec;
  const area = a1ToRange(rangePart);
  if (!area) return ko(MESSAGES.consistentRow, tr('grade.32', { rangeSpec }));

  const sheetId = wb.sheetId(sheetName);
  const celle = cellsOf(area);

  let base: { coord: CellCoord; formula: string } | undefined;
  const senzaFormula: string[] = [];
  const divergenti: string[] = [];

  const vuote: string[] = [];
  for (const coord of celle) {
    if (wb.isEmpty(sheetId, coord)) {
      vuote.push(coordToA1(coord));
      continue;
    }
    const f = wb.getFormula(sheetId, coord);
    if (f === undefined) {
      senzaFormula.push(coordToA1(coord));
      continue;
    }
    if (!base) {
      base = { coord, formula: f };
      continue;
    }
    const atteso = shiftFormula(base.formula, coord.row - base.coord.row, coord.col - base.coord.col);
    if (!formulasEquivalent(atteso, f)) divergenti.push(coordToA1(coord));
  }

  if (!base) return ko(MESSAGES.consistentRow, tr('grade.33', { rangeSpec }));
  if (vuote.length > 0) {
    // Un range lasciato a meta' non e' coerente: la formula deve coprirlo tutto.
    return ko(MESSAGES.consistentRow, tr('grade.34', { p0: vuote.join(', ') }));
  }
  if (senzaFormula.length > 0) {
    return ko(
      MESSAGES.consistentRow,
      tr('grade.35', { p0: senzaFormula.join(', ') }),
    );
  }
  if (divergenti.length > 0) {
    return ko(MESSAGES.consistentRow, tr('grade.36', { p0: divergenti.join(', ') }));
  }
  return ok();
}

function cellsOf(r: RangeCoords): CellCoord[] {
  const out: CellCoord[] = [];
  for (let row = r.top; row <= r.bottom; row++) {
    for (let col = r.left; col <= r.right; col++) out.push({ row, col });
  }
  return out;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  const dec = abs >= 100 ? 0 : abs >= 1 ? 2 : 4;
  return n.toLocaleString(displayLocale(), { minimumFractionDigits: 0, maximumFractionDigits: dec });
}

function describe(v: unknown): string {
  if (v === null || v === undefined) return tr('grade.niente');
  if (isCellError(v)) return String(v.value);
  if (typeof v === 'string') return tr('grade.37', { v });
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return fmt(v);
  return String(v);
}

export { FAMILY_LABEL };
