/**
 * Progressi del giocatore: un'unica API per l'interfaccia, due archivi dietro.
 *
 *  - Dentro Tauri: il database SQLite (profilo + `level_runs`), come prima.
 *  - Nel browser: `localStorage`. Prima di questo modulo, fuori da Tauri ogni
 *    salvataggio falliva e al ricaricamento della pagina si ripartiva da zero.
 *
 * Il resto del gioco non deve sapere quale dei due e' attivo.
 */

import type { RecordRunInput } from './runs';

export interface LevelProgress {
  readonly completions: number;
  readonly bestXp: number;
  readonly bestTimeMs: number | null;
  readonly lastCompletedAt: string;
}

export interface ProgressSnapshot {
  readonly xp: number;
  readonly streakDays: number;
  readonly lastPlayed: string | null;
  readonly levels: Readonly<Record<string, LevelProgress>>;
}

export interface RecordOutcome {
  readonly xpBefore: number;
  readonly xpAfter: number;
  readonly firstClear: boolean;
}

const EMPTY: ProgressSnapshot = { xp: 0, streakDays: 0, lastPlayed: null, levels: {} };
const STORAGE_KEY = 'dd_progress_v1';
const FREE_PLAY_KEY = 'dd_free_play';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// ---------------------------------------------------------------------------
// Logica pura, condivisa dai due archivi
// ---------------------------------------------------------------------------

export function nextStreakDays(current: number, lastPlayed: string | null, today: string): number {
  if (lastPlayed === today) return current;
  if (lastPlayed === null) return 1;
  const giorni = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastPlayed}T00:00:00Z`)) / 86_400_000);
  return giorni === 1 ? current + 1 : 1;
}

/** Applica una run a un'istantanea. Pura: testabile senza archivio. */
export function applyRun(
  snap: ProgressSnapshot,
  run: { templateId: string; passed: boolean; xpEarned: number; durationMs: number; at: string },
): ProgressSnapshot {
  const today = run.at.slice(0, 10);
  const levels = { ...snap.levels };
  if (run.passed) {
    const prev = levels[run.templateId];
    levels[run.templateId] = {
      completions: (prev?.completions ?? 0) + 1,
      bestXp: Math.max(prev?.bestXp ?? 0, Math.round(run.xpEarned)),
      bestTimeMs:
        prev?.bestTimeMs == null ? Math.round(run.durationMs) : Math.min(prev.bestTimeMs, Math.round(run.durationMs)),
      lastCompletedAt: run.at,
    };
  }
  return {
    xp: Math.max(0, snap.xp + Math.round(run.xpEarned)),
    streakDays: nextStreakDays(snap.streakDays, snap.lastPlayed, today),
    lastPlayed: today,
    levels,
  };
}

// ---------------------------------------------------------------------------
// Archivio browser
// ---------------------------------------------------------------------------

function readLocal(): ProgressSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ProgressSnapshot>;
    return {
      xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
      streakDays: typeof parsed.streakDays === 'number' ? parsed.streakDays : 0,
      lastPlayed: typeof parsed.lastPlayed === 'string' ? parsed.lastPlayed : null,
      levels: typeof parsed.levels === 'object' && parsed.levels !== null ? parsed.levels : {},
    };
  } catch {
    return EMPTY;
  }
}

function writeLocal(snap: ProgressSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    // Quota piena o archiviazione bloccata: il gioco continua, i progressi valgono per la sessione.
  }
}

// ---------------------------------------------------------------------------
// Archivio Tauri
// ---------------------------------------------------------------------------

async function readTauri(): Promise<ProgressSnapshot> {
  const { loadProfile } = await import('./profile');
  const { db } = await import('./db');
  const profile = await loadProfile();
  const rows = await (await db()).select<
    { template_id: string; n: number; best_xp: number; best_ms: number; last_at: string }[]
  >(
    `SELECT template_id, COUNT(*) AS n, MAX(xp_earned) AS best_xp, MIN(duration_ms) AS best_ms,
            MAX(started_at) AS last_at
       FROM level_runs WHERE passed = 1 GROUP BY template_id`,
  );
  const levels: Record<string, LevelProgress> = {};
  for (const r of rows) {
    levels[r.template_id] = {
      completions: r.n,
      bestXp: r.best_xp,
      bestTimeMs: r.best_ms,
      lastCompletedAt: r.last_at,
    };
  }
  return { xp: profile.xp, streakDays: profile.streakDays, lastPlayed: profile.lastPlayed, levels };
}

// ---------------------------------------------------------------------------
// API pubblica
// ---------------------------------------------------------------------------

let cache: ProgressSnapshot | null = null;
const listeners = new Set<(snap: ProgressSnapshot) => void>();

function publish(snap: ProgressSnapshot): void {
  cache = snap;
  for (const l of listeners) l(snap);
}

export async function loadProgress(): Promise<ProgressSnapshot> {
  if (cache) return cache;
  let snap = EMPTY;
  if (isTauriRuntime()) {
    try {
      snap = await readTauri();
    } catch (err) {
      // eslint-disable-next-line no-console -- diagnostica, non un errore per l'utente
      console.warn('Progressi: database non disponibile, uso l\'archivio del browser.', err);
      snap = readLocal();
    }
  } else {
    snap = readLocal();
  }
  publish(snap);
  return snap;
}

export function subscribeProgress(fn: (snap: ProgressSnapshot) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Registra una run conclusa e aggiorna XP, streak e completamenti. */
export async function recordProgress(input: RecordRunInput): Promise<RecordOutcome> {
  const before = await loadProgress();
  const firstClear = input.report.passed && before.levels[input.templateId] === undefined;
  const after = applyRun(before, {
    templateId: input.templateId,
    passed: input.report.passed,
    xpEarned: input.xpEarned,
    durationMs: input.metrics.durationMs,
    at: input.startedAt,
  });

  if (isTauriRuntime()) {
    try {
      const { addXp, touchStreak } = await import('./profile');
      const { recordRun } = await import('./runs');
      await addXp(input.xpEarned);
      await touchStreak(after.lastPlayed ?? input.startedAt.slice(0, 10));
      await recordRun(input);
    } catch (err) {
      // eslint-disable-next-line no-console -- diagnostica, non un errore per l'utente
      console.warn('Progressi: scrittura sul database fallita, salvo nel browser.', err);
      writeLocal(after);
    }
  } else {
    writeLocal(after);
  }
  publish(after);
  return { xpBefore: before.xp, xpAfter: after.xp, firstClear };
}

/** Modalita' libera: tutti i livelli giocabili, prerequisiti ignorati. Preferenza locale. */
export function isFreePlay(): boolean {
  try {
    return localStorage.getItem(FREE_PLAY_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setFreePlay(on: boolean): void {
  try {
    localStorage.setItem(FREE_PLAY_KEY, on ? 'true' : 'false');
  } catch {
    // preferenza non salvabile: vale per la sessione tramite il chiamante
  }
}

/** Solo per i test: azzera la cache in memoria. */
export function resetProgressCache(): void {
  cache = null;
}
