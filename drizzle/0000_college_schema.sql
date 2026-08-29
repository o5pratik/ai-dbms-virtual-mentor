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

INSERT OR IGNORE INTO Department (dept_id, dept_name) VALUES
  (1, 'Computer Science'),
  (2, 'Information Technology'),
  (3, 'Electronics');

INSERT OR IGNORE INTO Teacher (teacher_id, name, dept_id) VALUES
  (1, 'Dr. Asha Mehta', 1),
  (2, 'Prof. Vikram Rao', 2),
  (3, 'Dr. Nisha Iyer', 3);

INSERT OR IGNORE INTO Course (course_id, course_name, teacher_id) VALUES
  (101, 'Database Management Systems', 1),
  (102, 'Data Structures', 2),
  (103, 'Computer Networks', 3),
  (104, 'Advanced SQL', 1);

INSERT OR IGNORE INTO Student (student_id, name, marks, dept_id) VALUES
  (1, 'Rahul Sharma', 85, 1),
  (2, 'Priya Patel', 92, 1),
  (3, 'Arjun Singh', 78, 2),
  (4, 'Sneha Reddy', 88, 3),
  (5, 'Kabir Khan', 81, 2);

INSERT OR IGNORE INTO Enrollment (student_id, course_id, semester) VALUES
  (1, 101, 4),
  (1, 104, 4),
  (2, 101, 4),
  (3, 102, 3),
  (4, 103, 4),
  (5, 101, 4);

CREATE INDEX IF NOT EXISTS idx_enrollment_semester
ON Enrollment(semester);

CREATE INDEX IF NOT EXISTS idx_student_marks
ON Student(marks);

PRAGMA optimize;
