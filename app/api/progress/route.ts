import { productivityDb } from '@/lib/productivity-store';

export async function GET() {
  const result = await productivityDb().prepare(
    'SELECT topic_id, completed, updated_at FROM LearningProgress ORDER BY topic_id',
  ).all<{ topic_id: string; completed: number; updated_at: string }>();
  return Response.json({ items: result.results });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { topic_id?: unknown; completed?: unknown };
  if (typeof payload.topic_id !== 'string' || typeof payload.completed !== 'boolean') {
    return Response.json({ error: 'A topic and completion state are required.' }, { status: 400 });
  }
  await productivityDb().prepare(
    `INSERT INTO LearningProgress (topic_id, completed, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(topic_id) DO UPDATE SET completed = excluded.completed, updated_at = CURRENT_TIMESTAMP`,
  ).bind(payload.topic_id.slice(0, 80), payload.completed ? 1 : 0).run();
  return Response.json({ success: true });
}
