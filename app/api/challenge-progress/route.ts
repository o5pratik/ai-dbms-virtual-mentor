import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/authenticated-user';
import { productivityDb } from '@/lib/productivity-store';

type SyncEntry = {
  challenge_id?: unknown;
  attempts?: unknown;
  failed_attempts?: unknown;
  passed?: unknown;
  passed_at?: unknown;
};

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();
  const result = await productivityDb()
    .prepare(
      `SELECT challenge_id, attempts, failed_attempts, passed, passed_at, updated_at
       FROM UserChallengeProgress
       WHERE owner_id = ?
       ORDER BY challenge_id`,
    )
    .bind(user.id)
    .all<{
      challenge_id: string;
      attempts: number;
      failed_attempts: number;
      passed: number;
      passed_at: number | null;
      updated_at: string;
    }>();
  return Response.json({ items: result.results });
}

export async function PUT(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();
  const payload = (await request.json()) as { entries?: unknown };
  if (!Array.isArray(payload.entries) || payload.entries.length > 100) {
    return Response.json(
      { error: 'A valid challenge progress list is required.' },
      { status: 400 },
    );
  }

  const entries = payload.entries as SyncEntry[];
  const valid = entries.every(
    (entry) =>
      typeof entry.challenge_id === 'string' &&
      entry.challenge_id.length > 0 &&
      entry.challenge_id.length <= 80 &&
      Number.isInteger(entry.attempts) &&
      Number(entry.attempts) >= 0 &&
      Number.isInteger(entry.failed_attempts) &&
      Number(entry.failed_attempts) >= 0 &&
      Number(entry.failed_attempts) <= Number(entry.attempts) &&
      typeof entry.passed === 'boolean' &&
      (entry.passed_at === null ||
        (typeof entry.passed_at === 'number' &&
          Number.isFinite(entry.passed_at) &&
          entry.passed_at > 0)),
  );
  if (!valid) {
    return Response.json(
      { error: 'One or more challenge progress entries are invalid.' },
      { status: 400 },
    );
  }

  if (entries.length) {
    const statements = entries.map((entry) =>
      productivityDb()
        .prepare(
          `INSERT INTO UserChallengeProgress
             (owner_id, challenge_id, attempts, failed_attempts, passed, passed_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(owner_id, challenge_id) DO UPDATE SET
             attempts = MAX(UserChallengeProgress.attempts, excluded.attempts),
             failed_attempts = MAX(UserChallengeProgress.failed_attempts, excluded.failed_attempts),
             passed = MAX(UserChallengeProgress.passed, excluded.passed),
             passed_at = CASE
               WHEN UserChallengeProgress.passed_at IS NULL THEN excluded.passed_at
               WHEN excluded.passed_at IS NULL THEN UserChallengeProgress.passed_at
               ELSE MIN(UserChallengeProgress.passed_at, excluded.passed_at)
             END,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          user.id,
          String(entry.challenge_id),
          Number(entry.attempts),
          Number(entry.failed_attempts),
          entry.passed ? 1 : 0,
          entry.passed_at === null ? null : Number(entry.passed_at),
        ),
    );
    await productivityDb().batch(statements);
  }
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = getAuthenticatedUser(request.headers);
  if (!user) return unauthorizedResponse();
  await productivityDb().prepare('DELETE FROM UserChallengeProgress WHERE owner_id = ?').bind(user.id).run();
  return Response.json({ success: true });
}
