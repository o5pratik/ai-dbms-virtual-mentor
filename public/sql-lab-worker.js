/* global initSqlJs */

importScripts('/sql-wasm.js');

const SEED_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE Department (
  dept_id INTEGER PRIMARY KEY,
  department_name TEXT NOT NULL UNIQUE
);

CREATE TABLE Student (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  marks INTEGER NOT NULL CHECK (marks BETWEEN 0 AND 100),
  dept_id INTEGER,
  FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
);

INSERT INTO Department (dept_id, department_name) VALUES
  (1, 'Computer Science'),
  (2, 'Electronics'),
  (3, 'Mechanical');

INSERT INTO Student (student_id, name, marks, dept_id) VALUES
  (1, 'Aarav Mehta', 88, 1),
  (2, 'Diya Nair', 76, 2),
  (3, 'Kabir Shah', 92, 1),
  (4, 'Meera Iyer', 81, 3);
`;

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
  if (!bytes || bytes.byteLength < 100) throw new Error('Choose a valid, non-empty SQLite database file.');
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('SQLite files are limited to 20 MB in Write Lab.');
  const header = new TextDecoder().decode(new Uint8Array(bytes, 0, 16));
  if (header !== 'SQLite format 3\0') throw new Error('This is not a valid SQLite 3 database file.');

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

self.onmessage = async (event) => {
  const { id, type, sql, bytes } = event.data;
  const startedAt = performance.now();
  try {
    if (type === 'reset') {
      const database = await resetDatabase();
      self.postMessage({ id, ok: true, schema: readSchema(database), elapsedMs: performance.now() - startedAt });
      return;
    }

    if (type === 'import') {
      const database = await importDatabase(bytes);
      self.postMessage({ id, ok: true, schema: readSchema(database), elapsedMs: performance.now() - startedAt });
      return;
    }

    const database = await getDatabase();
    if (type === 'schema') {
      self.postMessage({ id, ok: true, schema: readSchema(database), elapsedMs: performance.now() - startedAt });
      return;
    }

    if (type === 'export') {
      const exported = database.export();
      self.postMessage({ id, ok: true, bytes: exported.buffer, elapsedMs: performance.now() - startedAt }, [exported.buffer]);
      return;
    }

    if (!sql || !sql.trim()) throw new Error('Enter one or more SQL statements to run.');
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
      error: caught instanceof Error ? caught.message : 'SQLite could not execute this script.',
      elapsedMs: performance.now() - startedAt,
    });
  }
};
