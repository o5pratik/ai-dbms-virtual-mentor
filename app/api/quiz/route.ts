import {
  generateGateQuiz,
  type GateQuizDifficulty,
} from '@/lib/gate-quiz';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/authenticated-user';

const DIFFICULTIES = new Set<GateQuizDifficulty>([
  'Foundation',
  'Standard',
  'Challenging',
]);

export async function POST(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();

  try {
    const payload = (await request.json()) as {
      topic?: unknown;
      difficulty?: unknown;
      count?: unknown;
    };
    const topic =
      typeof payload.topic === 'string' ? payload.topic.trim().slice(0, 120) : '';
    if (topic.length < 2) {
      return Response.json(
        { error: 'Enter a DBMS topic for the quiz.' },
        { status: 400 },
      );
    }

    const difficulty = DIFFICULTIES.has(
      payload.difficulty as GateQuizDifficulty,
    )
      ? (payload.difficulty as GateQuizDifficulty)
      : 'Standard';
    const requestedCount = Number(payload.count);
    const count = Number.isInteger(requestedCount)
      ? Math.min(8, Math.max(3, requestedCount))
      : 5;

    return Response.json(await generateGateQuiz(topic, difficulty, count));
  } catch {
    return Response.json(
      { error: 'The quiz could not be generated. Please try again.' },
      { status: 400 },
    );
  }
}
