/**
 * Calcolo iterativo (BUILD SPEC §3.1: max 100 iterazioni, delta 0,001).
 *
 * PERCHE' QUESTO MODULO ESISTE
 * HyperFormula 3.4.0 non ha l'iterative calculation di Excel: un riferimento
 * circolare produce `#CYCLE!` e finisce li'. Ma senza calcolo iterativo meta'
 * del modulo M8 non e' giocabile — un debt schedule con cash sweep e' circolare
 * per costruzione (interessi -> cassa disponibile -> rimborso -> debito medio del
 * periodo -> interessi) e in Excel si risolve solo attivando l'iterazione.
 * Lo stack e' fisso (§2: "risolvi l'attrito, non cambiare la scelta"), quindi
 * l'iterazione va costruita SOPRA HyperFormula. Questo modulo e' quella soluzione.
 *
 * COME FUNZIONA
 * Gauss-Seidel su un motore OMBRA (una seconda istanza HyperFormula con lo stesso
 * contenuto): tutte le celle del ciclo vengono congelate a un valore numerico —
 * si parte da 0, esattamente come fa Excel a freddo — cosi' il grafo delle
 * dipendenze non ha piu' archi circolari; a ogni passo si rivaluta la formula
 * originale di una cella sola contro i valori congelati delle altre e si aggiorna
 * subito il suo valore (da cui "Gauss-Seidel": la cella successiva vede gia' il
 * valore nuovo, non quello dell'iterazione precedente). Lo sweep finisce quando
 * il massimo scarto assoluto scende sotto `delta`.
 *
 * Il modello dell'utente non viene MAI toccato: le sostituzioni avvengono solo
 * sull'ombra, che viene distrutta in `finally`.
 */

import { HyperFormula } from 'hyperformula';
import type { CellValue, SimpleCellAddress, SimpleCellRange } from 'hyperformula';

import { coordToA1, quoteSheetName } from './address';

// ---------------------------------------------------------------------------
// API pubblica
// ---------------------------------------------------------------------------

export interface IterativeConfig {
  readonly enabled: boolean;
  readonly maxIterations: number;
  readonly delta: number;
}

/**
 * Default di Excel, e default nostro: l'iterazione e' SPENTA finche' un livello
 * non la chiede (`LevelInstance.iterativeCalculation`). Lasciarla accesa
 * ovunque nasconderebbe i riferimenti circolari accidentali, che in un livello
 * "noCircular" sono proprio l'errore da far vedere allo studente.
 */
export const DEFAULT_ITERATIVE: IterativeConfig = {
  enabled: false,
  maxIterations: 100,
  delta: 0.001,
};

export interface IterativeResult {
  readonly converged: boolean;
  /** Sweep completi eseguiti. 0 se non c'era niente da risolvere. */
  readonly iterations: number;
  /** Massimo scarto assoluto dell'ultimo sweep; `Infinity` se il modello e' esploso. */
  readonly maxDelta: number;
  /** Chiave `"sheet!A1"` -> valore convergente. Contiene solo le celle del ciclo. */
  readonly values: Map<string, number>;
  readonly cycleCells: string[];
}

/** Chiave stabile di una cella qualificata: `"Model!B10"`, `"'Deal Model'!B10"`. */
export function iterativeKey(sheetName: string, row: number, col: number): string {
  return `${quoteSheetName(sheetName)}!${coordToA1({ row, col })}`;
}

// ---------------------------------------------------------------------------
// Rilevamento delle celle in ciclo
// ---------------------------------------------------------------------------

/** Cella del ciclo, con tutto quello che serve per rivalutarla. */
interface CycleCell {
  readonly key: string;
  readonly sheetId: number;
  readonly sheetName: string;
  readonly row: number;
  readonly col: number;
}

/**
 * Un range enorme fra i precedenti (`A:A` diventa 1.048.576 celle) manderebbe la
 * chiusura in ginocchio. Oltre questa soglia il range viene ignorato: e' un caso
 * che nei modelli finanziari non si presenta, i cicli veri sono locali.
 */
const MAX_RANGE_EXPANSION = 4096;

function isCycleError(value: CellValue): boolean {
  // Duck typing invece di `instanceof DetailedCellError`: e' immune al caso in cui
  // il bundle di HyperFormula venga caricato in due copie (ESM + CJS).
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'CYCLE'
  );
}

function isRange(x: SimpleCellAddress | SimpleCellRange): x is SimpleCellRange {
  return (x as SimpleCellRange).start !== undefined;
}

/** Espande un vicino del grafo delle dipendenze nelle sue celle singole. */
function* expandNeighbour(x: SimpleCellAddress | SimpleCellRange): Generator<SimpleCellAddress> {
  if (!isRange(x)) {
    yield x;
    return;
  }
  const { start, end } = x;
  const rows = Math.abs(end.row - start.row) + 1;
  const cols = Math.abs(end.col - start.col) + 1;
  if (rows * cols > MAX_RANGE_EXPANSION) return;
  const top = Math.min(start.row, end.row);
  const bottom = Math.max(start.row, end.row);
  const left = Math.min(start.col, end.col);
  const right = Math.max(start.col, end.col);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      yield { sheet: start.sheet, row, col };
    }
  }
}

/**
 * Tutte le celle coinvolte in un riferimento circolare, ordinate per
 * (foglio, riga, colonna) — che nei modelli finanziari e' anche l'ordine in cui
 * scorre il calcolo, quindi fa da buon ordine di sweep per Gauss-Seidel.
 *
 * Nota: l'insieme comprende anche le celle a VALLE del ciclo, quelle che si
 * limitano a propagare `#CYCLE!` senza farne parte. E' voluto e coerente con
 * Excel, che le tratta come parte del problema circolare: congelarle e
 * rivalutarle a ogni sweep non cambia il punto fisso e in cambio mette anche il
 * loro valore convergente nel risultato.
 */
function detectCycleCellsDetailed(hf: HyperFormula): CycleCell[] {
  const found = new Map<string, CycleCell>();

  const push = (sheetId: number, sheetName: string, row: number, col: number): CycleCell | null => {
    const key = iterativeKey(sheetName, row, col);
    if (found.has(key)) return null;
    const cell: CycleCell = { key, sheetId, sheetName, row, col };
    found.set(key, cell);
    return cell;
  };

  // 1. scansione dell'area usata di ogni foglio
  const sheetNameById = new Map<number, string>();
  const queue: CycleCell[] = [];
  for (const sheetName of hf.getSheetNames()) {
    const sheetId = hf.getSheetId(sheetName);
    if (sheetId === undefined) continue;
    sheetNameById.set(sheetId, sheetName);
    const { width, height } = hf.getSheetDimensions(sheetId);
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (isCycleError(hf.getCellValue({ sheet: sheetId, row, col }))) {
          const added = push(sheetId, sheetName, row, col);
          if (added) queue.push(added);
        }
      }
    }
  }

  // 2. chiusura risalendo precedenti e dipendenti: garantisce che l'insieme sia
  //    chiuso anche se la scansione per dimensioni del foglio ha mancato qualcosa
  //    (celle fuori dall'area dichiarata, cicli che attraversano piu' fogli).
  while (queue.length > 0) {
    const cur = queue.pop() as CycleCell;
    const addr: SimpleCellAddress = { sheet: cur.sheetId, row: cur.row, col: cur.col };
    const neighbours = [...hf.getCellPrecedents(addr), ...hf.getCellDependents(addr)];
    for (const n of neighbours) {
      for (const cand of expandNeighbour(n)) {
        const name = sheetNameById.get(cand.sheet) ?? hf.getSheetName(cand.sheet);
        if (name === undefined) continue;
        sheetNameById.set(cand.sheet, name);
        if (found.has(iterativeKey(name, cand.row, cand.col))) continue;
        if (!isCycleError(hf.getCellValue(cand))) continue;
        const added = push(cand.sheet, name, cand.row, cand.col);
        if (added) queue.push(added);
      }
    }
  }

  return [...found.values()].sort(
    (a, b) => a.sheetId - b.sheetId || a.row - b.row || a.col - b.col,
  );
}

/** Chiavi `"sheet!A1"` delle celle in riferimento circolare. Array vuoto se il modello e' aciclico. */
export function detectCycleCells(hf: HyperFormula): string[] {
  return detectCycleCellsDetailed(hf).map((c) => c.key);
}

// ---------------------------------------------------------------------------
// Solver
// ---------------------------------------------------------------------------

/**
 * Excel accetta 1..32767 iterazioni e un delta non negativo. Con `delta = 0`
 * l'iterazione va sempre fino in fondo al conteggio massimo: e' il comportamento
 * di Excel, non un bug.
 */
function sanitizeConfig(config: IterativeConfig): { maxIterations: number; delta: number } {
  const raw = Math.floor(config.maxIterations);
  const maxIterations = Number.isFinite(raw) ? Math.max(1, Math.min(32767, raw)) : 100;
  const delta = Number.isFinite(config.delta) ? Math.max(0, config.delta) : 0.001;
  return { maxIterations, delta };
}

/**
 * Un risultato non numerico durante l'iterazione vale 0.
 * Motivo: a freddo tutte le celle del ciclo valgono 0, quindi i primi sweep
 * possono produrre `#DIV/0!` o `#NUM!` transitori su denominatori ancora vuoti.
 * Trattarli come 0 lascia al modello la possibilita' di riprendersi allo sweep
 * successivo, che e' esattamente cio' che fa Excel partendo da zero.
 */
function toNumber(value: CellValue | CellValue[][]): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (Array.isArray(value)) {
    const first = value[0]?.[0];
    return first === undefined ? 0 : toNumber(first);
  }
  return 0;
}

function emptyResult(cycleCells: string[], converged: boolean): IterativeResult {
  return { converged, iterations: 0, maxDelta: 0, values: new Map(), cycleCells };
}

/**
 * Risolve i riferimenti circolari di `hf` e restituisce i valori convergenti.
 *
 * Non modifica `hf`: tocca a chi chiama decidere se e come scrivere i valori nel
 * modello (il grader legge direttamente `values`, la griglia li mostra come
 * overlay). Nessuna eccezione in caso di divergenza: si tronca a `maxIterations`
 * con `converged: false`.
 */
export function solveIterative(hf: HyperFormula, config: IterativeConfig): IterativeResult {
  const cells = detectCycleCellsDetailed(hf);
  const cycleCells = cells.map((c) => c.key);

  // Niente cicli: non c'e' nulla da risolvere ed e' gia' tutto "convergente".
  if (cells.length === 0) return emptyResult(cycleCells, true);
  // Iterazione spenta: i cicli restano irrisolti, e va detto.
  if (!config.enabled) return emptyResult(cycleCells, false);

  const { maxIterations, delta } = sanitizeConfig(config);

  // Motore ombra. Config e named expressions vanno clonati o le formule del
  // modello (che possono usare named ranges) non compilerebbero allo stesso modo.
  const shadow = HyperFormula.buildFromSheets(
    hf.getAllSheetsSerialized(),
    hf.getConfig(),
    hf.getAllNamedExpressionsSerialized(),
  );

  try {
    // Indirizzi nel motore ombra: gli id foglio si risolvono per NOME, non si
    // assume che l'ordine di serializzazione coincida con quello originale.
    const addrs: SimpleCellAddress[] = [];
    const formulas: string[] = [];
    const keys: string[] = [];
    for (const c of cells) {
      const sheetId = shadow.getSheetId(c.sheetName);
      if (sheetId === undefined) continue;
      const addr: SimpleCellAddress = { sheet: sheetId, row: c.row, col: c.col };
      const formula = shadow.getCellFormula(addr);
      // Una cella senza formula non puo' stare in un ciclo; se capita, e' un
      // valore gia' fisso e va lasciato dov'e'.
      if (formula === undefined) continue;
      addrs.push(addr);
      formulas.push(formula);
      keys.push(c.key);
    }

    const n = addrs.length;
    if (n === 0) return emptyResult(cycleCells, false);

    // Partenza a freddo: tutte le celle del ciclo a 0, come Excel. In batch,
    // perche' cosi' il grafo viene ricostruito una volta sola invece di n.
    const current = new Float64Array(n);
    shadow.batch(() => {
      for (let i = 0; i < n; i++) shadow.setCellContents(addrs[i], 0);
    });

    let iterations = 0;
    let maxDelta = Number.POSITIVE_INFINITY;
    let diverged = false;

    for (let it = 0; it < maxIterations; it++) {
      let sweepMax = 0;
      for (let i = 0; i < n; i++) {
        const next = toNumber(evaluateAt(shadow, addrs[i], formulas[i], current[i]));
        if (!Number.isFinite(next)) {
          // Overflow o NaN: il modello e' esploso. Fermarsi qui evita di
          // scrivere valori che HyperFormula rifiuterebbe come #NUM!.
          diverged = true;
          break;
        }
        const d = Math.abs(next - current[i]);
        if (d > sweepMax) sweepMax = d;
        current[i] = next;
        shadow.setCellContents(addrs[i], next);
      }
      iterations = it + 1;
      if (diverged) {
        maxDelta = Number.POSITIVE_INFINITY;
        break;
      }
      maxDelta = sweepMax;
      if (maxDelta < delta) break;
    }

    const values = new Map<string, number>();
    for (let i = 0; i < n; i++) values.set(keys[i], current[i]);

    return {
      converged: !diverged && maxDelta < delta,
      iterations,
      maxDelta,
      values,
      cycleCells,
    };
  } finally {
    // Anche in caso di eccezione: un'istanza HyperFormula non distrutta tiene in
    // vita l'intero grafo delle dipendenze.
    shadow.destroy();
  }
}

/**
 * Valuta la formula di una cella del ciclo contro i valori congelati delle altre.
 *
 * `calculateFormula` invece di rimettere fisicamente la formula nella cella:
 * e' semanticamente equivalente (HyperFormula parsifica la stringa con cella
 * base A1 e la valuta da A1, e la forma A1 restituita da `getCellFormula` nomina
 * gia' le celle bersaglio in modo assoluto, quindi i riferimenti relativi
 * atterrano dove devono) ma costa UNA sola scrittura per cella per sweep invece
 * di due, e soprattutto non ricalcola l'albero dei dipendenti a valle due volte.
 * Con 100 iterazioni x N celle e' la differenza fra sostenibile e inutilizzabile:
 * sul debt schedule LBO del test (8 celle in ciclo) l'intera soluzione sta
 * sotto i 10 ms.
 *
 * Fallback difensivo: se `calculateFormula` rifiuta la stringa (array formula,
 * costrutti che vogliono il contesto della cella vera) si ripiega sulla via
 * letterale — rimetti la formula, leggi, ricongela.
 */
function evaluateAt(
  shadow: HyperFormula,
  addr: SimpleCellAddress,
  formula: string,
  frozen: number,
): CellValue | CellValue[][] {
  try {
    return shadow.calculateFormula(formula, addr.sheet);
  } catch {
    shadow.setCellContents(addr, formula);
    const v = shadow.getCellValue(addr);
    shadow.setCellContents(addr, frozen);
    return v;
  }
}
