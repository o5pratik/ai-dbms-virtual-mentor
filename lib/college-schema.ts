export const COLLEGE_SCHEMA = `
Department(dept_id INTEGER PRIMARY KEY, dept_name TEXT UNIQUE NOT NULL)
Teacher(teacher_id INTEGER PRIMARY KEY, name TEXT NOT NULL, dept_id INTEGER NOT NULL REFERENCES Department.dept_id)
Course(course_id INTEGER PRIMARY KEY, course_name TEXT NOT NULL, teacher_id INTEGER NOT NULL REFERENCES Teacher.teacher_id)
Student(student_id INTEGER PRIMARY KEY, name TEXT NOT NULL, marks INTEGER CHECK 0..100, dept_id INTEGER NOT NULL REFERENCES Department.dept_id)
Enrollment(student_id INTEGER REFERENCES Student.student_id, course_id INTEGER REFERENCES Course.course_id, semester INTEGER CHECK 1..8, PRIMARY KEY(student_id, course_id))
`.trim();

export type SchemaColumn = {
  name: string;
  type: 'INTEGER' | 'TEXT';
  nullable: boolean;
  primary_key?: boolean;
  unique?: boolean;
  foreign_key?: { table: string; column: string };
  check?: string;
};

export type SchemaTable = {
  name: string;
  kind: 'entity' | 'junction';
  description: string;
  row_count: number;
  columns: SchemaColumn[];
};

export type SchemaRelationship = {
  id: string;
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  cardinality: 'many-to-one';
};

export type SchemaMetadata = {
  database: string;
  engine: string;
  tables: SchemaTable[];
  relationships: SchemaRelationship[];
  totals: { tables: number; columns: number; primary_keys: number; foreign_keys: number };
};

export const COLLEGE_SCHEMA_METADATA: SchemaMetadata = {
  database: 'CollegeDB',
  engine: 'SQLite',
  tables: [
    {
      name: 'Department', kind: 'entity', description: 'Academic departments in the college.', row_count: 3,
      columns: [
        { name: 'dept_id', type: 'INTEGER', nullable: false, primary_key: true },
        { name: 'dept_name', type: 'TEXT', nullable: false, unique: true },
      ],
    },
    {
      name: 'Teacher', kind: 'entity', description: 'Faculty members and their home departments.', row_count: 3,
      columns: [
        { name: 'teacher_id', type: 'INTEGER', nullable: false, primary_key: true },
        { name: 'name', type: 'TEXT', nullable: false },
        { name: 'dept_id', type: 'INTEGER', nullable: false, foreign_key: { table: 'Department', column: 'dept_id' } },
      ],
    },
    {
      name: 'Course', kind: 'entity', description: 'Courses offered and their assigned teachers.', row_count: 4,
      columns: [
        { name: 'course_id', type: 'INTEGER', nullable: false, primary_key: true },
        { name: 'course_name', type: 'TEXT', nullable: false },
        { name: 'teacher_id', type: 'INTEGER', nullable: false, foreign_key: { table: 'Teacher', column: 'teacher_id' } },
      ],
    },
    {
      name: 'Student', kind: 'entity', description: 'Students, marks, and department membership.', row_count: 5,
      columns: [
        { name: 'student_id', type: 'INTEGER', nullable: false, primary_key: true },
        { name: 'name', type: 'TEXT', nullable: false },
        { name: 'marks', type: 'INTEGER', nullable: false, check: '0–100' },
        { name: 'dept_id', type: 'INTEGER', nullable: false, foreign_key: { table: 'Department', column: 'dept_id' } },
      ],
    },
    {
      name: 'Enrollment', kind: 'junction', description: 'Links students to courses by semester.', row_count: 6,
      columns: [
        { name: 'student_id', type: 'INTEGER', nullable: false, primary_key: true, foreign_key: { table: 'Student', column: 'student_id' } },
        { name: 'course_id', type: 'INTEGER', nullable: false, primary_key: true, foreign_key: { table: 'Course', column: 'course_id' } },
        { name: 'semester', type: 'INTEGER', nullable: false, check: '1–8' },
      ],
    },
  ],
  relationships: [
    { id: 'teacher-department', from_table: 'Teacher', from_column: 'dept_id', to_table: 'Department', to_column: 'dept_id', cardinality: 'many-to-one' },
    { id: 'course-teacher', from_table: 'Course', from_column: 'teacher_id', to_table: 'Teacher', to_column: 'teacher_id', cardinality: 'many-to-one' },
    { id: 'student-department', from_table: 'Student', from_column: 'dept_id', to_table: 'Department', to_column: 'dept_id', cardinality: 'many-to-one' },
    { id: 'enrollment-student', from_table: 'Enrollment', from_column: 'student_id', to_table: 'Student', to_column: 'student_id', cardinality: 'many-to-one' },
    { id: 'enrollment-course', from_table: 'Enrollment', from_column: 'course_id', to_table: 'Course', to_column: 'course_id', cardinality: 'many-to-one' },
  ],
  totals: { tables: 5, columns: 15, primary_keys: 6, foreign_keys: 5 },
};
