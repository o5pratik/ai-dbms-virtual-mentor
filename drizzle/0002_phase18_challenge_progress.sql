CREATE TABLE IF NOT EXISTS ChallengeProgress (
  challenge_id TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0 AND failed_attempts <= attempts),
  passed INTEGER NOT NULL DEFAULT 0 CHECK (passed IN (0, 1)),
  passed_at INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

PRAGMA optimize;
