/**
 * Profilo del giocatore: la riga singola `profile` e la tabella `skill_mastery`.
 */

import { db } from './db';
import type { SkillId } from '../content/types';

/**
 * Carriera del giocatore (spec §6): `Intern → Analyst 1 → Analyst 3 → Associate
 * → VP → Director → MD`. Distinto da `Rank` di `content/types.ts`, che è la
 * difficoltà 1-5 di un TEMPLATE — due scale diverse che condividono solo il nome
 * "rank" nello spec, ed è un falso amico da non fondere in un tipo solo.
 */
export type CareerRank = 'Intern' | 'Analyst 1' | 'Analyst 3' | 'Associate' | 'VP' | 'Director' | 'MD';

export const CAREER_LADDER: readonly CareerRank[] = [
  'Intern',
  'Analyst 1',
  'Analyst 3',
  'Associate',
  'VP',
  'Director',
  'MD',
];

export interface Profile {
  readonly rank: CareerRank;
  readonly xp: number;
  readonly streakDays: number;
  readonly lastPlayed: string | null;
  readonly branch: 'IB' | 'PE';
}

interface ProfileRow {
  rank: string;
  xp: number;
  streak_days: number;
  last_played: string | null;
  branch: string;
}

export async function loadProfile(): Promise<Profile> {
  const rows = await (await db()).select<ProfileRow[]>('SELECT * FROM profile WHERE id = 1');
  const r = rows[0];
  if (!r) {
    // La migrazione inserisce sempre la riga id=1: se manca, il DB non è stato
    // ancora migrato correttamente, ed è meglio dirlo forte che inventare un default.
    throw new Error('Profilo assente: la migrazione iniziale non è stata applicata.');
  }
  return {
    rank: (CAREER_LADDER as readonly string[]).includes(r.rank) ? (r.rank as CareerRank) : 'Intern',
    xp: r.xp,
    streakDays: r.streak_days,
    lastPlayed: r.last_played,
    branch: r.branch as 'IB' | 'PE',
  };
}

export async function addXp(delta: number): Promise<number> {
  const conn = await db();
  await conn.execute('UPDATE profile SET xp = MAX(0, xp + $1) WHERE id = 1', [Math.round(delta)]);
  const rows = await conn.select<{ xp: number }[]>('SELECT xp FROM profile WHERE id = 1');
  return rows[0]?.xp ?? 0;
}

export async function setRank(rank: string): Promise<void> {
  await (await db()).execute('UPDATE profile SET rank = $1 WHERE id = 1', [rank]);
}

export async function setBranch(branch: 'IB' | 'PE'): Promise<void> {
  await (await db()).execute('UPDATE profile SET branch = $1 WHERE id = 1', [branch]);
}

/**
 * Aggiorna la streak e `last_played`. Un giorno di calendario nuovo rispetto
 * all'ultimo gioco incrementa la streak; un salto di piu' di un giorno la
 * azzera a 1. Rigiocare piu' volte nello stesso giorno non la muove.
 *
 * `oggi` e' iniettato (`YYYY-MM-DD`): la funzione non deve dipendere dall'orologio
 * di sistema per restare testabile e deterministica.
 */
export async function touchStreak(oggi: string): Promise<number> {
  const conn = await db();
  const rows = await conn.select<{ streak_days: number; last_played: string | null }[]>(
    'SELECT streak_days, last_played FROM profile WHERE id = 1',
  );
  const prev = rows[0];
  const nuova = nextStreak(prev?.streak_days ?? 0, prev?.last_played ?? null, oggi);
  await conn.execute('UPDATE profile SET streak_days = $1, last_played = $2 WHERE id = 1', [nuova, oggi]);
  return nuova;
}

/** Logica pura della streak, separata dal DB per essere testabile senza connessione. */
export function nextStreak(current: number, lastPlayed: string | null, today: string): number {
  if (lastPlayed === today) return current;
  if (lastPlayed === null) return 1;
  const giorniPassati = diffDays(lastPlayed, today);
  if (giorniPassati === 1) return current + 1;
  return 1;
}

function diffDays(a: string, b: string): number {
  const msPerDay = 86_400_000;
  const da = Date.parse(`${a}T00:00:00Z`);
  const db_ = Date.parse(`${b}T00:00:00Z`);
  return Math.round((db_ - da) / msPerDay);
}

// ---------------------------------------------------------------------------
// Mastery per skill
// ---------------------------------------------------------------------------

export interface MasteryRow {
  readonly skillId: SkillId;
  readonly mastery: number;
  readonly lastPracticed: string | null;
}

export async function getMastery(skillId: SkillId): Promise<MasteryRow | null> {
  const rows = await (await db()).select<
    { skill_id: string; mastery: number; last_practiced: string | null }[]
  >('SELECT skill_id, mastery, last_practiced FROM skill_mastery WHERE skill_id = $1', [skillId]);
  const r = rows[0];
  if (!r) return null;
  return { skillId: r.skill_id, mastery: r.mastery, lastPracticed: r.last_practiced };
}

export async function getAllMastery(): Promise<MasteryRow[]> {
  const rows = await (await db()).select<
    { skill_id: string; mastery: number; last_practiced: string | null }[]
  >('SELECT skill_id, mastery, last_practiced FROM skill_mastery');
  return rows.map((r) => ({ skillId: r.skill_id, mastery: r.mastery, lastPracticed: r.last_practiced }));
}

/** Upsert del valore già calcolato da `updateMastery`/`applyDecay` (src/input/metrics.ts). */
export async function setMastery(skillId: SkillId, mastery: number, when: string): Promise<void> {
  await (await db()).execute(
    `INSERT INTO skill_mastery (skill_id, mastery, last_practiced)
     VALUES ($1, $2, $3)
     ON CONFLICT(skill_id) DO UPDATE SET mastery = $2, last_practiced = $3`,
    [skillId, mastery, when],
  );
}
