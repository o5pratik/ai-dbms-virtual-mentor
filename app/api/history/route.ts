import { productivityDb, type HistoryRecord } from '@/lib/productivity-store';

export async function GET() {
  const result = await productivityDb().prepare(
    'SELECT id, query, success, row_count, execution_time, error, executed_at FROM QueryHistory ORDER BY id DESC LIMIT 100',
  ).all<HistoryRecord>();
  return Response.json({ items: result.results });
}

export async function DELETE() {
  await productivityDb().prepare('DELETE FROM QueryHistory').run();
  return Response.json({ success: true });
}
