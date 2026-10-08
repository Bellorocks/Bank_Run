import { describe, it, expect } from 'vitest';
import { rankForXp, xpWithinRank, XP_PER_RANK } from './progression';
import { CAREER_LADDER } from './profile';

describe('rankForXp', () => {
  it('parte da Intern a XP zero', () => {
    expect(rankForXp(0)).toBe('Intern');
  });

  it('avanza esattamente alla soglia', () => {
    expect(rankForXp(XP_PER_RANK - 1)).toBe('Intern');
    expect(rankForXp(XP_PER_RANK)).toBe('Analyst 1');
  });

  it('si ferma a MD e non sfora la scala', () => {
    expect(rankForXp(XP_PER_RANK * (CAREER_LADDER.length + 5))).toBe('MD');
  });

  it('tratta l\'XP negativo come zero', () => {
    expect(rankForXp(-500)).toBe('Intern');
  });
});

describe('xpWithinRank', () => {
  it('e\' relativo al rank corrente, non al totale', () => {
    expect(xpWithinRank(0)).toBe(0);
    expect(xpWithinRank(XP_PER_RANK + 200)).toBe(200);
    expect(xpWithinRank(XP_PER_RANK * 2 + 50)).toBe(50);
  });

  it('a MD resta al massimo invece di continuare a crescere', () => {
    const oltreLaScala = XP_PER_RANK * (CAREER_LADDER.length + 3);
    expect(xpWithinRank(oltreLaScala)).toBe(XP_PER_RANK);
  });
});
