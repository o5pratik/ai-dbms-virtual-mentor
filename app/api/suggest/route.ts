import { suggestSql } from '@/lib/ai-tutor';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { current_sql?: unknown; instruction?: unknown };
    const currentSql = typeof payload.current_sql === 'string' ? payload.current_sql.slice(0, 10_000) : '';
    const instruction = typeof payload.instruction === 'string' ? payload.instruction.slice(0, 1_000) : '';
    return Response.json(await suggestSql(currentSql, instruction));
  } catch {
    return Response.json({ error: 'A SQL suggestion could not be generated.' }, { status: 400 });
  }
}
