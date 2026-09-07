import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/authenticated-user';
import { productivityDb, type HistoryRecord } from '@/lib/productivity-store';

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();
  const result = await productivityDb().prepare(
    'SELECT id, query, success, row_count, execution_time, error, executed_at FROM UserQueryHistory WHERE owner_id = ? ORDER BY id DESC LIMIT 100',
  ).bind(user.id).all<HistoryRecord>();
  return Response.json({ items: result.results });
}

export async function DELETE(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();
  await productivityDb().prepare('DELETE FROM UserQueryHistory WHERE owner_id = ?').bind(user.id).run();
  return Response.json({ success: true });
}
