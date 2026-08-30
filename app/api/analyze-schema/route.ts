import { analyzeDdlSchema } from '@/lib/ddl-schema-analyzer';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { sql?: unknown };
    if (typeof payload.sql !== 'string' || !payload.sql.trim()) return Response.json({ error: 'Enter one or more CREATE TABLE statements.' }, { status: 400 });
    return Response.json(analyzeDdlSchema(payload.sql.slice(0, 50_000)));
  } catch (caught) {
    return Response.json({ error: caught instanceof Error ? caught.message : 'The schema could not be analyzed.' }, { status: 400 });
  }
}
