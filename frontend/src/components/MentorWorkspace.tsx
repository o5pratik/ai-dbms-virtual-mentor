'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, ChevronDown, CircleHelp, Eraser, Lightbulb, Play, Save as SaveIcon, Sparkles, WandSparkles, Workflow } from 'lucide-react';

import { analyzeQuery, clearHistory, deleteSavedQuery, executeQuery, explainQuery, fixQuery, getHistory, getProgress, getSavedQueries, getSchema, saveQuery, setTopicProgress, suggestQuery, type HistoryItem, type ProgressItem, type QueryAnalysis, type QueryResponse, type SavedQueryItem, type SchemaResponse } from '../services/api';
import { ErDiagram } from './ErDiagram';
import { MentorPanel, type MentorView } from './MentorPanel';
import { ProductivityContextPanel, ProductivityWorkspace } from './ProductivityWorkspace';
import { ResultsPanel, type ResultTab } from './ResultsPanel';
import { SchemaContextPanel, SchemaExplorer, SchemaLoading } from './SchemaExplorer';
import { Sidebar, type WorkspaceView } from './Sidebar';
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
  const [analysis, setAnalysis] = useState<QueryAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>('output');
  const [instruction, setInstruction] = useState('');
  const [mentorView, setMentorView] = useState<MentorView>({ kind: 'welcome' });
  const [activeView, setActiveView] = useState<WorkspaceView>('playground');
  const [selectedTable, setSelectedTable] = useState('Student');
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [schemaError, setSchemaError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saved, setSaved] = useState<SavedQueryItem[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [productivityLoading, setProductivityLoading] = useState(false);
  const [productivityLoaded, setProductivityLoaded] = useState(false);

  const refreshProductivity = useCallback(async (showLoading = false) => {
    if (showLoading) setProductivityLoading(true);
    try {
      const [nextHistory, nextSaved, nextProgress] = await Promise.all([getHistory(), getSavedQueries(), getProgress()]);
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
    getSchema().then((data) => { if (!cancelled) setSchema(data); }).catch((caught) => { if (!cancelled) setSchemaError(caught instanceof Error ? caught.message : 'The schema could not be loaded.'); });
    return () => { cancelled = true; };
  }, [activeView, schema]);

  useEffect(() => {
    const productivityView = ['dashboard', 'history', 'saved', 'analytics', 'topics'].includes(activeView);
    if (!productivityView || productivityLoaded) return;
    void refreshProductivity(true);
  }, [activeView, productivityLoaded, refreshProductivity]);

  const runQuery = useCallback(async () => {
    if (!query.trim() || running) return;
    setRunning(true);
    setError(null);
    setResultTab('output');
    try {
      setResult(await executeQuery(query));
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : 'The query could not be executed.');
    } finally {
      setRunning(false);
      void refreshProductivity();
    }
  }, [query, running, refreshProductivity]);

  const clearEditor = () => {
    setQuery('');
    setResult(null);
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setResultTab('output');
    setMentorView({ kind: 'welcome' });
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setResult(null);
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setResultTab('output');
    if (mentorView.kind === 'fix' || mentorView.kind === 'error') setMentorView({ kind: 'welcome' });
  };

  const mentorError = (caught: unknown) => {
    setMentorView({ kind: 'error', message: caught instanceof Error ? caught.message : 'The AI Mentor could not complete that request.' });
  };

  const explainCurrentQuery = async () => {
    if (!query.trim()) return;
    setMentorView({ kind: 'loading', label: 'Explaining your query' });
    try {
      const resultSummary = result ? `${result.row_count} rows; columns: ${result.columns.join(', ')}` : '';
      setMentorView({ kind: 'explanation', data: await explainQuery(query, resultSummary) });
    } catch (caught) {
      mentorError(caught);
    }
  };

  const suggestCurrentQuery = async (request = '') => {
    setMentorView({ kind: 'loading', label: request ? 'Turning your request into SQL' : 'Improving your SQL' });
    try {
      setMentorView({ kind: 'suggestion', data: await suggestQuery(query, request) });
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
    try {
      setAnalysis(await analyzeQuery(query));
    } catch (caught) {
      setAnalysis(null);
      setAnalysisError(caught instanceof Error ? caught.message : 'The query could not be analyzed.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const applyMentorSql = (sql: string) => {
    setQuery(sql);
    setResult(null);
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setResultTab('output');
    setMentorView({ kind: 'welcome' });
  };

  const openInPlayground = (sql: string) => {
    setQuery(sql);
    setResult(null);
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setResultTab('output');
    setMentorView({ kind: 'welcome' });
    setActiveView('playground');
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
    const records = result.rows.map((row) => Object.fromEntries(result.columns.map((column, index) => [column, row[index]])));
    const content = format === 'json'
      ? JSON.stringify(records, null, 2)
      : [result.columns, ...result.rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `collegedb-results.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const completedTopics = new Set(progress.filter((item) => item.completed).map((item) => item.topic_id));
  const schemaView = activeView === 'schema' || activeView === 'er';

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

      <Sidebar activeView={activeView} selectedTable={selectedTable} onNavigate={setActiveView} onSelectTable={setSelectedTable} />

      {activeView === 'playground' ? <section className="app-workspace flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0b1018]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={runQuery} disabled={running || !query.trim()} className="flex items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--blue),#806dff)] px-3.5 py-2 text-xs font-bold text-white shadow-[0_5px_16px_rgb(109_141_255_/_20%)] transition disabled:cursor-not-allowed disabled:opacity-50">
              <Play size={13} fill="currentColor" /> {running ? 'Running…' : 'Run'}
              <kbd className="ml-1 rounded border border-white/20 bg-black/10 px-1 py-0.5 font-mono text-[9px] font-medium">Ctrl ↵</kbd>
            </button>
            <div className="mx-1 h-5 w-px bg-[var(--border)]" />
            <button type="button" onClick={analyzeCurrentQuery} disabled={!query.trim() || analysisLoading} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"><Workflow size={14} /> {analysisLoading ? 'Analyzing…' : 'Analyze'}</button>
            <button type="button" onClick={explainCurrentQuery} disabled={!query.trim() || mentorView.kind === 'loading'} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"><Sparkles size={14} /> Explain</button>
            <button type="button" onClick={() => suggestCurrentQuery()} disabled={mentorView.kind === 'loading'} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"><Lightbulb size={14} /> AI Suggest</button>
            <button type="button" onClick={fixCurrentQuery} disabled={!query.trim() || mentorView.kind === 'loading'} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"><WandSparkles size={14} /> Fix error</button>
          </div>
          <div className="flex items-center gap-1"><button type="button" onClick={() => saveSql(query)} disabled={!query.trim()} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40"><SaveIcon size={14} /> Save</button><button type="button" onClick={clearEditor} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"><Eraser size={14} /> Clear</button></div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center border-b border-[var(--border)] bg-[#0c111a] px-4 text-[11px]">
            <span className="flex h-full items-center border-b-2 border-[var(--blue)] px-2 font-mono text-[var(--muted-bright)]"><span className="mr-2 h-2 w-2 rounded-sm bg-[var(--blue)]" />query.sql</span>
            <span className="ml-auto text-[10px] text-[var(--muted)]">SQLite · read-only sandbox</span>
          </div>
          <SqlEditor value={query} onChange={changeQuery} onRun={runQuery} />
          <ResultsPanel result={result} error={error} running={running} analysis={analysis} analysisLoading={analysisLoading} analysisError={analysisError} activeTab={resultTab} onTabChange={setResultTab} onAnalyze={analyzeCurrentQuery} onFix={fixCurrentQuery} onExportCsv={() => exportResult('csv')} onExportJson={() => exportResult('json')} />
        </div>
      </section> : schemaView ? <section className="app-workspace flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0b1018]">{schema ? (activeView === 'schema' ? <SchemaExplorer schema={schema} selectedTable={selectedTable} onSelectTable={setSelectedTable} /> : <ErDiagram schema={schema} selectedTable={selectedTable} onSelectTable={setSelectedTable} />) : <SchemaLoading error={schemaError} />}</section> : <section className="app-workspace flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0b1018]"><ProductivityWorkspace activeView={activeView} history={history} saved={saved} completedTopics={completedTopics} loading={productivityLoading} onNavigate={setActiveView} onRunQuery={openInPlayground} onSaveQuery={saveSql} onDeleteSaved={removeSaved} onClearHistory={removeHistory} onToggleTopic={toggleTopic} /></section>}

      {activeView === 'playground' ? <MentorPanel
        view={mentorView}
        instruction={instruction}
        onInstructionChange={setInstruction}
        onAsk={() => suggestCurrentQuery(instruction)}
        onApply={applyMentorSql}
        onReject={() => setMentorView({ kind: 'welcome' })}
      /> : schemaView ? (schema ? <SchemaContextPanel schema={schema} selectedTable={selectedTable} /> : <aside className="app-mentor border-l border-[var(--border)] bg-[var(--surface)]" />) : <ProductivityContextPanel history={history} saved={saved} completedTopics={completedTopics} />}
    </main>
  );
}
