'use client';

/* oxlint-disable next/no-html-link-for-pages -- SIWC sign-out must use a top-level browser navigation. */

import { useCallback, useEffect, useState } from 'react';
import {
  AlignLeft,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Database,
  Download,
  Eraser,
  FileText,
  Lightbulb,
  LogOut,
  Moon,
  PencilLine,
  Play,
  Save as SaveIcon,
  Sparkles,
  Sun,
  Users,
  WandSparkles,
  Workflow,
} from 'lucide-react';
import Image from 'next/image';

import {
  analyzeQuery,
  analyzeSchema,
  clearHistory,
  deleteSavedQuery,
  executeQuery,
  explainQuery,
  fixQuery,
  getHistory,
  getProgress,
  getQueryPlan,
  getSavedQueries,
  getSchema,
  saveQuery,
  setTopicProgress,
  suggestQuery,
  type HistoryItem,
  type ProgressItem,
  type QueryAnalysis,
  type QueryPlanResponse,
  type QueryResponse,
  type SavedQueryItem,
  type SchemaResponse,
} from '../services/api';
import { formatSql } from '../services/sql-intelligence';
import { ErDiagram } from './ErDiagram';
import { MentorPanel, type MentorView } from './MentorPanel';
import {
  GuideContextPanel,
  HelpPage,
  LearnPage,
  TeamPage,
} from './ProjectGuide';
import {
  ProductivityContextPanel,
  ProductivityWorkspace,
} from './ProductivityWorkspace';
import { ResultsPanel, type ResultTab } from './ResultsPanel';
import {
  SchemaContextPanel,
  SchemaExplorer,
  SchemaLoading,
} from './SchemaExplorer';
import { SchemaLab, SchemaLabContextPanel } from './SchemaLab';
import { Sidebar, type WorkspaceView } from './Sidebar';
import { SqlEditor } from './SqlEditor';
import { WriteLab, WriteLabContextPanel } from './WriteLab';

const STARTER_QUERY = `SELECT s.name, c.course_name, e.semester
FROM Student AS s
JOIN Enrollment AS e ON s.student_id = e.student_id
JOIN Course AS c ON e.course_id = c.course_id
WHERE e.semester = 4
ORDER BY s.name;`;

export function MentorWorkspace({
  user,
}: {
  user: { email: string; name: string };
}) {
  const [query, setQuery] = useState(STARTER_QUERY);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [analysis, setAnalysis] = useState<QueryAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [queryPlan, setQueryPlan] = useState<QueryPlanResponse | null>(null);
  const [queryPlanError, setQueryPlanError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>('output');
  const [instruction, setInstruction] = useState('');
  const [mentorView, setMentorView] = useState<MentorView>({ kind: 'welcome' });
  const [activeView, setActiveView] = useState<WorkspaceView>('playground');
  const [playgroundMode, setPlaygroundMode] = useState<'query' | 'edit'>(
    'edit',
  );
  const [selectedTable, setSelectedTable] = useState('Student');
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [schemaError, setSchemaError] = useState('');
  const [customSchema, setCustomSchema] = useState<SchemaResponse | null>(null);
  const [customSchemaLoading, setCustomSchemaLoading] = useState(false);
  const [customSchemaError, setCustomSchemaError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saved, setSaved] = useState<SavedQueryItem[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [productivityLoading, setProductivityLoading] = useState(false);
  const [productivityLoaded, setProductivityLoaded] = useState(false);
  const [dayMode, setDayMode] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dayMode ? 'light' : 'dark';
    document.documentElement.style.colorScheme = dayMode ? 'light' : 'dark';
  }, [dayMode]);

  const refreshProductivity = useCallback(async (showLoading = false) => {
    if (showLoading) setProductivityLoading(true);
    try {
      const [nextHistory, nextSaved, nextProgress] = await Promise.all([
        getHistory(),
        getSavedQueries(),
        getProgress(),
      ]);
      setHistory(nextHistory);
      setSaved(nextSaved);
      setProgress(nextProgress);
      setProductivityLoaded(true);
    } catch {
      setProductivityLoaded(true);
    } finally {
      if (showLoading) setProductivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((activeView !== 'schema' && activeView !== 'er') || schema) return;
    let cancelled = false;
    getSchema()
      .then((data) => {
        if (!cancelled) setSchema(data);
      })
      .catch((caught) => {
        if (!cancelled)
          setSchemaError(
            caught instanceof Error
              ? caught.message
              : 'The schema could not be loaded.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [activeView, schema]);

  useEffect(() => {
    const productivityView = [
      'dashboard',
      'history',
      'saved',
      'analytics',
      'topics',
    ].includes(activeView);
    if (!productivityView || productivityLoaded) return;
    queueMicrotask(() => void refreshProductivity(true));
  }, [activeView, productivityLoaded, refreshProductivity]);

  const runQuery = async () => {
    if (!query.trim() || running) return;
    setRunning(true);
    setError(null);
    setResultTab('output');
    try {
      setResult(await executeQuery(query));
    } catch (caught) {
      setResult(null);
      setError(
        caught instanceof Error
          ? caught.message
          : 'The query could not be executed.',
      );
    } finally {
      setRunning(false);
      void refreshProductivity();
    }
  };

  const clearEditor = () => {
    setQuery('');
    setResult(null);
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setQueryPlan(null);
    setQueryPlanError(null);
    setResultTab('output');
    setMentorView({ kind: 'welcome' });
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setResult(null);
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setQueryPlan(null);
    setQueryPlanError(null);
    setResultTab('output');
    if (mentorView.kind === 'fix' || mentorView.kind === 'error')
      setMentorView({ kind: 'welcome' });
  };

  const mentorError = (caught: unknown) => {
    setMentorView({
      kind: 'error',
      message:
        caught instanceof Error
          ? caught.message
          : 'The AI Mentor could not complete that request.',
    });
  };

  const explainCurrentQuery = async () => {
    if (!query.trim()) return;
    setMentorView({ kind: 'loading', label: 'Explaining your query' });
    try {
      const resultSummary = result
        ? `${result.row_count} rows; columns: ${result.columns.join(', ')}`
        : '';
      setMentorView({
        kind: 'explanation',
        data: await explainQuery(query, resultSummary),
      });
    } catch (caught) {
      mentorError(caught);
    }
  };

  const suggestCurrentQuery = async (request = '') => {
    setMentorView({
      kind: 'loading',
      label: request ? 'Turning your request into SQL' : 'Improving your SQL',
    });
    try {
      setMentorView({
        kind: 'suggestion',
        data: await suggestQuery(query, request),
      });
      if (request) setInstruction('');
    } catch (caught) {
      mentorError(caught);
    }
  };

  const fixCurrentQuery = async () => {
    if (!query.trim()) return;
    setMentorView({ kind: 'loading', label: 'Checking and correcting SQL' });
    try {
      setMentorView({ kind: 'fix', data: await fixQuery(query, error ?? '') });
    } catch (caught) {
      mentorError(caught);
    }
  };

  const analyzeCurrentQuery = async () => {
    if (!query.trim() || analysisLoading) return;
    setResultTab('plan');
    setAnalysisLoading(true);
    setAnalysisError(null);
    setQueryPlanError(null);
    const [logicalResult, planResult] = await Promise.allSettled([
      analyzeQuery(query),
      getQueryPlan(query),
    ]);
    if (logicalResult.status === 'fulfilled') setAnalysis(logicalResult.value);
    else {
      setAnalysis(null);
      setAnalysisError(
        logicalResult.reason instanceof Error
          ? logicalResult.reason.message
          : 'The learning flow could not be generated.',
      );
    }
    if (planResult.status === 'fulfilled') setQueryPlan(planResult.value);
    else {
      setQueryPlan(null);
      setQueryPlanError(
        planResult.reason instanceof Error
          ? planResult.reason.message
          : 'SQLite could not generate an execution plan.',
      );
    }
    setAnalysisLoading(false);
  };

  const analyzeCustomSchema = async (sql: string) => {
    setCustomSchemaLoading(true);
    setCustomSchemaError('');
    try {
      const nextSchema = await analyzeSchema(sql);
      setCustomSchema(nextSchema);
      setSelectedTable(nextSchema.tables[0]?.name ?? '');
    } catch (caught) {
      setCustomSchema(null);
      setCustomSchemaError(
        caught instanceof Error
          ? caught.message
          : 'The schema could not be analyzed.',
      );
    } finally {
      setCustomSchemaLoading(false);
    }
  };

  const applyMentorSql = (sql: string) => {
    setQuery(sql);
    setResult(null);
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setQueryPlan(null);
    setQueryPlanError(null);
    setResultTab('output');
    setMentorView({ kind: 'welcome' });
  };

  const openInPlayground = (sql: string) => {
    setQuery(sql);
    setResult(null);
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setQueryPlan(null);
    setQueryPlanError(null);
    setResultTab('output');
    setMentorView({ kind: 'welcome' });
    setPlaygroundMode('query');
    setActiveView('playground');
  };

  const explainLessonQuery = async (sql: string) => {
    setQuery(sql);
    setResult(null);
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setQueryPlan(null);
    setQueryPlanError(null);
    setResultTab('output');
    setPlaygroundMode('query');
    setActiveView('playground');
    setMentorView({ kind: 'loading', label: 'Explaining this lesson example' });
    try {
      setMentorView({
        kind: 'explanation',
        data: await explainQuery(sql, 'Learning-path example'),
      });
    } catch (caught) {
      mentorError(caught);
    }
  };

  const saveSql = async (sql: string, requestedName?: string) => {
    const table = sql.match(/\bFROM\s+([A-Za-z_]\w*)/i)?.[1] ?? 'SQL';
    await saveQuery(requestedName ?? `${table} query ${saved.length + 1}`, sql);
    await refreshProductivity();
  };

  const removeSaved = async (id: number) => {
    await deleteSavedQuery(id);
    await refreshProductivity();
  };

  const removeHistory = async () => {
    await clearHistory();
    await refreshProductivity();
  };

  const toggleTopic = async (topicId: string, completed: boolean) => {
    await setTopicProgress(topicId, completed);
    await refreshProductivity();
  };

  const exportResult = (format: 'csv' | 'json') => {
    if (!result) return;
    const records = result.rows.map((row) =>
      Object.fromEntries(
        result.columns.map((column, index) => [column, row[index]]),
      ),
    );
    const content =
      format === 'json'
        ? JSON.stringify(records, null, 2)
        : [result.columns, ...result.rows]
            .map((row) =>
              row
                .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
                .join(','),
            )
            .join('\n');
    const url = URL.createObjectURL(
      new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `collegedb-results.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const completedTopics = new Set(
    progress.filter((item) => item.completed).map((item) => item.topic_id),
  );
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'ST';
  const schemaView = activeView === 'schema' || activeView === 'er';
  const navigateTo = (view: WorkspaceView) => {
    if (
      (view === 'schema' || view === 'er') &&
      !['Student', 'Course', 'Teacher', 'Department', 'Enrollment'].includes(
        selectedTable,
      )
    )
      setSelectedTable('Student');
    setActiveView(view);
  };
  const guideView = ['learn', 'team', 'help'].includes(activeView);
  const requestReport = (format: 'pdf' | 'doc' | 'txt') => {
    const dispatch = () =>
      window.dispatchEvent(
        new CustomEvent('write-lab-download', { detail: format }),
      );
    if (
      activeView === 'write-lab' ||
      (activeView === 'playground' && playgroundMode === 'edit')
    ) {
      dispatch();
      return;
    }
    setPlaygroundMode('edit');
    setActiveView('playground');
    window.setTimeout(dispatch, 200);
  };

  return (
    <main className="mentor-grid">
      <header className="app-header panel-shadow flex items-center justify-between border-b border-[var(--border)] bg-[color:rgb(14_19_29_/_94%)] px-4 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] border border-[color:rgb(109_141_255_/_24%)] bg-[#080d18] shadow-[0_6px_18px_rgb(109_141_255_/_18%)]">
              <Image
                src="/apexdb-logo.png"
                alt=""
                width={36}
                height={36}
                unoptimized
                className="h-full w-full object-contain p-0.5"
              />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-bold tracking-tight">
                ApexDB Mentor
              </p>
              <p className="text-[10px] text-[var(--muted)]">
                Team Apex · Learn SQL by doing
              </p>
            </div>
          </div>
          <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />
          <div className="hidden items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-xs text-[var(--muted-bright)] sm:flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${guideView ? 'bg-[var(--violet)]' : activeView === 'write-lab' || (activeView === 'playground' && playgroundMode === 'edit') ? 'bg-[var(--green)]' : 'bg-[var(--blue)]'}`}
            />
            {guideView
              ? 'Project guide'
              : activeView === 'write-lab' ||
                  (activeView === 'playground' && playgroundMode === 'edit')
                ? 'ProgramDB'
                : 'CollegeDB reference'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <nav
            className="mr-1 flex items-center gap-0.5"
            aria-label="Project pages"
          >
            <button
              type="button"
              title="Learn"
              onClick={() => navigateTo('learn')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold ${activeView === 'learn' ? 'bg-[color:rgb(109_141_255_/_14%)] text-[var(--blue-bright)]' : 'text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'}`}
            >
              <BookOpen size={14} />
              <span className="hidden sm:inline">Learn</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('team')}
              className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold lg:flex ${activeView === 'team' ? 'bg-[color:rgb(109_141_255_/_14%)] text-[var(--blue-bright)]' : 'text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'}`}
            >
              <Users size={14} /> Developed By
            </button>
            <button
              type="button"
              onClick={() => navigateTo('help')}
              className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold lg:flex ${activeView === 'help' ? 'bg-[color:rgb(109_141_255_/_14%)] text-[var(--blue-bright)]' : 'text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'}`}
            >
              <CircleHelp size={14} /> Help
            </button>
          </nav>
          <details className="group relative">
            <summary
              className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
              title="Download execution report"
            >
              <Download size={15} />
              <span className="hidden lg:inline">Download</span>
              <ChevronDown
                size={12}
                className="transition group-open:rotate-180"
              />
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl">
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Execution report
              </p>
              {[
                ['pdf', 'PDF / Print'],
                ['doc', 'Document (.doc)'],
                ['txt', 'Text (.txt)'],
              ].map(([format, label]) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => requestReport(format as 'pdf' | 'doc' | 'txt')}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                >
                  <FileText size={14} className="text-[var(--blue-bright)]" />
                  {label}
                </button>
              ))}
            </div>
          </details>
          <button
            type="button"
            onClick={() => setDayMode((current) => !current)}
            aria-label={dayMode ? 'Switch to night mode' : 'Switch to day mode'}
            title={dayMode ? 'Night mode' : 'Day mode'}
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
          >
            {dayMode ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <div className="ml-2 hidden text-right sm:block">
            <p className="max-w-36 truncate text-[10px] font-semibold">
              {user.name}
            </p>
            <p className="max-w-36 truncate text-[9px] text-[var(--muted)]">
              {user.email}
            </p>
          </div>
          <div
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--blue),var(--violet))] text-[10px] font-bold"
            title={user.email}
          >
            {initials}
          </div>
          <a
            href="/signout-with-chatgpt?return_to=/"
            target="_top"
            title="Sign out"
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
          >
            <LogOut size={15} />
          </a>
        </div>
      </header>

      <Sidebar activeView={activeView} onNavigate={navigateTo} />

      {activeView === 'learn' ? (
        <section className="app-workspace min-h-0 min-w-0 overflow-hidden">
          <LearnPage />
        </section>
      ) : activeView === 'team' ? (
        <section className="app-workspace min-h-0 min-w-0 overflow-hidden">
          <TeamPage />
        </section>
      ) : activeView === 'help' ? (
        <section className="app-workspace min-h-0 min-w-0 overflow-hidden">
          <HelpPage />
        </section>
      ) : activeView === 'playground' ? (
        <section className="app-workspace flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0b1018]">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[#0c111a] px-4 py-2">
            <div
              className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1"
              aria-label="Playground database mode"
            >
              <button
                type="button"
                onClick={() => setPlaygroundMode('edit')}
                aria-pressed={playgroundMode === 'edit'}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${playgroundMode === 'edit' ? 'bg-[var(--green)] text-[#07130e]' : 'text-[var(--muted-bright)] hover:text-[var(--text)]'}`}
              >
                <PencilLine size={13} /> Editable SQL
              </button>
              <button
                type="button"
                onClick={() => setPlaygroundMode('query')}
                aria-pressed={playgroundMode === 'query'}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${playgroundMode === 'query' ? 'bg-[var(--blue)] text-white' : 'text-[var(--muted-bright)] hover:text-[var(--text)]'}`}
              >
                <Database size={13} /> CollegeDB reference
              </button>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {playgroundMode === 'query'
                ? 'Read-only examples and reference data'
                : 'Write, run, and visualize your own SQLite program'}
            </p>
          </div>
          {playgroundMode === 'query' ? (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={runQuery}
                    disabled={running || !query.trim()}
                    className="flex items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),#806dff)] px-3.5 py-2 text-xs font-bold text-white shadow-[0_5px_16px_rgb(109_141_255_/_20%)] transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play size={13} fill="currentColor" />{' '}
                    {running ? 'Running…' : 'Run'}
                    <kbd className="ml-1 rounded border border-white/20 bg-black/10 px-1 py-0.5 font-mono text-[9px] font-medium">
                      Ctrl ↵
                    </kbd>
                  </button>
                  <div className="mx-1 h-5 w-px bg-[var(--border)]" />
                  <button
                    type="button"
                    onClick={analyzeCurrentQuery}
                    disabled={!query.trim() || analysisLoading}
                    className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"
                  >
                    <Workflow size={14} />{' '}
                    {analysisLoading ? 'Analyzing…' : 'Analyze'}
                  </button>
                  <button
                    type="button"
                    onClick={() => changeQuery(formatSql(query))}
                    disabled={!query.trim()}
                    className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 lg:flex"
                    title="Format SQL (Shift + Alt + F)"
                  >
                    <AlignLeft size={14} /> Format
                  </button>
                  <button
                    type="button"
                    onClick={explainCurrentQuery}
                    disabled={!query.trim() || mentorView.kind === 'loading'}
                    className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"
                  >
                    <Sparkles size={14} /> Explain
                  </button>
                  <button
                    type="button"
                    onClick={() => suggestCurrentQuery()}
                    disabled={mentorView.kind === 'loading'}
                    className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"
                  >
                    <Lightbulb size={14} /> AI Suggest
                  </button>
                  <button
                    type="button"
                    onClick={fixCurrentQuery}
                    disabled={!query.trim() || mentorView.kind === 'loading'}
                    className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"
                  >
                    <WandSparkles size={14} /> Fix error
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => saveSql(query)}
                    disabled={!query.trim()}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40"
                  >
                    <SaveIcon size={14} /> Save
                  </button>
                  <button
                    type="button"
                    onClick={clearEditor}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                  >
                    <Eraser size={14} /> Clear
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex h-9 shrink-0 items-center border-b border-[var(--border)] bg-[#0c111a] px-4 text-[11px]">
                  <span className="flex h-full items-center border-b-2 border-[var(--blue)] px-2 font-mono text-[var(--muted-bright)]">
                    <span className="mr-2 h-2 w-2 rounded-sm bg-[var(--blue)]" />
                    query.sql
                  </span>
                  <span className="ml-auto text-[10px] text-[var(--muted)]">
                    SQLite · autocomplete · live diagnostics
                  </span>
                </div>
                <SqlEditor
                  value={query}
                  onChange={changeQuery}
                  onRun={runQuery}
                  onFormat={() => changeQuery(formatSql(query))}
                />
                <ResultsPanel
                  result={result}
                  error={error}
                  running={running}
                  analysis={analysis}
                  analysisLoading={analysisLoading}
                  analysisError={analysisError}
                  queryPlan={queryPlan}
                  queryPlanError={queryPlanError}
                  activeTab={resultTab}
                  onTabChange={setResultTab}
                  onAnalyze={analyzeCurrentQuery}
                  onFix={fixCurrentQuery}
                  onExportCsv={() => exportResult('csv')}
                  onExportJson={() => exportResult('json')}
                />
              </div>
            </>
          ) : (
            <WriteLab />
          )}
        </section>
      ) : activeView === 'write-lab' ? (
        <section className="app-workspace flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0b1018]">
          <WriteLab />
        </section>
      ) : activeView === 'schema-lab' ? (
        <section className="app-workspace flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0b1018]">
          <SchemaLab
            analysis={customSchema}
            loading={customSchemaLoading}
            error={customSchemaError}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            onAnalyze={analyzeCustomSchema}
          />
        </section>
      ) : schemaView ? (
        <section className="app-workspace flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0b1018]">
          {schema ? (
            activeView === 'schema' ? (
              <SchemaExplorer
                schema={schema}
                selectedTable={selectedTable}
                onSelectTable={setSelectedTable}
                onOpenQuery={openInPlayground}
              />
            ) : (
              <ErDiagram
                schema={schema}
                selectedTable={selectedTable}
                onSelectTable={setSelectedTable}
              />
            )
          ) : (
            <SchemaLoading error={schemaError} />
          )}
        </section>
      ) : (
        <section className="app-workspace flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0b1018]">
          <ProductivityWorkspace
            activeView={activeView}
            history={history}
            saved={saved}
            completedTopics={completedTopics}
            loading={productivityLoading}
            onNavigate={navigateTo}
            onRunQuery={openInPlayground}
            onExplainQuery={explainLessonQuery}
            onSaveQuery={saveSql}
            onDeleteSaved={removeSaved}
            onClearHistory={removeHistory}
            onToggleTopic={toggleTopic}
          />
        </section>
      )}

      {guideView ? (
        <GuideContextPanel
          activeView={activeView as 'learn' | 'team' | 'help'}
          onNavigate={navigateTo}
        />
      ) : activeView === 'playground' ? (
        playgroundMode === 'edit' ? (
          <WriteLabContextPanel />
        ) : (
          <MentorPanel
            view={mentorView}
            instruction={instruction}
            onInstructionChange={setInstruction}
            onAsk={() => suggestCurrentQuery(instruction)}
            onApply={applyMentorSql}
            onReject={() => setMentorView({ kind: 'welcome' })}
          />
        )
      ) : activeView === 'write-lab' ? (
        <WriteLabContextPanel />
      ) : activeView === 'schema-lab' ? (
        <SchemaLabContextPanel schema={customSchema} />
      ) : schemaView ? (
        schema ? (
          <SchemaContextPanel schema={schema} selectedTable={selectedTable} />
        ) : (
          <aside className="app-mentor border-l border-[var(--border)] bg-[var(--surface)]" />
        )
      ) : (
        <ProductivityContextPanel
          history={history}
          saved={saved}
          completedTopics={completedTopics}
        />
      )}
    </main>
  );
}
