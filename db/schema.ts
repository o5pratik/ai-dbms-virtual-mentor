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

export type CollegeTable =
  | 'Department'
  | 'Teacher'
  | 'Course'
  | 'Student'
  | 'Enrollment';
