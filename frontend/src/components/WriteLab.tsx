'use client';

import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Box, CheckCircle2, CodeXml, Download, FileCode2, FileUp, FlaskConical, Play, RotateCcw, ShieldCheck, Table2, TimerReset } from 'lucide-react';

type SqlValue = number | string | Uint8Array | null;
type ResultSet = { columns: string[]; values: SqlValue[][]; rowCount: number; truncated: boolean };
type SchemaObject = { name: string; type: string; sql: string | null };
type LabResponse = {
  id: number;
  ok: boolean;
  results?: ResultSet[];
  changes?: number;
  schema?: SchemaObject[];
  bytes?: ArrayBuffer;
  elapsedMs?: number;
  error?: string;
};
type RequestType = 'execute' | 'reset' | 'schema' | 'export' | 'import';
type PendingRequest = { resolve: (response: LabResponse) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
type EditorInstance = Parameters<OnMount>[0];

const STARTER_SCRIPT = `-- This database is isolated from CollegeDB.
CREATE TABLE Project (
  project_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  budget REAL DEFAULT 0,
  student_id INTEGER,
  FOREIGN KEY (student_id) REFERENCES Student(student_id)
);

INSERT INTO Project (title, budget, student_id)
VALUES ('Campus Portal', 25000, 1),
       ('IoT Attendance', 18000, 3);

SELECT p.title, p.budget, s.name AS student
FROM Project AS p
JOIN Student AS s ON s.student_id = p.student_id
ORDER BY p.budget DESC;`;

const EXAMPLES = [
  { label: 'Create + insert', sql: STARTER_SCRIPT },
  { label: 'Update rows', sql: `UPDATE Student\nSET marks = marks + 3\nWHERE dept_id = 1;\n\nSELECT * FROM Student ORDER BY marks DESC;` },
  { label: 'Transaction', sql: `BEGIN;\nUPDATE Student SET marks = 100 WHERE student_id = 2;\nSELECT * FROM Student WHERE student_id = 2;\nROLLBACK;\nSELECT * FROM Student WHERE student_id = 2;` },
  { label: 'Index + plan', sql: `CREATE INDEX IF NOT EXISTS idx_student_dept ON Student(dept_id);\nPRAGMA optimize;\nEXPLAIN QUERY PLAN\nSELECT * FROM Student WHERE dept_id = 1;` },
];

function displayValue(value: SqlValue) {
  if (value === null) return <span className="italic text-[var(--muted)]">NULL</span>;
  if (value instanceof Uint8Array) return `<BLOB ${value.byteLength} bytes>`;
  return String(value);
}

export function WriteLab() {
  const [sql, setSql] = useState(STARTER_SCRIPT);
  const [results, setResults] = useState<ResultSet[]>([]);
  const [schema, setSchema] = useState<SchemaObject[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Loading the isolated SQLite database…');
  const [activeTab, setActiveTab] = useState<'output' | 'schema' | 'messages'>('output');
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [databaseName, setDatabaseName] = useState('PracticeDB');
  const [hasSelection, setHasSelection] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const runRef = useRef<(script?: string) => void>(() => undefined);
  const pendingRef = useRef(new Map<number, PendingRequest>());
  const requestIdRef = useRef(0);

  const stopWorker = useCallback((reason?: string) => {
    workerRef.current?.terminate();
    workerRef.current = null;
    for (const pending of pendingRef.current.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason ?? 'The SQL lab was restarted.'));
    }
    pendingRef.current.clear();
  }, []);

  const startWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL('../workers/sqlLabWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<LabResponse>) => {
      const pending = pendingRef.current.get(event.data.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingRef.current.delete(event.data.id);
      pending.resolve(event.data);
    };
    worker.onerror = () => stopWorker('The isolated SQLite engine stopped unexpectedly.');
    workerRef.current = worker;
    return worker;
  }, [stopWorker]);

  const request = useCallback((type: RequestType, payload: { sql?: string; bytes?: ArrayBuffer } = {}, timeoutMs = 5000) => new Promise<LabResponse>((resolve, reject) => {
    const worker = startWorker();
    const id = ++requestIdRef.current;
    const timer = setTimeout(() => {
      stopWorker('This script exceeded the 5-second safety limit. The lab was reset.');
      setMessage('Safety timeout reached. The isolated database was reset.');
    }, timeoutMs);
    pendingRef.current.set(id, { resolve, reject, timer });
    worker.postMessage({ id, type, ...payload }, payload.bytes ? [payload.bytes] : []);
  }), [startWorker, stopWorker]);

  useEffect(() => {
    let cancelled = false;
    request('schema', {}, 15000).then((response) => {
      if (cancelled) return;
      if (!response.ok) throw new Error(response.error);
      setSchema(response.schema ?? []);
      setMessage('PracticeDB is ready. Changes stay inside this browser tab.');
      setReady(true);
    }).catch((caught) => {
      if (!cancelled) { setError(caught instanceof Error ? caught.message : 'The SQL lab could not start.'); setMessage('SQLite engine unavailable.'); }
    });
    return () => { cancelled = true; stopWorker(); };
  }, [request, stopWorker]);

  useEffect(() => {
    const useExample = (event: Event) => {
      const nextSql = (event as CustomEvent<string>).detail;
      if (nextSql) { setSql(nextSql); setError(''); setResults([]); }
    };
    window.addEventListener('write-lab-example', useExample);
    return () => window.removeEventListener('write-lab-example', useExample);
  }, []);

  const run = async (script = sql) => {
    if (!script.trim() || running) return;
    setRunning(true);
    setError('');
    setActiveTab('output');
    try {
      const response = await request('execute', { sql: script });
      if (!response.ok) throw new Error(response.error);
      setResults(response.results ?? []);
      setSchema(response.schema ?? []);
      const resultCount = response.results?.length ?? 0;
      setMessage(`${resultCount ? `${resultCount} result set${resultCount === 1 ? '' : 's'}` : 'Script completed'} · last statement changed ${response.changes ?? 0} row(s) · ${(response.elapsedMs ?? 0).toFixed(1)} ms`);
      setReady(true);
    } catch (caught) {
      setResults([]);
      setError(caught instanceof Error ? caught.message : 'SQLite could not execute this script.');
      setActiveTab('messages');
    } finally {
      setRunning(false);
    }
  };
  runRef.current = (script) => { void run(script); };

  const selectedSql = () => {
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    const model = editor?.getModel();
    if (!selection || !model || selection.isEmpty()) return '';
    return model.getValueInRange(selection).trim();
  };

  const runSelection = () => {
    const selection = selectedSql();
    if (!selection) { setMessage('Select one or more SQL statements, then choose Run selection.'); return; }
    runRef.current(selection);
  };

  const reset = async () => {
    if (!window.confirm('Reset PracticeDB and remove every table and row you created in this tab?')) return;
    setRunning(true);
    setError('');
    try {
      const response = await request('reset', {}, 15000);
      if (!response.ok) throw new Error(response.error);
      setSchema(response.schema ?? []);
      setResults([]);
      setDatabaseName('PracticeDB');
      setMessage('PracticeDB was reset to the starter Student and Department tables.');
      setActiveTab('schema');
      setReady(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The database could not be reset.');
      setActiveTab('messages');
    } finally {
      setRunning(false);
    }
  };

  const importDatabase = async (file?: File) => {
    if (!file) return;
    setRunning(true);
    setError('');
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('SQLite files are limited to 20 MB in Write Lab.');
      const bytes = await file.arrayBuffer();
      const response = await request('import', { bytes }, 15000);
      if (!response.ok) throw new Error(response.error);
      setSchema(response.schema ?? []);
      setResults([]);
      setDatabaseName(file.name);
      setMessage(`${file.name} is open in the isolated lab · ${response.schema?.length ?? 0} schema object(s).`);
      setActiveTab('schema');
      setReady(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The SQLite file could not be opened.');
      setActiveTab('messages');
    } finally {
      setRunning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const exportDatabase = async () => {
    try {
      const response = await request('export', {}, 15000);
      if (!response.ok || !response.bytes) throw new Error(response.error ?? 'No database file was returned.');
      const url = URL.createObjectURL(new Blob([response.bytes], { type: 'application/vnd.sqlite3' }));
      const anchor = document.createElement('a');
      const exportName = `${databaseName.replace(/\.(db|sqlite|sqlite3)$/i, '').replace(/[^a-z0-9_-]+/gi, '-') || 'practice-db'}-edited.sqlite`;
      anchor.href = url;
      anchor.download = exportName;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`${exportName} was downloaded.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The database could not be exported.');
      setActiveTab('messages');
    }
  };

  return <>
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".db,.sqlite,.sqlite3,application/vnd.sqlite3" className="hidden" onChange={(event) => void importDatabase(event.target.files?.[0])} />
        <button type="button" onClick={() => void run()} disabled={!ready || running || !sql.trim()} className="flex items-center gap-2 rounded-lg bg-[linear-gradient(135deg,#29b67f,#438cff)] px-3.5 py-2 text-sm font-bold text-white shadow-[0_5px_16px_rgb(72_213_151_/_16%)] disabled:cursor-not-allowed disabled:opacity-50"><Play size={14} fill="currentColor" />{running ? 'Running…' : 'Run script'}<kbd className="ml-1 rounded border border-white/20 bg-black/10 px-1 py-0.5 font-mono text-xs font-medium">Ctrl ↵</kbd></button>
        <button type="button" onClick={runSelection} disabled={!ready || running || !hasSelection} title="Run only the highlighted SQL" className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"><CodeXml size={14} />Run selection</button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={running} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40"><FileUp size={14} />Open SQLite</button>
        <button type="button" onClick={reset} disabled={running} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40"><RotateCcw size={14} />Reset database</button>
        <button type="button" onClick={exportDatabase} disabled={!ready || running} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"><Download size={14} />Export .sqlite</button>
      </div>
      <span className="flex items-center gap-2 rounded-full border border-[color:rgb(72_213_151_/_22%)] bg-[color:rgb(72_213_151_/_7%)] px-3 py-1.5 text-xs font-semibold text-[var(--green)]"><ShieldCheck size={14} />Isolated from CollegeDB</span>
    </div>

    <div className="flex h-10 shrink-0 items-center border-b border-[var(--border)] bg-[#0c111a] px-4 text-sm">
      <span className="flex h-full items-center border-b-2 border-[var(--green)] px-2 font-mono text-[var(--muted-bright)]"><span className="mr-2 h-2 w-2 rounded-sm bg-[var(--green)]" />{databaseName}</span>
      <span className="ml-auto hidden text-xs text-[var(--muted)] sm:inline">SQLite · DDL + DML + transactions · memory only</span>
    </div>

    <div className="grid min-h-0 flex-1 grid-rows-[minmax(280px,1fr)_minmax(220px,0.75fr)] overflow-hidden">
      <div className="min-h-0 overflow-hidden bg-[#0b1019]">
        <Editor height="100%" defaultLanguage="sql" theme="vs-dark" value={sql} onChange={(value) => setSql(value ?? '')} onMount={(editor, monaco) => { editorRef.current = editor; editor.onDidChangeCursorSelection(({ selection }) => setHasSelection(!selection.isEmpty())); editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current(selectedSql() || undefined)); }} loading={<div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Loading SQL editor…</div>} options={{ automaticLayout: true, minimap: { enabled: false }, fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 23, padding: { top: 16, bottom: 16 }, scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2, bracketPairColorization: { enabled: true }, renderLineHighlight: 'all' }} />
      </div>

      <div className="flex min-h-0 flex-col border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="flex h-11 shrink-0 items-center gap-5 border-b border-[var(--border)] px-4" role="tablist" aria-label="Write Lab output">
          {(['output', 'schema', 'messages'] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`h-full border-b-2 px-0.5 text-sm font-semibold capitalize ${activeTab === tab ? 'border-[var(--blue)] text-[var(--text)]' : 'border-transparent text-[var(--muted)]'}`}>{tab}{tab === 'schema' ? ` (${schema.length})` : ''}</button>)}
        </div>
        <div className="result-scroll min-h-0 flex-1 overflow-auto p-4">
          {activeTab === 'output' ? (results.length ? <div className="space-y-4">{results.map((result, resultIndex) => <section key={resultIndex} className="overflow-hidden rounded-xl border border-[var(--border)]"><div className="flex items-center justify-between bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--muted-bright)]"><span>Result {resultIndex + 1}</span><span>{result.rowCount} row(s){result.truncated ? ' · showing first 1,000' : ''}</span></div><div className="overflow-auto"><table className="w-full border-collapse text-left text-sm"><thead className="sticky top-0 bg-[#101722]"><tr>{result.columns.map((column) => <th key={column} className="whitespace-nowrap border-b border-r border-[var(--border)] px-3 py-2 font-semibold text-[var(--blue-bright)]">{column}</th>)}</tr></thead><tbody>{result.values.map((row, rowIndex) => <tr key={rowIndex} className="odd:bg-white/[0.015] hover:bg-[color:rgb(109_141_255_/_5%)]">{row.map((value, columnIndex) => <td key={columnIndex} className="whitespace-nowrap border-b border-r border-[var(--border)] px-3 py-2 font-mono text-xs text-[var(--muted-bright)]">{displayValue(value)}</td>)}</tr>)}</tbody></table></div></section>)}</div> : <div className="flex h-full min-h-36 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center"><div><CheckCircle2 className="mx-auto text-[var(--green)]" size={24} /><p className="mt-3 text-sm font-semibold">Ready to run a script</p><p className="mt-1 text-xs text-[var(--muted)]">DDL and data-changing statements report completion here.</p></div></div>) : null}
          {activeTab === 'schema' ? <div className="grid gap-3 md:grid-cols-2">{schema.map((item) => <article key={`${item.type}-${item.name}`} className="rounded-xl border border-[var(--border)] bg-[#0b1018] p-3"><div className="flex items-center gap-2"><Table2 size={15} className={item.type === 'table' ? 'text-[var(--green)]' : 'text-[var(--violet)]'} /><strong className="text-sm">{item.name}</strong><span className="ml-auto rounded bg-[var(--surface-muted)] px-2 py-0.5 text-xs uppercase text-[var(--muted)]">{item.type}</span></div><pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-[var(--muted-bright)]">{item.sql ?? 'Created automatically by SQLite'}</pre></article>)}</div> : null}
          {activeTab === 'messages' ? <div className={`rounded-xl border p-4 ${error ? 'border-[color:rgb(255_107_135_/_35%)] bg-[color:rgb(255_107_135_/_7%)]' : 'border-[color:rgb(72_213_151_/_25%)] bg-[color:rgb(72_213_151_/_5%)]'}`}><div className="flex items-start gap-3">{error ? <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--red)]" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--green)]" />}<div><p className="text-sm font-semibold">{error ? 'SQLite error' : 'Lab message'}</p><p className="mt-1 whitespace-pre-wrap font-mono text-xs leading-5 text-[var(--muted-bright)]">{error || message}</p></div></div></div> : null}
        </div>
        <div className="shrink-0 border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">{message}</div>
      </div>
    </div>
  </>;
}

export function WriteLabContextPanel() {
  return <aside className="app-mentor overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4">
    <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:rgb(72_213_151_/_10%)] text-[var(--green)]"><FlaskConical size={18} /></div><div><p className="text-sm font-bold">Write Lab</p><p className="text-xs text-[var(--green)]">Phase 10 · ready</p></div></div>
    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4"><ShieldCheck size={18} className="text-[var(--green)]" /><h2 className="mt-3 text-sm font-bold">Safe SQL sandbox</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-bright)]">Create, alter, insert, update, delete, drop, and use transactions in a disposable SQLite database. CollegeDB is never modified.</p></div>
    <div className="mt-3 rounded-xl border border-[var(--border)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Try an example</p><div className="mt-3 space-y-2">{EXAMPLES.map((example) => <button key={example.label} type="button" onClick={() => window.dispatchEvent(new CustomEvent('write-lab-example', { detail: example.sql }))} className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[#0b1018] px-3 py-2.5 text-left text-sm text-[var(--muted-bright)] hover:border-[var(--border-bright)] hover:text-[var(--text)]"><FileCode2 size={14} className="text-[var(--blue-bright)]" />{example.label}</button>)}</div></div>
    <div className="mt-3 space-y-2 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted-bright)]"><p className="flex items-center gap-2"><FileUp size={15} className="text-[var(--green)]" />Open SQLite files up to 20 MB</p><p className="flex items-center gap-2"><CodeXml size={15} className="text-[var(--blue-bright)]" />Run highlighted statements</p><p className="flex items-center gap-2"><Box size={15} className="text-[var(--violet)]" />State lasts for this tab only</p><p className="flex items-center gap-2"><TimerReset size={15} className="text-[#f6c76f]" />5-second safety limit</p><p className="flex items-center gap-2"><Download size={15} className="text-[var(--blue-bright)]" />Export before closing</p></div>
    <div className="mt-3 rounded-xl border border-dashed border-[color:rgb(246_199_111_/_30%)] bg-[color:rgb(246_199_111_/_5%)] p-3 text-xs leading-5 text-[var(--muted-bright)]"><strong className="text-[#f6c76f]">SQLite only.</strong> MySQL, PostgreSQL, Oracle, and SQL Server procedures or vendor-specific syntax need their own database engine.</div>
  </aside>;
}
