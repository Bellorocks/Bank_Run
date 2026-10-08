/**
 * `level_runs`, `task_results`, `error_log` (spec §10).
 *
 * `task_results.user_formula` va salvato SEMPRE, corretto o sbagliato: e' il
 * dato che alimenta "i tuoi errori ricorrenti", la feature con piu' valore
 * didattico del gioco. Non e' un log opzionale.
 */

import { db } from './db';
import type { GradeReport } from '../grader/grade';
import type { RunMetrics } from '../input/metrics';
import type { LevelMode } from '../content/types';

export interface SavedRun {
  readonly id: number;
  readonly templateId: string;
  readonly seed: number;
  readonly mode: LevelMode;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly keystrokes: number;
  readonly mouseClicks: number;
  readonly hintsUsed: number;
  readonly tasksTotal: number;
  readonly tasksCorrect: number;
  readonly xpEarned: number;
  readonly passed: boolean;
}

export interface RecordRunInput {
  readonly templateId: string;
  readonly seed: number;
  readonly mode: LevelMode;
  /** ISO 8601. Iniettato: la funzione non deve dipendere dall'orologio per essere testabile. */
  readonly startedAt: string;
  readonly metrics: RunMetrics;
  readonly hintsUsed: number;
  readonly xpEarned: number;
  readonly report: GradeReport;
}

/**
 * Registra una run completa: la riga in `level_runs`, un `task_results` per
 * ogni task del report (con la formula dell'utente, sempre), e un `error_log`
 * per ogni check strutturale o numerico fallito.
 *
 * NIENTE `BEGIN`/`COMMIT` qui: `Database.execute()` di tauri-plugin-sql preleva
 * una connessione dal pool sqlx per OGNI chiamata e la rilascia subito dopo (l'ho
 * verificato nel sorgente Rust del plugin, `wrapper.rs::DbPool::execute`) — non
 * c'e' alcuna garanzia che `BEGIN` e gli `INSERT` successivi finiscano sulla
 * stessa connessione. Una transazione scritta cosi' e' un'illusione: sembra
 * atomica e non lo e', e nel caso peggiore fallisce a runtime.
 *
 * La soluzione che l'API pubblica del plugin permette davvero: comprimere ogni
 * tabella in UN SOLO statement multi-VALUES. Uno statement e' sempre atomico su
 * SQLite, qualunque connessione lo esegua. Restano tre statement invece di uno,
 * quindi un crollo a meta' fra `level_runs` e `task_results` resta possibile in
 * teoria — ma i totali (`tasks_correct`/`tasks_total`) sono gia' nella riga di
 * `level_runs`, quindi anche in quel caso raro il dato aggregato non si perde,
 * solo il dettaglio per-task.
 */
export async function recordRun(input: RecordRunInput): Promise<number> {
  const conn = await db();
  const { report, metrics } = input;

  const ins = await conn.execute(
    `INSERT INTO level_runs
       (template_id, seed, mode, started_at, duration_ms, keystrokes, mouse_clicks,
        hints_used, tasks_total, tasks_correct, xp_earned, passed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      input.templateId,
      input.seed,
      input.mode,
      input.startedAt,
      Math.round(metrics.durationMs),
      metrics.keystrokes,
      metrics.mouseClicks,
      input.hintsUsed,
      report.tasksTotal,
      report.tasksCorrect,
      Math.round(input.xpEarned),
      report.passed ? 1 : 0,
    ],
  );
  const runId = ins.lastInsertId;
  if (runId === undefined) throw new Error('recordRun: lastInsertId assente dopo INSERT in level_runs');

  if (report.tasks.length > 0) {
    const valori: unknown[] = [];
    const placeholders = report.tasks.map((task, i) => {
      // Un task puo' avere piu' check falliti: si registra comunque UNA riga
      // per task, con il primo check fallito come rappresentativo — e' cio' su
      // cui "i tuoi errori ricorrenti" aggrega, e sdoppiare per check farebbe
      // contare due volte lo stesso errore dell'utente.
      const primoFallito = task.checks.find((c) => !c.passed);
      valori.push(
        runId,
        task.taskId,
        primoFallito?.kind ?? task.checks[0]?.kind ?? '',
        task.passed ? 1 : 0,
        task.userFormula ?? null,
        serializeValue(task.userValue),
      );
      const base = i * 6;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    });
    await conn.execute(
      `INSERT INTO task_results (run_id, task_id, check_kind, passed, user_formula, user_value)
       VALUES ${placeholders.join(', ')}`,
      valori,
    );
  }

  const erroriFalliti = report.tasks.flatMap((task) => task.checks.filter((c) => !c.passed));
  if (erroriFalliti.length > 0) {
    const valori: unknown[] = [];
    const placeholders = erroriFalliti.map((check, i) => {
      valori.push(runId, check.kind, null, check.message);
      const base = i * 4;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    });
    await conn.execute(
      `INSERT INTO error_log (run_id, error_type, skill_id, detail) VALUES ${placeholders.join(', ')}`,
      valori,
    );
  }

  return runId;
}

function serializeValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

interface RunRow {
  id: number;
  template_id: string;
  seed: number;
  mode: string;
  started_at: string;
  duration_ms: number;
  keystrokes: number;
  mouse_clicks: number;
  hints_used: number;
  tasks_total: number;
  tasks_correct: number;
  xp_earned: number;
  passed: number;
}

function fromRow(r: RunRow): SavedRun {
  return {
    id: r.id,
    templateId: r.template_id,
    seed: r.seed,
    mode: r.mode as LevelMode,
    startedAt: r.started_at,
    durationMs: r.duration_ms,
    keystrokes: r.keystrokes,
    mouseClicks: r.mouse_clicks,
    hintsUsed: r.hints_used,
    tasksTotal: r.tasks_total,
    tasksCorrect: r.tasks_correct,
    xpEarned: r.xp_earned,
    passed: r.passed === 1,
  };
}

export async function runsForTemplate(templateId: string, limit = 50): Promise<SavedRun[]> {
  const rows = await (await db()).select<RunRow[]>(
    'SELECT * FROM level_runs WHERE template_id = $1 ORDER BY started_at DESC LIMIT $2',
    [templateId, limit],
  );
  return rows.map(fromRow);
}

export async function recentRuns(limit = 20): Promise<SavedRun[]> {
  const rows = await (await db()).select<RunRow[]>(
    'SELECT * FROM level_runs ORDER BY started_at DESC LIMIT $1',
    [limit],
  );
  return rows.map(fromRow);
}

/**
 * Mediana delle run superate su un template: e' la base per ricalibrare il par
 * time (spec §14: "il par time va calibrato, non inventato"). Restituisce
 * `null` se non ci sono ancora abbastanza run — ricalibrare su 2 campioni
 * sarebbe rumore, non calibrazione.
 */
export async function medianDurationMs(templateId: string, minSamples = 5): Promise<number | null> {
  const rows = await (await db()).select<{ duration_ms: number }[]>(
    'SELECT duration_ms FROM level_runs WHERE template_id = $1 AND passed = 1 ORDER BY duration_ms',
    [templateId],
  );
  if (rows.length < minSamples) return null;
  const mid = Math.floor(rows.length / 2);
  return rows.length % 2 === 0 ? (rows[mid - 1].duration_ms + rows[mid].duration_ms) / 2 : rows[mid].duration_ms;
}

// ---------------------------------------------------------------------------
// I tuoi errori ricorrenti — spec §10, "la feature con piu' valore didattico"
// ---------------------------------------------------------------------------

export interface RecurringError {
  readonly errorType: string;
  readonly count: number;
  readonly lastSeen: string;
}

export async function topRecurringErrors(limit = 5): Promise<RecurringError[]> {
  const rows = await (await db()).select<{ error_type: string; count: number; last_seen: string }[]>(
    `SELECT e.error_type as error_type, COUNT(*) as count, MAX(r.started_at) as last_seen
     FROM error_log e
     JOIN level_runs r ON r.id = e.run_id
     GROUP BY e.error_type
     ORDER BY count DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({ errorType: r.error_type, count: r.count, lastSeen: r.last_seen }));
}
