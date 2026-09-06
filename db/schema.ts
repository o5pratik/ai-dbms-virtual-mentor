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
  `CREATE TABLE IF NOT EXISTS QueryHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    success INTEGER NOT NULL CHECK (success IN (0, 1)),
    row_count INTEGER NOT NULL DEFAULT 0,
    execution_time REAL NOT NULL DEFAULT 0,
    error TEXT,
    executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_query_history_executed_at
    ON QueryHistory(executed_at DESC)`,
  `CREATE TABLE IF NOT EXISTS SavedQuery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS LearningProgress (
    topic_id TEXT PRIMARY KEY,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ChallengeProgress (
    challenge_id TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0 AND failed_attempts <= attempts),
    passed INTEGER NOT NULL DEFAULT 0 CHECK (passed IN (0, 1)),
    passed_at INTEGER,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
] as const;

export type CollegeTable =
  | 'Department'
  | 'Teacher'
  | 'Course'
  | 'Student'
  | 'Enrollment';
