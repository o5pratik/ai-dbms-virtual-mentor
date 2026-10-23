'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

import {
  generateGateQuiz,
  submitLeaderboardScore,
  type GateQuizDifficulty,
  type GateQuizResponse,
} from '../services/api';

const SUGGESTED_TOPICS = [
  'Normalization and functional dependencies',
  'Transactions and serializability',
  'SQL queries and joins',
  'Indexing and hashing',
  'ER model and relational algebra',
];

export function QuizWorkspace({ examMode = false }: { examMode?: boolean }) {
  const [topic, setTopic] = useState(
    'Normalization and functional dependencies',
  );
  const [difficulty, setDifficulty] = useState<GateQuizDifficulty>('Standard');
  const [count, setCount] = useState(examMode ? 20 : 5);
  const [duration, setDuration] = useState(30);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [quiz, setQuiz] = useState<GateQuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leaderboardMessage, setLeaderboardMessage] = useState('');

  useEffect(() => {
    const pendingTopic = window.sessionStorage.getItem('apexdb-quiz-topic');
    if (pendingTopic) {
      setTopic(pendingTopic);
      window.sessionStorage.removeItem('apexdb-quiz-topic');
    }
    const receiveTopic = (event: Event) => {
      const nextTopic = (event as CustomEvent<string>).detail;
      if (nextTopic) setTopic(nextTopic);
    };
    window.addEventListener('gate-quiz-topic', receiveTopic);
    return () => window.removeEventListener('gate-quiz-topic', receiveTopic);
  }, []);

  const answeredCount = Object.keys(answers).length;
  const score = useMemo(
    () =>
      quiz?.questions.reduce(
        (total, question) =>
          total + (answers[question.id] === question.correct_index ? 1 : 0),
        0,
      ) ?? 0,
    [answers, quiz],
  );

  const createQuiz = async () => {
    if (!topic.trim()) {
      setError('Enter a DBMS topic first.');
      return;
    }
    setLoading(true);
    setError('');
    setSubmitted(false);
    setLeaderboardMessage('');
    setAnswers({});
    try {
      const nextQuiz = await generateGateQuiz(topic.trim(), difficulty, count);
      setQuiz(nextQuiz);
      setSecondsRemaining(examMode ? duration * 60 : 0);
    } catch (caught) {
      setQuiz(null);
      setError(
        caught instanceof Error
          ? caught.message
          : 'The quiz could not be generated.',
      );
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async (force = false) => {
    if (
      !quiz ||
      submitted ||
      (!force && !examMode && answeredCount !== quiz.questions.length)
    )
      return;
    setSubmitted(true);
    setLeaderboardMessage('Saving score…');
    try {
      const result = await submitLeaderboardScore({
        mode: examMode ? 'competitive-exam' : 'ai-quiz',
        topic: quiz.topic,
        score,
        total: quiz.questions.length,
      });
      setLeaderboardMessage(`Saved to leaderboard · +${result.points} points`);
    } catch {
      setLeaderboardMessage('Score shown here, but leaderboard saving failed.');
    }
  };

  useEffect(() => {
    if (!examMode || !quiz || submitted) return;
    if (secondsRemaining <= 0) {
      void submitQuiz(true);
      return;
    }
    const timer = window.setTimeout(
      () => setSecondsRemaining((current) => Math.max(0, current - 1)),
      1_000,
    );
    return () => window.clearTimeout(timer);
  }, [examMode, quiz, secondsRemaining, submitted]);

  const formattedTime = `${Math.floor(secondsRemaining / 60)
    .toString()
    .padStart(2, '0')}:${(secondsRemaining % 60).toString().padStart(2, '0')}`;

  return (
    <div className="h-full overflow-y-auto bg-[#0b1018]">
      <div className="mx-auto max-w-5xl px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--violet)]">
              {examMode ? <Clock3 size={15} /> : <BrainCircuit size={15} />}{' '}
              {examMode ? 'Competitive exam mode' : 'AI practice lab'}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">
              {examMode ? 'GATE DBMS Competitive Exam' : 'GATE DBMS Quiz'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-bright)]">
              {examMode
                ? 'Choose a DBMS topic, set the duration, and attempt a timed exam with up to 50 original GATE-style questions. Answers and explanations appear only after submission.'
                : 'Ask the AI for original practice questions based on recurring concepts and reasoning patterns from GATE DBMS previous-year papers. Generate up to 50 fresh questions for any topic.'}
            </p>
          </div>
          {quiz ? (
            <div className="flex items-center gap-2">
              {examMode && !submitted ? (
                <span className="flex items-center gap-1.5 rounded-full border border-[color:rgb(246_200_95_/_30%)] bg-[color:rgb(246_200_95_/_8%)] px-3 py-1.5 font-mono text-xs font-bold text-[#f6c85f]">
                  <Clock3 size={13} /> {formattedTime}
                </span>
              ) : null}
              <span className="w-fit rounded-full border border-[color:rgb(155_124_255_/_30%)] bg-[color:rgb(155_124_255_/_8%)] px-3 py-1.5 text-xs font-semibold text-[#c5b7ff]">
                GATE-style question paper
              </span>
            </div>
          ) : null}
        </header>

        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl lg:p-5">
          <div
            className={`grid gap-4 lg:items-end ${examMode ? 'lg:grid-cols-[1fr_150px_120px_120px_auto]' : 'lg:grid-cols-[1fr_170px_130px_auto]'}`}
          >
            <label className="block">
              <span className="text-xs font-bold text-[var(--muted-bright)]">
                What topic should the AI test?
              </span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void createQuiz();
                }}
                placeholder="e.g. serializability, normalization, SQL joins"
                maxLength={120}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#090e16] px-3.5 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--violet)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[var(--muted-bright)]">
                Difficulty
              </span>
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as GateQuizDifficulty)
                }
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#090e16] px-3 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--violet)]"
              >
                <option>Foundation</option>
                <option>Standard</option>
                <option>Challenging</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[var(--muted-bright)]">
                Questions
              </span>
              <select
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#090e16] px-3 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--violet)]"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
              </select>
            </label>
            {examMode ? (
              <label className="block">
                <span className="text-xs font-bold text-[var(--muted-bright)]">
                  Duration
                </span>
                <select
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#090e16] px-3 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--violet)]"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </label>
            ) : null}
            <button
              type="button"
              onClick={() => void createQuiz()}
              disabled={loading || !topic.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--violet),var(--blue))] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgb(109_141_255_/_20%)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {loading
                ? 'Preparing…'
                : examMode
                  ? 'Start exam'
                  : 'Generate quiz'}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setTopic(suggestion)}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:border-[var(--violet)] hover:text-[var(--text)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
          {error ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-[color:rgb(255_107_135_/_30%)] bg-[color:rgb(255_107_135_/_7%)] p-3 text-sm text-[#ff9daf]">
              <AlertTriangle size={16} className="shrink-0" /> {error}
            </p>
          ) : null}
        </section>

        {!quiz && !loading ? (
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              [
                '1',
                'Choose a topic',
                'Enter any DBMS topic or select a suggested one.',
              ],
              [
                '2',
                examMode ? 'Take the timed exam' : 'Solve the questions',
                examMode
                  ? 'The timer starts when your paper is ready. You can submit with unanswered questions.'
                  : 'Answer original MCQs built around GATE-style reasoning.',
              ],
              [
                '3',
                examMode ? 'Submit and rank' : 'Review explanations',
                'Submit once to see your score, solutions, and leaderboard points.',
              ],
            ].map(([step, title, detail]) => (
              <article
                key={step}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:rgb(155_124_255_/_12%)] text-sm font-bold text-[#c5b7ff]">
                  {step}
                </span>
                <h2 className="mt-4 text-base font-bold text-[var(--text)]">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {detail}
                </p>
              </article>
            ))}
          </section>
        ) : null}

        {quiz ? (
          <div className="mt-6 space-y-4">
            <section className="flex flex-col gap-3 rounded-2xl border border-[color:rgb(109_141_255_/_28%)] bg-[color:rgb(109_141_255_/_6%)] p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold text-[var(--text)]">
                  {quiz.title}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted-bright)]">
                  {quiz.difficulty} · {quiz.questions.length} MCQs ·{' '}
                  {answeredCount}/{quiz.questions.length} answered
                  {examMode && !submitted
                    ? ` · ${formattedTime} remaining`
                    : ''}
                </p>
              </div>
              {submitted ? (
                <div className="flex items-center gap-3 rounded-xl border border-[color:rgb(72_213_151_/_30%)] bg-[color:rgb(72_213_151_/_8%)] px-4 py-2.5">
                  <Trophy size={19} className="text-[var(--green)]" />
                  <div>
                    <p className="text-xs text-[var(--muted)]">Your score</p>
                    <p className="font-bold text-[var(--text)]">
                      {score}/{quiz.questions.length} ·{' '}
                      {Math.round((score / quiz.questions.length) * 100)}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)] sm:w-40">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--violet),var(--blue))] transition-all"
                    style={{
                      width: `${(answeredCount / quiz.questions.length) * 100}%`,
                    }}
                  />
                </div>
              )}
            </section>

            {quiz.questions.map((question, questionIndex) => (
              <article
                key={question.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[#090e16] text-sm font-bold text-[var(--blue-bright)]">
                    {questionIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[color:rgb(155_124_255_/_10%)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c5b7ff]">
                        {question.concept}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        1 mark
                      </span>
                      <span className="flex items-center gap-1 rounded-full border border-[color:rgb(246_200_95_/_28%)] bg-[color:rgb(246_200_95_/_7%)] px-2 py-0.5 text-[10px] font-semibold text-[#f6c85f]">
                        <CalendarDays size={11} />
                        GATE {question.pattern_year}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold leading-7 text-[var(--text)]">
                      {question.question}
                    </h3>
                    <fieldset className="mt-4 space-y-2" disabled={submitted}>
                      <legend className="sr-only">Choose one answer</legend>
                      {question.options.map((option, optionIndex) => {
                        const selected = answers[question.id] === optionIndex;
                        const correct = question.correct_index === optionIndex;
                        const resultClass = submitted
                          ? correct
                            ? 'border-[color:rgb(72_213_151_/_48%)] bg-[color:rgb(72_213_151_/_9%)] text-[var(--text)]'
                            : selected
                              ? 'border-[color:rgb(255_107_135_/_45%)] bg-[color:rgb(255_107_135_/_8%)] text-[var(--text)]'
                              : 'border-[var(--border)] text-[var(--muted)] opacity-70'
                          : selected
                            ? 'border-[var(--blue)] bg-[color:rgb(109_141_255_/_10%)] text-[var(--text)]'
                            : 'border-[var(--border)] text-[var(--muted-bright)] hover:border-[var(--border-bright)] hover:bg-[var(--surface-raised)]';
                        return (
                          <label
                            key={optionIndex}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition ${resultClass}`}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              checked={selected}
                              onChange={() =>
                                setAnswers((current) => ({
                                  ...current,
                                  [question.id]: optionIndex,
                                }))
                              }
                              className="mt-0.5 accent-[var(--blue)]"
                            />
                            <span className="flex-1 leading-5">
                              <strong className="mr-2 font-mono text-xs">
                                {String.fromCharCode(65 + optionIndex)}.
                              </strong>
                              {option}
                            </span>
                            {submitted && correct ? (
                              <Check
                                size={16}
                                className="shrink-0 text-[var(--green)]"
                              />
                            ) : null}
                          </label>
                        );
                      })}
                    </fieldset>
                    {submitted ? (
                      <div className="mt-4 rounded-xl border border-[color:rgb(109_141_255_/_22%)] bg-[#090e16] p-4">
                        <p className="flex items-center gap-2 text-xs font-bold text-[var(--blue-bright)]">
                          <CircleHelp size={15} /> Solution
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-bright)]">
                          {question.explanation}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}

            <section className="sticky bottom-3 flex flex-col gap-3 rounded-2xl border border-[var(--border-bright)] bg-[color:rgb(14_19_29_/_96%)] p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  {submitted
                    ? 'Solutions are now visible above.'
                    : examMode
                      ? `${answeredCount}/${quiz.questions.length} answered · ${formattedTime} remaining`
                      : answeredCount === quiz.questions.length
                        ? 'All questions answered — ready to check.'
                        : `Answer ${quiz.questions.length - answeredCount} more question${quiz.questions.length - answeredCount === 1 ? '' : 's'}.`}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {leaderboardMessage || quiz.note}
                </p>
              </div>
              {submitted ? (
                <button
                  type="button"
                  onClick={() => void createQuiz()}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                >
                  <RefreshCw size={15} /> New questions
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void submitQuiz()}
                  disabled={
                    !examMode && answeredCount !== quiz.questions.length
                  }
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-5 py-2.5 text-sm font-bold text-[#07130e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {examMode ? 'Submit exam' : 'Check answers'}{' '}
                  <ArrowRight size={15} />
                </button>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function QuizContextPanel({ examMode = false }: { examMode?: boolean }) {
  const sendTopic = (topic: string) =>
    window.dispatchEvent(new CustomEvent('gate-quiz-topic', { detail: topic }));

  return (
    <aside className="app-mentor overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="rounded-2xl border border-[color:rgb(155_124_255_/_28%)] bg-[color:rgb(155_124_255_/_7%)] p-4">
        <div className="flex items-center gap-2">
          <BrainCircuit size={18} className="text-[#b9a5ff]" />
          <h2 className="font-bold text-[var(--text)]">
            {examMode ? 'Competitive Exam Rules' : 'AI Quiz Coach'}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-bright)]">
          {examMode
            ? 'Select one DBMS topic, choose up to 50 questions, and set your timer. Unanswered questions are scored as incorrect when time expires.'
            : 'Describe the DBMS topic you want to practise. The AI creates fresh MCQs, scores your answers, and explains every solution.'}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          <Target size={14} /> Popular GATE areas
        </p>
        <div className="mt-3 space-y-2">
          {SUGGESTED_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => sendTopic(topic)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[#0b1018] px-3 py-3 text-left text-sm text-[var(--muted-bright)] hover:border-[var(--violet)] hover:text-[var(--text)]"
            >
              {topic}
              <ArrowRight size={13} className="shrink-0 text-[var(--muted)]" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2 rounded-2xl border border-[color:rgb(72_213_151_/_25%)] bg-[color:rgb(72_213_151_/_5%)] p-4">
        <CheckCircle2
          size={17}
          className="mt-0.5 shrink-0 text-[var(--green)]"
        />
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">
            Practice note
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-bright)]">
            Questions follow GATE DBMS concepts and patterns, but are newly
            generated rather than copied from official papers. A year badge
            names the closest question style—it does not claim the question was
            asked in that year.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          PYQ pattern references
        </p>
        <div className="mt-3 space-y-2 text-xs leading-5">
          <a
            href="https://www.geeksforgeeks.org/dbms/database-management-system-gate-questions/"
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg bg-[#0b1018] px-3 py-2 text-[var(--blue-bright)] hover:underline"
          >
            GeeksforGeeks · Topic-wise GATE DBMS PYQs
          </a>
          <a
            href="https://www.geeksforgeeks.org/quizzes/gate-dbms-sql-relational-algebra-pyq-2010-to-2025/"
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg bg-[#0b1018] px-3 py-2 text-[var(--blue-bright)] hover:underline"
          >
            GeeksforGeeks · SQL & Relational Algebra 2010–2025
          </a>
          <a
            href="https://questions.examside.com/past-years/gate/gate-cse/database-management-system/structured-query-language"
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg bg-[#0b1018] px-3 py-2 text-[var(--blue-bright)] hover:underline"
          >
            ExamSIDE · GATE SQL past-year index
          </a>
        </div>
      </div>
    </aside>
  );
}
