ALTER TABLE UserMentorConversation
ADD COLUMN follow_ups_json TEXT NOT NULL DEFAULT '[]';

PRAGMA optimize;
