CREATE TABLE IF NOT EXISTS QuizLeaderboardAttempt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('ai-quiz', 'pyq-bank')),
  topic TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  total INTEGER NOT NULL CHECK (total > 0),
  points INTEGER NOT NULL CHECK (points >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_leaderboard_owner
  ON QuizLeaderboardAttempt(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_leaderboard_points
  ON QuizLeaderboardAttempt(points DESC, created_at ASC);
