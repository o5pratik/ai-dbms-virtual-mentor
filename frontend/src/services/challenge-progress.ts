export type ChallengeProgressEntry = {
  attempts: number;
  failedAttempts: number;
  passed: boolean;
  passedAt: number | null;
  lastAttemptAt: number;
};

export type ChallengeProgress = Record<string, ChallengeProgressEntry>;

const CHALLENGE_PROGRESS_KEY = 'ai-dbms-mentor:challenge-progress:v1';
let memoryProgress: ChallengeProgress | null = null;

export function loadChallengeProgress(): ChallengeProgress {
  if (memoryProgress) return memoryProgress;
  try {
    const stored = localStorage.getItem(CHALLENGE_PROGRESS_KEY);
    if (!stored) {
      memoryProgress = {};
      return memoryProgress;
    }
    const parsed = JSON.parse(stored) as Record<
      string,
      Partial<ChallengeProgressEntry>
    >;
    memoryProgress = Object.fromEntries(
      Object.entries(parsed).flatMap(([challengeId, entry]) =>
        Number.isInteger(entry.attempts) &&
        Number(entry.attempts) > 0 &&
        typeof entry.passed === 'boolean' &&
        typeof entry.lastAttemptAt === 'number'
          ? [
              [
                challengeId,
                {
                  attempts: Number(entry.attempts),
                  failedAttempts:
                    typeof entry.failedAttempts === 'number' &&
                    entry.failedAttempts >= 0
                      ? Math.floor(entry.failedAttempts)
                      : entry.passed
                        ? Math.max(0, Number(entry.attempts) - 1)
                        : Number(entry.attempts),
                  passed: entry.passed,
                  passedAt:
                    typeof entry.passedAt === 'number' ? entry.passedAt : null,
                  lastAttemptAt: entry.lastAttemptAt,
                },
              ],
            ]
          : [],
      ),
    );
    return memoryProgress;
  } catch {
    memoryProgress = {};
    return memoryProgress;
  }
}

export function recordChallengeAttempt(
  challengeId: string,
  passed: boolean,
): ChallengeProgress {
  const progress = loadChallengeProgress();
  const previous = progress[challengeId];
  const attemptedAt = Date.now();
  const nextPassed = Boolean(previous?.passed || passed);
  const next = {
    ...progress,
    [challengeId]: {
      attempts: (previous?.attempts ?? 0) + 1,
      failedAttempts: (previous?.failedAttempts ?? 0) + (passed ? 0 : 1),
      passed: nextPassed,
      passedAt: previous?.passedAt ?? (passed ? attemptedAt : null),
      lastAttemptAt: attemptedAt,
    },
  } satisfies ChallengeProgress;
  memoryProgress = next;
  try {
    localStorage.setItem(CHALLENGE_PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // Progress remains available for the current page when storage is blocked.
  }
  return next;
}

export function clearChallengeProgress(): ChallengeProgress {
  memoryProgress = {};
  try {
    localStorage.removeItem(CHALLENGE_PROGRESS_KEY);
  } catch {
    // Clearing remains reflected in the current page when storage is blocked.
  }
  return memoryProgress;
}
