import { env } from 'cloudflare:workers';

import { validateReadOnlyQuery } from '@/lib/query-safety';
import { interpretQueryPlan, type RawPlanRow } from '@/lib/sqlite-query-plan';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { query?: unknown };
    const query = validateReadOnlyQuery(payload.query);
    const database = (env as unknown as { DB: D1Database }).DB;
    const result = await database.prepare(`EXPLAIN QUERY PLAN ${query}`).all<RawPlanRow>();
    return Response.json(interpretQueryPlan(result.results ?? []));
  } catch (caught) {
    return Response.json({ error: caught instanceof Error ? caught.message : 'The execution plan could not be generated.' }, { status: 400 });
  }
}
