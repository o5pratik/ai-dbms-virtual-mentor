import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/authenticated-user';
import { productivityDb, type SavedQueryRecord } from '@/lib/productivity-store';

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();
  const result = await productivityDb().prepare(
    'SELECT id, name, query, created_at FROM UserSavedQuery WHERE owner_id = ? ORDER BY id DESC LIMIT 100',
  ).bind(user.id).all<SavedQueryRecord>();
  return Response.json({ items: result.results });
}

export async function POST(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();
  const payload = (await request.json()) as { name?: unknown; query?: unknown };
  if (typeof payload.name !== 'string' || !payload.name.trim() || typeof payload.query !== 'string' || !payload.query.trim()) {
    return Response.json({ error: 'A name and SQL query are required.' }, { status: 400 });
  }
  const query = payload.query.trim();
  if (query.length > 10_000 || !/^(SELECT|WITH)\b/i.test(query)) {
    return Response.json({ error: 'Only one read-only SELECT or WITH query can be saved.' }, { status: 400 });
  }
  const result = await productivityDb().prepare(
    'INSERT INTO UserSavedQuery (owner_id, name, query) VALUES (?, ?, ?)',
  ).bind(user.id, payload.name.trim().slice(0, 80), query).run();
  return Response.json({ success: true, id: result.meta.last_row_id });
}

export async function DELETE(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();
  const payload = (await request.json()) as { id?: unknown };
  if (typeof payload.id !== 'number') return Response.json({ error: 'A saved-query id is required.' }, { status: 400 });
  await productivityDb().prepare('DELETE FROM UserSavedQuery WHERE id = ? AND owner_id = ?').bind(payload.id, user.id).run();
  return Response.json({ success: true });
}
