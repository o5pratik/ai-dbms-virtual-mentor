import { analyzeSql } from '@/lib/query-analyzer';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { query?: unknown };
    if (typeof payload.query !== 'string' || !payload.query.trim()) {
      return Response.json({ error: 'Enter a SQL query before analyzing it.' }, { status: 400 });
    }
    return Response.json(analyzeSql(payload.query.slice(0, 10_000)));
  } catch {
    return Response.json({ error: 'The query could not be analyzed.' }, { status: 400 });
  }
}
