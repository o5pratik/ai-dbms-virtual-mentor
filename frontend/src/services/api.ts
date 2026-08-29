export type QueryResponse = {
  success: boolean;
  columns: string[];
  rows: Array<Array<string | number | null>>;
  row_count: number;
  execution_time: number;
  error?: string;
};

export type TutorSource = 'groq' | 'built-in';
export type ExplanationResponse = {
  summary: string;
  steps: string[];
  concepts: string[];
  improvements: string[];
  complexity: string;
  source: TutorSource;
};
export type SuggestionResponse = {
  sql: string;
  rationale: string;
  source: TutorSource;
};
export type FixResponse = {
  has_error: boolean;
  error_explanation: string;
  corrected_sql: string;
  reason: string;
  source: TutorSource;
};

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
export type SchemaResponse = {
  database: string;
  engine: string;
  tables: SchemaTable[];
  relationships: SchemaRelationship[];
  totals: { tables: number; columns: number; primary_keys: number; foreign_keys: number };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export async function executeQuery(query: string): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const payload = (await response.json()) as QueryResponse;
  if (!response.ok) throw new Error(payload.error ?? 'The query could not be executed.');
  return payload;
}

async function postTutor<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'The AI Mentor could not complete that request.');
  return payload;
}

export function explainQuery(query: string, resultSummary = '') {
  return postTutor<ExplanationResponse>('/api/explain', { query, result_summary: resultSummary });
}

export function suggestQuery(currentSql: string, instruction = '') {
  return postTutor<SuggestionResponse>('/api/suggest', { current_sql: currentSql, instruction });
}

export function fixQuery(query: string, databaseError = '') {
  return postTutor<FixResponse>('/api/fix', { query, database_error: databaseError });
}

export async function getSchema(): Promise<SchemaResponse> {
  const response = await fetch(`${API_BASE_URL}/api/schema`);
  const payload = (await response.json()) as SchemaResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'The database schema could not be loaded.');
  return payload;
}
