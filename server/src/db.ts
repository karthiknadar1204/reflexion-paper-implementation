import { Database } from "bun:sqlite";

export const db = new Database("reflexion.sqlite", { strict: true });

db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA foreign_keys = ON;");

db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    question     TEXT NOT NULL,
    gold_answer  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'running',
    created_at   INTEGER NOT NULL,
    finished_at  INTEGER
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS trials (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id       INTEGER NOT NULL REFERENCES tasks(id),
    trial_number  INTEGER NOT NULL,
    attempt       TEXT NOT NULL,
    passed        INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS reflections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id       INTEGER NOT NULL REFERENCES tasks(id),
    trial_number  INTEGER NOT NULL,
    content       TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_reflections_task ON reflections(task_id, trial_number DESC);`);
db.run(`CREATE INDEX IF NOT EXISTS idx_trials_task     ON trials(task_id, trial_number);`);
