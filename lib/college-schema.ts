export const COLLEGE_SCHEMA = `
Department(dept_id INTEGER PRIMARY KEY, dept_name TEXT UNIQUE NOT NULL)
Teacher(teacher_id INTEGER PRIMARY KEY, name TEXT NOT NULL, dept_id INTEGER NOT NULL REFERENCES Department.dept_id)
Course(course_id INTEGER PRIMARY KEY, course_name TEXT NOT NULL, teacher_id INTEGER NOT NULL REFERENCES Teacher.teacher_id)
Student(student_id INTEGER PRIMARY KEY, name TEXT NOT NULL, marks INTEGER CHECK 0..100, dept_id INTEGER NOT NULL REFERENCES Department.dept_id)
Enrollment(student_id INTEGER REFERENCES Student.student_id, course_id INTEGER REFERENCES Course.course_id, semester INTEGER CHECK 1..8, PRIMARY KEY(student_id, course_id))
`.trim();
