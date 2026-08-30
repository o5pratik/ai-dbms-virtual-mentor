const MAX_QUERY_LENGTH = 10_000;
const FORBIDDEN_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|VACUUM|REINDEX|ANALYZE|PRAGMA|TRANSACTION|BEGIN|COMMIT|ROLLBACK)\b/i;
const COMMENT_MARKERS = /--|\/\*/;

export function validateReadOnlyQuery(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Query must not be blank.');
  const query = input.trim();
  if (query.length > MAX_QUERY_LENGTH) throw new Error(`Query cannot exceed ${MAX_QUERY_LENGTH.toLocaleString()} characters.`);
  if (COMMENT_MARKERS.test(query)) throw new Error('SQL comments are not allowed in the hosted learning sandbox.');
  const statement = query.endsWith(';') ? query.slice(0, -1).trimEnd() : query;
  if (statement.includes(';')) throw new Error('Run one SQL statement at a time.');
  if (!/^(SELECT|WITH)\b/i.test(statement)) throw new Error('Only read-only SELECT and WITH queries are allowed in the learning sandbox.');
  if (FORBIDDEN_KEYWORDS.test(statement)) throw new Error('This statement contains an operation that is not allowed in the read-only sandbox.');
  if (/\bload_extension\s*\(/i.test(statement)) throw new Error('Loading SQLite extensions is not allowed.');
  return statement;
}
