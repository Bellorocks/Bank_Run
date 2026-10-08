/**
 * Metriche di una run e calcolo XP (BUILD SPEC 6).
 *
 * Tutto qui dentro e' puro: prende una registrazione di input e restituisce numeri.
 * E' quello che rende testabile la parte piu' delicata del gioco — il punteggio —
 * senza montare ne' la griglia ne' il DOM.
 */

import type { LevelMode, ParScore } from '../content/types';
import type { InputEvent } from './InputRecorder';

/**
 * Il minimo che serve a `computeMetrics`. Tipizzare la sorgente in modo
 * strutturale (invece che come `InputRecorder`) permette ai test — e alla
 * schermata statistiche, che rilegge run dal database — di passare una run
 * ricostruita senza costruire un recorder vero.
 */
export interface MetricsSource {
  readonly events: readonly InputEvent[];
  elapsedMs(): number;
}

export interface RunMetrics {
  readonly durationMs: number;
  readonly keystrokes: number;
  /** Tutti i click, anche quelli bloccati dalla modalita' mouse-free. */
  readonly mouseClicks: number;
  readonly mouseBlocked: number;
  readonly hintsUsed: number;
  readonly cheatSheetOpens: number;
  /** Keystroke usati / keystroke minimi teorici. 1.0 = perfetto, mai sotto 1. */
  readonly keystrokeEfficiency: number;
  /** Somma delle pause oltre soglia: il tempo in cui l'utente non stava lavorando. */
  readonly idleMs: number;
  readonly activeMs: number;
  readonly timePerTask: Map<string, number>;
  readonly firstTryTasks: number;
  /** Task consecutivi corretti al primo tentativo. */
  readonly longestCombo: number;
}

export interface MetricsOptions {
  /** Somma dei `Task.minKeystrokes` del livello. */
  readonly minKeystrokes: number;
  readonly idleThresholdMs?: number;
}

/** Tre secondi senza toccare nulla: l'utente sta leggendo o e' altrove, non sta costruendo. */
export const DEFAULT_IDLE_THRESHOLD_MS = 3_000;

export function computeMetrics(source: MetricsSource, opts: MetricsOptions): RunMetrics {
  const durationMs = Math.max(0, source.elapsedMs());
  const idleThreshold = opts.idleThresholdMs ?? DEFAULT_IDLE_THRESHOLD_MS;
  const events = source.events;

  let keystrokes = 0;
  let mouseClicks = 0;
  let mouseBlocked = 0;
  let cheatSheetOpens = 0;

  // Set e non contatore: riaprire lo stesso hint non e' un secondo aiuto ricevuto,
  // e il malus XP di 6 e' "per hint usato", non "per apertura".
  const hintIds = new Set<string>();

  const timePerTask = new Map<string, number>();
  /** Esito del PRIMO tentativo per task: alimenta firstTryTasks e la combo. */
  const firstAttemptPassed: boolean[] = [];
  const seenTasks = new Set<string>();

  // Confine del segmento attribuito al prossimo taskAttempt. Il tempo speso su un
  // task e' quello fra la verifica precedente (di qualsiasi task) e la sua.
  let taskSegmentStart = 0;

  for (const ev of events) {
    switch (ev.kind) {
      case 'key':
        keystrokes += 1;
        break;
      case 'mouse':
        // Un click bloccato e' comunque uso del mouse: entra in entrambi i
        // contatori. E' cio' che rende onesto il bonus "zero mouse" in mouse-free.
        mouseClicks += 1;
        if (ev.blocked) mouseBlocked += 1;
        break;
      case 'hint':
        hintIds.add(ev.hintId);
        break;
      case 'cheatSheet':
        if (ev.open) cheatSheetOpens += 1;
        break;
      case 'taskAttempt': {
        const spent = Math.max(0, ev.t - taskSegmentStart);
        timePerTask.set(ev.taskId, (timePerTask.get(ev.taskId) ?? 0) + spent);
        taskSegmentStart = ev.t;
        if (!seenTasks.has(ev.taskId)) {
          seenTasks.add(ev.taskId);
          firstAttemptPassed.push(ev.passed);
        }
        break;
      }
      case 'mark':
        // Neutro per definizione: un mark non chiude il segmento di un task.
        break;
    }
  }

  let firstTryTasks = 0;
  let longestCombo = 0;
  let combo = 0;
  for (const passed of firstAttemptPassed) {
    if (passed) {
      firstTryTasks += 1;
      combo += 1;
      if (combo > longestCombo) longestCombo = combo;
    } else {
      combo = 0;
    }
  }

  const idleMs = computeIdleMs(events, durationMs, idleThreshold);

  return {
    durationMs,
    keystrokes,
    mouseClicks,
    mouseBlocked,
    hintsUsed: hintIds.size,
    cheatSheetOpens,
    keystrokeEfficiency: computeKeystrokeEfficiency(keystrokes, opts.minKeystrokes),
    idleMs,
    activeMs: Math.max(0, durationMs - idleMs),
    timePerTask,
    firstTryTasks,
    longestCombo,
  };
}

/**
 * Rapporto fra keystroke usati e minimi teorici, con pavimento a 1.
 *
 * Il pavimento serve perche' i `minKeystrokes` dei template sono una stima scritta
 * a mano: se l'utente trova una strada piu' corta di quella prevista il numero
 * scenderebbe sotto 1 e la metrica diventerebbe illeggibile ("efficienza 0,8" non
 * significa niente). Meglio saturare a "perfetto" e ricalibrare il par (14).
 */
function computeKeystrokeEfficiency(keystrokes: number, minKeystrokes: number): number {
  if (!Number.isFinite(minKeystrokes) || minKeystrokes <= 0) return 1;
  return Math.max(1, keystrokes / minKeystrokes);
}

/**
 * Somma delle pause oltre soglia. Conta l'INTERO buco, non solo l'eccedenza:
 * una pausa di 10s con soglia 3s vale 10s di idle, perche' e' tempo in cui
 * l'utente non stava costruendo, non "7s di troppo".
 *
 * Contano anche i due buchi di bordo — dallo start al primo evento e dall'ultimo
 * evento alla fine — altrimenti un minuto passato a fissare il brief senza
 * toccare la tastiera risulterebbe tempo attivo.
 */
function computeIdleMs(events: readonly InputEvent[], durationMs: number, threshold: number): number {
  if (threshold <= 0) return 0;
  let idle = 0;
  let prev = 0;
  for (const ev of events) {
    const gap = ev.t - prev;
    if (gap > threshold) idle += gap;
    prev = ev.t;
  }
  const tail = durationMs - prev;
  if (tail > threshold) idle += tail;
  return idle;
}

// ---------------------------------------------------------------------------
// XP (6)
// ---------------------------------------------------------------------------

/**
 * Moltiplicatori di modalita'. La tabella di 6 elenca GUIDED 1.0, PRACTICE 1.3,
 * BLIND 1.8, SPEEDRUN 2.0, BOSS 3.0 — AUDIT manca.
 *
 * Scelta: AUDIT 1.5. Un livello di audit non e' guidato (quindi vale piu' di
 * PRACTICE) ma si gioca leggendo il modello di qualcun altro, con poca battitura
 * e nessuna costruzione da zero: vale meno di un BLIND.
 */
export const MODE_MULTIPLIER: Readonly<Record<LevelMode, number>> = {
  GUIDED: 1.0,
  PRACTICE: 1.3,
  BLIND: 1.8,
  SPEEDRUN: 2.0,
  AUDIT: 1.5,
  BOSS: 3.0,
};

export const XP_BONUS_UNDER_PAR = 0.5;
export const XP_BONUS_ZERO_MOUSE = 0.3;
export const XP_BONUS_ZERO_HINT = 0.2;
export const XP_BONUS_PERFECT_STRUCTURE = 0.25;
export const XP_MALUS_PER_HINT = 0.1;
export const XP_MALUS_CHEAT_SHEET = 0.05;
export const XP_MALUS_PER_RETRY = 0.15;

export interface XpBreakdownEntry {
  readonly label: string;
  /** Contributo in XP, gia' arrotondato. La somma delle voci e' esattamente `total`. */
  readonly delta: number;
}

export interface XpResult {
  readonly total: number;
  readonly breakdown: readonly XpBreakdownEntry[];
}

export interface XpInput {
  readonly baseXp: number;
  readonly mode: LevelMode;
  readonly metrics: RunMetrics;
  readonly par: ParScore;
  /** Quante volte il livello e' stato ri-giocato prima di questa run. */
  readonly retryCount: number;
  /** Tutti i check strutturali passati al primo tentativo. */
  readonly perfectStructure: boolean;
}

/**
 * XP di una run.
 *
 * Bonus e malus sono ADDITIVI sul moltiplicatore di modalita', non moltiplicativi:
 *   totale = base x (modo + bonus - malus)
 * Motivo: e' prevedibile. Con la composizione moltiplicativa "+50% e -10%" darebbe
 * 1,35 e nessun utente riesce a stimare a mente il punteggio prima di premere
 * Verifica; in forma additiva ogni voce vale sempre la stessa quota della base,
 * e il breakdown della schermata risultato si legge come una somma.
 *
 * Ogni voce e' arrotondata all'intero e il totale e' la somma delle voci
 * arrotondate: la schermata risultato deve quadrare a vista. Il totale non
 * scende mai sotto zero — se i malus sfondano, una voce esplicita di pavimento
 * mantiene la somma coerente.
 */
export function computeXp(input: XpInput): XpResult {
  const { baseXp, mode, metrics, par, retryCount, perfectStructure } = input;
  const breakdown: XpBreakdownEntry[] = [];

  const modeMult = MODE_MULTIPLIER[mode];
  breakdown.push({ label: `Base ${mode} (x${formatMult(modeMult)})`, delta: Math.round(baseXp * modeMult) });

  const push = (label: string, fraction: number): void => {
    if (fraction === 0) return;
    breakdown.push({ label: `${label} (${formatPct(fraction)})`, delta: Math.round(baseXp * fraction) });
  };

  // Par centrato esatto conta come raggiunto: il par e' un bersaglio, non un limite.
  const parMs = par.seconds * 1000;
  if (metrics.durationMs <= parMs) push('Sotto il par time', XP_BONUS_UNDER_PAR);
  if (metrics.mouseClicks === 0) push('Zero mouse', XP_BONUS_ZERO_MOUSE);
  if (metrics.hintsUsed === 0) push('Zero hint', XP_BONUS_ZERO_HINT);
  if (perfectStructure) push('Struttura perfetta', XP_BONUS_PERFECT_STRUCTURE);

  if (metrics.hintsUsed > 0) {
    push(`Hint usati: ${metrics.hintsUsed}`, -XP_MALUS_PER_HINT * metrics.hintsUsed);
  }
  if (metrics.cheatSheetOpens > 0) {
    // 6 scrive "cheat sheet aperto (-5%)" senza "ciascuno" (che invece c'e' per
    // gli hint): il malus e' forfettario, non per apertura. Altrimenti aprire e
    // chiudere l'overlay per sbaglio dieci volte azzererebbe la run.
    push('Cheat sheet consultato', -XP_MALUS_CHEAT_SHEET);
  }
  if (retryCount > 0) {
    push(`Retry: ${retryCount}`, -XP_MALUS_PER_RETRY * retryCount);
  }

  const sum = breakdown.reduce((acc, e) => acc + e.delta, 0);
  if (sum < 0) {
    breakdown.push({ label: 'Pavimento a zero', delta: -sum });
    return { total: 0, breakdown };
  }
  return { total: sum, breakdown };
}

/** Quota di XP che un livello gia' superato restituisce a ogni ripetizione. */
export const XP_REPLAY_SHARE = 0.25;

/**
 * Le ripetizioni di un livello gia' superato valgono il 25% degli XP: rigiocarlo
 * resta utile per allenarsi, ma non e' piu' un modo per scalare la carriera
 * ripetendo all'infinito il livello piu' facile.
 */
export function applyReplayPenalty(xp: XpResult): XpResult {
  const taglio = -Math.round(xp.total * (1 - XP_REPLAY_SHARE));
  if (taglio === 0) return xp;
  return {
    total: xp.total + taglio,
    breakdown: [...xp.breakdown, { label: `Livello gia' superato (${Math.round(XP_REPLAY_SHARE * 100)}% XP)`, delta: taglio }],
  };
}

function formatMult(m: number): string {
  return Number.isInteger(m) ? m.toFixed(1) : String(m);
}

function formatPct(fraction: number): string {
  const pct = Math.round(fraction * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

// ---------------------------------------------------------------------------
// Mastery (6)
// ---------------------------------------------------------------------------

/** -3% a settimana senza pratica. */
export const MASTERY_WEEKLY_DECAY = 0.03;

/** Finestra della media mobile: le ultime 5 performance sulla skill. */
export const MASTERY_WINDOW = 5;

/**
 * Decadimento della mastery: "le shortcut si dimenticano" (6).
 *
 * Il -3% e' composto, non sottrattivo: e' una curva di oblio, quindi si perde il
 * 3% di quello che si sa, non 3 punti assoluti. Con la forma sottrattiva una
 * mastery di 0,9 si azzererebbe in 30 settimane esatte come una di 0,3 in 10 —
 * assurdo, chi sa fare una cosa bene la dimentica piu' lentamente.
 * Le settimane frazionarie sono ammesse: il decay si applica al momento della
 * lettura, non a scatti settimanali.
 */
export function applyDecay(mastery: number, weeksSincePractice: number): number {
  if (!Number.isFinite(weeksSincePractice) || weeksSincePractice <= 0) return Math.max(0, mastery);
  const decayed = mastery * Math.pow(1 - MASTERY_WEEKLY_DECAY, weeksSincePractice);
  return Math.max(0, decayed);
}

/**
 * Media mobile delle ultime 5 performance, nuovo punteggio incluso.
 * `history` e' in ordine cronologico; la funzione non la muta.
 */
export function updateMastery(history: readonly number[], newScore: number): number {
  const window = [...history, newScore].slice(-MASTERY_WINDOW);
  const sum = window.reduce((acc, v) => acc + v, 0);
  return sum / window.length;
}
