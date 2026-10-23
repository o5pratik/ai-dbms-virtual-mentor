'use client';

import { useMemo, useState } from 'react';
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Filter,
  LibraryBig,
  RotateCcw,
  Shuffle,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

import {
  GATE_PYQ_BANK,
  GATE_PYQ_TOPICS,
  type PyqQuestion,
} from '../data/gate-pyq-bank';
import { submitLeaderboardScore } from '../services/api';

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function PyqBankWorkspace({
  onGenerateMore,
}: {
  onGenerateMore: (topic: string) => void;
}) {
  const [topic, setTopic] = useState('All topics');
  const [search, setSearch] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [limit, setLimit] = useState(12);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  const [scoreMessage, setScoreMessage] = useState('');
  const [order, setOrder] = useState(() =>
    GATE_PYQ_BANK.map((item) => item.id),
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const byId = new Map(GATE_PYQ_BANK.map((item) => [item.id, item]));
    return order
      .map((id) => byId.get(id))
      .filter((item): item is PyqQuestion => Boolean(item))
      .filter((item) => topic === 'All topics' || item.topic === topic)
      .filter(
        (item) =>
          !query ||
          item.question.toLowerCase().includes(query) ||
          item.topic.toLowerCase().includes(query) ||
          String(item.year ?? '').includes(query) ||
          item.paper?.toLowerCase().includes(query),
      );
  }, [order, search, topic]);

  const visible = filtered.slice(0, limit);
  const checkedIds = visible.filter((item) => checked[item.id]);
  const score = checkedIds.filter(
    (item) => answers[item.id] === item.correctIndex,
  ).length;

  const resetPractice = () => {
    setAnswers({});
    setChecked({});
    setLimit(12);
    setSessionSaved(false);
    setScoreMessage('');
  };

  const saveSession = async () => {
    if (checkedIds.length < 3 || sessionSaved) return;
    setSavingScore(true);
    setScoreMessage('');
    try {
      const result = await submitLeaderboardScore({
        mode: 'pyq-bank',
        topic: topic === 'All topics' ? 'Mixed PYQ practice' : topic,
        score,
        total: checkedIds.length,
      });
      setSessionSaved(true);
      setScoreMessage(`Saved · +${result.points} points`);
    } catch {
      setScoreMessage('Could not save this session. Please try again.');
    } finally {
      setSavingScore(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0b1018]">
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-8">
        <header className="border-b border-[var(--border)] pb-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--blue-bright)]">
            <LibraryBig size={15} /> Topic-wise practice bank
          </p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">
                GATE DBMS PYQ Practice
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-bright)]">
                Practise {GATE_PYQ_BANK.length} curated questions with GATE year
                labels plus original GATE-style drills. Check each answer
                instantly and learn from the explanation.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() =>
                  onGenerateMore(
                    topic === 'All topics' ? 'Mixed DBMS topics' : topic,
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--violet),var(--blue))] px-3.5 py-2.5 text-xs font-bold text-white hover:brightness-110"
              >
                <Sparkles size={14} /> Generate more with AI
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrder(shuffled(GATE_PYQ_BANK).map((item) => item.id));
                  resetPractice();
                }}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-xs font-bold text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
              >
                <Shuffle size={14} /> Shuffle
              </button>
              <button
                type="button"
                onClick={resetPractice}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-xs font-bold text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="grid gap-3 md:grid-cols-[240px_1fr_auto] md:items-center">
            <label className="relative">
              <Filter
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <select
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  resetPractice();
                }}
                className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[#090e16] py-2.5 pl-9 pr-8 text-sm text-[var(--text)] outline-none focus:border-[var(--blue)]"
              >
                {GATE_PYQ_TOPICS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
            </label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search concepts or question text…"
              className="w-full rounded-xl border border-[var(--border)] bg-[#090e16] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--blue)]"
            />
            <div className="rounded-xl bg-[color:rgb(109_141_255_/_9%)] px-3.5 py-2.5 text-xs font-semibold text-[var(--blue-bright)]">
              {filtered.length} questions
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {GATE_PYQ_TOPICS.map((item) => {
              const count =
                item === 'All topics'
                  ? GATE_PYQ_BANK.length
                  : GATE_PYQ_BANK.filter((question) => question.topic === item)
                      .length;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setTopic(item);
                    resetPractice();
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${topic === item ? 'border-[var(--blue)] bg-[color:rgb(109_141_255_/_13%)] text-[var(--text)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'}`}
                >
                  {item} · {count}
                </button>
              );
            })}
          </div>
        </section>

        {checkedIds.length ? (
          <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-[color:rgb(72_213_151_/_26%)] bg-[color:rgb(72_213_151_/_6%)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <BookOpenCheck size={17} className="text-[var(--green)]" />
              <span>
                Current score · {score}/{checkedIds.length} correct
              </span>
            </div>
            <div className="flex items-center gap-3">
              {scoreMessage ? (
                <span className="text-xs text-[var(--muted-bright)]">
                  {scoreMessage}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void saveSession()}
                disabled={checkedIds.length < 3 || sessionSaved || savingScore}
                title={
                  checkedIds.length < 3
                    ? 'Check at least three answers first'
                    : 'Save this practice session to the leaderboard'
                }
                className="flex shrink-0 items-center gap-2 rounded-xl bg-[#f6c85f] px-3.5 py-2 text-xs font-bold text-[#1c1606] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Trophy size={14} />
                {savingScore
                  ? 'Saving…'
                  : sessionSaved
                    ? 'Saved'
                    : 'Save to leaderboard'}
              </button>
            </div>
          </section>
        ) : null}

        <div className="mt-5 space-y-4">
          {visible.map((item, index) => {
            const selected = answers[item.id];
            const isChecked = Boolean(checked[item.id]);
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:rgb(109_141_255_/_10%)] text-sm font-bold text-[var(--blue-bright)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[color:rgb(155_124_255_/_10%)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c5b7ff]">
                        {item.topic}
                      </span>
                      {item.kind === 'verified-pyq' && item.year ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={`Reference: ${item.sourceName}`}
                          className="flex items-center gap-1 rounded-full border border-[color:rgb(246_200_95_/_30%)] bg-[color:rgb(246_200_95_/_8%)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#f6c85f] hover:bg-[color:rgb(246_200_95_/_14%)]"
                        >
                          GATE {item.year}
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Original GATE-style · 2010–2025 pattern
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-base font-semibold leading-7 text-[var(--text)]">
                      {item.question}
                    </h2>
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {item.options.map((option, optionIndex) => {
                        const chosen = selected === optionIndex;
                        const correct = item.correctIndex === optionIndex;
                        const state = isChecked
                          ? correct
                            ? 'border-[color:rgb(72_213_151_/_50%)] bg-[color:rgb(72_213_151_/_9%)]'
                            : chosen
                              ? 'border-[color:rgb(255_107_135_/_45%)] bg-[color:rgb(255_107_135_/_8%)]'
                              : 'border-[var(--border)] opacity-65'
                          : chosen
                            ? 'border-[var(--blue)] bg-[color:rgb(109_141_255_/_10%)]'
                            : 'border-[var(--border)] hover:bg-[var(--surface-raised)]';
                        return (
                          <button
                            key={option}
                            type="button"
                            disabled={isChecked || sessionSaved}
                            onClick={() =>
                              setAnswers((current) => ({
                                ...current,
                                [item.id]: optionIndex,
                              }))
                            }
                            className={`flex items-start gap-2 rounded-xl border p-3 text-left text-sm text-[var(--muted-bright)] transition ${state}`}
                          >
                            <strong className="text-[var(--text)]">
                              {String.fromCharCode(65 + optionIndex)}.
                            </strong>
                            <span className="flex-1">{option}</span>
                            {isChecked && correct ? (
                              <Check
                                size={15}
                                className="shrink-0 text-[var(--green)]"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      {isChecked ? (
                        <div className="flex flex-1 gap-2 rounded-xl border border-[color:rgb(109_141_255_/_22%)] bg-[#090e16] p-3 text-sm leading-6 text-[var(--muted-bright)]">
                          <CircleHelp
                            size={16}
                            className="mt-1 shrink-0 text-[var(--blue-bright)]"
                          />
                          <span>{item.explanation}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">
                          Choose one option, then check the answer.
                        </span>
                      )}
                      {!isChecked ? (
                        <button
                          type="button"
                          disabled={selected === undefined || sessionSaved}
                          onClick={() =>
                            setChecked((current) => ({
                              ...current,
                              [item.id]: true,
                            }))
                          }
                          className="shrink-0 rounded-xl bg-[var(--green)] px-4 py-2.5 text-xs font-bold text-[#07130e] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Check answer
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {visible.length < filtered.length ? (
          <button
            type="button"
            onClick={() => setLimit((current) => current + 12)}
            className="mt-5 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-3 text-sm font-bold text-[var(--muted-bright)] hover:border-[var(--blue)] hover:text-[var(--text)]"
          >
            Show 12 more questions
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PyqBankContextPanel({
  onGenerateMore,
}: {
  onGenerateMore: (topic: string) => void;
}) {
  return (
    <aside className="app-mentor overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="rounded-2xl border border-[color:rgb(109_141_255_/_28%)] bg-[color:rgb(109_141_255_/_7%)] p-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-[var(--blue-bright)]" />
          <h2 className="font-bold text-[var(--text)]">PYQ Practice Plan</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-bright)]">
          Start with one topic, answer without notes, and review every
          explanation. Shuffle the bank when repeating a practice session.
        </p>
      </div>
      <button
        type="button"
        onClick={() => onGenerateMore('Mixed DBMS topics')}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--violet),var(--blue))] px-4 py-3 text-sm font-bold text-white hover:brightness-110"
      >
        <Sparkles size={15} /> Generate fresh topic-wise questions
      </button>
      <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          Coverage
        </p>
        <div className="mt-3 space-y-2">
          {GATE_PYQ_TOPICS.slice(1).map((topic) => (
            <div
              key={topic}
              className="flex items-center justify-between rounded-lg bg-[#0b1018] px-3 py-2 text-xs"
            >
              <span className="text-[var(--muted-bright)]">{topic}</span>
              <strong className="text-[var(--blue-bright)]">
                {GATE_PYQ_BANK.filter((item) => item.topic === topic).length}
              </strong>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-3 text-xs leading-5 text-[var(--muted)]">
        Gold badges show the GATE year. Grey badges identify original practice
        questions.
      </p>
      <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          Reference collections
        </p>
        <div className="mt-3 space-y-2">
          {[
            [
              'Topic-wise DBMS PYQs',
              'https://www.geeksforgeeks.org/dbms/database-management-system-gate-questions/',
            ],
            [
              'SQL & RA · 2010–2025',
              'https://www.geeksforgeeks.org/quizzes/gate-dbms-sql-relational-algebra-pyq-2010-to-2025/',
            ],
            [
              'ExamSIDE SQL PYQs',
              'https://questions.examside.com/past-years/gate/gate-cse/database-management-system/structured-query-language',
            ],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg bg-[#0b1018] px-3 py-2 text-xs text-[var(--blue-bright)] hover:underline"
            >
              {label} <ExternalLink size={11} />
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
