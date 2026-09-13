import {
  answerMentorQuestion,
  type MentorAnswer,
  type MentorConversationTurn,
} from '@/lib/ai-tutor';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/authenticated-user';
import { productivityDb } from '@/lib/productivity-store';

type MentorConversationRecord = {
  id: number;
  question: string;
  answer: string;
  steps_json: string;
  concepts_json: string;
  example_sql: string;
  caution: string;
  follow_ups_json: string;
  source: MentorAnswer['source'];
  created_at: string;
};

function parseStringList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function presentConversation(record: MentorConversationRecord) {
  return {
    id: record.id,
    question: record.question,
    answer: record.answer,
    steps: parseStringList(record.steps_json),
    concepts: parseStringList(record.concepts_json),
    example_sql: record.example_sql,
    caution: record.caution,
    follow_ups: parseStringList(record.follow_ups_json),
    source: record.source,
    created_at: record.created_at,
  };
}

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();
  const result = await productivityDb()
    .prepare(
      `SELECT id, question, answer, steps_json, concepts_json, example_sql,
              caution, follow_ups_json, source, created_at
       FROM UserMentorConversation
       WHERE owner_id = ?
       ORDER BY id DESC
       LIMIT 20`,
    )
    .bind(user.id)
    .all<MentorConversationRecord>();
  return Response.json({
    items: result.results.reverse().map(presentConversation),
  });
}

export async function POST(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();

  try {
    const payload = (await request.json()) as {
      question?: unknown;
      current_sql?: unknown;
      schema?: unknown;
      database_error?: unknown;
      database_name?: unknown;
    };
    if (typeof payload.question !== 'string' || !payload.question.trim()) {
      return Response.json(
        { error: 'Enter a DBMS or SQL question for the AI Mentor.' },
        { status: 400 },
      );
    }

    const question = payload.question.trim().slice(0, 1_500);
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
    const databaseName =
      typeof payload.database_name === 'string'
        ? payload.database_name.trim().slice(0, 80)
        : 'EditableDB';

    let conversation: MentorConversationTurn[] = [];
    try {
      const history = await productivityDb()
        .prepare(
          `SELECT question, answer
           FROM UserMentorConversation
           WHERE owner_id = ?
           ORDER BY id DESC
           LIMIT 6`,
        )
        .bind(user.id)
        .all<MentorConversationTurn>();
      conversation = history.results.reverse();
    } catch {
      // The mentor still answers if conversation storage is unavailable.
    }
    const answer = await answerMentorQuestion(
      question,
      currentSql,
      schema,
      databaseError,
      conversation,
      databaseName,
    );

    let id: number | null = null;
    try {
      const inserted = await productivityDb()
        .prepare(
          `INSERT INTO UserMentorConversation
             (owner_id, question, answer, steps_json, concepts_json,
              example_sql, caution, follow_ups_json, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          user.id,
          question,
          answer.answer,
          JSON.stringify(answer.steps),
          JSON.stringify(answer.concepts),
          answer.example_sql,
          answer.caution,
          JSON.stringify(answer.follow_ups),
          answer.source,
        )
        .run();
      id = Number(inserted.meta.last_row_id) || null;
      await productivityDb()
        .prepare(
          `DELETE FROM UserMentorConversation
           WHERE owner_id = ?
             AND id NOT IN (
               SELECT id FROM UserMentorConversation
               WHERE owner_id = ?
               ORDER BY id DESC
               LIMIT 50
             )`,
        )
        .bind(user.id, user.id)
        .run();
    } catch {
      // A mentor answer remains useful if history storage is temporarily unavailable.
    }

    return Response.json({
      ...answer,
      id,
      question,
      created_at: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      { error: 'The AI Mentor could not answer that question.' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();
  await productivityDb()
    .prepare('DELETE FROM UserMentorConversation WHERE owner_id = ?')
    .bind(user.id)
    .run();
  return Response.json({ success: true });
}
