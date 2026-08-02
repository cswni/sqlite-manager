-- 001_init.sql
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
