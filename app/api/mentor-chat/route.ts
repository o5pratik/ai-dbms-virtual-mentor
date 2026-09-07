import { answerMentorQuestion } from '@/lib/ai-tutor';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/authenticated-user';

export async function POST(request: Request) {
  if (!getAuthenticatedUser(request.headers)) return unauthorizedResponse();

  try {
    const payload = (await request.json()) as {
      question?: unknown;
      current_sql?: unknown;
      schema?: unknown;
      database_error?: unknown;
    };
    if (typeof payload.question !== 'string' || !payload.question.trim()) {
      return Response.json(
        { error: 'Enter a DBMS or SQL question for the AI Mentor.' },
        { status: 400 },
      );
    }

    const currentSql =
      typeof payload.current_sql === 'string'
        ? payload.current_sql.slice(0, 10_000)
        : '';
    const schema =
      typeof payload.schema === 'string' ? payload.schema.slice(0, 12_000) : '';
    const databaseError =
      typeof payload.database_error === 'string'
        ? payload.database_error.slice(0, 2_000)
        : '';

    return Response.json(
      await answerMentorQuestion(
        payload.question.slice(0, 1_500),
        currentSql,
        schema,
        databaseError,
      ),
    );
  } catch {
    return Response.json(
      { error: 'The AI Mentor could not answer that question.' },
      { status: 400 },
    );
  }
}
