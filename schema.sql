CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  info_hash TEXT NOT NULL,
  magnet TEXT NOT NULL,
  file_count INTEGER,
  total_size INTEGER,
  files_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, info_hash)
);