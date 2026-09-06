import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATABASE_DIR = PROJECT_ROOT / "database"
DATABASE_PATH = DATABASE_DIR / "college.db"

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Department (
    dept_id INTEGER PRIMARY KEY,
    dept_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Teacher (
    teacher_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    dept_id INTEGER NOT NULL,
    FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
);

CREATE TABLE IF NOT EXISTS Course (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    FOREIGN KEY (teacher_id) REFERENCES Teacher(teacher_id)
);

CREATE TABLE IF NOT EXISTS Student (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    marks INTEGER NOT NULL CHECK (marks BETWEEN 0 AND 100),
    dept_id INTEGER NOT NULL,
    FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
);

CREATE TABLE IF NOT EXISTS Enrollment (
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

CREATE TABLE IF NOT EXISTS QueryHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    success INTEGER NOT NULL CHECK (success IN (0, 1)),
    row_count INTEGER NOT NULL DEFAULT 0,
    execution_time REAL NOT NULL DEFAULT 0,
    error TEXT,
    executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_query_history_executed_at
ON QueryHistory(executed_at DESC);

CREATE TABLE IF NOT EXISTS SavedQuery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS LearningProgress (
    topic_id TEXT PRIMARY KEY,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ChallengeProgress (
    challenge_id TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0 AND failed_attempts <= attempts),
    passed INTEGER NOT NULL DEFAULT 0 CHECK (passed IN (0, 1)),
    passed_at INTEGER,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enrollment_semester ON Enrollment(semester);
CREATE INDEX IF NOT EXISTS idx_student_marks ON Student(marks);
PRAGMA optimize;
"""

SEED_SQL = """
INSERT OR IGNORE INTO Department VALUES
    (1, 'Computer Science'),
    (2, 'Information Technology'),
    (3, 'Electronics');

INSERT OR IGNORE INTO Teacher VALUES
    (1, 'Dr. Asha Mehta', 1),
    (2, 'Prof. Vikram Rao', 2),
    (3, 'Dr. Nisha Iyer', 3);

INSERT OR IGNORE INTO Course VALUES
    (101, 'Database Management Systems', 1),
    (102, 'Data Structures', 2),
    (103, 'Computer Networks', 3),
    (104, 'Advanced SQL', 1);

INSERT OR IGNORE INTO Student VALUES
    (1, 'Rahul Sharma', 85, 1),
    (2, 'Priya Patel', 92, 1),
    (3, 'Arjun Singh', 78, 2),
    (4, 'Sneha Reddy', 88, 3),
    (5, 'Kabir Khan', 81, 2);

INSERT OR IGNORE INTO Enrollment VALUES
    (1, 101, 4),
    (1, 104, 4),
    (2, 101, 4),
    (3, 102, 3),
    (4, 103, 4),
    (5, 101, 4);
"""


def initialize_database() -> Path:
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.executescript(SCHEMA_SQL)
        connection.executescript(SEED_SQL)
    return DATABASE_PATH


def open_read_only_connection() -> sqlite3.Connection:
    initialize_database()
    connection = sqlite3.connect(f"file:{DATABASE_PATH.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    return connection
