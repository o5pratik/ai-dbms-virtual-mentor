export type QueryResponse = {
  success: boolean;
  columns: string[];
  rows: Array<Array<string | number | null>>;
  row_count: number;
  execution_time: number;
  error?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8000';

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
