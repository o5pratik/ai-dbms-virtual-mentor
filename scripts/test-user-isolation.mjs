import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import initSqlJs from 'sql.js';

const projectRoot = process.cwd();
const SQL = await initSqlJs({
  locateFile: (file) => path.join(projectRoot, 'node_modules', 'sql.js', 'dist', file),
});
const database = new SQL.Database();
database.exec(
  fs.readFileSync(
    path.join(projectRoot, 'drizzle', '0003_phase24_user_scoped_productivity.sql'),
    'utf8',
  ),
);

function scalar(sql, params = []) {
  const statement = database.prepare(sql);
  statement.bind(params);
  assert.equal(statement.step(), true, `Expected one row from: ${sql}`);
  const value = statement.get()[0];
  statement.free();
  return value;
}

database.run(
  'INSERT INTO UserQueryHistory (owner_id, query, success) VALUES (?, ?, ?), (?, ?, ?)',
  ['student-a', 'SELECT 1;', 1, 'student-b', 'SELECT 2;', 1],
);
assert.equal(scalar('SELECT COUNT(*) FROM UserQueryHistory WHERE owner_id = ?', ['student-a']), 1);
database.run('DELETE FROM UserQueryHistory WHERE owner_id = ?', ['student-a']);
assert.equal(scalar('SELECT COUNT(*) FROM UserQueryHistory WHERE owner_id = ?', ['student-a']), 0);
assert.equal(scalar('SELECT COUNT(*) FROM UserQueryHistory WHERE owner_id = ?', ['student-b']), 1);

database.run(
  'INSERT INTO UserSavedQuery (owner_id, name, query) VALUES (?, ?, ?), (?, ?, ?)',
  ['student-a', 'A query', 'SELECT 1;', 'student-b', 'B query', 'SELECT 2;'],
);
const studentBSavedId = scalar('SELECT id FROM UserSavedQuery WHERE owner_id = ?', ['student-b']);
database.run('DELETE FROM UserSavedQuery WHERE id = ? AND owner_id = ?', [studentBSavedId, 'student-a']);
assert.equal(scalar('SELECT COUNT(*) FROM UserSavedQuery WHERE owner_id = ?', ['student-b']), 1);

database.run(
  `INSERT INTO UserLearningProgress (owner_id, topic_id, completed)
   VALUES (?, ?, ?), (?, ?, ?)`,
  ['student-a', 'joins', 1, 'student-b', 'joins', 0],
);
assert.equal(scalar('SELECT completed FROM UserLearningProgress WHERE owner_id = ?', ['student-a']), 1);
assert.equal(scalar('SELECT completed FROM UserLearningProgress WHERE owner_id = ?', ['student-b']), 0);

database.run(
  `INSERT INTO UserChallengeProgress (owner_id, challenge_id, attempts, failed_attempts, passed)
   VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
  ['student-a', 'top-student', 1, 0, 1, 'student-b', 'top-student', 2, 2, 0],
);
assert.equal(scalar('SELECT passed FROM UserChallengeProgress WHERE owner_id = ?', ['student-a']), 1);
assert.equal(scalar('SELECT passed FROM UserChallengeProgress WHERE owner_id = ?', ['student-b']), 0);

database.close();
console.log('User-scoped productivity isolation passed.');
