import { describe, it, expect } from 'vitest';
import { nextStreak } from './profile';

/**
 * `nextStreak` e' l'unica logica non banale di questo modulo, ed e' l'unica
 * testabile senza una connessione Tauri vera: il resto sono query dirette.
 */
describe('nextStreak', () => {
  it('il primo giorno in assoluto parte da 1', () => {
    expect(nextStreak(0, null, '2026-08-12')).toBe(1);
  });

  it('rigiocare lo stesso giorno non muove la streak', () => {
    expect(nextStreak(5, '2026-08-12', '2026-08-12')).toBe(5);
  });

  it('il giorno immediatamente successivo incrementa', () => {
    expect(nextStreak(5, '2026-08-11', '2026-08-12')).toBe(6);
  });

  it('saltare un giorno o piu\' azzera a 1', () => {
    expect(nextStreak(10, '2026-08-09', '2026-08-12')).toBe(1);
    expect(nextStreak(10, '2026-07-01', '2026-08-12')).toBe(1);
  });

  it('attraversa il cambio di mese correttamente', () => {
    expect(nextStreak(3, '2026-07-31', '2026-08-01')).toBe(4);
  });

  it('attraversa un anno bisestile senza sfasare', () => {
    // Il 2028 e' bisestile: 28 febbraio -> 29 febbraio e' un giorno solo.
    expect(nextStreak(1, '2028-02-28', '2028-02-29')).toBe(2);
    expect(nextStreak(1, '2028-02-28', '2028-03-01')).toBe(1); // salta il 29: due giorni
  });
});
