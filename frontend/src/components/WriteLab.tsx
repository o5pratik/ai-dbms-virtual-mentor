'use client';

import Editor from '@monaco-editor/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  AlertTriangle,
  Box,
  Check,
  CheckCircle2,
  Clipboard,
  CodeXml,
  Download,
  FileCode2,
  FileUp,
  FlaskConical,
  HardDrive,
  Play,
  RotateCcw,
  ShieldCheck,
  Table2,
  TimerReset,
  Undo2,
  WandSparkles,
  X,
} from 'lucide-react';

import { fixWriteQuery, type FixResponse } from '../services/api';
import {
  clearChallengeProgress,
  loadChallengeProgress,
  recordChallengeAttempt,
  type ChallengeProgress,
} from '../services/challenge-progress';
import {
  clearPracticeSnapshot,
  clearPracticeCheckpoint,
  loadPracticeCheckpoint,
  loadPracticeDraft,
  loadPracticeSnapshot,
  savePracticeDraft,
  savePracticeCheckpoint,
  savePracticeSnapshot,
} from '../services/practice-storage';

type SqlValue = number | string | Uint8Array | null;
type ResultSet = {
  columns: string[];
  values: SqlValue[][];
  rowCount: number;
  truncated: boolean;
};
type SchemaObject = { name: string; type: string; sql: string | null };
type LabResponse = {
  id: number;
  ok: boolean;
  results?: ResultSet[];
  changes?: number;
  schema?: SchemaObject[];
  bytes?: ArrayBuffer;
  elapsedMs?: number;
  passed?: boolean;
  feedback?: string;
  error?: string;
};
type RequestType =
  | 'execute'
  | 'reset'
  | 'schema'
  | 'export'
  | 'import'
  | 'grade';
type PendingRequest = {
  resolve: (response: LabResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
type SaveState = 'loading' | 'saving' | 'saved' | 'draft' | 'unavailable';

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
  {
    label: 'Update rows',
    sql: `UPDATE Student\nSET marks = marks + 3\nWHERE dept_id = 1;\n\nSELECT * FROM Student ORDER BY marks DESC;`,
  },
  {
    label: 'Transaction',
    sql: `BEGIN;\nUPDATE Student SET marks = 100 WHERE student_id = 2;\nSELECT * FROM Student WHERE student_id = 2;\nROLLBACK;\nSELECT * FROM Student WHERE student_id = 2;`,
  },
  {
    label: 'Index + plan',
    sql: `CREATE INDEX IF NOT EXISTS idx_student_dept ON Student(dept_id);\nPRAGMA optimize;\nEXPLAIN QUERY PLAN\nSELECT * FROM Student WHERE dept_id = 1;`,
  },
];

const CHALLENGES = [
  {
    id: 'students-above-80',
    title: 'Students above 80',
    difficulty: 'Beginner',
    prompt: 'Return name and marks for students above 80, highest mark first.',
    hint: 'Use WHERE marks > 80 and ORDER BY marks DESC.',
    sql: `-- Return students with marks above 80, highest first.
SELECT name, marks
FROM Student
WHERE marks > 0
ORDER BY marks DESC;`,
  },
  {
    id: 'department-counts',
    title: 'Count by department',
    difficulty: 'Intermediate',
    prompt:
      'Return every department name and its student_count, alphabetically.',
    hint: 'Use LEFT JOIN, COUNT(student_id), GROUP BY, and an alias.',
    sql: `-- Return department_name and student_count for every department.
SELECT d.department_name, s.student_id
FROM Department AS d
LEFT JOIN Student AS s ON s.dept_id = d.dept_id
ORDER BY d.department_name;`,
  },
  {
    id: 'top-student',
    title: 'Top student',
    difficulty: 'Beginner',
    prompt: 'Return only the name and marks of the highest-scoring student.',
    hint: 'Sort marks descending, then limit the result to one row.',
    sql: `-- Return only the highest-scoring student.
SELECT name, marks
FROM Student
ORDER BY marks DESC;`,
  },
];

function displayValue(value: SqlValue) {
  if (value === null)
    return <span className="italic text-[var(--muted)]">NULL</span>;
  if (value instanceof Uint8Array) return `<BLOB ${value.byteLength} bytes>`;
  return String(value);
}

export function WriteLab() {
  const [sql, setSql] = useState(STARTER_SCRIPT);
  const [results, setResults] = useState<ResultSet[]>([]);
  const [schema, setSchema] = useState<SchemaObject[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(
    'Loading the isolated SQLite database…',
  );
  const [activeTab, setActiveTab] = useState<'output' | 'schema' | 'messages'>(
    'output',
  );
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [databaseName, setDatabaseName] = useState('PracticeDB');
  const [hasSelection, setHasSelection] = useState(false);
  const [fix, setFix] = useState<FixResponse | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState('');
  const [lastExecutedSql, setLastExecutedSql] = useState(STARTER_SCRIPT);
  const [saveState, setSaveState] = useState<SaveState>('loading');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [undoLabel, setUndoLabel] = useState('');
  const [undoing, setUndoing] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<{
    passed: boolean;
    feedback: string;
  } | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const selectionReaderRef = useRef<(() => string) | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const runRef = useRef<(script?: string) => void>(() => undefined);
  const pendingRef = useRef(new Map<number, PendingRequest>());
  const requestIdRef = useRef(0);
  const lastSnapshotRef = useRef({ sql: '', databaseName: '' });

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
    const worker = new Worker('/sql-lab-worker.js');
    worker.onmessage = (event: MessageEvent<LabResponse>) => {
      const pending = pendingRef.current.get(event.data.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingRef.current.delete(event.data.id);
      pending.resolve(event.data);
    };
    worker.onerror = () =>
      stopWorker('The isolated SQLite engine stopped unexpectedly.');
    workerRef.current = worker;
    return worker;
  }, [stopWorker]);

  const request = useCallback(
    (
      type: RequestType,
      payload: {
        sql?: string;
        bytes?: ArrayBuffer;
        challengeId?: string;
      } = {},
      timeoutMs = 5000,
    ) =>
      new Promise<LabResponse>((resolve, reject) => {
        const worker = startWorker();
        const id = ++requestIdRef.current;
        const timer = setTimeout(() => {
          stopWorker(
            'This script exceeded the 5-second safety limit. The lab was reset.',
          );
          setMessage(
            'Safety timeout reached. The isolated database was reset.',
          );
        }, timeoutMs);
        pendingRef.current.set(id, { resolve, reject, timer });
        worker.postMessage(
          { id, type, ...payload },
          payload.bytes ? [payload.bytes] : [],
        );
      }),
    [startWorker, stopWorker],
  );

  const persistDatabase = useCallback(
    async (snapshotSql: string, snapshotName: string) => {
      setSaveState('saving');
      try {
        const exported = await request('export', {}, 15000);
        if (!exported.ok || !exported.bytes)
          throw new Error(
            exported.error ?? 'No database snapshot was returned.',
          );
        const savedAt = Date.now();
        await savePracticeSnapshot({
          bytes: exported.bytes,
          databaseName: snapshotName,
          sql: snapshotSql,
          savedAt,
        });
        savePracticeDraft(snapshotSql, snapshotName);
        lastSnapshotRef.current = {
          sql: snapshotSql,
          databaseName: snapshotName,
        };
        setLastSavedAt(savedAt);
        setSaveState('saved');
      } catch {
        setSaveState('unavailable');
      }
    },
    [request],
  );

  const createCheckpoint = useCallback(
    async (label: string, checkpointSql: string, checkpointName: string) => {
      try {
        const exported = await request('export', {}, 15000);
        if (!exported.ok || !exported.bytes)
          throw new Error(exported.error ?? 'No checkpoint was returned.');
        await savePracticeCheckpoint({
          bytes: exported.bytes,
          databaseName: checkpointName,
          sql: checkpointSql,
          savedAt: Date.now(),
          label,
        });
        setUndoLabel(label);
        setUndoAvailable(true);
      } catch {
        setUndoAvailable(false);
        setUndoLabel('');
      }
    },
    [request],
  );

  useEffect(() => {
    let cancelled = false;
    const initialise = async () => {
      try {
        let restored = false;
        try {
          const checkpoint = await loadPracticeCheckpoint();
          if (cancelled) return;
          setUndoAvailable(Boolean(checkpoint));
          setUndoLabel(checkpoint?.label ?? '');
          const snapshot = await loadPracticeSnapshot();
          if (snapshot) {
            const response = await request(
              'import',
              { bytes: snapshot.bytes },
              15000,
            );
            if (!response.ok) throw new Error(response.error);
            if (cancelled) return;
            const draft = loadPracticeDraft();
            setSql(draft?.sql ?? snapshot.sql);
            setDatabaseName(draft?.databaseName ?? snapshot.databaseName);
            lastSnapshotRef.current = {
              sql: snapshot.sql,
              databaseName: snapshot.databaseName,
            };
            setSchema(response.schema ?? []);
            setLastSavedAt(snapshot.savedAt);
            setSaveState(
              draft && draft.savedAt > snapshot.savedAt ? 'draft' : 'saved',
            );
            setMessage(
              'PracticeDB and your SQL draft were restored from this device.',
            );
            setReady(true);
            restored = true;
          }
        } catch {
          await clearPracticeSnapshot().catch(() => undefined);
        }

        if (!restored) {
          const response = await request('schema', {}, 15000);
          if (!response.ok) throw new Error(response.error);
          if (cancelled) return;
          setSchema(response.schema ?? []);
          setMessage(
            'PracticeDB is ready. Local recovery is enabled on this device.',
          );
          setReady(true);
          await persistDatabase(STARTER_SCRIPT, 'PracticeDB');
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'The SQL lab could not start.',
          );
          setMessage('SQLite engine unavailable.');
          setSaveState('unavailable');
        }
      }
    };
    void initialise();
    return () => {
      cancelled = true;
      stopWorker();
    };
  }, [persistDatabase, request, stopWorker]);

  useEffect(() => {
    if (!ready) return;
    if (
      lastSnapshotRef.current.sql === sql &&
      lastSnapshotRef.current.databaseName === databaseName
    )
      return;
    const timer = window.setTimeout(() => {
      if (
        lastSnapshotRef.current.sql === sql &&
        lastSnapshotRef.current.databaseName === databaseName
      )
        return;
      savePracticeDraft(sql, databaseName);
      setSaveState((current) =>
        current === 'saving' || current === 'unavailable' ? current : 'draft',
      );
    }, 500);
    return () => window.clearTimeout(timer);
  }, [databaseName, ready, sql]);

  useEffect(() => {
    const useExample = (event: Event) => {
      const nextSql = (event as CustomEvent<string>).detail;
      if (nextSql) {
        setSql(nextSql);
        setActiveChallenge(null);
        setGradeResult(null);
        setError('');
        setFix(null);
        setFixError('');
        setResults([]);
      }
    };
    window.addEventListener('write-lab-example', useExample);
    return () => window.removeEventListener('write-lab-example', useExample);
  }, []);

  useEffect(() => {
    const useChallenge = (event: Event) => {
      const detail = (
        event as CustomEvent<{ id?: string; sql?: string; title?: string }>
      ).detail;
      if (!detail?.id || !detail.sql) return;
      setSql(detail.sql);
      setActiveChallenge(detail.id);
      setGradeResult(null);
      setError('');
      setFix(null);
      setFixError('');
      setResults([]);
      setMessage(
        `${detail.title ?? 'Challenge'} loaded. Edit the query, then choose Check answer.`,
      );
      setActiveTab('output');
    };
    window.addEventListener('write-lab-challenge', useChallenge);
    return () =>
      window.removeEventListener('write-lab-challenge', useChallenge);
  }, []);

  const run = async (script = sql) => {
    if (!script.trim() || running) return;
    setRunning(true);
    setError('');
    setFix(null);
    setFixError('');
    setGradeResult(null);
    setLastExecutedSql(script);
    setActiveTab('output');
    try {
      const statementType =
        script
          .match(
            /\b(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|REPLACE|PRAGMA|BEGIN)\b/i,
          )?.[1]
          ?.toUpperCase() ?? 'SQL';
      await createCheckpoint(`Before ${statementType} run`, sql, databaseName);
      const response = await request('execute', { sql: script });
      if (!response.ok) throw new Error(response.error);
      setResults(response.results ?? []);
      setSchema(response.schema ?? []);
      const resultCount = response.results?.length ?? 0;
      setMessage(
        `${resultCount ? `${resultCount} result set${resultCount === 1 ? '' : 's'}` : 'Script completed'} · last statement changed ${response.changes ?? 0} row(s) · ${(response.elapsedMs ?? 0).toFixed(1)} ms`,
      );
      setReady(true);
      await persistDatabase(sql, databaseName);
    } catch (caught) {
      setResults([]);
      setError(
        caught instanceof Error
          ? caught.message
          : 'SQLite could not execute this script.',
      );
      setActiveTab('messages');
      await persistDatabase(sql, databaseName);
    } finally {
      setRunning(false);
    }
  };

  const gradeAnswer = async () => {
    if (!activeChallenge || !sql.trim() || grading || running) return;
    setGrading(true);
    setError('');
    setFix(null);
    setFixError('');
    setGradeResult(null);
    setActiveTab('output');
    try {
      const response = await request(
        'grade',
        { sql, challengeId: activeChallenge },
        15000,
      );
      if (!response.ok) throw new Error(response.error);
      const passed = Boolean(response.passed);
      const feedback = response.feedback ?? 'Your answer was checked.';
      const progress = recordChallengeAttempt(activeChallenge, passed);
      setResults(response.results ?? []);
      setGradeResult({ passed, feedback });
      window.dispatchEvent(
        new CustomEvent('write-lab-progress', { detail: progress }),
      );
      setMessage(
        `${passed ? 'Challenge passed' : 'Keep trying'} · ${(response.elapsedMs ?? 0).toFixed(1)} ms · PracticeDB was not changed.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The challenge answer could not be checked.',
      );
      setActiveTab('messages');
    } finally {
      setGrading(false);
    }
  };
  useEffect(() => {
    runRef.current = (script) => {
      void run(script);
    };
  });

  const selectedSql = () => {
    return selectionReaderRef.current?.() ?? '';
  };

  const runSelection = () => {
    const selection = selectedSql();
    if (!selection) {
      setMessage(
        'Select one or more SQL statements, then choose Run selection.',
      );
      return;
    }
    runRef.current(selection);
  };

  const askMentorForFix = async () => {
    if (!error || fixing) return;
    setFixing(true);
    setFixError('');
    try {
      const currentSchema = schema
        .map((item) => item.sql)
        .filter((value): value is string => Boolean(value))
        .join('\n\n');
      setFix(await fixWriteQuery(lastExecutedSql, error, currentSchema));
    } catch (caught) {
      setFixError(
        caught instanceof Error
          ? caught.message
          : 'The mentor could not review this SQLite error.',
      );
    } finally {
      setFixing(false);
    }
  };

  const applyFix = () => {
    if (!fix?.corrected_sql || fix.corrected_sql === lastExecutedSql) return;
    const failedSql = lastExecutedSql;
    const failedAt = sql.indexOf(failedSql);
    const nextSql =
      failedAt >= 0 && failedSql !== sql
        ? `${sql.slice(0, failedAt)}${fix.corrected_sql}${sql.slice(failedAt + failedSql.length)}`
        : fix.corrected_sql;
    setSql(nextSql);
    setError('');
    setFix(null);
    setFixError('');
    setMessage(
      'Mentor fix applied to the editor. Review it, then run it when you are ready.',
    );
  };

  const editSql = (value: string) => {
    setSql(value);
    setGradeResult(null);
    if (error || fix || fixError) {
      setError('');
      setFix(null);
      setFixError('');
      setMessage('SQL changed. Run it again to validate the new version.');
    }
  };

  const undoLastRun = async () => {
    if (!undoAvailable || running || undoing) return;
    setUndoing(true);
    setRunning(true);
    setError('');
    setFix(null);
    setFixError('');
    try {
      const checkpoint = await loadPracticeCheckpoint();
      if (!checkpoint)
        throw new Error(
          'The previous PracticeDB checkpoint is no longer available.',
        );
      const response = await request(
        'import',
        { bytes: checkpoint.bytes },
        15000,
      );
      if (!response.ok) throw new Error(response.error);
      setSql(checkpoint.sql);
      setDatabaseName(checkpoint.databaseName);
      setSchema(response.schema ?? []);
      setResults([]);
      await persistDatabase(checkpoint.sql, checkpoint.databaseName);
      await clearPracticeCheckpoint();
      setUndoAvailable(false);
      setUndoLabel('');
      setMessage(`Restored checkpoint: ${checkpoint.label}.`);
      setActiveTab('schema');
      setReady(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The previous database state could not be restored.',
      );
      setActiveTab('messages');
    } finally {
      setUndoing(false);
      setRunning(false);
    }
  };

  const reset = async () => {
    if (
      !window.confirm(
        'Reset PracticeDB and replace the saved local copy with a clean starter database?',
      )
    )
      return;
    setRunning(true);
    setError('');
    setFix(null);
    setFixError('');
    try {
      await createCheckpoint('Before database reset', sql, databaseName);
      const response = await request('reset', {}, 15000);
      if (!response.ok) throw new Error(response.error);
      setSchema(response.schema ?? []);
      setResults([]);
      setDatabaseName('PracticeDB');
      setSql(STARTER_SCRIPT);
      await clearPracticeSnapshot().catch(() => undefined);
      await persistDatabase(STARTER_SCRIPT, 'PracticeDB');
      setMessage(
        'PracticeDB was reset to the starter Student and Department tables.',
      );
      setActiveTab('schema');
      setReady(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The database could not be reset.',
      );
      setActiveTab('messages');
    } finally {
      setRunning(false);
    }
  };

  const importDatabase = async (file?: File) => {
    if (!file) return;
    setRunning(true);
    setError('');
    setFix(null);
    setFixError('');
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error('SQLite files are limited to 20 MB in Write Lab.');
      const bytes = await file.arrayBuffer();
      await createCheckpoint(`Before opening ${file.name}`, sql, databaseName);
      const response = await request('import', { bytes }, 15000);
      if (!response.ok) throw new Error(response.error);
      setSchema(response.schema ?? []);
      setResults([]);
      setDatabaseName(file.name);
      await persistDatabase(sql, file.name);
      setMessage(
        `${file.name} is open in the isolated lab · ${response.schema?.length ?? 0} schema object(s).`,
      );
      setActiveTab('schema');
      setReady(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The SQLite file could not be opened.',
      );
      setActiveTab('messages');
    } finally {
      setRunning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const exportDatabase = async () => {
    try {
      const response = await request('export', {}, 15000);
      if (!response.ok || !response.bytes)
        throw new Error(response.error ?? 'No database file was returned.');
      const url = URL.createObjectURL(
        new Blob([response.bytes], { type: 'application/vnd.sqlite3' }),
      );
      const anchor = document.createElement('a');
      const exportName = `${databaseName.replace(/\.(db|sqlite|sqlite3)$/i, '').replace(/[^a-z0-9_-]+/gi, '-') || 'practice-db'}-edited.sqlite`;
      anchor.href = url;
      anchor.download = exportName;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`${exportName} was downloaded.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The database could not be exported.',
      );
      setActiveTab('messages');
    }
  };

  const saveLabel = {
    loading: 'Restoring local lab…',
    saving: 'Saving locally…',
    saved: 'Database saved locally',
    draft: 'SQL draft saved',
    unavailable: 'Local autosave unavailable',
  }[saveState];

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".db,.sqlite,.sqlite3,application/vnd.sqlite3"
            className="hidden"
            onChange={(event) => void importDatabase(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => void run()}
            disabled={!ready || running || !sql.trim()}
            className="flex items-center gap-2 rounded-lg bg-[linear-gradient(135deg,#29b67f,#438cff)] px-3.5 py-2 text-sm font-bold text-white shadow-[0_5px_16px_rgb(72_213_151_/_16%)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={14} fill="currentColor" />
            {running ? 'Running…' : 'Run script'}
            <kbd className="ml-1 rounded border border-white/20 bg-black/10 px-1 py-0.5 font-mono text-xs font-medium">
              Ctrl ↵
            </kbd>
          </button>
          <button
            type="button"
            onClick={runSelection}
            disabled={!ready || running || !hasSelection}
            title="Run only the highlighted SQL"
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"
          >
            <CodeXml size={14} />
            Run selection
          </button>
          {activeChallenge ? (
            <button
              type="button"
              onClick={() => void gradeAnswer()}
              disabled={!ready || running || grading || !sql.trim()}
              title="Grade this query against a fresh starter database"
              className="flex items-center gap-1.5 rounded-lg border border-[color:rgb(246_199_111_/_30%)] bg-[color:rgb(246_199_111_/_7%)] px-2.5 py-2 text-sm font-semibold text-[#f6c76f] hover:bg-[color:rgb(246_199_111_/_12%)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Award size={14} />
              {grading ? 'Checking…' : 'Check answer'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={running}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40"
          >
            <FileUp size={14} />
            Open SQLite
          </button>
          <button
            type="button"
            onClick={() => void undoLastRun()}
            disabled={!ready || running || !undoAvailable}
            title={undoLabel || 'A checkpoint appears after your first run'}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 size={14} />
            {undoing ? 'Restoring…' : 'Undo last run'}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={running}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40"
          >
            <RotateCcw size={14} />
            Reset database
          </button>
          <button
            type="button"
            onClick={exportDatabase}
            disabled={!ready || running}
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40 md:flex"
          >
            <Download size={14} />
            Export .sqlite
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            title={
              lastSavedAt
                ? `Last database snapshot: ${new Date(lastSavedAt).toLocaleString()}`
                : undefined
            }
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${saveState === 'unavailable' ? 'border-[color:rgb(246_199_111_/_25%)] bg-[color:rgb(246_199_111_/_6%)] text-[#f6c76f]' : 'border-[color:rgb(109_141_255_/_22%)] bg-[color:rgb(109_141_255_/_7%)] text-[var(--blue-bright)]'}`}
          >
            <HardDrive size={14} />
            {saveLabel}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-[color:rgb(72_213_151_/_22%)] bg-[color:rgb(72_213_151_/_7%)] px-3 py-1.5 text-xs font-semibold text-[var(--green)]">
            <ShieldCheck size={14} />
            Isolated from CollegeDB
          </span>
        </div>
      </div>

      <div className="flex h-10 shrink-0 items-center border-b border-[var(--border)] bg-[#0c111a] px-4 text-sm">
        <span className="flex h-full items-center border-b-2 border-[var(--green)] px-2 font-mono text-[var(--muted-bright)]">
          <span className="mr-2 h-2 w-2 rounded-sm bg-[var(--green)]" />
          {databaseName}
        </span>
        <span className="ml-auto hidden text-xs text-[var(--muted)] sm:inline">
          SQLite · DDL + DML + transactions · local recovery
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(280px,1fr)_minmax(220px,0.75fr)] overflow-hidden">
        <div className="min-h-0 overflow-hidden bg-[#0b1019]">
          <Editor
            height="100%"
            defaultLanguage="sql"
            theme="vs-dark"
            value={sql}
            onChange={(value) => editSql(value ?? '')}
            onMount={(editor, monaco) => {
              selectionReaderRef.current = () => {
                const selection = editor.getSelection();
                const model = editor.getModel();
                if (!selection || !model || selection.isEmpty()) return '';
                return model.getValueInRange(selection).trim();
              };
              editor.onDidChangeCursorSelection(
                (event: { selection: { isEmpty: () => boolean } }) =>
                  setHasSelection(!event.selection.isEmpty()),
              );
              editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                () => runRef.current(selectedSql() || undefined),
              );
            }}
            loading={
              <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                Loading SQL editor…
              </div>
            }
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              lineHeight: 23,
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              bracketPairColorization: { enabled: true },
              renderLineHighlight: 'all',
            }}
          />
        </div>

        <div className="flex min-h-0 flex-col border-t border-[var(--border)] bg-[var(--surface)]">
          <div
            className="flex h-11 shrink-0 items-center gap-5 border-b border-[var(--border)] px-4"
            role="tablist"
            aria-label="Write Lab output"
          >
            {(['output', 'schema', 'messages'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`h-full border-b-2 px-0.5 text-sm font-semibold capitalize ${activeTab === tab ? 'border-[var(--blue)] text-[var(--text)]' : 'border-transparent text-[var(--muted)]'}`}
              >
                {tab}
                {tab === 'schema' ? ` (${schema.length})` : ''}
              </button>
            ))}
          </div>
          <div className="result-scroll min-h-0 flex-1 overflow-auto p-4">
            {activeTab === 'output' ? (
              <div className="space-y-4">
                {gradeResult ? (
                  <section
                    className={`rounded-xl border p-4 ${gradeResult.passed ? 'border-[color:rgb(72_213_151_/_35%)] bg-[color:rgb(72_213_151_/_8%)]' : 'border-[color:rgb(246_199_111_/_35%)] bg-[color:rgb(246_199_111_/_7%)]'}`}
                  >
                    <div className="flex items-start gap-3">
                      {gradeResult.passed ? (
                        <CheckCircle2
                          size={20}
                          className="mt-0.5 shrink-0 text-[var(--green)]"
                        />
                      ) : (
                        <AlertTriangle
                          size={20}
                          className="mt-0.5 shrink-0 text-[#f6c76f]"
                        />
                      )}
                      <div>
                        <p className="text-sm font-bold">
                          {gradeResult.passed
                            ? 'Challenge passed'
                            : 'Not quite yet'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted-bright)]">
                          {gradeResult.feedback}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}
                {results.length ? (
                  <>
                    {results.map((result, resultIndex) => (
                      <section
                        key={resultIndex}
                        className="overflow-hidden rounded-xl border border-[var(--border)]"
                      >
                        <div className="flex items-center justify-between bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--muted-bright)]">
                          <span>Result {resultIndex + 1}</span>
                          <span>
                            {result.rowCount} row(s)
                            {result.truncated ? ' · showing first 1,000' : ''}
                          </span>
                        </div>
                        <div className="overflow-auto">
                          <table className="w-full border-collapse text-left text-sm">
                            <thead className="sticky top-0 bg-[#101722]">
                              <tr>
                                {result.columns.map((column) => (
                                  <th
                                    key={column}
                                    className="whitespace-nowrap border-b border-r border-[var(--border)] px-3 py-2 font-semibold text-[var(--blue-bright)]"
                                  >
                                    {column}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.values.map((row, rowIndex) => (
                                <tr
                                  key={rowIndex}
                                  className="odd:bg-white/[0.015] hover:bg-[color:rgb(109_141_255_/_5%)]"
                                >
                                  {row.map((value, columnIndex) => (
                                    <td
                                      key={columnIndex}
                                      className="whitespace-nowrap border-b border-r border-[var(--border)] px-3 py-2 font-mono text-xs text-[var(--muted-bright)]"
                                    >
                                      {displayValue(value)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ))}
                  </>
                ) : !gradeResult ? (
                  <div className="flex h-full min-h-36 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center">
                    <div>
                      <CheckCircle2
                        className="mx-auto text-[var(--green)]"
                        size={24}
                      />
                      <p className="mt-3 text-sm font-semibold">
                        Ready to run a script
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        DDL and data-changing statements report completion here.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {activeTab === 'schema' ? (
              <div className="grid gap-3 md:grid-cols-2">
                {schema.map((item) => (
                  <article
                    key={`${item.type}-${item.name}`}
                    className="rounded-xl border border-[var(--border)] bg-[#0b1018] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Table2
                        size={15}
                        className={
                          item.type === 'table'
                            ? 'text-[var(--green)]'
                            : 'text-[var(--violet)]'
                        }
                      />
                      <strong className="text-sm">{item.name}</strong>
                      <span className="ml-auto rounded bg-[var(--surface-muted)] px-2 py-0.5 text-xs uppercase text-[var(--muted)]">
                        {item.type}
                      </span>
                    </div>
                    <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-[var(--muted-bright)]">
                      {item.sql ?? 'Created automatically by SQLite'}
                    </pre>
                  </article>
                ))}
              </div>
            ) : null}
            {activeTab === 'messages' ? (
              <div className="space-y-3">
                <div
                  className={`rounded-xl border p-4 ${error ? 'border-[color:rgb(255_107_135_/_35%)] bg-[color:rgb(255_107_135_/_7%)]' : 'border-[color:rgb(72_213_151_/_25%)] bg-[color:rgb(72_213_151_/_5%)]'}`}
                >
                  <div className="flex items-start gap-3">
                    {error ? (
                      <AlertTriangle
                        size={18}
                        className="mt-0.5 shrink-0 text-[var(--red)]"
                      />
                    ) : (
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-[var(--green)]"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {error ? 'SQLite error' : 'Lab message'}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap font-mono text-xs leading-5 text-[var(--muted-bright)]">
                        {error || message}
                      </p>
                      {error ? (
                        <button
                          type="button"
                          onClick={() => void askMentorForFix()}
                          disabled={fixing}
                          className="mt-3 flex items-center gap-1.5 rounded-lg border border-[color:rgb(255_107_135_/_30%)] bg-[color:rgb(255_107_135_/_8%)] px-3 py-2 text-xs font-semibold text-[#ff9daf] hover:bg-[color:rgb(255_107_135_/_14%)] disabled:opacity-50"
                        >
                          <WandSparkles size={13} />
                          {fixing ? 'Reviewing error…' : 'Fix with mentor'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                {fixError ? (
                  <div className="flex items-start gap-2 rounded-xl border border-[color:rgb(255_107_135_/_25%)] bg-[color:rgb(255_107_135_/_5%)] p-3 text-xs text-[#ff9daf]">
                    <AlertTriangle size={15} className="shrink-0" />
                    {fixError}
                  </div>
                ) : null}
                {fix ? (
                  <section className="rounded-xl border border-[color:rgb(109_141_255_/_35%)] bg-[color:rgb(109_141_255_/_7%)] p-4">
                    <div className="flex items-center gap-2">
                      <WandSparkles
                        size={16}
                        className="text-[var(--blue-bright)]"
                      />
                      <h3 className="text-sm font-bold">Mentor suggestion</h3>
                      <span className="ml-auto rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        {fix.source}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[var(--muted-bright)]">
                      {fix.error_explanation}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[var(--text)]">
                      {fix.reason}
                    </p>
                    <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[#080d14] p-3 font-mono text-xs leading-5 text-[var(--muted-bright)]">
                      {fix.corrected_sql}
                    </pre>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={applyFix}
                        disabled={
                          !fix.has_error ||
                          fix.corrected_sql === lastExecutedSql
                        }
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--blue)] px-3 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Check size={13} />
                        Apply to editor
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void navigator.clipboard.writeText(fix.corrected_sql)
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted-bright)] hover:bg-[var(--surface-muted)]"
                      >
                        <Clipboard size={13} />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => setFix(null)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        <X size={13} />
                        Dismiss
                      </button>
                    </div>
                    <p className="mt-3 text-[10px] leading-4 text-[var(--muted)]">
                      Applying only edits the SQL. Nothing runs until you press
                      Run script or Run selection.
                    </p>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
            {message}
          </div>
        </div>
      </div>
    </>
  );
}

export function WriteLabContextPanel() {
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress>(
    {},
  );
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => setChallengeProgress(loadChallengeProgress()),
      0,
    );
    const updateProgress = (event: Event) => {
      setChallengeProgress(
        (event as CustomEvent<ChallengeProgress>).detail ??
          loadChallengeProgress(),
      );
    };
    window.addEventListener('write-lab-progress', updateProgress);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener('write-lab-progress', updateProgress);
    };
  }, []);

  const completedChallenges = CHALLENGES.filter(
    (challenge) => challengeProgress[challenge.id]?.passed,
  ).length;
  const completionPercent = Math.round(
    (completedChallenges / CHALLENGES.length) * 100,
  );

  const resetProgress = () => {
    if (!window.confirm('Clear your challenge attempts and completion badges?'))
      return;
    const progress = clearChallengeProgress();
    setChallengeProgress(progress);
    setSelectedChallenge(null);
    window.dispatchEvent(
      new CustomEvent('write-lab-progress', { detail: progress }),
    );
  };

  return (
    <aside className="app-mentor overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:rgb(72_213_151_/_10%)] text-[var(--green)]">
          <FlaskConical size={18} />
        </div>
        <div>
          <p className="text-sm font-bold">Write Lab</p>
          <p className="text-xs text-[var(--green)]">Phase 15 · ready</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-[color:rgb(246_199_111_/_25%)] bg-[color:rgb(246_199_111_/_4%)] p-4">
        <div className="flex items-center gap-2">
          <Award size={17} className="text-[#f6c76f]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#f6c76f]">
            SQL challenges
          </p>
          <span className="ml-auto text-xs font-semibold text-[var(--muted-bright)]">
            {completedChallenges}/{CHALLENGES.length}
          </span>
        </div>
        <div className="mt-3">
          <progress
            aria-label="SQL challenge completion"
            max={CHALLENGES.length}
            value={completedChallenges}
            className="h-1.5 w-full accent-[var(--green)]"
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted)]">
            <span>{completionPercent}% complete on this device</span>
            {Object.keys(challengeProgress).length ? (
              <button
                type="button"
                onClick={resetProgress}
                className="font-semibold hover:text-[var(--text)]"
              >
                Reset progress
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {CHALLENGES.map((challenge) => {
            const progress = challengeProgress[challenge.id];
            return (
              <button
                key={challenge.id}
                type="button"
                onClick={() => {
                  setSelectedChallenge(challenge.id);
                  window.dispatchEvent(
                    new CustomEvent('write-lab-challenge', {
                      detail: {
                        id: challenge.id,
                        sql: challenge.sql,
                        title: challenge.title,
                      },
                    }),
                  );
                }}
                className={`w-full rounded-lg border bg-[#0b1018] p-3 text-left ${progress?.passed ? 'border-[color:rgb(72_213_151_/_38%)]' : selectedChallenge === challenge.id ? 'border-[color:rgb(246_199_111_/_45%)]' : 'border-[var(--border)] hover:border-[color:rgb(246_199_111_/_38%)]'}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <strong className="flex items-center gap-1.5 text-sm text-[var(--text)]">
                    {progress?.passed ? (
                      <CheckCircle2 size={14} className="text-[var(--green)]" />
                    ) : null}
                    {challenge.title}
                  </strong>
                  <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                    {challenge.difficulty}
                  </span>
                </span>
                <span className="mt-1.5 block text-xs leading-5 text-[var(--muted-bright)]">
                  {challenge.prompt}
                </span>
                <span className="mt-1 flex items-center justify-between gap-2 text-[11px] leading-4 text-[var(--muted)]">
                  <span>Hint: {challenge.hint}</span>
                  {progress ? (
                    <span className="shrink-0 font-semibold">
                      {progress.attempts} attempt
                      {progress.attempts === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <ShieldCheck size={18} className="text-[var(--green)]" />
        <h2 className="mt-3 text-sm font-bold">Safe SQL sandbox</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-bright)]">
          Create, alter, insert, update, delete, drop, and use transactions in a
          disposable SQLite database. CollegeDB is never modified.
        </p>
      </div>
      <div className="mt-3 rounded-xl border border-[var(--border)] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          Try an example
        </p>
        <div className="mt-3 space-y-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('write-lab-example', { detail: example.sql }),
                )
              }
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[#0b1018] px-3 py-2.5 text-left text-sm text-[var(--muted-bright)] hover:border-[var(--border-bright)] hover:text-[var(--text)]"
            >
              <FileCode2 size={14} className="text-[var(--blue-bright)]" />
              {example.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-2 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted-bright)]">
        <p className="flex items-center gap-2">
          <FileUp size={15} className="text-[var(--green)]" />
          Open SQLite files up to 20 MB
        </p>
        <p className="flex items-center gap-2">
          <CodeXml size={15} className="text-[var(--blue-bright)]" />
          Run highlighted statements
        </p>
        <p className="flex items-center gap-2">
          <Box size={15} className="text-[var(--violet)]" />
          Database restores on this device
        </p>
        <p className="flex items-center gap-2">
          <Undo2 size={15} className="text-[var(--blue-bright)]" />
          Undo the last run, reset, or import
        </p>
        <p className="flex items-center gap-2">
          <TimerReset size={15} className="text-[#f6c76f]" />
          5-second safety limit
        </p>
        <p className="flex items-center gap-2">
          <Download size={15} className="text-[var(--blue-bright)]" />
          Export for a portable backup
        </p>
      </div>
      <div className="mt-3 rounded-xl border border-[color:rgb(109_141_255_/_25%)] bg-[color:rgb(109_141_255_/_5%)] p-4">
        <WandSparkles size={18} className="text-[var(--blue-bright)]" />
        <h2 className="mt-3 text-sm font-bold">Mentor-assisted repairs</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-bright)]">
          After a failed run, open Messages and choose Fix with mentor. The
          suggestion uses your current schema and only changes the editor after
          you approve it.
        </p>
      </div>
      <div className="mt-3 rounded-xl border border-dashed border-[color:rgb(246_199_111_/_30%)] bg-[color:rgb(246_199_111_/_5%)] p-3 text-xs leading-5 text-[var(--muted-bright)]">
        <strong className="text-[#f6c76f]">SQLite only.</strong> MySQL,
        PostgreSQL, Oracle, and SQL Server procedures or vendor-specific syntax
        need their own database engine.
      </div>
    </aside>
  );
}
