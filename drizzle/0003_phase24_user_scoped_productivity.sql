CREATE TABLE IF NOT EXISTS UserQueryHistory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  query TEXT NOT NULL,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  row_count INTEGER NOT NULL DEFAULT 0,
  execution_time REAL NOT NULL DEFAULT 0,
  error TEXT,
  executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_query_history_owner_id
ON UserQueryHistory(owner_id, id DESC);

CREATE TABLE IF NOT EXISTS UserSavedQuery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_saved_query_owner_id
ON UserSavedQuery(owner_id, id DESC);

CREATE TABLE IF NOT EXISTS UserLearningProgress (
  owner_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (owner_id, topic_id)
);

CREATE TABLE IF NOT EXISTS UserChallengeProgress (
  owner_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0 AND failed_attempts <= attempts),
  passed INTEGER NOT NULL DEFAULT 0 CHECK (passed IN (0, 1)),
  passed_at INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (owner_id, challenge_id)
);

PRAGMA optimize;
