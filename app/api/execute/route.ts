import { env } from 'cloudflare:workers';

import { recordQueryHistory } from '@/lib/productivity-store';

const MAX_QUERY_LENGTH = 10_000;
const MAX_RESULT_ROWS = 500;
const FORBIDDEN_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|VACUUM|REINDEX|ANALYZE|PRAGMA|TRANSACTION|BEGIN|COMMIT|ROLLBACK)\b/i;
const COMMENT_MARKERS = /--|\/\*/;

type ExecuteRequest = { query?: unknown };
type CellValue = string | number | null;

function validateQuery(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Query must not be blank.');
  }

  const query = input.trim();
  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query cannot exceed ${MAX_QUERY_LENGTH.toLocaleString()} characters.`);
  }
  if (COMMENT_MARKERS.test(query)) {
    throw new Error('SQL comments are not allowed in the hosted learning sandbox.');
  }

  const withoutTerminalSemicolon = query.endsWith(';') ? query.slice(0, -1).trimEnd() : query;
  if (withoutTerminalSemicolon.includes(';')) {
    throw new Error('Run one SQL statement at a time.');
  }
  if (!/^(SELECT|WITH)\b/i.test(withoutTerminalSemicolon)) {
    throw new Error('Only read-only SELECT and WITH queries are allowed in the learning sandbox.');
  }
  if (FORBIDDEN_KEYWORDS.test(withoutTerminalSemicolon)) {
    throw new Error('This statement contains an operation that is not allowed in the read-only sandbox.');
  }
  if (/\bload_extension\s*\(/i.test(withoutTerminalSemicolon)) {
    throw new Error('Loading SQLite extensions is not allowed.');
  }

  return withoutTerminalSemicolon;
}

function normalizeCell(value: unknown): CellValue {
  if (value === null || typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  return String(value);
}

function errorResponse(message: string, status = 400) {
  return Response.json(
    {
      success: false,
      columns: [],
      rows: [],
      row_count: 0,
      execution_time: 0,
      error: message,
    },
    { status },
  );
}

export async function POST(request: Request) {
  const started = performance.now();
  let historyQuery = '';

  try {
    const payload = (await request.json()) as ExecuteRequest;
    historyQuery = typeof payload.query === 'string' ? payload.query.trim() : '';
    const query = validateQuery(payload.query);
    const database = (env as unknown as { DB: D1Database }).DB;
    const raw = await database.prepare(query).raw<unknown[]>({ columnNames: true });
    const [columnRow = [], ...resultRows] = raw;

    if (resultRows.length > MAX_RESULT_ROWS) {
      const message = `This query returns more than ${MAX_RESULT_ROWS} rows. Add a LIMIT clause and try again.`;
      await recordQueryHistory(query, false, 0, Math.round((performance.now() - started) * 100) / 100, message);
      return errorResponse(
        message,
      );
    }

    const executionTime = Math.round((performance.now() - started) * 100) / 100;
    await recordQueryHistory(query, true, resultRows.length, executionTime, null);
    return Response.json({
      success: true,
      columns: columnRow.map(String),
      rows: resultRows.map((row) => row.map(normalizeCell)),
      row_count: resultRows.length,
      execution_time: executionTime,
      error: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The query could not be executed.';
    if (historyQuery) await recordQueryHistory(historyQuery, false, 0, Math.round((performance.now() - started) * 100) / 100, message);
    return errorResponse(message);
  }
}
