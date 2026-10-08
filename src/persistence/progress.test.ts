import { describe, expect, it } from 'vitest';
import { applyRun, nextStreakDays, type ProgressSnapshot } from './progress';
import { applyReplayPenalty, XP_REPLAY_SHARE } from '../input/metrics';

const VUOTO: ProgressSnapshot = { xp: 0, streakDays: 0, lastPlayed: null, levels: {} };

describe('nextStreakDays', () => {
  it('parte da 1, cresce il giorno dopo, si azzera dopo un buco', () => {
    expect(nextStreakDays(0, null, '2026-10-08')).toBe(1);
    expect(nextStreakDays(3, '2026-10-07', '2026-10-08')).toBe(4);
    expect(nextStreakDays(3, '2026-10-08', '2026-10-08')).toBe(3);
    expect(nextStreakDays(3, '2026-10-05', '2026-10-08')).toBe(1);
  });
});

describe('applyRun', () => {
  it('registra il completamento con migliori XP e tempo', () => {
    let s = applyRun(VUOTO, { templateId: 'a', passed: true, xpEarned: 100, durationMs: 9000, at: '2026-10-08T10:00:00Z' });
    s = applyRun(s, { templateId: 'a', passed: true, xpEarned: 40, durationMs: 5000, at: '2026-10-08T11:00:00Z' });
    expect(s.xp).toBe(140);
    expect(s.levels.a).toMatchObject({ completions: 2, bestXp: 100, bestTimeMs: 5000 });
    expect(s.streakDays).toBe(1);
  });

  it('una run fallita non segna il livello come completato', () => {
    const s = applyRun(VUOTO, { templateId: 'b', passed: false, xpEarned: 0, durationMs: 1000, at: '2026-10-08T10:00:00Z' });
    expect(s.levels.b).toBeUndefined();
  });
});

describe('applyReplayPenalty', () => {
  it('lascia solo la quota prevista degli XP', () => {
    const r = applyReplayPenalty({ total: 200, breakdown: [{ label: 'Base', delta: 200 }] });
    expect(r.total).toBe(200 * XP_REPLAY_SHARE);
    expect(r.breakdown).toHaveLength(2);
  });
});
