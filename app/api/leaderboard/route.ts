import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/authenticated-user';
import { productivityDb } from '@/lib/productivity-store';

type LeaderboardRow = {
  owner_id: string;
  display_name: string;
  total_points: number;
  correct_answers: number;
  total_questions: number;
  quizzes_completed: number;
  last_played_at: string;
};

function rankedEntry(row: LeaderboardRow, rank: number, currentUserId: string) {
  return {
    rank,
    name: row.display_name,
    points: Number(row.total_points),
    correct_answers: Number(row.correct_answers),
    total_questions: Number(row.total_questions),
    quizzes_completed: Number(row.quizzes_completed),
    accuracy: row.total_questions
      ? Math.round(
          (Number(row.correct_answers) / Number(row.total_questions)) * 100,
        )
      : 0,
    last_played_at: row.last_played_at,
    is_current: row.owner_id === currentUserId,
  };
}

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();

  const result = await productivityDb()
    .prepare(
      `SELECT
         attempts.owner_id,
         (SELECT latest.display_name
          FROM QuizLeaderboardAttempt AS latest
          WHERE latest.owner_id = attempts.owner_id
          ORDER BY latest.created_at DESC, latest.id DESC
          LIMIT 1) AS display_name,
         SUM(points) AS total_points,
         SUM(score) AS correct_answers,
         SUM(total) AS total_questions,
         COUNT(*) AS quizzes_completed,
         MAX(created_at) AS last_played_at
       FROM QuizLeaderboardAttempt AS attempts
       GROUP BY attempts.owner_id
       ORDER BY total_points DESC, correct_answers DESC, last_played_at ASC
       LIMIT 100`,
    )
    .all<LeaderboardRow>();

  const entries = result.results.map((row, index) =>
    rankedEntry(row, index + 1, user.id),
  );
  return Response.json({
    entries,
    current: entries.find((entry) => entry.is_current) ?? null,
  });
}

export async function POST(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();

  try {
    const payload = (await request.json()) as {
      mode?: unknown;
      topic?: unknown;
      score?: unknown;
      total?: unknown;
    };
    const mode = payload.mode;
    const topic =
      typeof payload.topic === 'string'
        ? payload.topic.trim().slice(0, 120)
        : '';
    const score = Number(payload.score);
    const total = Number(payload.total);

    if (
      (mode !== 'ai-quiz' &&
        mode !== 'pyq-bank' &&
        mode !== 'competitive-exam') ||
      topic.length < 2 ||
      !Number.isInteger(score) ||
      !Number.isInteger(total) ||
      total < 1 ||
      total > 100 ||
      score < 0 ||
      score > total
    ) {
      return Response.json(
        { error: 'Invalid leaderboard score.' },
        { status: 400 },
      );
    }

    const points = score * 10 + (score === total ? 20 : 0);
    await productivityDb()
      .prepare(
        `INSERT INTO QuizLeaderboardAttempt
           (owner_id, display_name, mode, topic, score, total, points)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(user.id, user.name.slice(0, 80), mode, topic, score, total, points)
      .run();

    return Response.json({ success: true, points });
  } catch {
    return Response.json(
      { error: 'The score could not be saved.' },
      { status: 400 },
    );
  }
}
