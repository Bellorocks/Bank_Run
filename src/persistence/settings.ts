/**
 * `settings` (chiave/valore) e `module_checkout` (spec §5: il test di
 * check-out che rende saltabili M0-A e M0-B a chi sa gia' usare Excel).
 */

import { db } from './db';

export interface GameSettings {
  readonly mouseFreeMode: boolean;
  readonly audioVolume: number;
  readonly toleranceOverride: number | null;
}

const DEFAULTS: GameSettings = {
  mouseFreeMode: false,
  audioVolume: 0.6,
  toleranceOverride: null,
};

export async function loadSettings(): Promise<GameSettings> {
  const rows = await (await db()).select<{ key: string; value: string }[]>('SELECT key, value FROM settings');
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    mouseFreeMode: map.get('mouseFreeMode') === 'true',
    audioVolume: Number(map.get('audioVolume') ?? DEFAULTS.audioVolume),
    toleranceOverride: map.has('toleranceOverride') ? Number(map.get('toleranceOverride')) : null,
  };
}

export async function saveSetting(key: keyof GameSettings, value: string | number | boolean | null): Promise<void> {
  await (await db()).execute(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = $2`,
    [key, value === null ? '' : String(value)],
  );
}

// ---------------------------------------------------------------------------
// Check-out dei moduli saltabili (spec §5)
// ---------------------------------------------------------------------------

export interface ModuleCheckoutStatus {
  readonly moduleId: string;
  readonly passed: boolean;
  readonly attemptedAt: string | null;
}

export async function getModuleCheckout(moduleId: string): Promise<ModuleCheckoutStatus | null> {
  const rows = await (await db()).select<{ module_id: string; passed: number; attempted_at: string | null }[]>(
    'SELECT module_id, passed, attempted_at FROM module_checkout WHERE module_id = $1',
    [moduleId],
  );
  const r = rows[0];
  if (!r) return null;
  return { moduleId: r.module_id, passed: r.passed === 1, attemptedAt: r.attempted_at };
}

export async function recordModuleCheckout(moduleId: string, passed: boolean, when: string): Promise<void> {
  await (await db()).execute(
    `INSERT INTO module_checkout (module_id, passed, attempted_at) VALUES ($1, $2, $3)
     ON CONFLICT(module_id) DO UPDATE SET passed = $2, attempted_at = $3`,
    [moduleId, passed ? 1 : 0, when],
  );
}

/**
 * M0-A e M0-B sono skippabili SOLO se entrambi i test di check-out sono stati
 * superati (spec §5). M0-C, M0-D, M0-E non compaiono qui perche' non sono mai
 * skippabili, per scelta esplicita dello spec.
 */
export async function skippableModules(): Promise<Set<string>> {
  const a = await getModuleCheckout('M0-A');
  const b = await getModuleCheckout('M0-B');
  const skip = new Set<string>();
  if (a?.passed) skip.add('M0-A');
  if (b?.passed) skip.add('M0-B');
  return skip;
}
