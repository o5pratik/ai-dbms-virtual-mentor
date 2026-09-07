import { env } from 'cloudflare:workers';

export type HistoryRecord = {
  id: number;
  query: string;
  success: number;
  row_count: number;
  execution_time: number;
  error: string | null;
  executed_at: string;
};

export type SavedQueryRecord = {
  id: number;
  name: string;
  query: string;
  created_at: string;
};

export function productivityDb() {
  return (env as unknown as { DB: D1Database }).DB;
}

export async function recordQueryHistory(ownerId: string, query: string, success: boolean, rowCount: number, executionTime: number, error: string | null) {
  try {
    await productivityDb().prepare(
      'INSERT INTO UserQueryHistory (owner_id, query, success, row_count, execution_time, error) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(ownerId, query.slice(0, 10_000), success ? 1 : 0, rowCount, executionTime, error?.slice(0, 2_000) ?? null).run();
  } catch {
    // History must never prevent the SQL playground from returning its result.
  }
}
