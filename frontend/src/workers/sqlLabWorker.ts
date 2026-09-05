import initSqlJs, { type Database, type QueryExecResult, type SqlValue } from 'sql.js';

type Request = {
  id: number;
  type: 'execute' | 'reset' | 'schema' | 'export' | 'import';
  sql?: string;
  bytes?: ArrayBuffer;
};

type SchemaObject = { name: string; type: string; sql: string | null };

type WorkerScope = {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

const scope = self as unknown as WorkerScope;

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
let databasePromise: Promise<Database> | null = null;

async function createDatabase(bytes?: ArrayBuffer) {
  const SQL = await sqlPromise;
  const database = new SQL.Database(bytes ? new Uint8Array(bytes) : undefined);
  if (bytes) database.run('PRAGMA foreign_keys = ON;');
  else database.run(SEED_SQL);
  return database;
}

function getDatabase() {
  databasePromise ??= createDatabase();
  return databasePromise;
}

async function resetDatabase() {
  const current = await getDatabase();
  current.close();
  databasePromise = createDatabase();
  return databasePromise;
}

async function importDatabase(bytes?: ArrayBuffer) {
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

function readSchema(database: Database): SchemaObject[] {
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

function serialiseResults(results: QueryExecResult[]) {
  return results.map((result) => ({
    columns: result.columns,
    values: result.values.slice(0, 1000) as SqlValue[][],
    rowCount: result.values.length,
    truncated: result.values.length > 1000,
  }));
}

scope.onmessage = async (event) => {
  const { id, type, sql, bytes } = event.data;
  const startedAt = performance.now();
  try {
    if (type === 'reset') {
      const database = await resetDatabase();
      scope.postMessage({ id, ok: true, schema: readSchema(database), elapsedMs: performance.now() - startedAt });
      return;
    }

    if (type === 'import') {
      const database = await importDatabase(bytes);
      scope.postMessage({ id, ok: true, schema: readSchema(database), elapsedMs: performance.now() - startedAt });
      return;
    }

    const database = await getDatabase();
    if (type === 'schema') {
      scope.postMessage({ id, ok: true, schema: readSchema(database), elapsedMs: performance.now() - startedAt });
      return;
    }

    if (type === 'export') {
      const bytes = database.export();
      scope.postMessage({ id, ok: true, bytes: bytes.buffer, elapsedMs: performance.now() - startedAt }, [bytes.buffer]);
      return;
    }

    if (!sql?.trim()) throw new Error('Enter one or more SQL statements to run.');
    const results = database.exec(sql);
    scope.postMessage({
      id,
      ok: true,
      results: serialiseResults(results),
      changes: database.getRowsModified(),
      schema: readSchema(database),
      elapsedMs: performance.now() - startedAt,
    });
  } catch (caught) {
    scope.postMessage({
      id,
      ok: false,
      error: caught instanceof Error ? caught.message : 'SQLite could not execute this script.',
      elapsedMs: performance.now() - startedAt,
    });
  }
};
