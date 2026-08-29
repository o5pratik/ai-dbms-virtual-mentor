import { explainSql } from '@/lib/ai-tutor';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { query?: unknown; result_summary?: unknown };
    if (typeof payload.query !== 'string' || !payload.query.trim()) {
      return Response.json({ error: 'Enter a SQL query before asking for an explanation.' }, { status: 400 });
    }
    const resultSummary = typeof payload.result_summary === 'string' ? payload.result_summary.slice(0, 2_000) : '';
    return Response.json(await explainSql(payload.query.slice(0, 10_000), resultSummary));
  } catch {
    return Response.json({ error: 'The query could not be explained.' }, { status: 400 });
  }
}
