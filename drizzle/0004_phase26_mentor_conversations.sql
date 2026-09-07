CREATE TABLE IF NOT EXISTS UserMentorConversation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  steps_json TEXT NOT NULL DEFAULT '[]',
  concepts_json TEXT NOT NULL DEFAULT '[]',
  example_sql TEXT NOT NULL DEFAULT '',
  caution TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'built-in' CHECK (source IN ('groq', 'built-in')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_mentor_conversation_owner_id
ON UserMentorConversation(owner_id, id DESC);

PRAGMA optimize;
