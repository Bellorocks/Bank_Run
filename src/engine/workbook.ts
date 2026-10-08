/**
 * `Workbook` — l'adattatore fra HyperFormula e il resto del gioco.
 *
 * Divisione delle responsabilita' (rispettarla evita il bug piu' insidioso di
 * un clone di Excel, cioe' due fonti di verita' che divergono):
 *
 *   HyperFormula possiede il CONTENUTO   -> testo digitato, formule, valori, grafo delle dipendenze
 *   Workbook possiede tutto il resto     -> stili, larghezze, righe nascoste, outline, celle bloccate,
 *                                           undo unificato, calcolo iterativo
 *
 * Il contenuto non viene mai duplicato: `getFormula` interroga HyperFormula.
 * Se un giorno lo si mettesse in cache, ogni bug di ricalcolo diventerebbe
 * invisibile fino al grader.
 */

import {
  HyperFormula,
  AlwaysSparse,
  type RawCellContent,
  type CellValue,
  type ExportedChange,
} from 'hyperformula';
import {
  cellKey,
  cellKeyToCoord,
  clampCol,
  clampRow,
  iterateRange,
  LAST_COL,
  LAST_ROW,
  normalizeRange,
  type CellCoord,
  type RangeCoords,
} from './address';
import {
  createSheetLayout,
  EMPTY_STYLE,
  type CellRaw,
  type CellStyle,
  type GridProbe,
  type SheetLayout,
} from './types';
import {
  DEFAULT_ITERATIVE,
  iterativeKey,
  solveIterative,
  type IterativeConfig,
} from './iterative';
import {
  addBooleanNames,
  fromEngineFormula,
  registerEngineExtensions,
  toEngineFormula,
} from './engineExtensions';

/** Le stringhe che iniziano con = passano per la traduzione verso il motore. */
function toEngineRaw<T>(raw: T): T {
  return (typeof raw === 'string' ? toEngineFormula(raw) : raw) as T;
}

/**
 * Configurazione del motore. `maxRows`/`maxColumns` sono i limiti veri di Excel
 * perche' la navigazione deve poterci atterrare (Ctrl+Giu su colonna vuota va
 * all'ultima riga del foglio); la strategia sparsa evita che questo costi memoria.
 */
const HF_CONFIG = {
  licenseKey: 'gpl-v3',
  maxRows: LAST_ROW + 1,
  maxColumns: LAST_COL + 1,
  chooseAddressMappingPolicy: new AlwaysSparse(),
  useArrayArithmetic: true,
  smartRounding: true,
  // Lo spec §3.1 chiede almeno 100 passi di undo; il default di HyperFormula e' 20.
  undoLimit: 250,
  language: 'enGB',
} as const;

export interface SheetInit {
  readonly name: string;
  /** Matrice riga x colonna di contenuti grezzi, come li digiterebbe l'utente. */
  readonly data?: RawCellContent[][];
}

/** Cosa e' cambiato dopo una scrittura: serve al ridisegno mirato della griglia. */
export interface ChangeSummary {
  readonly touched: readonly { sheet: number; row: number; col: number }[];
  readonly structural: boolean;
}

/**
 * Un passo invertibile. Ogni voce conserva sia il PRIMA sia il DOPO: senza il
 * "dopo" il redo saprebbe rifare il contenuto (lo tiene HyperFormula) ma non il
 * formato, e dopo Ctrl+Z / Ctrl+Y il foglio resterebbe in uno stato che l'utente
 * non ha mai prodotto.
 */
type InverseOp =
  | { kind: 'hf' }
  | { kind: 'style'; sheet: number; key: number; prev: CellStyle | undefined; next: CellStyle | undefined }
  /** Rimappatura in blocco (traslazione di stili e celle bloccate su insert/remove). */
  | { kind: 'remap'; undo: () => void; redo: () => void };

interface UndoEntry {
  readonly label: string;
  readonly ops: InverseOp[];
}

export class Workbook {
  private readonly hf: HyperFormula;
  private readonly layouts = new Map<number, SheetLayout>();
  private readonly styles = new Map<number, Map<number, CellStyle>>();
  private readonly locked = new Map<number, Set<number>>();

  private readonly undoStack: UndoEntry[] = [];
  private readonly redoStack: UndoEntry[] = [];
  private pending: InverseOp[] | null = null;

  private iterative: IterativeConfig = { ...DEFAULT_ITERATIVE };
  /** Valori delle celle circolari risolti dal solver, chiave "sheet!A1". */
  private iterativeValues = new Map<string, number>();

  private constructor(hf: HyperFormula) {
    this.hf = hf;
    for (const id of this.sheetIds()) {
      this.layouts.set(id, createSheetLayout());
      this.styles.set(id, new Map());
      this.locked.set(id, new Set());
    }
  }

  static create(sheets: readonly SheetInit[]): Workbook {
    registerEngineExtensions();
    const payload: Record<string, RawCellContent[][]> = {};
    for (const s of sheets) payload[s.name] = s.data ? s.data.map((r) => r.map(toEngineRaw)) : [[]];
    const hf = HyperFormula.buildFromSheets(payload, HF_CONFIG);
    addBooleanNames(hf);
    hf.clearUndoStack();
    hf.clearRedoStack();
    return new Workbook(hf);
  }

  static empty(sheetName = 'Foglio1'): Workbook {
    return Workbook.create([{ name: sheetName }]);
  }

  destroy(): void {
    this.hf.destroy();
  }

  /** Accesso di fuga al motore, per i moduli che ne hanno davvero bisogno (solver, export). */
  get engine(): HyperFormula {
    return this.hf;
  }

  // -------------------------------------------------------------------------
  // Fogli
  // -------------------------------------------------------------------------

  sheetIds(): number[] {
    return this.hf.getSheetNames().map((n) => this.hf.getSheetId(n)!);
  }

  sheetNames(): string[] {
    return this.hf.getSheetNames();
  }

  sheetName(id: number): string {
    const n = this.hf.getSheetName(id);
    if (n === undefined) throw new Error(`Foglio ${id} inesistente`);
    return n;
  }

  sheetId(name: string): number {
    const id = this.hf.getSheetId(name);
    if (id === undefined) throw new Error(`Foglio "${name}" inesistente`);
    return id;
  }

  addSheet(name: string): number {
    const actual = this.hf.addSheet(name);
    const id = this.hf.getSheetId(actual)!;
    this.layouts.set(id, createSheetLayout());
    this.styles.set(id, new Map());
    this.locked.set(id, new Set());
    return id;
  }

  layout(sheet: number): SheetLayout {
    const l = this.layouts.get(sheet);
    if (!l) throw new Error(`Foglio ${sheet} inesistente`);
    return l;
  }

  // -------------------------------------------------------------------------
  // Lettura del contenuto
  // -------------------------------------------------------------------------

  /** Testo della formula CON il segno `=`, oppure `undefined` se la cella non e' una formula. */
  getFormula(sheet: number, c: CellCoord): string | undefined {
    const f = this.hf.getCellFormula({ sheet, row: c.row, col: c.col });
    return f === undefined ? undefined : fromEngineFormula(f);
  }

  /** Contenuto grezzo cosi' come l'utente lo ha digitato: e' cio' che va in edit mode. */
  getRaw(sheet: number, c: CellCoord): CellRaw {
    const v = this.hf.getCellSerialized({ sheet, row: c.row, col: c.col });
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') return fromEngineFormula(v);
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    return String(v);
  }

  /**
   * Valore calcolato. Se il calcolo iterativo e' attivo e la cella fa parte di un
   * ciclo risolto, restituisce il valore convergente invece di `#CYCLE!`.
   */
  getValue(sheet: number, c: CellCoord): CellValue {
    if (this.iterative.enabled && this.iterativeValues.size > 0) {
      // La chiave DEVE essere costruita con `iterativeKey`, che quota i nomi
      // foglio quando serve: comporla a mano qui significherebbe cercare
      // "Deal Model!B10" in una mappa che contiene "'Deal Model'!B10".
      const solved = this.iterativeValues.get(iterativeKey(this.sheetName(sheet), c.row, c.col));
      if (solved !== undefined) return solved;
    }
    return this.hf.getCellValue({ sheet, row: c.row, col: c.col });
  }

  /** Sintassi accettata dal motore (non dice nulla sul risultato: #NAME? e' sintatticamente valido). */
  isValidFormula(text: string): boolean {
    return this.hf.validateFormula(toEngineFormula(text));
  }

  isFormula(sheet: number, c: CellCoord): boolean {
    return this.hf.doesCellHaveFormula({ sheet, row: c.row, col: c.col });
  }

  isEmpty(sheet: number, c: CellCoord): boolean {
    return this.hf.isCellEmpty({ sheet, row: c.row, col: c.col });
  }

  /**
   * "Piena" ai fini della navigazione. Attenzione: una cella contenente la
   * stringa vuota risultato di una formula (es. `=IF(A1>0,"","")`) in Excel
   * CONTA come piena per Ctrl+Freccia, perche' la cella non e' vuota: contiene
   * una formula. Riprodotto qui.
   */
  isFilled(sheet: number, row: number, col: number): boolean {
    return !this.hf.isCellEmpty({ sheet, row, col });
  }

  usedRange(sheet: number): RangeCoords | null {
    const dim = this.hf.getSheetDimensions(sheet);
    if (dim.width === 0 || dim.height === 0) return null;

    // getSheetDimensions restituisce il rettangolo allocato, che puo' essere piu'
    // largo del contenuto reale dopo cancellazioni. Ctrl+Fine deve atterrare sul
    // contenuto vero, quindi restringiamo.
    let bottom = -1;
    let right = -1;
    for (let r = 0; r < dim.height; r++) {
      for (let c = 0; c < dim.width; c++) {
        if (!this.hf.isCellEmpty({ sheet, row: r, col: c })) {
          if (r > bottom) bottom = r;
          if (c > right) right = c;
        }
      }
    }
    if (bottom < 0) return null;
    return { top: 0, left: 0, bottom, right };
  }

  /** Sonda per navigazione e selezione: le vincola alla sola superficie che serve. */
  probe(sheet: number): GridProbe {
    const layout = this.layout(sheet);
    return {
      isFilled: (row, col) => this.isFilled(sheet, row, col),
      maxRow: LAST_ROW,
      maxCol: LAST_COL,
      usedRange: () => this.usedRange(sheet),
      isRowHidden: (row) => layout.hiddenRows.has(row),
      isColHidden: (col) => layout.hiddenCols.has(col),
      frozenRows: layout.frozenRows,
      frozenCols: layout.frozenCols,
    };
  }

  // -------------------------------------------------------------------------
  // Scrittura
  // -------------------------------------------------------------------------

  setContents(sheet: number, c: CellCoord, raw: CellRaw, label = 'digitazione'): ChangeSummary {
    return this.transaction(label, () => {
      const changes = this.hf.setCellContents({ sheet, row: c.row, col: c.col }, toEngineRaw(raw));
      this.record({ kind: 'hf' });
      return this.summarize(changes);
    });
  }

  /** Scrive un blocco. Una sola voce di undo per l'intera operazione, come in Excel. */
  setBlock(
    sheet: number,
    topLeft: CellCoord,
    block: readonly (readonly CellRaw[])[],
    label = 'incolla',
  ): ChangeSummary {
    return this.transaction(label, () => {
      const payload = block.map((r) => r.map(toEngineRaw)) as RawCellContent[][];
      const changes = this.hf.setCellContents({ sheet, row: topLeft.row, col: topLeft.col }, payload);
      this.record({ kind: 'hf' });
      return this.summarize(changes);
    });
  }

  clearRange(sheet: number, range: RangeCoords, label = 'cancella'): ChangeSummary {
    const r = normalizeRange(range);
    return this.transaction(label, () => {
      const rows = r.bottom - r.top + 1;
      const cols = r.right - r.left + 1;
      const empty: RawCellContent[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => null),
      );
      const changes = this.hf.setCellContents({ sheet, row: r.top, col: r.left }, empty);
      this.record({ kind: 'hf' });
      return this.summarize(changes);
    });
  }

  /**
   * Traduce le modifiche riportate da HyperFormula in un elenco di celle da
   * ridisegnare. Include le celle DIPENDENTI, non solo quella scritta: e' il
   * motivo per cui esiste un motore a grafo invece di ricalcolare tutto.
   */
  private summarize(changes: readonly ExportedChange[]): ChangeSummary {
    const touched: { sheet: number; row: number; col: number }[] = [];
    for (const ch of changes) {
      if ('address' in ch && ch.address) {
        touched.push({ sheet: ch.address.sheet, row: ch.address.row, col: ch.address.col });
      }
    }
    return { touched, structural: false };
  }

  // -------------------------------------------------------------------------
  // Stili
  // -------------------------------------------------------------------------

  getStyle(sheet: number, c: CellCoord): CellStyle {
    return this.styles.get(sheet)?.get(cellKey(c.row, c.col)) ?? EMPTY_STYLE;
  }

  setStyle(sheet: number, c: CellCoord, patch: CellStyle, label = 'formato'): void {
    this.transaction(label, () => {
      this.applyStyle(sheet, c, patch);
    });
  }

  setStyleRange(sheet: number, range: RangeCoords, patch: CellStyle, label = 'formato'): void {
    this.transaction(label, () => {
      for (const c of iterateRange(normalizeRange(range))) this.applyStyle(sheet, c, patch);
    });
  }

  private applyStyle(sheet: number, c: CellCoord, patch: CellStyle): void {
    const map = this.styles.get(sheet);
    if (!map) throw new Error(`Foglio ${sheet} inesistente`);
    const key = cellKey(c.row, c.col);
    const prev = map.get(key);
    const merged = { ...(prev ?? {}), ...patch };
    // Un patch che azzera tutto deve rimuovere la voce, non lasciare un oggetto vuoto.
    const next = Object.values(merged).every((v) => v === undefined) ? undefined : merged;
    this.record({ kind: 'style', sheet, key, prev, next });
    if (next === undefined) map.delete(key);
    else map.set(key, next);
  }

  // -------------------------------------------------------------------------
  // Celle bloccate
  // -------------------------------------------------------------------------

  setLocked(sheet: number, range: RangeCoords, isLocked: boolean): void {
    const set = this.locked.get(sheet);
    if (!set) throw new Error(`Foglio ${sheet} inesistente`);
    for (const c of iterateRange(normalizeRange(range))) {
      const key = cellKey(c.row, c.col);
      if (isLocked) set.add(key);
      else set.delete(key);
    }
  }

  isLocked(sheet: number, c: CellCoord): boolean {
    return this.locked.get(sheet)?.has(cellKey(c.row, c.col)) ?? false;
  }

  // -------------------------------------------------------------------------
  // Struttura
  // -------------------------------------------------------------------------

  insertRows(sheet: number, at: number, count = 1): void {
    // Il punto di intervento va clampato UNA volta e riusato: se HyperFormula
    // inserisse a riga 0 e gli stili traslassero da riga -5, le due meta' del
    // modello scivolerebbero di quantita' diverse.
    const row = clampRow(at);
    this.transaction('inserisci righe', () => {
      this.hf.addRows(sheet, [row, count]);
      this.record({ kind: 'hf' });
      this.shiftAttributes(sheet, row, count, 'row');
    });
  }

  removeRows(sheet: number, at: number, count = 1): void {
    const row = clampRow(at);
    this.transaction('elimina righe', () => {
      this.hf.removeRows(sheet, [row, count]);
      this.record({ kind: 'hf' });
      this.shiftAttributes(sheet, row, -count, 'row');
    });
  }

  insertCols(sheet: number, at: number, count = 1): void {
    const col = clampCol(at);
    this.transaction('inserisci colonne', () => {
      this.hf.addColumns(sheet, [col, count]);
      this.record({ kind: 'hf' });
      this.shiftAttributes(sheet, col, count, 'col');
    });
  }

  removeCols(sheet: number, at: number, count = 1): void {
    const col = clampCol(at);
    this.transaction('elimina colonne', () => {
      this.hf.removeColumns(sheet, [col, count]);
      this.record({ kind: 'hf' });
      this.shiftAttributes(sheet, col, -count, 'col');
    });
  }

  /**
   * Stili e celle bloccate devono traslare insieme alle celle: HyperFormula sposta
   * il contenuto, ma colori e lucchetti vivono qui. Senza questo, inserire una riga
   * scombina il color coding e il grader boccia l'utente per un errore che non ha
   * commesso — e un'area protetta finirebbe per proteggere le celle sbagliate.
   */
  private shiftAttributes(sheet: number, at: number, delta: number, axis: 'row' | 'col'): void {
    const styles = this.styles.get(sheet);
    const locked = this.locked.get(sheet);
    if (!styles || !locked) return;
    if (styles.size === 0 && locked.size === 0) return;

    const styleBefore = new Map(styles);
    const lockedBefore = new Set(locked);

    const styleAfter = new Map<number, CellStyle>();
    for (const [key, style] of styleBefore) {
      const moved = shiftKey(key, at, delta, axis);
      if (moved !== null) styleAfter.set(moved, style);
    }
    const lockedAfter = new Set<number>();
    for (const key of lockedBefore) {
      const moved = shiftKey(key, at, delta, axis);
      if (moved !== null) lockedAfter.add(moved);
    }

    const apply = (s: ReadonlyMap<number, CellStyle>, l: ReadonlySet<number>): void => {
      styles.clear();
      for (const [k, v] of s) styles.set(k, v);
      locked.clear();
      for (const k of l) locked.add(k);
    };

    this.record({
      kind: 'remap',
      undo: () => apply(styleBefore, lockedBefore),
      redo: () => apply(styleAfter, lockedAfter),
    });
    apply(styleAfter, lockedAfter);
  }

  // -------------------------------------------------------------------------
  // Undo / redo unificati
  // -------------------------------------------------------------------------

  /**
   * HyperFormula ha il proprio undo, ma non sa nulla di stili e layout. Un solo
   * Ctrl+Z deve annullare l'intera azione dell'utente, contenuto e formato insieme:
   * per questo ogni operazione e' una transazione che colleziona gli inversi.
   */
  private transaction<T>(label: string, fn: () => T): T {
    if (this.pending) return fn(); // transazione annidata: confluisce nella padre
    this.pending = [];
    try {
      const result = fn();
      if (this.pending.length > 0) {
        this.undoStack.push({ label, ops: this.pending });
        if (this.undoStack.length > 250) this.undoStack.shift();
        this.redoStack.length = 0;
      }
      return result;
    } finally {
      this.pending = null;
      this.invalidateIterative();
    }
  }

  /**
   * Raggruppa piu' scritture in UNA sola voce di undo.
   *
   * Serve perche' l'unita' di Ctrl+Z e' l'azione dell'utente, non la chiamata di
   * API: "incolla con formato" o "scrivi il numero e coloralo di blu" sono un
   * gesto solo e devono tornare indietro insieme. Vale per ogni comando che
   * tocca piu' di una cella — Ctrl+D, Ctrl+Invio, incolla, Canc su selezione
   * multipla: senza, servirebbe un Ctrl+Z per cella.
   *
   * Le transazioni annidate confluiscono in quella esterna, quindi i metodi
   * pubblici si possono comporre liberamente qui dentro.
   */
  batch<T>(label: string, fn: () => T): T {
    return this.transaction(label, fn);
  }

  private record(op: InverseOp): void {
    this.pending?.push(op);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undoLabel(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.label;
  }

  /**
   * Azzera la cronologia, propria e di HyperFormula. Si chiama dopo aver
   * caricato un livello: il primo Ctrl+Z dell'utente deve annullare la SUA
   * prima mossa, non smontare il livello che ha appena aperto.
   */
  clearHistory(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.hf.clearUndoStack();
    this.hf.clearRedoStack();
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    // Gli inversi vanno applicati in ordine contrario a come sono stati registrati.
    for (let i = entry.ops.length - 1; i >= 0; i--) {
      const op = entry.ops[i];
      if (op.kind === 'hf') {
        if (this.hf.isThereSomethingToUndo()) this.hf.undo();
      } else if (op.kind === 'style') {
        this.writeStyle(op.sheet, op.key, op.prev);
      } else {
        op.undo();
      }
    }
    this.redoStack.push(entry);
    this.invalidateIterative();
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    // In avanti, nello stesso ordine in cui gli inversi erano stati registrati.
    for (const op of entry.ops) {
      if (op.kind === 'hf') {
        if (this.hf.isThereSomethingToRedo()) this.hf.redo();
      } else if (op.kind === 'style') {
        this.writeStyle(op.sheet, op.key, op.next);
      } else {
        op.redo();
      }
    }
    this.undoStack.push(entry);
    this.invalidateIterative();
  }

  private writeStyle(sheet: number, key: number, style: CellStyle | undefined): void {
    const map = this.styles.get(sheet);
    if (!map) return;
    if (style === undefined) map.delete(key);
    else map.set(key, style);
  }

  // -------------------------------------------------------------------------
  // Audit: precedenti e dipendenti
  // -------------------------------------------------------------------------

  precedents(sheet: number, c: CellCoord): { sheet: number; range: RangeCoords }[] {
    return this.hf
      .getCellPrecedents({ sheet, row: c.row, col: c.col })
      .map(toRange)
      .filter((x): x is { sheet: number; range: RangeCoords } => x !== null);
  }

  dependents(sheet: number, c: CellCoord): { sheet: number; range: RangeCoords }[] {
    return this.hf
      .getCellDependents({ sheet, row: c.row, col: c.col })
      .map(toRange)
      .filter((x): x is { sheet: number; range: RangeCoords } => x !== null);
  }

  /** F9 su frammento: valuta un'espressione nel contesto di un foglio. */
  evaluateFragment(sheet: number, expression: string): CellValue | CellValue[][] {
    const formula = expression.startsWith('=') ? expression : `=${expression}`;
    if (!this.hf.validateFormula(formula)) return '#NAME?';
    return this.hf.calculateFormula(formula, sheet);
  }

  // -------------------------------------------------------------------------
  // Calcolo iterativo
  // -------------------------------------------------------------------------

  setIterative(config: Partial<IterativeConfig>): void {
    this.iterative = { ...this.iterative, ...config };
    this.invalidateIterative();
    if (this.iterative.enabled) this.recalcIterative();
  }

  getIterative(): IterativeConfig {
    return { ...this.iterative };
  }

  private invalidateIterative(): void {
    this.iterativeValues.clear();
  }

  /**
   * Risolve i cicli. Non e' automatico dopo ogni scrittura: costa, e durante la
   * digitazione i cicli transitori sono normali. Il chiamante decide quando.
   */
  recalcIterative(): { converged: boolean; iterations: number } | null {
    if (!this.iterative.enabled) return null;
    const result = solveIterative(this.hf, this.iterative);
    this.iterativeValues = result.values;
    return { converged: result.converged, iterations: result.iterations };
  }
}

/**
 * Nuova chiave di cella dopo un inserimento (`delta > 0`) o un'eliminazione
 * (`delta < 0`) di righe/colonne a partire da `at`. `null` se la cella e' stata
 * eliminata: la sua riga/colonna non esiste piu' e i suoi attributi devono
 * sparire, non accavallarsi su quelli della cella che prende il suo posto.
 */
function shiftKey(key: number, at: number, delta: number, axis: 'row' | 'col'): number | null {
  const { row, col } = cellKeyToCoord(key);
  const pos = axis === 'row' ? row : col;
  if (pos < at) return key; // prima del punto di intervento: ferma
  if (delta < 0 && pos < at - delta) return null; // dentro la banda eliminata
  const moved = pos + delta;
  const r = axis === 'row' ? moved : row;
  const c = axis === 'col' ? moved : col;
  if (r < 0 || c < 0 || r > LAST_ROW || c > LAST_COL) return null;
  return cellKey(r, c);
}

function toRange(
  x: { sheet: number; row: number; col: number } | { start: { sheet: number; row: number; col: number }; end: { row: number; col: number } },
): { sheet: number; range: RangeCoords } | null {
  if ('start' in x) {
    // I riferimenti a named expression arrivano con sheet -1: non sono celle.
    if (x.start.sheet < 0) return null;
    return {
      sheet: x.start.sheet,
      range: normalizeRange({ top: x.start.row, left: x.start.col, bottom: x.end.row, right: x.end.col }),
    };
  }
  if (x.sheet < 0) return null;
  return { sheet: x.sheet, range: { top: x.row, left: x.col, bottom: x.row, right: x.col } };
}
