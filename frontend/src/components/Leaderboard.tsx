'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Crown,
  Medal,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';

import {
  getLeaderboard,
  type LeaderboardEntry,
  type LeaderboardResponse,
} from '../services/api';

const podiumStyles = [
  'border-[#f6c85f]/45 bg-[#f6c85f]/8 text-[#f6c85f]',
  'border-[#b9c3d6]/35 bg-[#b9c3d6]/7 text-[#d7deea]',
  'border-[#c98c63]/40 bg-[#c98c63]/8 text-[#e4a87f]',
];

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'ST'
  );
}

function lastPlayed(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function LeaderboardWorkspace() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getLeaderboard());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The leaderboard could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = data?.entries ?? [];
  const podium = entries.slice(0, 3);

  return (
    <div className="h-full overflow-y-auto bg-[#0b1018]">
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#f6c85f]">
              <Trophy size={15} /> Student rankings
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">
              ApexDB Leaderboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-bright)]">
              Earn points by completing AI quizzes and saving topic-wise PYQ
              practice sessions. A perfect score receives a 20-point bonus.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex w-fit items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-bold text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh rankings
          </button>
        </header>

        {error ? (
          <section className="mt-5 rounded-2xl border border-[color:rgb(255_107_135_/_30%)] bg-[color:rgb(255_107_135_/_7%)] p-5 text-sm text-[#ff9daf]">
            {error}
          </section>
        ) : null}

        {loading && !data ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
              />
            ))}
          </div>
        ) : entries.length ? (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-3">
              {podium.map((entry, index) => (
                <article
                  key={`${entry.rank}-${entry.name}`}
                  className={`relative overflow-hidden rounded-2xl border p-5 ${podiumStyles[index]}`}
                >
                  <div className="absolute right-4 top-4 opacity-70">
                    {index === 0 ? <Crown size={26} /> : <Medal size={24} />}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]">
                    Rank #{entry.rank}
                  </p>
                  <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:rgb(255_255_255_/_8%)] text-sm font-black">
                    {initials(entry.name)}
                  </div>
                  <h2 className="mt-3 truncate text-lg font-bold text-[var(--text)]">
                    {entry.name}
                    {entry.is_current ? (
                      <span className="ml-2 text-xs font-semibold text-[var(--green)]">
                        You
                      </span>
                    ) : null}
                  </h2>
                  <p className="mt-1 text-2xl font-black">{entry.points} pts</p>
                  <p className="mt-2 text-xs text-[var(--muted-bright)]">
                    {entry.accuracy}% accuracy · {entry.quizzes_completed}{' '}
                    sessions
                  </p>
                </article>
              ))}
            </section>

            {data?.current ? (
              <section className="mt-5 grid gap-3 rounded-2xl border border-[color:rgb(72_213_151_/_28%)] bg-[color:rgb(72_213_151_/_6%)] p-4 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Your rank
                  </p>
                  <p className="mt-1 text-xl font-bold text-[var(--green)]">
                    #{data.current.rank}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Points
                  </p>
                  <p className="mt-1 text-xl font-bold text-[var(--text)]">
                    {data.current.points}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Accuracy
                  </p>
                  <p className="mt-1 text-xl font-bold text-[var(--text)]">
                    {data.current.accuracy}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Questions answered
                  </p>
                  <p className="mt-1 text-xl font-bold text-[var(--text)]">
                    {data.current.total_questions}
                  </p>
                </div>
              </section>
            ) : null}

            <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <div>
                  <h2 className="font-bold text-[var(--text)]">All rankings</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Ranked by total points, then correct answers.
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <Users size={14} /> {entries.length} students
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                  <thead className="bg-[var(--surface-raised)] text-xs uppercase tracking-wide text-[var(--muted)]">
                    <tr>
                      <th className="px-5 py-3">Rank</th>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Points</th>
                      <th className="px-5 py-3">Accuracy</th>
                      <th className="px-5 py-3">Sessions</th>
                      <th className="px-5 py-3">Last played</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {entries.map((entry) => (
                      <tr
                        key={`${entry.rank}-${entry.name}`}
                        className={
                          entry.is_current
                            ? 'bg-[color:rgb(72_213_151_/_5%)]'
                            : 'hover:bg-[var(--surface-raised)]'
                        }
                      >
                        <td className="px-5 py-4 font-bold text-[var(--muted-bright)]">
                          #{entry.rank}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:rgb(109_141_255_/_12%)] text-[10px] font-bold text-[var(--blue-bright)]">
                              {initials(entry.name)}
                            </span>
                            <span className="font-semibold text-[var(--text)]">
                              {entry.name}
                              {entry.is_current ? ' (You)' : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-[#f6c85f]">
                          {entry.points}
                        </td>
                        <td className="px-5 py-4 text-[var(--muted-bright)]">
                          {entry.accuracy}%
                        </td>
                        <td className="px-5 py-4 text-[var(--muted-bright)]">
                          {entry.quizzes_completed}
                        </td>
                        <td className="px-5 py-4 text-[var(--muted)]">
                          {lastPlayed(entry.last_played_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : !loading ? (
          <section className="mt-6 rounded-2xl border border-dashed border-[var(--border-bright)] bg-[var(--surface)] px-6 py-14 text-center">
            <Award size={36} className="mx-auto text-[#f6c85f]" />
            <h2 className="mt-4 text-xl font-bold text-[var(--text)]">
              Be the first on the leaderboard
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-bright)]">
              Complete an AI quiz or check at least three topic-wise PYQs, then
              save the session to earn your first points.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function LeaderboardContextPanel() {
  const rules = [
    { icon: CheckCircle2, title: 'Correct answer', text: '+10 points' },
    { icon: Sparkles, title: 'Perfect session', text: '+20 bonus' },
    { icon: Target, title: 'Tie breaker', text: 'More correct answers' },
  ];
  return (
    <aside className="app-mentor overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="rounded-2xl border border-[color:rgb(246_200_95_/_30%)] bg-[color:rgb(246_200_95_/_7%)] p-4">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-[#f6c85f]" />
          <h2 className="font-bold text-[var(--text)]">How scoring works</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-bright)]">
          Quiz results are tied to the signed-in account. Keep practising to
          improve both your points and accuracy.
        </p>
      </div>
      <div className="mt-4 space-y-2">
        {rules.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[#0b1018] p-3"
          >
            <Icon size={16} className="text-[var(--blue-bright)]" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-[var(--text)]">
                {title}
              </p>
              <p className="text-[11px] text-[var(--muted)]">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2 rounded-xl border border-dashed border-[var(--border)] p-3 text-xs leading-5 text-[var(--muted)]">
        <BarChart3 size={15} className="mt-0.5 shrink-0" />
        Rankings refresh whenever this page opens or when Refresh rankings is
        selected.
      </div>
    </aside>
  );
}
