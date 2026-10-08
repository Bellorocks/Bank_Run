import { describe, it, expect } from 'vitest';
import { InputRecorder } from './InputRecorder';
import type { InputEvent } from './InputRecorder';
import {
  computeMetrics,
  computeXp,
  applyDecay,
  updateMastery,
  MODE_MULTIPLIER,
  DEFAULT_IDLE_THRESHOLD_MS,
} from './metrics';
import type { MetricsSource, RunMetrics } from './metrics';
import type { ParScore } from '../content/types';

/** Sorgente sintetica: gli eventi sono gia' timbrati, la durata e' dichiarata. */
function sourceOf(events: readonly InputEvent[], durationMs: number): MetricsSource {
  return { events, elapsedMs: () => durationMs };
}

function key(t: number, signature = 'A'): InputEvent {
  return { t, kind: 'key', signature, inEdit: true };
}

const PAR: ParScore = { seconds: 120, keystrokes: 80 };

function metricsWith(over: Partial<RunMetrics>): RunMetrics {
  return {
    durationMs: 60_000,
    keystrokes: 100,
    mouseClicks: 0,
    mouseBlocked: 0,
    hintsUsed: 0,
    cheatSheetOpens: 0,
    keystrokeEfficiency: 1,
    idleMs: 0,
    activeMs: 60_000,
    timePerTask: new Map<string, number>(),
    firstTryTasks: 0,
    longestCombo: 0,
    ...over,
  };
}

describe('computeMetrics — conteggi', () => {
  it('conta keystroke, mouse, hint e cheat sheet', () => {
    const events: InputEvent[] = [
      key(100, 'Ctrl+ArrowDown'),
      key(200, 'F2'),
      { t: 300, kind: 'mouse', target: 'grid', blocked: true },
      { t: 400, kind: 'mouse', target: 'ui', blocked: false },
      { t: 500, kind: 'hint', hintId: 'h1' },
      { t: 600, kind: 'cheatSheet', open: true },
      { t: 700, kind: 'cheatSheet', open: false },
      { t: 800, kind: 'mark', label: 'x' },
    ];
    const m = computeMetrics(sourceOf(events, 1_000), { minKeystrokes: 2 });

    expect(m.durationMs).toBe(1_000);
    expect(m.keystrokes).toBe(2);
    // Un click bloccato dalla modalita' mouse-free e' comunque uso del mouse.
    expect(m.mouseClicks).toBe(2);
    expect(m.mouseBlocked).toBe(1);
    expect(m.hintsUsed).toBe(1);
    // La chiusura dell'overlay non e' una seconda apertura.
    expect(m.cheatSheetOpens).toBe(1);
  });

  it('lo stesso hint riaperto vale un solo hint usato', () => {
    const events: InputEvent[] = [
      { t: 10, kind: 'hint', hintId: 'h1' },
      { t: 20, kind: 'hint', hintId: 'h1' },
      { t: 30, kind: 'hint', hintId: 'h2' },
    ];
    expect(computeMetrics(sourceOf(events, 100), { minKeystrokes: 1 }).hintsUsed).toBe(2);
  });
});

describe('computeMetrics — keystroke efficiency', () => {
  it('e\' il rapporto con i keystroke minimi teorici', () => {
    const events = Array.from({ length: 120 }, (_, i) => key(i * 10));
    const m = computeMetrics(sourceOf(events, 1_200), { minKeystrokes: 100 });
    expect(m.keystrokeEfficiency).toBeCloseTo(1.2, 10);
  });

  it('non scende sotto 1 nemmeno se il par e\' tarato male', () => {
    const events = [key(10), key(20)];
    const m = computeMetrics(sourceOf(events, 100), { minKeystrokes: 50 });
    expect(m.keystrokeEfficiency).toBe(1);
  });

  it('regge minKeystrokes assente o zero senza dividere per zero', () => {
    const m = computeMetrics(sourceOf([key(10)], 100), { minKeystrokes: 0 });
    expect(m.keystrokeEfficiency).toBe(1);
    expect(Number.isFinite(m.keystrokeEfficiency)).toBe(true);
  });
});

describe('computeMetrics — idle e active', () => {
  it('somma per intero le pause oltre soglia, bordi compresi', () => {
    const events: InputEvent[] = [key(1_000), key(2_000), key(12_000)];
    const m = computeMetrics(sourceOf(events, 20_000), { minKeystrokes: 3 });

    // gap iniziale 1s: sotto soglia. gap 2s->12s: 10s interi di idle.
    // coda 12s->20s: altri 8s. Il buco conta tutto, non solo l'eccedenza.
    expect(m.idleMs).toBe(18_000);
    expect(m.activeMs).toBe(2_000);
  });

  it('una run senza eventi e\' interamente idle', () => {
    const m = computeMetrics(sourceOf([], 30_000), { minKeystrokes: 10 });
    expect(m.idleMs).toBe(30_000);
    expect(m.activeMs).toBe(0);
  });

  it('la soglia e\' configurabile', () => {
    const events: InputEvent[] = [key(0), key(2_000), key(4_000)];
    const fitta = computeMetrics(sourceOf(events, 4_000), { minKeystrokes: 3, idleThresholdMs: 1_000 });
    expect(fitta.idleMs).toBe(4_000);
    const larga = computeMetrics(sourceOf(events, 4_000), { minKeystrokes: 3, idleThresholdMs: 5_000 });
    expect(larga.idleMs).toBe(0);
  });

  it('la soglia di default e\' 3 secondi', () => {
    const sotto = computeMetrics(sourceOf([key(DEFAULT_IDLE_THRESHOLD_MS)], DEFAULT_IDLE_THRESHOLD_MS), {
      minKeystrokes: 1,
    });
    expect(sotto.idleMs).toBe(0); // esattamente in soglia: non e' idle
    const sopra = computeMetrics(sourceOf([key(DEFAULT_IDLE_THRESHOLD_MS + 1)], DEFAULT_IDLE_THRESHOLD_MS + 1), {
      minKeystrokes: 1,
    });
    expect(sopra.idleMs).toBe(DEFAULT_IDLE_THRESHOLD_MS + 1);
  });
});

describe('computeMetrics — tempo per task e combo', () => {
  it('attribuisce a ogni task il tempo fra una verifica e la precedente', () => {
    const events: InputEvent[] = [
      key(1_000),
      { t: 5_000, kind: 'taskAttempt', taskId: 'A', passed: false },
      key(7_000),
      { t: 9_000, kind: 'taskAttempt', taskId: 'A', passed: true },
      key(12_000),
      { t: 15_000, kind: 'taskAttempt', taskId: 'B', passed: true },
    ];
    const m = computeMetrics(sourceOf(events, 16_000), { minKeystrokes: 10 });

    // Il retry di A si somma al primo tentativo: 5s + 4s.
    expect(m.timePerTask.get('A')).toBe(9_000);
    expect(m.timePerTask.get('B')).toBe(6_000);
    expect(m.firstTryTasks).toBe(1);
    expect(m.longestCombo).toBe(1);
  });

  it('la combo e\' la sequenza piu\' lunga di primi tentativi corretti', () => {
    const events: InputEvent[] = [
      { t: 1_000, kind: 'taskAttempt', taskId: 'A', passed: true },
      { t: 2_000, kind: 'taskAttempt', taskId: 'B', passed: true },
      { t: 3_000, kind: 'taskAttempt', taskId: 'C', passed: false },
      { t: 4_000, kind: 'taskAttempt', taskId: 'C', passed: true },
      { t: 5_000, kind: 'taskAttempt', taskId: 'D', passed: true },
      { t: 6_000, kind: 'taskAttempt', taskId: 'E', passed: true },
      { t: 7_000, kind: 'taskAttempt', taskId: 'F', passed: true },
    ];
    const m = computeMetrics(sourceOf(events, 8_000), { minKeystrokes: 10 });

    // C corretto al secondo tentativo NON rientra nella combo e la spezza:
    // e' il senso di "corretti al primo tentativo" di 6.
    expect(m.firstTryTasks).toBe(5);
    expect(m.longestCombo).toBe(3);
  });

  it('un task mai verificato non compare in timePerTask', () => {
    const m = computeMetrics(sourceOf([key(100)], 200), { minKeystrokes: 1 });
    expect(m.timePerTask.size).toBe(0);
  });
});

describe('computeMetrics — integrazione con InputRecorder', () => {
  it('ignora il tempo di pausa anche nelle metriche', () => {
    let t = 5_000;
    const rec = new InputRecorder(() => t);
    rec.start();
    t += 1_000;
    rec.record({ kind: 'key', signature: 'Ctrl+D', command: 'fillDown', inEdit: false });
    rec.pause();
    t += 3_600_000; // un'ora di pausa
    rec.resume();
    t += 1_000;
    rec.record({ kind: 'taskAttempt', taskId: 'A', passed: true });
    rec.stop();

    const m = computeMetrics(rec, { minKeystrokes: 1 });
    expect(m.durationMs).toBe(2_000);
    expect(m.idleMs).toBe(0);
    expect(m.activeMs).toBe(2_000);
    expect(m.timePerTask.get('A')).toBe(2_000);
    expect(m.firstTryTasks).toBe(1);
  });
});

describe('computeXp', () => {
  it('applica bonus e malus in forma additiva sul moltiplicatore di modalita\'', () => {
    const res = computeXp({
      baseXp: 1_000,
      mode: 'BLIND',
      metrics: metricsWith({ durationMs: 100_000 }),
      par: PAR,
      retryCount: 0,
      perfectStructure: true,
    });

    // 1.8 base + 0.5 par + 0.3 mouse + 0.2 hint + 0.25 struttura = 3.05
    // (in forma moltiplicativa sarebbe 1.8*1.5*1.3*1.2*1.25 = 5.27: illeggibile)
    expect(res.total).toBe(3_050);
    expect(res.breakdown.map((e) => e.delta)).toEqual([1_800, 500, 300, 200, 250]);
    expect(res.breakdown[0].label).toBe('Base BLIND (x1.8)');
  });

  it('non elenca i bonus non maturati', () => {
    const res = computeXp({
      baseXp: 1_000,
      mode: 'GUIDED',
      metrics: metricsWith({ durationMs: 500_000, mouseClicks: 3, hintsUsed: 1 }),
      par: PAR,
      retryCount: 0,
      perfectStructure: false,
    });
    const labels = res.breakdown.map((e) => e.label);
    expect(labels).toEqual(['Base GUIDED (x1.0)', 'Hint usati: 1 (-10%)']);
    expect(res.total).toBe(900);
  });

  it('il cheat sheet costa il 5% una volta sola, gli hint il 10% ciascuno', () => {
    const res = computeXp({
      baseXp: 1_000,
      mode: 'PRACTICE',
      metrics: metricsWith({ durationMs: 500_000, mouseClicks: 4, hintsUsed: 2, cheatSheetOpens: 3 }),
      par: PAR,
      retryCount: 2,
      perfectStructure: false,
    });
    // 1300 - 200 (2 hint) - 50 (cheat sheet, forfettario) - 300 (2 retry) = 750
    expect(res.total).toBe(750);
    expect(res.breakdown.map((e) => e.label)).toEqual([
      'Base PRACTICE (x1.3)',
      'Hint usati: 2 (-20%)',
      'Cheat sheet consultato (-5%)',
      'Retry: 2 (-30%)',
    ]);
  });

  it('il totale non scende mai sotto zero e il breakdown continua a quadrare', () => {
    const res = computeXp({
      baseXp: 100,
      mode: 'GUIDED',
      metrics: metricsWith({ durationMs: 999_000, mouseClicks: 10, hintsUsed: 3, cheatSheetOpens: 1 }),
      par: PAR,
      retryCount: 5,
      perfectStructure: false,
    });
    // 100 - 30 - 5 - 75 = -10, quindi pavimento a 0 con voce esplicita.
    expect(res.total).toBe(0);
    expect(res.breakdown[res.breakdown.length - 1]).toEqual({ label: 'Pavimento a zero', delta: 10 });
    expect(res.breakdown.reduce((a, e) => a + e.delta, 0)).toBe(0);
  });

  it('il par centrato esatto conta come raggiunto', () => {
    const base = {
      baseXp: 1_000,
      mode: 'SPEEDRUN' as const,
      par: PAR,
      retryCount: 0,
      perfectStructure: false,
    };
    const esatto = computeXp({ ...base, metrics: metricsWith({ durationMs: PAR.seconds * 1_000 }) });
    const unMsOltre = computeXp({ ...base, metrics: metricsWith({ durationMs: PAR.seconds * 1_000 + 1 }) });

    expect(esatto.total).toBe(3_000); // 2.0 + 0.5 + 0.3 + 0.2
    expect(unMsOltre.total).toBe(2_500);
  });

  it('AUDIT vale 1.5 — scelta di progetto, manca dalla tabella dello spec', () => {
    expect(MODE_MULTIPLIER.AUDIT).toBe(1.5);
    expect(MODE_MULTIPLIER.AUDIT).toBeGreaterThan(MODE_MULTIPLIER.PRACTICE);
    expect(MODE_MULTIPLIER.AUDIT).toBeLessThan(MODE_MULTIPLIER.BLIND);

    const res = computeXp({
      baseXp: 1_000,
      mode: 'AUDIT',
      metrics: metricsWith({ durationMs: 500_000, mouseClicks: 1 }),
      par: PAR,
      retryCount: 0,
      perfectStructure: false,
    });
    expect(res.total).toBe(1_700); // 1500 + 200 zero hint
  });

  it('la somma delle voci arrotondate e\' esattamente il totale', () => {
    const res = computeXp({
      baseXp: 33,
      mode: 'BLIND',
      metrics: metricsWith({ durationMs: 1_000 }),
      par: PAR,
      retryCount: 1,
      perfectStructure: false,
    });
    const sum = res.breakdown.reduce((a, e) => a + e.delta, 0);
    expect(sum).toBe(res.total);
    // 59 (33*1.8) + 17 (par) + 10 (mouse) + 7 (hint) - 5 (retry): ogni voce e' un intero
    expect(res.breakdown.every((e) => Number.isInteger(e.delta))).toBe(true);
  });

  it('base zero resta zero', () => {
    const res = computeXp({
      baseXp: 0,
      mode: 'BOSS',
      metrics: metricsWith({ durationMs: 1_000 }),
      par: PAR,
      retryCount: 0,
      perfectStructure: true,
    });
    expect(res.total).toBe(0);
  });
});

describe('applyDecay', () => {
  it('toglie il 3% per settimana, in forma composta', () => {
    expect(applyDecay(1, 1)).toBeCloseTo(0.97, 10);
    expect(applyDecay(1, 2)).toBeCloseTo(0.9409, 10);
    expect(applyDecay(0.8, 4)).toBeCloseTo(0.8 * Math.pow(0.97, 4), 10);
  });

  it('accetta settimane frazionarie: il decay si applica quando si legge', () => {
    expect(applyDecay(1, 0.5)).toBeCloseTo(Math.pow(0.97, 0.5), 10);
    expect(applyDecay(1, 0.5)).toBeGreaterThan(applyDecay(1, 1));
  });

  it('senza tempo trascorso non decade', () => {
    expect(applyDecay(0.75, 0)).toBe(0.75);
    expect(applyDecay(0.75, -3)).toBe(0.75);
  });

  it('non scende mai sotto zero', () => {
    expect(applyDecay(1, 10_000)).toBeGreaterThanOrEqual(0);
    expect(applyDecay(-0.2, 1)).toBe(0);
    expect(applyDecay(0, 5)).toBe(0);
  });

  it('una mastery alta si dimentica piu\' lentamente in valore relativo', () => {
    // Il motivo per cui il decay e' composto e non sottrattivo: con -0.03 fissi
    // una mastery 0.9 e una 0.3 perderebbero la stessa quantita' ogni settimana.
    const alta = 0.9 - applyDecay(0.9, 1);
    const bassa = 0.3 - applyDecay(0.3, 1);
    expect(alta).toBeGreaterThan(bassa);
  });
});

describe('updateMastery', () => {
  it('e\' la media mobile delle ultime 5 performance, nuova inclusa', () => {
    expect(updateMastery([1, 1, 1, 1], 0)).toBeCloseTo(0.8, 10);
    expect(updateMastery([], 0.6)).toBeCloseTo(0.6, 10);
    expect(updateMastery([0.2, 0.4], 0.6)).toBeCloseTo(0.4, 10);
  });

  it('scarta le performance oltre la quinta piu\' recente', () => {
    // Le prime due (0) escono dalla finestra: conta solo l'ultimo periodo.
    expect(updateMastery([0, 0, 1, 1, 1, 1], 1)).toBe(1);
  });

  it('non muta lo storico ricevuto', () => {
    const history = [0.5, 0.6];
    updateMastery(history, 0.9);
    expect(history).toEqual([0.5, 0.6]);
  });
});
