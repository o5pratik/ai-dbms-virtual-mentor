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
export type MentorAnswerResponse = {
  answer: string;
  steps: string[];
  concepts: string[];
  example_sql: string;
  caution: string;
  follow_ups: string[];
  source: TutorSource;
};
export type MentorConversationItem = MentorAnswerResponse & {
  id: number | null;
  question: string;
  created_at: string;
};

export type SchemaColumn = {
  name: string;
  type: string;
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
  totals: {
    tables: number;
    columns: number;
    primary_keys: number;
    foreign_keys: number;
  };
  warnings?: string[];
};
export type HistoryItem = {
  id: number;
  query: string;
  success: number;
  row_count: number;
  execution_time: number;
  error: string | null;
  executed_at: string;
};
export type SavedQueryItem = {
  id: number;
  name: string;
  query: string;
  created_at: string;
};
export type ProgressItem = {
  topic_id: string;
  completed: number;
  updated_at: string;
};
export type ChallengeProgressItem = {
  challenge_id: string;
  attempts: number;
  failed_attempts: number;
  passed: number;
  passed_at: number | null;
  updated_at: string;
};
export type QueryStepType =
  | 'source'
  | 'join'
  | 'filter'
  | 'group'
  | 'having'
  | 'project'
  | 'sort'
  | 'limit';
export type QueryFlowStep = {
  id: string;
  type: QueryStepType;
  title: string;
  detail: string;
  sql_fragment: string;
  concepts: string[];
};
export type QueryAnalysis = {
  summary: string;
  steps: QueryFlowStep[];
  tables: string[];
  estimated_complexity: 'Simple' | 'Moderate' | 'Advanced';
  warnings: string[];
};
export type QueryPlanStep = {
  id: number;
  parent: number;
  detail: string;
  operation: 'scan' | 'search' | 'temporary' | 'compound' | 'other';
  table: string | null;
  index: string | null;
  uses_index: boolean;
};
export type QueryPlanResponse = {
  engine: 'SQLite';
  steps: QueryPlanStep[];
  summary: {
    scans: number;
    index_searches: number;
    temporary_structures: number;
  };
  warnings: string[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export async function executeQuery(query: string): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const payload = (await response.json()) as QueryResponse;
  if (!response.ok)
    throw new Error(payload.error ?? 'The query could not be executed.');
  return payload;
}

async function postTutor<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & {
    error?: string;
    detail?: string;
  };
  if (!response.ok)
    throw new Error(
      payload.error ??
        payload.detail ??
        'The AI Mentor could not complete that request.',
    );
  return payload;
}

export function explainQuery(query: string, resultSummary = '') {
  return postTutor<ExplanationResponse>('/api/explain', {
    query,
    result_summary: resultSummary,
  });
}

export function suggestQuery(currentSql: string, instruction = '') {
  return postTutor<SuggestionResponse>('/api/suggest', {
    current_sql: currentSql,
    instruction,
  });
}

export function fixQuery(query: string, databaseError = '') {
  return postTutor<FixResponse>('/api/fix', {
    query,
    database_error: databaseError,
  });
}

export function fixWriteQuery(
  query: string,
  databaseError: string,
  schema = '',
) {
  return postTutor<FixResponse>('/api/fix', {
    query,
    database_error: databaseError,
    mode: 'write-lab',
    schema,
  });
}

export function askEditableMentor(
  question: string,
  currentSql = '',
  schema = '',
  databaseError = '',
) {
  return postTutor<MentorConversationItem>('/api/mentor-chat', {
    question,
    current_sql: currentSql,
    schema,
    database_error: databaseError,
  });
}

export async function getMentorConversation() {
  return (
    await jsonRequest<{ items: MentorConversationItem[] }>('/api/mentor-chat')
  ).items;
}

export async function clearMentorConversation() {
  return jsonRequest<{ success: boolean }>('/api/mentor-chat', {
    method: 'DELETE',
  });
}

export function analyzeQuery(query: string) {
  return postTutor<QueryAnalysis>('/api/analyze-query', { query });
}

export function getQueryPlan(query: string) {
  return postTutor<QueryPlanResponse>('/api/query-plan', { query });
}

export async function getSchema(): Promise<SchemaResponse> {
  const response = await fetch(`${API_BASE_URL}/api/schema`);
  const payload = (await response.json()) as SchemaResponse & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(
      payload.error ?? 'The database schema could not be loaded.',
    );
  return payload;
}

export function analyzeSchema(sql: string) {
  return postTutor<SchemaResponse>('/api/analyze-schema', { sql });
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(payload.error ?? 'The request could not be completed.');
  return payload;
}

export async function getHistory() {
  return (await jsonRequest<{ items: HistoryItem[] }>('/api/history')).items;
}

export async function clearHistory() {
  return jsonRequest<{ success: boolean }>('/api/history', {
    method: 'DELETE',
  });
}

export async function getSavedQueries() {
  return (await jsonRequest<{ items: SavedQueryItem[] }>('/api/saved')).items;
}

export async function saveQuery(name: string, query: string) {
  return jsonRequest<{ success: boolean; id: number }>('/api/saved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, query }),
  });
}

export async function deleteSavedQuery(id: number) {
  return jsonRequest<{ success: boolean }>('/api/saved', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}

export async function getProgress() {
  return (await jsonRequest<{ items: ProgressItem[] }>('/api/progress')).items;
}

export async function setTopicProgress(topicId: string, completed: boolean) {
  return jsonRequest<{ success: boolean }>('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic_id: topicId, completed }),
  });
}

export async function getChallengeProgressCloud() {
  return (
    await jsonRequest<{ items: ChallengeProgressItem[] }>(
      '/api/challenge-progress',
    )
  ).items;
}

export async function syncChallengeProgressCloud(
  entries: Array<{
    challenge_id: string;
    attempts: number;
    failed_attempts: number;
    passed: boolean;
    passed_at: number | null;
  }>,
) {
  return jsonRequest<{ success: boolean }>('/api/challenge-progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
}

export async function clearChallengeProgressCloud() {
  return jsonRequest<{ success: boolean }>('/api/challenge-progress', {
    method: 'DELETE',
  });
}
