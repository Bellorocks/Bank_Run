/**
 * Accesso al database (spec §10).
 *
 * Un solo punto in cui si apre la connessione: `tauri-plugin-sql` la mette in
 * cache per path, quindi chiamare `open()` piu' volte e' economico, ma tenerla
 * qui evita che ogni chiamante debba sapere il nome del file.
 *
 * Le query stanno per esteso nei moduli che le usano (`runs.ts`, `mastery.ts`,
 * `settings.ts`): questo file non conosce lo schema, solo come raggiungerlo.
 */

import Database from '@tauri-apps/plugin-sql';

const DB_PATH = 'sqlite:dealdesk.db';

let instance: Promise<Database> | null = null;

export function db(): Promise<Database> {
  if (!instance) instance = Database.load(DB_PATH);
  return instance;
}

/** Solo per i test: forza una nuova connessione al prossimo `db()`. */
export function resetDbConnection(): void {
  instance = null;
}
