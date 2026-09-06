/* global initSqlJs */

importScripts('/sql-wasm.js');

const SEED_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE Department (
  dept_id INTEGER PRIMARY KEY,
  dept_name TEXT NOT NULL UNIQUE
);

CREATE TABLE Teacher (
  teacher_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  dept_id INTEGER NOT NULL,
  FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
);

CREATE TABLE Course (
  course_id INTEGER PRIMARY KEY,
  course_name TEXT NOT NULL,
  teacher_id INTEGER NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES Teacher(teacher_id)
);

CREATE TABLE Student (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  marks INTEGER NOT NULL CHECK (marks BETWEEN 0 AND 100),
  dept_id INTEGER NOT NULL,
  FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
);

CREATE TABLE Enrollment (
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES Student(student_id),
  FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

INSERT INTO Department (dept_id, dept_name) VALUES
  (1, 'Computer Science'),
  (2, 'Information Technology'),
  (3, 'Electronics');

INSERT INTO Teacher (teacher_id, name, dept_id) VALUES
  (1, 'Dr. Asha Mehta', 1),
  (2, 'Prof. Vikram Rao', 2),
  (3, 'Dr. Nisha Iyer', 3);

INSERT INTO Course (course_id, course_name, teacher_id) VALUES
  (101, 'Database Management Systems', 1),
  (102, 'Data Structures', 2),
  (103, 'Computer Networks', 3),
  (104, 'Advanced SQL', 1);

INSERT INTO Student (student_id, name, marks, dept_id) VALUES
  (1, 'Rahul Sharma', 85, 1),
  (2, 'Priya Patel', 92, 1),
  (3, 'Arjun Singh', 78, 2),
  (4, 'Sneha Reddy', 88, 3),
  (5, 'Kabir Khan', 81, 2);

INSERT INTO Enrollment (student_id, course_id, semester) VALUES
  (1, 101, 4),
  (1, 104, 4),
  (2, 101, 4),
  (3, 102, 3),
  (4, 103, 4),
  (5, 101, 4);

CREATE INDEX idx_enrollment_semester ON Enrollment(semester);
CREATE INDEX idx_student_marks ON Student(marks);
PRAGMA optimize;
`;

const CHALLENGES = {
  'students-above-80': {
    expectedSql:
      'SELECT name, marks FROM Student WHERE marks > 80 ORDER BY marks DESC;',
    success:
      'Correct — you filtered the qualifying students and sorted the highest mark first.',
  },
  'department-counts': {
    expectedSql: `
      SELECT d.dept_name AS department_name, COUNT(s.student_id) AS student_count
      FROM Department AS d
      LEFT JOIN Student AS s ON s.dept_id = d.dept_id
      GROUP BY d.dept_name
      ORDER BY d.dept_name;
    `,
    success: 'Correct — every department is included with its student count.',
  },
  'top-student': {
    expectedSql: 'SELECT name, marks FROM Student ORDER BY marks DESC LIMIT 1;',
    success: 'Correct — the query returns only the highest-scoring student.',
  },
  'student-departments': {
    expectedSql: `
      SELECT s.name, d.dept_name AS department_name
      FROM Student AS s
      JOIN Department AS d ON d.dept_id = s.dept_id
      ORDER BY s.name;
    `,
    success: 'Correct — each student is matched to the right department.',
  },
  'department-averages': {
    expectedSql: `
      SELECT d.dept_name AS department_name, ROUND(AVG(s.marks), 1) AS average_marks
      FROM Department AS d
      JOIN Student AS s ON s.dept_id = d.dept_id
      GROUP BY d.dept_name
      ORDER BY average_marks DESC;
    `,
    success: 'Correct — the department averages and ranking are accurate.',
  },
  'above-average-students': {
    expectedSql: `
      SELECT name, marks
      FROM Student
      WHERE marks > (SELECT AVG(marks) FROM Student)
      ORDER BY marks DESC;
    `,
    success:
      'Correct — the scalar subquery identifies every above-average student.',
  },
};

const sqlPromise = initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
let databasePromise = null;

async function createDatabase(bytes) {
  const SQL = await sqlPromise;
  const database = new SQL.Database(bytes ? new Uint8Array(bytes) : undefined);
  if (bytes) database.run('PRAGMA foreign_keys = ON;');
  else database.run(SEED_SQL);
  return database;
}

function getDatabase() {
  if (!databasePromise) databasePromise = createDatabase();
  return databasePromise;
}

async function resetDatabase() {
  const current = await getDatabase();
  current.close();
  databasePromise = createDatabase();
  return databasePromise;
}

async function importDatabase(bytes) {
  if (!bytes || bytes.byteLength < 100)
    throw new Error('Choose a valid, non-empty SQLite database file.');
  if (bytes.byteLength > 20 * 1024 * 1024)
    throw new Error(
      'SQLite files are limited to 20 MB in Editable Playground.',
    );
  const header = new TextDecoder().decode(new Uint8Array(bytes, 0, 16));
  if (header !== 'SQLite format 3\0')
    throw new Error('This is not a valid SQLite 3 database file.');

  const imported = await createDatabase(bytes);
  imported.exec('SELECT COUNT(*) FROM sqlite_schema;');
  const current = await getDatabase();
  current.close();
  databasePromise = Promise.resolve(imported);
  return imported;
}

function readSchema(database) {
  const result = database.exec(`
    SELECT name, type, sql
    FROM sqlite_schema
    WHERE name NOT LIKE 'sqlite_%'
    ORDER BY CASE type WHEN 'table' THEN 1 WHEN 'view' THEN 2 WHEN 'index' THEN 3 ELSE 4 END, name;
  `)[0];
  if (!result) return [];
  return result.values.map((row) => ({
    name: String(row[0]),
    type: String(row[1]),
    sql: row[2] === null ? null : String(row[2]),
  }));
}

function serialiseResults(results) {
  return results.map((result) => ({
    columns: result.columns,
    values: result.values.slice(0, 1000),
    rowCount: result.values.length,
    truncated: result.values.length > 1000,
  }));
}

function stripLeadingComments(sql) {
  return sql
    .replace(/^\s*(?:--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/\s*)*/u, '')
    .trim();
}

function validateChallengeSql(sql) {
  const cleaned = stripLeadingComments(sql);
  if (!cleaned)
    throw new Error('Write a SELECT query before checking your answer.');
  const withoutTrailingSemicolon = cleaned.replace(/;\s*$/u, '');
  if (withoutTrailingSemicolon.includes(';')) {
    throw new Error('Check one SELECT statement at a time.');
  }
  if (!/^(SELECT|WITH)\b/iu.test(withoutTrailingSemicolon)) {
    throw new Error('Challenges accept one read-only SELECT or WITH query.');
  }
  return withoutTrailingSemicolon;
}

function comparableResults(result) {
  if (!result) return { columns: [], values: [] };
  return {
    columns: result.columns.map((column) =>
      String(column).trim().toLowerCase(),
    ),
    values: result.values.map((row) =>
      row.map((value) =>
        value instanceof Uint8Array ? Array.from(value) : value,
      ),
    ),
  };
}

function gradeFeedback(actual, expected) {
  if (actual.columns.length !== expected.columns.length) {
    return `Your query returned ${actual.columns.length} column(s); the challenge expects ${expected.columns.length}. Check the requested column names.`;
  }
  if (
    actual.columns.some((column, index) => column !== expected.columns[index])
  ) {
    return `Your columns do not match yet. Return them as: ${expected.columns.join(', ')}.`;
  }
  if (actual.values.length !== expected.values.length) {
    return `Your query returned ${actual.values.length} row(s); the expected result has ${expected.values.length}. Recheck the filter, grouping, or LIMIT.`;
  }
  return 'The columns are right, but one or more values or their order differ. Review the challenge hint and ORDER BY clause.';
}

async function gradeChallenge(sql, challengeId) {
  const challenge = CHALLENGES[challengeId];
  if (!challenge) throw new Error('Choose a valid SQL challenge first.');
  const safeSql = validateChallengeSql(sql);
  const database = await createDatabase();
  try {
    database.run('PRAGMA query_only = ON;');
    let actualRaw;
    try {
      actualRaw = database.exec(safeSql);
    } catch (caught) {
      return {
        passed: false,
        feedback: `SQLite could not run this answer: ${caught instanceof Error ? caught.message : 'syntax error'}`,
        results: [],
      };
    }
    const expectedRaw = database.exec(challenge.expectedSql);
    const actual = comparableResults(actualRaw[0]);
    const expected = comparableResults(expectedRaw[0]);
    const passed = JSON.stringify(actual) === JSON.stringify(expected);
    return {
      passed,
      feedback: passed ? challenge.success : gradeFeedback(actual, expected),
      results: serialiseResults(actualRaw),
    };
  } finally {
    database.close();
  }
}

self.onmessage = async (event) => {
  const { id, type, sql, bytes, challengeId } = event.data;
  const startedAt = performance.now();
  try {
    if (type === 'reset') {
      const database = await resetDatabase();
      self.postMessage({
        id,
        ok: true,
        schema: readSchema(database),
        elapsedMs: performance.now() - startedAt,
      });
      return;
    }

    if (type === 'import') {
      const database = await importDatabase(bytes);
      self.postMessage({
        id,
        ok: true,
        schema: readSchema(database),
        elapsedMs: performance.now() - startedAt,
      });
      return;
    }

    if (type === 'grade') {
      const grade = await gradeChallenge(sql, challengeId);
      self.postMessage({
        id,
        ok: true,
        ...grade,
        elapsedMs: performance.now() - startedAt,
      });
      return;
    }

    const database = await getDatabase();
    if (type === 'schema') {
      self.postMessage({
        id,
        ok: true,
        schema: readSchema(database),
        elapsedMs: performance.now() - startedAt,
      });
      return;
    }

    if (type === 'export') {
      const exported = database.export();
      self.postMessage(
        {
          id,
          ok: true,
          bytes: exported.buffer,
          elapsedMs: performance.now() - startedAt,
        },
        [exported.buffer],
      );
      return;
    }

    if (!sql || !sql.trim())
      throw new Error('Enter one or more SQL statements to run.');
    const results = database.exec(sql);
    self.postMessage({
      id,
      ok: true,
      results: serialiseResults(results),
      changes: database.getRowsModified(),
      schema: readSchema(database),
      elapsedMs: performance.now() - startedAt,
    });
  } catch (caught) {
    self.postMessage({
      id,
      ok: false,
      error:
        caught instanceof Error
          ? caught.message
          : 'SQLite could not execute this script.',
      elapsedMs: performance.now() - startedAt,
    });
  }
};
