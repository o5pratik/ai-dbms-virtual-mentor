import { fixSql, type FixMode } from '@/lib/ai-tutor';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      query?: unknown;
      database_error?: unknown;
      mode?: unknown;
      schema?: unknown;
    };
    if (typeof payload.query !== 'string' || !payload.query.trim()) {
      return Response.json(
        { error: 'Enter a SQL query before asking for a fix.' },
        { status: 400 },
      );
    }
    const databaseError =
      typeof payload.database_error === 'string'
        ? payload.database_error.slice(0, 2_000)
        : '';
    const mode: FixMode =
      payload.mode === 'write-lab' ? 'write-lab' : 'playground';
    const schema =
      typeof payload.schema === 'string' ? payload.schema.slice(0, 12_000) : '';
    return Response.json(
      await fixSql(payload.query.slice(0, 10_000), databaseError, mode, schema),
    );
  } catch {
    return Response.json(
      { error: 'The SQL could not be reviewed.' },
      { status: 400 },
    );
  }
}
