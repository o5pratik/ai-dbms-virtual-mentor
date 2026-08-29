'use client';

import { useCallback, useState } from 'react';
import { Bell, Bot, CheckCircle2, ChevronDown, CircleHelp, Eraser, Lightbulb, Play, Sparkles, WandSparkles } from 'lucide-react';

import { executeQuery, type QueryResponse } from '../services/api';
import { ResultsPanel } from './ResultsPanel';
import { Sidebar } from './Sidebar';
import { SqlEditor } from './SqlEditor';

const STARTER_QUERY = `SELECT s.name, c.course_name, e.semester
FROM Student AS s
JOIN Enrollment AS e ON s.student_id = e.student_id
JOIN Course AS c ON e.course_id = c.course_id
WHERE e.semester = 4
ORDER BY s.name;`;

export function MentorWorkspace() {
  const [query, setQuery] = useState(STARTER_QUERY);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const runQuery = useCallback(async () => {
    if (!query.trim() || running) return;
    setRunning(true);
    setError(null);
    try {
      setResult(await executeQuery(query));
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : 'The query could not be executed.');
    } finally {
      setRunning(false);
    }
  }, [query, running]);

  const clearEditor = () => {
    setQuery('');
    setResult(null);
    setError(null);
  };

  return (
    <main className="mentor-grid">
      <header className="app-header panel-shadow flex items-center justify-between border-b border-[var(--border)] bg-[color:rgb(14_19_29_/_94%)] px-4 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--blue),var(--violet))] shadow-[0_6px_18px_rgb(109_141_255_/_25%)]">
              <span className="font-mono text-[12px] font-black tracking-[-0.18em] text-white">{'{}'}</span>
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-bold tracking-tight">AI DBMS Virtual Mentor</p>
              <p className="text-[10px] text-[var(--muted)]">Learn SQL by doing</p>
            </div>
          </div>
          <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />
          <button type="button" className="hidden items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-[11px] text-[var(--muted-bright)] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" /> CollegeDB <ChevronDown size={12} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" title="Help" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"><CircleHelp size={16} /></button>
          <button type="button" title="Notifications" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)]"><Bell size={16} /></button>
          <div className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--blue),var(--violet))] text-[10px] font-bold">ST</div>
        </div>
      </header>

      <Sidebar />

      <section className="app-workspace flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0b1018]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={runQuery} disabled={running || !query.trim()} className="flex items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),#806dff)] px-3.5 py-2 text-xs font-bold text-white shadow-[0_5px_16px_rgb(109_141_255_/_20%)] transition disabled:cursor-not-allowed disabled:opacity-50">
              <Play size={13} fill="currentColor" /> {running ? 'Running…' : 'Run'}
              <kbd className="ml-1 rounded border border-white/20 bg-black/10 px-1 py-0.5 font-mono text-[9px] font-medium">Ctrl ↵</kbd>
            </button>
            <div className="mx-1 h-5 w-px bg-[var(--border)]" />
            {[
              { label: 'Explain', icon: Sparkles },
              { label: 'AI Suggest', icon: Lightbulb },
              { label: 'Fix error', icon: WandSparkles },
            ].map(({ label, icon: Icon }) => (
              <button key={label} type="button" disabled title={`${label} — available in Phase 2`} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted)] opacity-60 md:flex"><Icon size={14} /> {label}</button>
            ))}
          </div>
          <button type="button" onClick={clearEditor} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"><Eraser size={14} /> Clear</button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center border-b border-[var(--border)] bg-[#0c111a] px-4 text-[11px]">
            <span className="flex h-full items-center border-b-2 border-[var(--blue)] px-2 font-mono text-[var(--muted-bright)]"><span className="mr-2 h-2 w-2 rounded-sm bg-[var(--blue)]" />query.sql</span>
            <span className="ml-auto text-[10px] text-[var(--muted)]">SQLite · read-only sandbox</span>
          </div>
          <SqlEditor value={query} onChange={setQuery} onRun={runQuery} />
          <ResultsPanel result={result} error={error} running={running} />
        </div>
      </section>

      <aside className="app-mentor panel-shadow overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:rgb(155_124_255_/_13%)] text-[#b9a5ff]"><Bot size={17} /></div>
            <div><p className="text-xs font-bold">AI Mentor</p><p className="text-[10px] text-[var(--muted)]">Phase 2 preview</p></div>
          </div>
          <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">Soon</span>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold"><Sparkles size={14} className="text-[#b9a5ff]" /> Query explanation</div>
          <p className="mt-3 text-xs leading-5 text-[var(--muted-bright)]">This query connects students to their enrollments and courses, keeps semester 4 records, then sorts the result by student name.</p>
          <div className="mt-4 space-y-2.5">
            {['Join Student with Enrollment', 'Join Enrollment with Course', 'Filter semester = 4', 'Sort by student name'].map((step, index) => (
              <div key={step} className="flex items-start gap-2.5 text-[11px] text-[var(--muted)]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border-bright)] bg-[var(--surface-muted)] font-mono text-[9px] text-[var(--blue-bright)]">{index + 1}</span><span className="pt-0.5">{step}</span></div>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Concepts used</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['SELECT', 'JOIN', 'WHERE', 'ORDER BY'].map((concept) => <span key={concept} className="rounded-md border border-[color:rgb(109_141_255_/_18%)] bg-[color:rgb(109_141_255_/_8%)] px-2 py-1 font-mono text-[10px] text-[var(--blue-bright)]">{concept}</span>)}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-[var(--border-bright)] p-3 text-[11px] leading-4 text-[var(--muted)]"><CheckCircle2 size={15} className="shrink-0 text-[var(--green)]" /> The live SQL playground is ready. AI actions will connect here next.</div>
      </aside>
    </main>
  );
}
