//! Shell Tauri di DEAL DESK.
//!
//! Il gioco vive interamente nel frontend: qui stanno solo la finestra, il plugin
//! SQLite e le migrazioni dello schema di persistenza (BUILD SPEC §10).
//! Nessuna logica di gioco in Rust — deve restare tutta testabile in TypeScript.

use tauri_plugin_sql::{Migration, MigrationKind};

/// Schema di persistenza. Ogni modifica va aggiunta come NUOVA migrazione:
/// il save file dell'utente non si ricostruisce.
fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "schema iniziale: profilo, mastery, run, task, errori",
            sql: r#"
CREATE TABLE IF NOT EXISTS profile (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    rank          TEXT    NOT NULL DEFAULT 'Intern',
    xp            INTEGER NOT NULL DEFAULT 0,
    streak_days   INTEGER NOT NULL DEFAULT 0,
    last_played   TEXT,
    branch        TEXT    NOT NULL DEFAULT 'IB'
);

INSERT OR IGNORE INTO profile (id) VALUES (1);

CREATE TABLE IF NOT EXISTS skill_mastery (
    skill_id         TEXT PRIMARY KEY,
    mastery          REAL    NOT NULL DEFAULT 0,
    last_practiced   TEXT,
    decay_applied_at TEXT
);

CREATE TABLE IF NOT EXISTS level_runs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id  TEXT    NOT NULL,
    seed         INTEGER NOT NULL,
    mode         TEXT    NOT NULL,
    started_at   TEXT    NOT NULL,
    duration_ms  INTEGER NOT NULL DEFAULT 0,
    keystrokes   INTEGER NOT NULL DEFAULT 0,
    mouse_clicks INTEGER NOT NULL DEFAULT 0,
    hints_used   INTEGER NOT NULL DEFAULT 0,
    tasks_total  INTEGER NOT NULL DEFAULT 0,
    tasks_correct INTEGER NOT NULL DEFAULT 0,
    xp_earned    INTEGER NOT NULL DEFAULT 0,
    passed       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_runs_template ON level_runs (template_id, started_at);

-- user_formula va salvata SEMPRE: alimenta la schermata "i tuoi errori ricorrenti",
-- che secondo lo spec §10 e' la feature con piu' valore didattico del gioco.
CREATE TABLE IF NOT EXISTS task_results (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id       INTEGER NOT NULL REFERENCES level_runs (id) ON DELETE CASCADE,
    task_id      TEXT    NOT NULL,
    check_kind   TEXT    NOT NULL,
    passed       INTEGER NOT NULL,
    user_formula TEXT,
    user_value   TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_results_run ON task_results (run_id);

CREATE TABLE IF NOT EXISTS error_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id     INTEGER NOT NULL REFERENCES level_runs (id) ON DELETE CASCADE,
    error_type TEXT    NOT NULL,
    skill_id   TEXT,
    detail     TEXT
);

CREATE INDEX IF NOT EXISTS idx_error_log_type ON error_log (error_type);
"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "impostazioni utente e check-out dei sotto-moduli saltabili",
            sql: r#"
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- M0-A e M0-B sono saltabili tramite il test di check-out (spec §5).
CREATE TABLE IF NOT EXISTS module_checkout (
    module_id  TEXT PRIMARY KEY,
    passed     INTEGER NOT NULL DEFAULT 0,
    attempted_at TEXT
);
"#,
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:dealdesk.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("errore durante l'avvio di DEAL DESK");
}
