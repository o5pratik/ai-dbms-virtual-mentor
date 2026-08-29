import { COLLEGE_SCHEMA_METADATA } from '@/lib/college-schema';

export async function GET() {
  return Response.json(COLLEGE_SCHEMA_METADATA, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
