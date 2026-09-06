import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import initSqlJs from 'sql.js';

const projectRoot = process.cwd();
const responses = [];
const context = vm.createContext({
  ArrayBuffer,
  Error,
  JSON,
  TextDecoder,
  Uint8Array,
  console,
  importScripts: () => undefined,
  initSqlJs: () =>
    initSqlJs({
      locateFile: (file) =>
        path.join(projectRoot, 'node_modules', 'sql.js', 'dist', file),
    }),
  performance,
  self: {
    postMessage: (response) => responses.push(response),
  },
});

vm.runInContext(
  fs.readFileSync(
    path.join(projectRoot, 'public', 'sql-lab-worker.js'),
    'utf8',
  ),
  context,
  { filename: 'sql-lab-worker.js' },
);

let requestId = 0;
async function request(type, payload = {}) {
  const id = ++requestId;
  await context.self.onmessage({ data: { id, type, ...payload } });
  const response = responses.find((candidate) => candidate.id === id);
  assert.ok(response, `Worker did not respond to request ${id}.`);
  return response;
}

const challengeAnswers = [
  [
    'students-above-80',
    'SELECT name, marks FROM Student WHERE marks > 80 ORDER BY marks DESC;',
  ],
  [
    'department-counts',
    `SELECT d.dept_name AS department_name, COUNT(s.student_id) AS student_count
     FROM Department AS d
     LEFT JOIN Student AS s ON s.dept_id = d.dept_id
     GROUP BY d.dept_name
     ORDER BY d.dept_name;`,
  ],
  [
    'top-student',
    'SELECT name, marks FROM Student ORDER BY marks DESC LIMIT 1;',
  ],
  [
    'student-departments',
    `SELECT s.name, d.dept_name AS department_name
     FROM Student AS s
     JOIN Department AS d ON d.dept_id = s.dept_id
     ORDER BY s.name;`,
  ],
  [
    'department-averages',
    `SELECT d.dept_name AS department_name, ROUND(AVG(s.marks), 1) AS average_marks
     FROM Department AS d
     JOIN Student AS s ON s.dept_id = d.dept_id
     GROUP BY d.dept_name
     ORDER BY average_marks DESC;`,
  ],
  [
    'above-average-students',
    `SELECT name, marks
     FROM Student
     WHERE marks > (SELECT AVG(marks) FROM Student)
     ORDER BY marks DESC;`,
  ],
];

for (const [challengeId, sql] of challengeAnswers) {
  const response = await request('grade', { challengeId, sql });
  assert.equal(response.ok, true);
  assert.equal(response.passed, true, `${challengeId} should pass.`);
}

const seededSchema = await request('schema');
for (const table of [
  'Department',
  'Teacher',
  'Course',
  'Student',
  'Enrollment',
]) {
  assert.ok(
    seededSchema.schema.some(
      (item) => item.type === 'table' && item.name === table,
    ),
    `${table} should be available in the editable CollegeDB copy.`,
  );
}

const editableScript = await request('execute', {
  sql: `CREATE TABLE Employee (
          employee_id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          salary REAL
        );
        INSERT INTO Employee VALUES (1, 'Rahul', 45000);
        SELECT * FROM Employee;`,
});
assert.equal(editableScript.ok, true);
assert.deepEqual(Array.from(editableScript.results[0].columns), [
  'employee_id',
  'name',
  'salary',
]);
assert.deepEqual(Array.from(editableScript.results[0].values[0]), [
  1,
  'Rahul',
  45000,
]);
const droppedTable = await request('execute', {
  sql: 'DROP TABLE Employee;',
});
assert.equal(droppedTable.ok, true);
assert.equal(
  droppedTable.schema.some((item) => item.name === 'Employee'),
  false,
);

const wrongAnswer = await request('grade', {
  challengeId: 'top-student',
  sql: 'SELECT name, marks FROM Student ORDER BY marks DESC;',
});
assert.equal(wrongAnswer.ok, true);
assert.equal(wrongAnswer.passed, false);
assert.match(wrongAnswer.feedback, /expected result has 1/i);

const mutatingAnswer = await request('grade', {
  challengeId: 'top-student',
  sql: `WITH source(value) AS (SELECT 'Unsafe')
        INSERT INTO Department (dept_name) SELECT value FROM source;`,
});
assert.equal(mutatingAnswer.ok, true);
assert.equal(mutatingAnswer.passed, false);
assert.match(mutatingAnswer.feedback, /read.?only|attempt to write/i);

await request('execute', { sql: 'UPDATE Student SET marks = 0;' });
const isolatedGrade = await request('grade', {
  challengeId: 'top-student',
  sql: challengeAnswers[2][1],
});
assert.equal(isolatedGrade.passed, true, 'Grading must use a fresh seed.');

console.log('SQL Lab worker challenge grading passed.');
