export const collegeSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS Department (
    dept_id INTEGER PRIMARY KEY,
    dept_name TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS Teacher (
    teacher_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    dept_id INTEGER NOT NULL,
    FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
  )`,
  `CREATE TABLE IF NOT EXISTS Course (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    FOREIGN KEY (teacher_id) REFERENCES Teacher(teacher_id)
  )`,
  `CREATE TABLE IF NOT EXISTS Student (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    marks INTEGER NOT NULL CHECK (marks BETWEEN 0 AND 100),
    dept_id INTEGER NOT NULL,
    FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
  )`,
  `CREATE TABLE IF NOT EXISTS Enrollment (
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
  )`,
] as const;

export const productivitySchemaStatements = [
  `CREATE TABLE IF NOT EXISTS UserQueryHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL,
    query TEXT NOT NULL,
    success INTEGER NOT NULL CHECK (success IN (0, 1)),
    row_count INTEGER NOT NULL DEFAULT 0,
    execution_time REAL NOT NULL DEFAULT 0,
    error TEXT,
    executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_query_history_owner_id
    ON UserQueryHistory(owner_id, id DESC)`,
  `CREATE TABLE IF NOT EXISTS UserSavedQuery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_saved_query_owner_id
    ON UserSavedQuery(owner_id, id DESC)`,
  `CREATE TABLE IF NOT EXISTS UserLearningProgress (
    owner_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (owner_id, topic_id)
  )`,
  `CREATE TABLE IF NOT EXISTS UserChallengeProgress (
    owner_id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0 AND failed_attempts <= attempts),
    passed INTEGER NOT NULL DEFAULT 0 CHECK (passed IN (0, 1)),
    passed_at INTEGER,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (owner_id, challenge_id)
  )`,
  `CREATE TABLE IF NOT EXISTS UserMentorConversation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    steps_json TEXT NOT NULL DEFAULT '[]',
    concepts_json TEXT NOT NULL DEFAULT '[]',
    example_sql TEXT NOT NULL DEFAULT '',
    caution TEXT NOT NULL DEFAULT '',
    follow_ups_json TEXT NOT NULL DEFAULT '[]',
    source TEXT NOT NULL DEFAULT 'built-in' CHECK (source IN ('groq', 'built-in')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_mentor_conversation_owner_id
    ON UserMentorConversation(owner_id, id DESC)`,
] as const;

export type CollegeTable =
  | 'Department'
  | 'Teacher'
  | 'Course'
  | 'Student'
  | 'Enrollment';
