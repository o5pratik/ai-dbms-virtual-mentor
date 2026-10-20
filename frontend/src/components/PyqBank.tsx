'use client';

import { useMemo, useState } from 'react';
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  CircleHelp,
  Filter,
  LibraryBig,
  RotateCcw,
  Shuffle,
  Target,
} from 'lucide-react';

import {
  GATE_PYQ_BANK,
  GATE_PYQ_TOPICS,
  type PyqQuestion,
} from '../data/gate-pyq-bank';

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function PyqBankWorkspace() {
  const [topic, setTopic] = useState('All topics');
  const [search, setSearch] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [limit, setLimit] = useState(12);
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
          item.topic.toLowerCase().includes(query),
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
                Practise {GATE_PYQ_BANK.length} carefully paraphrased questions
                organized by the recurring concepts tested in GATE DBMS papers.
                Check each answer instantly and learn from the explanation.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
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
                  setLimit(12);
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
                    setLimit(12);
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
          <section className="mt-4 flex items-center justify-between rounded-2xl border border-[color:rgb(72_213_151_/_26%)] bg-[color:rgb(72_213_151_/_6%)] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <BookOpenCheck size={17} className="text-[var(--green)]" />
              Current score
            </div>
            <strong className="text-[var(--green)]">
              {score}/{checkedIds.length} correct
            </strong>
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
                    <span className="rounded-full bg-[color:rgb(155_124_255_/_10%)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c5b7ff]">
                      {item.topic}
                    </span>
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
                            disabled={isChecked}
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
                          disabled={selected === undefined}
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

export function PyqBankContextPanel() {
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
        These are educational paraphrases and original adaptations of recurring
        GATE DBMS concepts—not verbatim reproductions of official papers.
      </p>
    </aside>
  );
}
