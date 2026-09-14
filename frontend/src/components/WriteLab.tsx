'use client';

import Editor from '@monaco-editor/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Cloud,
  CloudOff,
  CodeXml,
  CornerDownLeft,
  Download,
  Eye,
  FileCode2,
  FileUp,
  HardDrive,
  Lightbulb,
  MessageSquareText,
  MoreHorizontal,
  Play,
  RotateCcw,
  Sparkles,
  Table2,
  Target,
  Trophy,
  Trash2,
  Undo2,
  WandSparkles,
  X,
} from 'lucide-react';

import {
  askEditableMentor,
  clearChallengeProgressCloud,
  clearMentorConversation,
  fixWriteQuery,
  getChallengeProgressCloud,
  getMentorConversation,
  syncChallengeProgressCloud,
  type ChallengeProgressItem,
  type FixResponse,
  type MentorConversationItem,
  type SchemaResponse,
} from '../services/api';
import {
  challengeProgressEntries,
  clearChallengeProgress,
  loadChallengeProgress,
  mergeChallengeProgress,
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
import { ErDiagram } from './ErDiagram';

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
  diagram?: SchemaResponse;
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
type WriteLabMentorContext = {
  currentSql: string;
  schema: string;
  databaseError: string;
  databaseName: string;
};

const EMPLOYEE_SETUP_SQL = `-- Shared sample data used by this program.
CREATE TABLE IF NOT EXISTS Department (
  department_id INTEGER PRIMARY KEY,
  department_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Employee (
  employee_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  salary REAL NOT NULL,
  department_id INTEGER NOT NULL,
  FOREIGN KEY (department_id) REFERENCES Department(department_id)
);

INSERT OR IGNORE INTO Department (department_id, department_name)
VALUES (1, 'Engineering'),
       (2, 'Design'),
       (3, 'Marketing');

INSERT OR IGNORE INTO Employee (employee_id, name, salary, department_id)
VALUES (1, 'Rahul', 45000, 1),
       (2, 'Priya', 52000, 2),
       (3, 'Aman', 48000, 1),
       (4, 'Neha', 56000, 2),
       (5, 'Vikram', 41000, 1);`;

const STARTER_SCRIPT = `-- Safe to run again: existing tables and rows are preserved.
${EMPLOYEE_SETUP_SQL}

SELECT e.name, e.salary, d.department_name
FROM Employee AS e
JOIN Department AS d ON d.department_id = e.department_id
ORDER BY e.salary DESC;`;

const LEGACY_STARTER_SCRIPT = STARTER_SCRIPT.replaceAll(' IF NOT EXISTS', '')
  .replaceAll(' OR IGNORE', '')
  .replace(
    '-- Safe to run again: existing tables and rows are preserved.',
    '-- Create two related tables, insert data, and run the program.',
  );

const EXAMPLE_GROUPS = [
  {
    category: 'SQL basics',
    examples: [
      {
        label: 'Create tables + insert rows',
        description: 'Build two related tables and display their data.',
        sql: STARTER_SCRIPT,
      },
      {
        label: 'Filter, sort + limit',
        description: 'Find the three highest salaries above a value.',
        sql: `${EMPLOYEE_SETUP_SQL}

SELECT name, salary
FROM Employee
WHERE salary >= 45000
ORDER BY salary DESC
LIMIT 3;`,
      },
      {
        label: 'CASE expression',
        description: 'Create a calculated salary band for every row.',
        sql: `${EMPLOYEE_SETUP_SQL}

SELECT name,
       salary,
       CASE
         WHEN salary >= 55000 THEN 'Senior band'
         WHEN salary >= 45000 THEN 'Mid band'
         ELSE 'Entry band'
       END AS salary_band
FROM Employee
ORDER BY salary DESC;`,
      },
    ],
  },
  {
    category: 'Joins + analysis',
    examples: [
      {
        label: 'INNER JOIN',
        description: 'Match each employee to their department.',
        sql: `${EMPLOYEE_SETUP_SQL}

SELECT e.employee_id, e.name, d.department_name
FROM Employee AS e
INNER JOIN Department AS d
  ON d.department_id = e.department_id
ORDER BY d.department_name, e.name;`,
      },
      {
        label: 'LEFT JOIN + count',
        description: 'Keep departments that currently have no employees.',
        sql: `${EMPLOYEE_SETUP_SQL}

SELECT d.department_name,
       COUNT(e.employee_id) AS employee_count
FROM Department AS d
LEFT JOIN Employee AS e
  ON e.department_id = d.department_id
GROUP BY d.department_id, d.department_name
ORDER BY employee_count DESC, d.department_name;`,
      },
      {
        label: 'GROUP BY + HAVING',
        description: 'Compare department averages and filter the groups.',
        sql: `${EMPLOYEE_SETUP_SQL}

SELECT d.department_name,
       ROUND(AVG(e.salary), 2) AS average_salary,
       COUNT(*) AS team_size
FROM Employee AS e
JOIN Department AS d
  ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name
HAVING AVG(e.salary) >= 45000
ORDER BY average_salary DESC;`,
      },
      {
        label: 'Subquery',
        description: 'Return employees earning above the overall average.',
        sql: `${EMPLOYEE_SETUP_SQL}

SELECT name, salary
FROM Employee
WHERE salary > (SELECT AVG(salary) FROM Employee)
ORDER BY salary DESC;`,
      },
      {
        label: 'CTE + window rank',
        description: 'Rank salaries inside each department.',
        sql: `${EMPLOYEE_SETUP_SQL}

WITH ranked_employees AS (
  SELECT e.name,
         d.department_name,
         e.salary,
         DENSE_RANK() OVER (
           PARTITION BY e.department_id
           ORDER BY e.salary DESC
         ) AS salary_rank
  FROM Employee AS e
  JOIN Department AS d
    ON d.department_id = e.department_id
)
SELECT *
FROM ranked_employees
ORDER BY department_name, salary_rank;`,
      },
    ],
  },
  {
    category: 'Change data safely',
    examples: [
      {
        label: 'UPDATE rows',
        description: 'Apply a targeted raise and inspect the result.',
        sql: `${EMPLOYEE_SETUP_SQL}

UPDATE Employee
SET salary = salary + 2500
WHERE department_id = 1;

SELECT employee_id, name, salary
FROM Employee
WHERE department_id = 1
ORDER BY salary DESC;`,
      },
      {
        label: 'DELETE rows',
        description: 'Remove completed tasks without touching other rows.',
        sql: `CREATE TABLE IF NOT EXISTS TaskDemo (
  task_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'done'))
);

INSERT OR IGNORE INTO TaskDemo (task_id, title, status)
VALUES (1, 'Design schema', 'done'),
       (2, 'Write queries', 'open'),
       (3, 'Review output', 'done');

DELETE FROM TaskDemo
WHERE status = 'done';

SELECT * FROM TaskDemo ORDER BY task_id;`,
      },
      {
        label: 'Transaction + rollback',
        description: 'Try a transfer, inspect it, then undo the change.',
        sql: `CREATE TABLE IF NOT EXISTS WalletDemo (
  wallet_id INTEGER PRIMARY KEY,
  owner TEXT NOT NULL,
  balance REAL NOT NULL CHECK (balance >= 0)
);

INSERT OR IGNORE INTO WalletDemo (wallet_id, owner, balance)
VALUES (1, 'Asha', 1000), (2, 'Kabir', 600);

BEGIN;
UPDATE WalletDemo SET balance = balance - 200 WHERE wallet_id = 1;
UPDATE WalletDemo SET balance = balance + 200 WHERE wallet_id = 2;
SELECT 'Before rollback' AS stage, * FROM WalletDemo;
ROLLBACK;

SELECT 'After rollback' AS stage, * FROM WalletDemo;`,
      },
    ],
  },
  {
    category: 'Schema + performance',
    examples: [
      {
        label: 'Constraints',
        description: 'Use primary, unique, default, and check constraints.',
        sql: `CREATE TABLE IF NOT EXISTS CourseDemo (
  course_id INTEGER PRIMARY KEY,
  course_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3 CHECK (credits BETWEEN 1 AND 6)
);

INSERT OR IGNORE INTO CourseDemo (course_id, course_code, title, credits)
VALUES (1, 'DBMS101', 'Database Fundamentals', 4),
       (2, 'SQL201', 'Advanced SQL', 3);

SELECT * FROM CourseDemo ORDER BY course_code;`,
      },
      {
        label: 'Create + query a view',
        description: 'Save a reusable query as a database view.',
        sql: `${EMPLOYEE_SETUP_SQL}

DROP VIEW IF EXISTS HighEarners;
CREATE VIEW HighEarners AS
SELECT e.name, e.salary, d.department_name
FROM Employee AS e
JOIN Department AS d
  ON d.department_id = e.department_id
WHERE e.salary >= 50000;

SELECT * FROM HighEarners ORDER BY salary DESC;`,
      },
      {
        label: 'Index + query plan',
        description: 'Create an index and inspect how SQLite uses it.',
        sql: `${EMPLOYEE_SETUP_SQL}

CREATE INDEX IF NOT EXISTS idx_employee_department
ON Employee(department_id);

PRAGMA optimize;

EXPLAIN QUERY PLAN
SELECT *
FROM Employee
WHERE department_id = 1;`,
      },
    ],
  },
] as const;

const CHALLENGES = [
  {
    id: 'students-above-80',
    title: 'Students above 80',
    difficulty: 'Beginner',
    topic: 'Filtering',
    prompt: 'Return name and marks for students above 80, highest mark first.',
    hint: 'Filter the rows before sorting the result.',
    deepHint: 'Use WHERE marks > 80 and ORDER BY marks DESC.',
    solution: `SELECT name, marks
FROM Student
WHERE marks > 80
ORDER BY marks DESC;`,
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
    topic: 'Aggregation',
    prompt:
      'Return every department name and its student_count, alphabetically.',
    hint: 'One result row per department requires grouping.',
    deepHint:
      'Use LEFT JOIN, COUNT(s.student_id) AS student_count, and GROUP BY dept_name.',
    solution: `SELECT d.dept_name AS department_name, COUNT(s.student_id) AS student_count
FROM Department AS d
LEFT JOIN Student AS s ON s.dept_id = d.dept_id
GROUP BY d.dept_name
ORDER BY d.dept_name;`,
    sql: `-- Return department_name and student_count for every department.
SELECT d.dept_name AS department_name, s.student_id
FROM Department AS d
LEFT JOIN Student AS s ON s.dept_id = d.dept_id
ORDER BY d.dept_name;`,
  },
  {
    id: 'top-student',
    title: 'Top student',
    difficulty: 'Beginner',
    topic: 'Sorting',
    prompt: 'Return only the name and marks of the highest-scoring student.',
    hint: 'Sorting can place the maximum mark in the first row.',
    deepHint: 'Use ORDER BY marks DESC followed by LIMIT 1.',
    solution: `SELECT name, marks
FROM Student
ORDER BY marks DESC
LIMIT 1;`,
    sql: `-- Return only the highest-scoring student.
SELECT name, marks
FROM Student
ORDER BY marks DESC;`,
  },
  {
    id: 'student-departments',
    title: 'Student departments',
    difficulty: 'Intermediate',
    topic: 'JOIN',
    prompt: 'Return each student name and department_name, sorted by name.',
    hint: 'The two tables share a department identifier.',
    deepHint:
      'Select d.dept_name AS department_name, match the department IDs, then sort by s.name.',
    solution: `SELECT s.name, d.dept_name AS department_name
FROM Student AS s
JOIN Department AS d ON d.dept_id = s.dept_id
ORDER BY s.name;`,
    sql: `-- Match every student to a department.
SELECT s.name, d.dept_name AS department_name
FROM Student AS s
JOIN Department AS d
ORDER BY s.name;`,
  },
  {
    id: 'department-averages',
    title: 'Department averages',
    difficulty: 'Advanced',
    topic: 'Aggregation',
    prompt:
      'Return department_name and average_marks rounded to 1 decimal, highest first.',
    hint: 'Calculate one aggregate value for each department group.',
    deepHint:
      'Use ROUND(AVG(s.marks), 1) AS average_marks, GROUP BY dept_name, then sort the alias descending.',
    solution: `SELECT d.dept_name AS department_name, ROUND(AVG(s.marks), 1) AS average_marks
FROM Department AS d
JOIN Student AS s ON s.dept_id = d.dept_id
GROUP BY d.dept_name
ORDER BY average_marks DESC;`,
    sql: `-- Calculate one average_marks value per department.
SELECT d.dept_name AS department_name, s.marks
FROM Department AS d
JOIN Student AS s ON s.dept_id = d.dept_id
ORDER BY s.marks DESC;`,
  },
  {
    id: 'above-average-students',
    title: 'Above-average students',
    difficulty: 'Advanced',
    topic: 'Subquery',
    prompt:
      'Return name and marks for students above the overall average, highest first.',
    hint: 'The comparison value can come from a query inside WHERE.',
    deepHint:
      'Compare marks with (SELECT AVG(marks) FROM Student), then sort descending.',
    solution: `SELECT name, marks
FROM Student
WHERE marks > (SELECT AVG(marks) FROM Student)
ORDER BY marks DESC;`,
    sql: `-- Return students whose marks exceed the overall average.
SELECT name, marks
FROM Student
WHERE marks > 0
ORDER BY marks DESC;`,
  },
];

function dispatchChallenge(challenge: (typeof CHALLENGES)[number]) {
  window.dispatchEvent(
    new CustomEvent('write-lab-challenge', {
      detail: {
        id: challenge.id,
        sql: challenge.sql,
        title: challenge.title,
      },
    }),
  );
}

function cloudItemsToChallengeProgress(items: ChallengeProgressItem[]) {
  const progress: ChallengeProgress = {};
  for (const item of items) {
    const updatedAt = Date.parse(`${item.updated_at.replace(' ', 'T')}Z`);
    progress[item.challenge_id] = {
      attempts: item.attempts,
      failedAttempts: item.failed_attempts,
      passed: Boolean(item.passed),
      passedAt: item.passed_at,
      lastAttemptAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    };
  }
  return progress;
}

function displayValue(value: SqlValue) {
  if (value === null)
    return <span className="italic text-[var(--muted)]">NULL</span>;
  if (value instanceof Uint8Array) return `<BLOB ${value.byteLength} bytes>`;
  return String(value);
}

function quoteSqlIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

type ReportFormat = 'pdf' | 'doc' | 'txt';
type LabReport = {
  databaseName: string;
  sql: string;
  lastExecutedSql: string;
  message: string;
  error: string;
  results: ResultSet[];
  schema: SchemaObject[];
  diagram: SchemaResponse | null;
};

function reportValue(value: SqlValue) {
  if (value === null) return 'NULL';
  if (value instanceof Uint8Array) return `<BLOB ${value.byteLength} bytes>`;
  return String(value);
}

function escapeReportHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function reportSteps(sql: string) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement, index) => {
      const type =
        statement
          .match(
            /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|SELECT|WITH|PRAGMA|BEGIN|COMMIT|ROLLBACK)\b/i,
          )?.[1]
          ?.toUpperCase() ?? 'SQL';
      return `${index + 1}. ${type} statement processed`;
    });
}

function resultText(result: ResultSet) {
  const rows = [result.columns, ...result.values].map((row) =>
    row.map((value) => reportValue(value)).join(' | '),
  );
  return `${rows.join('\n')}\n${result.rowCount} row(s)${result.truncated ? ' · preview truncated' : ''}`;
}

function buildTextReport(report: LabReport) {
  const intermediate = report.results.slice(0, -1);
  const finalResult = report.results.at(-1);
  return [
    'APEXDB MENTOR — EXECUTION REPORT',
    `Generated: ${new Date().toLocaleString()}`,
    `Database: ${report.databaseName}`,
    '',
    '1. USER INPUTS',
    report.sql || 'No SQL input.',
    '',
    '2. PROCESSING STEPS',
    reportSteps(report.lastExecutedSql).join('\n') ||
      'No script has been executed yet.',
    '',
    '3. INTERMEDIATE RESULTS',
    intermediate.length
      ? intermediate
          .map((result, index) => `Result ${index + 1}\n${resultText(result)}`)
          .join('\n\n')
      : 'No intermediate result sets.',
    '',
    '4. FINAL OUTPUT',
    report.error
      ? `Execution error: ${report.error}`
      : finalResult
        ? resultText(finalResult)
        : report.message,
    '',
    '5. TABLES AND ER RELATIONSHIPS',
    report.schema.length
      ? report.schema
          .map((item) => `${item.type.toUpperCase()}: ${item.name}`)
          .join('\n')
      : 'No schema objects.',
    report.diagram?.relationships.length
      ? report.diagram.relationships
          .map(
            (item) =>
              `${item.from_table}.${item.from_column} → ${item.to_table}.${item.to_column}`,
          )
          .join('\n')
      : 'No foreign-key relationships.',
  ].join('\n');
}

function buildHtmlReport(report: LabReport) {
  const sections = report.results
    .map(
      (result, index) =>
        `<section><h3>${
          index === report.results.length - 1
            ? 'Final output'
            : `Intermediate result ${index + 1}`
        }</h3><div class="table-wrap"><table><thead><tr>${result.columns
          .map((column) => `<th>${escapeReportHtml(column)}</th>`)
          .join('')}</tr></thead><tbody>${result.values
          .map(
            (row) =>
              `<tr>${row
                .map(
                  (value) => `<td>${escapeReportHtml(reportValue(value))}</td>`,
                )
                .join('')}</tr>`,
          )
          .join('')}</tbody></table></div><p>${result.rowCount} row(s)${
          result.truncated ? ' · preview truncated' : ''
        }</p></section>`,
    )
    .join('');
  const relationships =
    report.diagram?.relationships
      .map(
        (item) =>
          `<li><code>${escapeReportHtml(item.from_table)}.${escapeReportHtml(item.from_column)}</code> → <code>${escapeReportHtml(item.to_table)}.${escapeReportHtml(item.to_column)}</code></li>`,
      )
      .join('') || '<li>No foreign-key relationships.</li>';
  return `<!doctype html><html><head><meta charset="utf-8"><title>ApexDB Mentor execution report</title><style>
  body{font:15px/1.55 Arial,sans-serif;color:#172033;max-width:960px;margin:0 auto;padding:38px}h1{color:#4f46e5;margin-bottom:4px}h2{margin-top:32px;border-bottom:1px solid #d8deea;padding-bottom:6px}h3{margin-top:22px}pre{white-space:pre-wrap;background:#f4f6fb;border:1px solid #d8deea;border-radius:8px;padding:14px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd4e3;padding:8px;text-align:left}th{background:#eef1f8}.meta{color:#566176}.table-wrap{overflow:auto}code{color:#4338ca}@media print{body{padding:0}.table-wrap{overflow:visible}}
  </style></head><body><h1>ApexDB Mentor</h1><p class="meta">Execution report · ${escapeReportHtml(new Date().toLocaleString())} · ${escapeReportHtml(report.databaseName)}</p>
  <h2>1. User inputs</h2><pre>${escapeReportHtml(report.sql || 'No SQL input.')}</pre>
  <h2>2. Processing steps</h2><ol>${
    reportSteps(report.lastExecutedSql)
      .map(
        (step) => `<li>${escapeReportHtml(step.replace(/^\d+\.\s*/, ''))}</li>`,
      )
      .join('') || '<li>No script has been executed yet.</li>'
  }</ol>
  <h2>3–4. Intermediate results and final output</h2>${sections || `<p>${escapeReportHtml(report.error || report.message)}</p>`}
  ${report.error ? `<p><strong>Execution error:</strong> ${escapeReportHtml(report.error)}</p>` : ''}
  <h2>5. Tables and ER relationships</h2><p>${report.schema.length ? report.schema.map((item) => `${escapeReportHtml(item.type)}: <strong>${escapeReportHtml(item.name)}</strong>`).join(' · ') : 'No schema objects.'}</p><ul>${relationships}</ul>
  </body></html>`;
}

function downloadLabReport(format: ReportFormat, report: LabReport) {
  const filename = `apexdb-report-${new Date().toISOString().slice(0, 10)}`;
  if (format === 'pdf') {
    const reportUrl = URL.createObjectURL(
      new Blob([buildHtmlReport(report)], { type: 'text/html;charset=utf-8' }),
    );
    const printWindow = window.open(
      reportUrl,
      '_blank',
      'width=1000,height=800',
    );
    if (!printWindow) {
      URL.revokeObjectURL(reportUrl);
      return;
    }
    printWindow.addEventListener(
      'load',
      () => {
        printWindow.focus();
        printWindow.print();
        URL.revokeObjectURL(reportUrl);
      },
      { once: true },
    );
    return;
  }
  const content =
    format === 'doc' ? buildHtmlReport(report) : buildTextReport(report);
  const blob = new Blob([content], {
    type:
      format === 'doc'
        ? 'application/msword;charset=utf-8'
        : 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function WriteLab({
  mode = 'workspace',
  onOpenWorkspace,
}: {
  mode?: 'workspace' | 'diagram';
  onOpenWorkspace?: () => void;
}) {
  const [sql, setSql] = useState(STARTER_SCRIPT);
  const [results, setResults] = useState<ResultSet[]>([]);
  const [schema, setSchema] = useState<SchemaObject[]>([]);
  const [diagram, setDiagram] = useState<SchemaResponse | null>(null);
  const [selectedDiagramTable, setSelectedDiagramTable] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(
    'Loading the isolated SQLite database…',
  );
  const [activeTab, setActiveTab] = useState<
    'output' | 'schema' | 'er' | 'messages'
  >('output');
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [databaseName, setDatabaseName] = useState('ProgramDB');
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
    nextChallengeId?: string;
    failedAttempts?: number;
  } | null>(null);
  const [solutionVisible, setSolutionVisible] = useState(false);
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
            const recoveredSql = draft?.sql ?? snapshot.sql;
            const upgradedStarter = recoveredSql === LEGACY_STARTER_SCRIPT;
            setSql(upgradedStarter ? STARTER_SCRIPT : recoveredSql);
            setDatabaseName(draft?.databaseName ?? snapshot.databaseName);
            lastSnapshotRef.current = {
              sql: snapshot.sql,
              databaseName: snapshot.databaseName,
            };
            setSchema(response.schema ?? []);
            setDiagram(response.diagram ?? null);
            setLastSavedAt(snapshot.savedAt);
            setSaveState(
              draft && draft.savedAt > snapshot.savedAt ? 'draft' : 'saved',
            );
            setMessage(
              upgradedStarter
                ? 'Your database was restored and the starter SQL was updated so it can be run again safely.'
                : 'Your editable database and SQL draft were restored from this device.',
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
          setDiagram(response.diagram ?? null);
          setMessage(
            'ProgramDB is blank and ready. Run the starter program to create its tables and matching ER diagram.',
          );
          setReady(true);
          await persistDatabase(STARTER_SCRIPT, 'ProgramDB');
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
        setSolutionVisible(false);
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
    const createReport = (event: Event) => {
      const format = (event as CustomEvent<ReportFormat>).detail;
      if (!['pdf', 'doc', 'txt'].includes(format)) return;
      downloadLabReport(format, {
        databaseName,
        sql,
        lastExecutedSql,
        message,
        error,
        results,
        schema,
        diagram,
      });
    };
    window.addEventListener('write-lab-download', createReport);
    return () => window.removeEventListener('write-lab-download', createReport);
  }, [
    databaseName,
    diagram,
    error,
    lastExecutedSql,
    message,
    results,
    schema,
    sql,
  ]);

  useEffect(() => {
    const useChallenge = (event: Event) => {
      const detail = (
        event as CustomEvent<{ id?: string; sql?: string; title?: string }>
      ).detail;
      if (!detail?.id || !detail.sql) return;
      setSql(detail.sql);
      setActiveChallenge(detail.id);
      setGradeResult(null);
      setSolutionVisible(false);
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

  useEffect(() => {
    const shareMentorContext = () => {
      window.dispatchEvent(
        new CustomEvent<WriteLabMentorContext>('write-lab-context', {
          detail: {
            currentSql: sql,
            schema: schema
              .map((item) => item.sql)
              .filter((value): value is string => Boolean(value))
              .join('\n\n'),
            databaseError: error,
            databaseName,
          },
        }),
      );
    };
    const applyMentorSql = (event: Event) => {
      const nextSql = (event as CustomEvent<string>).detail?.trim();
      if (!nextSql) return;
      setSql(nextSql);
      setGradeResult(null);
      setSolutionVisible(false);
      setResults([]);
      setError('');
      setFix(null);
      setFixError('');
      setMessage(
        'AI Mentor example added to the editor. Review it, then run it when you are ready.',
      );
      setActiveTab('output');
    };

    window.addEventListener('write-lab-context-request', shareMentorContext);
    window.addEventListener('write-lab-mentor-apply', applyMentorSql);
    shareMentorContext();
    return () => {
      window.removeEventListener(
        'write-lab-context-request',
        shareMentorContext,
      );
      window.removeEventListener('write-lab-mentor-apply', applyMentorSql);
    };
  }, [databaseName, error, schema, sql]);

  const run = async (script = sql) => {
    if (!script.trim() || running) return;
    setRunning(true);
    setError('');
    setFix(null);
    setFixError('');
    setGradeResult(null);
    setSolutionVisible(false);
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
      setDiagram(response.diagram ?? null);
      if (/\b(?:CREATE|ALTER|DROP)\s+TABLE\b/i.test(script)) {
        setActiveTab('er');
      }
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
    setSolutionVisible(false);
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
      const activeIndex = CHALLENGES.findIndex(
        (challenge) => challenge.id === activeChallenge,
      );
      const nextChallenge = passed
        ? [
            ...CHALLENGES.slice(activeIndex + 1),
            ...CHALLENGES.slice(0, activeIndex),
          ].find((challenge) => !progress[challenge.id]?.passed)
        : undefined;
      setResults(response.results ?? []);
      setGradeResult({
        passed,
        feedback,
        nextChallengeId: nextChallenge?.id,
        failedAttempts: progress[activeChallenge]?.failedAttempts ?? 0,
      });
      window.dispatchEvent(
        new CustomEvent('write-lab-progress', { detail: progress }),
      );
      setMessage(
        `${passed ? 'Challenge passed' : 'Keep trying'} · ${(response.elapsedMs ?? 0).toFixed(1)} ms · ProgramDB was not changed.`,
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

  const openNextChallenge = () => {
    const nextChallenge = CHALLENGES.find(
      (challenge) => challenge.id === gradeResult?.nextChallengeId,
    );
    if (nextChallenge) dispatchChallenge(nextChallenge);
  };

  const activeChallengeDefinition = CHALLENGES.find(
    (challenge) => challenge.id === activeChallenge,
  );
  const activeDiagramTable =
    diagram?.tables.find((table) => table.name === selectedDiagramTable)
      ?.name ??
    diagram?.tables[0]?.name ??
    '';
  const activeDiagramTableData = diagram?.tables.find(
    (table) => table.name === activeDiagramTable,
  );

  const loadDiagramQuery = () => {
    if (!activeDiagramTableData) return;
    const nextSql = `SELECT *
FROM ${quoteSqlIdentifier(activeDiagramTableData.name)}
LIMIT 100;`;
    setSql(nextSql);
    setActiveChallenge(null);
    setGradeResult(null);
    setSolutionVisible(false);
    setResults([]);
    setError('');
    setFix(null);
    setFixError('');
    setMessage(
      `A safe SELECT for ${activeDiagramTableData.name} is ready. Choose Run script to view its rows.`,
    );
    setActiveTab('output');
  };

  const applyChallengeSolution = () => {
    if (!activeChallengeDefinition) return;
    setSql(activeChallengeDefinition.solution);
    setGradeResult(null);
    setSolutionVisible(false);
    setResults([]);
    setMessage(
      'Reviewed solution loaded in the editor. Check the answer to verify its result.',
    );
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
    setSolutionVisible(false);
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
          'The previous editable-database checkpoint is no longer available.',
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
      setDiagram(response.diagram ?? null);
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
        'Reset ProgramDB to a blank database and restore the starter SQL?',
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
      setDiagram(response.diagram ?? null);
      setResults([]);
      setDatabaseName('ProgramDB');
      setSql(STARTER_SCRIPT);
      await clearPracticeSnapshot().catch(() => undefined);
      await persistDatabase(STARTER_SCRIPT, 'ProgramDB');
      setMessage(
        'ProgramDB is blank again. Run the starter SQL to create its tables and ER diagram.',
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
        throw new Error(
          'SQLite files are limited to 20 MB in Editable Playground.',
        );
      const bytes = await file.arrayBuffer();
      await createCheckpoint(`Before opening ${file.name}`, sql, databaseName);
      const response = await request('import', { bytes }, 15000);
      if (!response.ok) throw new Error(response.error);
      setSchema(response.schema ?? []);
      setDiagram(response.diagram ?? null);
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

  if (mode === 'diagram') {
    return (
      <>
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--violet)]">
              Editable database
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">
              ER Diagram
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              A live, full-size map of the tables and relationships in{' '}
              {databaseName}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--muted-bright)]">
              {diagram?.tables.length ?? 0} tables
            </span>
            <span className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--muted-bright)]">
              {diagram?.relationships.length ?? 0} relationships
            </span>
            <button
              type="button"
              onClick={onOpenWorkspace}
              className="flex items-center gap-2 rounded-lg bg-[var(--blue)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--blue-bright)]"
            >
              <CodeXml size={15} />
              Open SQL Workspace
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden bg-[#0b1018] p-4">
          {!ready ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted)]">
              Loading your editable database diagram…
            </div>
          ) : diagram?.tables.length ? (
            <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--border)] shadow-2xl">
              <ErDiagram
                schema={{ ...diagram, database: databaseName }}
                selectedTable={activeDiagramTable}
                onSelectTable={setSelectedDiagramTable}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center">
              <div className="max-w-sm px-6">
                <Table2
                  className="mx-auto text-[var(--violet)]"
                  size={30}
                />
                <p className="mt-4 text-base font-semibold text-[var(--text)]">
                  No tables to map yet
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Create and run at least one table in the SQL Workspace. Its ER
                  diagram will appear here automatically.
                </p>
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="mt-4 rounded-lg bg-[var(--blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--blue-bright)]"
                >
                  Open SQL Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

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
          {hasSelection ? (
            <button
              type="button"
              onClick={runSelection}
              disabled={!ready || running}
              title="Run only the highlighted SQL"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40"
            >
              <CodeXml size={14} />
              Run selection
            </button>
          ) : null}
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
          <details className="group relative">
            <summary
              className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm font-medium text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
              aria-label="More database actions"
            >
              <MoreHorizontal size={15} />
              More
            </summary>
            <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1.5 text-[var(--text)] shadow-2xl">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={running}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileUp size={14} /> Open SQLite file
              </button>
              <button
                type="button"
                onClick={() => void undoLastRun()}
                disabled={!ready || running || !undoAvailable}
                title={undoLabel || 'Available after your first run'}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Undo2 size={14} /> {undoing ? 'Restoring…' : 'Undo last run'}
              </button>
              <button
                type="button"
                onClick={exportDatabase}
                disabled={!ready || running}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={14} /> Export database
              </button>
              <div className="my-1 h-px bg-[var(--border)]" />
              <button
                type="button"
                onClick={reset}
                disabled={running}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-[var(--red)] hover:bg-[color:rgb(255_107_135_/_10%)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw size={14} /> Reset database
              </button>
            </div>
          </details>
        </div>
        <div className="hidden items-center sm:flex">
          <span
            title={
              lastSavedAt
                ? `Last database snapshot: ${new Date(lastSavedAt).toLocaleString()}`
                : undefined
            }
            className={`flex items-center gap-2 text-xs font-medium ${saveState === 'unavailable' ? 'text-[#f6c76f]' : 'text-[var(--muted)]'}`}
          >
            <HardDrive size={14} />
            {saveLabel}
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
            aria-label="Editable Playground output"
          >
            {(['output', 'er', 'schema', 'messages'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`h-full border-b-2 px-0.5 text-sm font-semibold capitalize ${activeTab === tab ? 'border-[var(--blue)] text-[var(--text)]' : 'border-transparent text-[var(--muted)]'}`}
              >
                {tab === 'er' ? 'ER diagram' : tab}
                {tab === 'schema' ? ` (${schema.length})` : ''}
                {tab === 'er' ? ` (${diagram?.tables.length ?? 0})` : ''}
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
                        {gradeResult.passed && gradeResult.nextChallengeId ? (
                          <button
                            type="button"
                            onClick={openNextChallenge}
                            className="mt-3 flex items-center gap-1.5 rounded-lg border border-[color:rgb(72_213_151_/_30%)] bg-[color:rgb(72_213_151_/_8%)] px-3 py-2 text-xs font-semibold text-[var(--green)] hover:bg-[color:rgb(72_213_151_/_13%)]"
                          >
                            Next challenge
                            <ArrowRight size={13} />
                          </button>
                        ) : null}
                        {!gradeResult.passed && activeChallengeDefinition ? (
                          <div className="mt-3 rounded-lg border border-[color:rgb(246_199_111_/_22%)] bg-black/10 p-3">
                            <p className="flex items-start gap-2 text-xs leading-5 text-[var(--muted-bright)]">
                              <Lightbulb
                                size={14}
                                className="mt-0.5 shrink-0 text-[#f6c76f]"
                              />
                              {gradeResult.failedAttempts &&
                              gradeResult.failedAttempts > 1
                                ? activeChallengeDefinition.deepHint
                                : activeChallengeDefinition.hint}
                            </p>
                            {(gradeResult.failedAttempts ?? 0) >= 3 ? (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSolutionVisible((visible) => !visible)
                                  }
                                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                                >
                                  <Eye size={13} />
                                  {solutionVisible
                                    ? 'Hide solution'
                                    : 'Reveal solution'}
                                </button>
                                {solutionVisible ? (
                                  <div className="mt-3">
                                    <pre className="overflow-auto rounded-lg border border-[var(--border)] bg-[#080d14] p-3 font-mono text-xs leading-5 text-[var(--muted-bright)]">
                                      {activeChallengeDefinition.solution}
                                    </pre>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={applyChallengeSolution}
                                        className="flex items-center gap-1.5 rounded-lg bg-[var(--blue)] px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
                                      >
                                        <Check size={13} />
                                        Load in editor
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void navigator.clipboard.writeText(
                                            activeChallengeDefinition.solution,
                                          )
                                        }
                                        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted-bright)] hover:bg-[var(--surface-raised)]"
                                      >
                                        <Clipboard size={13} />
                                        Copy
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <p className="mt-2 text-[11px] text-[var(--muted)]">
                                {3 - (gradeResult.failedAttempts ?? 0)} more
                                failed{' '}
                                {3 - (gradeResult.failedAttempts ?? 0) === 1
                                  ? 'check'
                                  : 'checks'}{' '}
                                unlocks the reviewed solution.
                              </p>
                            )}
                          </div>
                        ) : null}
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
            {activeTab === 'er' ? (
              diagram?.tables.length ? (
                <div className="space-y-3">
                  {activeDiagramTableData ? (
                    <section className="flex flex-col gap-3 rounded-xl border border-[color:rgb(109_141_255_/_28%)] bg-[color:rgb(109_141_255_/_6%)] p-4 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Table2
                            size={17}
                            className="text-[var(--blue-bright)]"
                          />
                          <h2 className="font-semibold text-[var(--text)]">
                            {activeDiagramTableData.name}
                          </h2>
                          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--muted)]">
                            {activeDiagramTableData.kind}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[var(--muted-bright)]">
                          {activeDiagramTableData.row_count} row(s) ·{' '}
                          {activeDiagramTableData.columns.length} column(s) ·{' '}
                          {
                            activeDiagramTableData.columns.filter(
                              (column) => column.primary_key,
                            ).length
                          }{' '}
                          primary key column(s) ·{' '}
                          {
                            activeDiagramTableData.columns.filter(
                              (column) => column.foreign_key,
                            ).length
                          }{' '}
                          foreign key column(s)
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {activeDiagramTableData.columns.map((column) => (
                            <span
                              key={column.name}
                              title={
                                column.foreign_key
                                  ? `References ${column.foreign_key.table}.${column.foreign_key.column}`
                                  : undefined
                              }
                              className={`rounded-md border px-2 py-1 font-mono text-[11px] ${column.primary_key ? 'border-[color:rgb(246_199_111_/_35%)] text-[#f6c76f]' : column.foreign_key ? 'border-[color:rgb(155_124_255_/_35%)] text-[#bba8ff]' : 'border-[var(--border)] text-[var(--muted-bright)]'}`}
                            >
                              {column.primary_key
                                ? 'PK '
                                : column.foreign_key
                                  ? 'FK '
                                  : ''}
                              {column.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={loadDiagramQuery}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--blue-bright)]"
                      >
                        <Play size={15} />
                        Query table
                      </button>
                    </section>
                  ) : null}
                  <ErDiagram
                    schema={{ ...diagram, database: databaseName }}
                    selectedTable={activeDiagramTable}
                    onSelectTable={setSelectedDiagramTable}
                    embedded
                  />
                </div>
              ) : (
                <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center">
                  <div>
                    <Table2
                      className="mx-auto text-[var(--violet)]"
                      size={24}
                    />
                    <p className="mt-3 text-sm font-semibold">
                      No tables to map yet
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Run a CREATE TABLE statement, then return to this tab.
                    </p>
                  </div>
                </div>
              )
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
  const [mentorQuestion, setMentorQuestion] = useState('');
  const [mentorAnswer, setMentorAnswer] =
    useState<MentorConversationItem | null>(null);
  const [mentorHistory, setMentorHistory] = useState<MentorConversationItem[]>(
    [],
  );
  const [mentorHistoryLoading, setMentorHistoryLoading] = useState(true);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorError, setMentorError] = useState('');
  const [mentorCopied, setMentorCopied] = useState(false);
  const mentorContextRef = useRef<WriteLabMentorContext>({
    currentSql: '',
    schema: '',
    databaseError: '',
    databaseName: 'ProgramDB',
  });
  const [mentorContext, setMentorContext] = useState<WriteLabMentorContext>({
    currentSql: '',
    schema: '',
    databaseError: '',
    databaseName: 'ProgramDB',
  });
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress>(
    {},
  );
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(
    null,
  );
  const [syncState, setSyncState] = useState<
    'loading' | 'syncing' | 'synced' | 'local'
  >('loading');

  useEffect(() => {
    const receiveContext = (event: Event) => {
      const context = (event as CustomEvent<WriteLabMentorContext>).detail;
      if (context) {
        mentorContextRef.current = context;
        setMentorContext(context);
      }
    };
    window.addEventListener('write-lab-context', receiveContext);
    window.dispatchEvent(new Event('write-lab-context-request'));
    return () =>
      window.removeEventListener('write-lab-context', receiveContext);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getMentorConversation()
      .then((items) => {
        if (cancelled) return;
        setMentorHistory(items);
        setMentorAnswer(items.at(-1) ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setMentorHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const askMentor = async (questionOverride?: string) => {
    const question = (questionOverride ?? mentorQuestion).trim();
    if (!question || mentorLoading) return;
    window.dispatchEvent(new Event('write-lab-context-request'));
    setMentorLoading(true);
    setMentorError('');
    setMentorAnswer(null);
    try {
      const context = mentorContextRef.current;
      const nextAnswer = await askEditableMentor(
        question,
        context.currentSql,
        context.schema,
        context.databaseError,
        context.databaseName,
      );
      setMentorAnswer(nextAnswer);
      setMentorHistory((current) =>
        [
          ...current.filter((item) => item.id !== nextAnswer.id),
          nextAnswer,
        ].slice(-20),
      );
      setMentorQuestion('');
    } catch (caught) {
      setMentorError(
        caught instanceof Error
          ? caught.message
          : 'The AI Mentor could not answer that doubt.',
      );
    } finally {
      setMentorLoading(false);
    }
  };

  const mentorPrompts = mentorContext.databaseError
    ? [
        'Fix my current error',
        'Explain why this error happened',
        'Show the smallest safe correction',
      ]
    : mentorContext.currentSql.trim()
      ? [
          'Review my current SQL',
          'Explain what this script does',
          'How can I improve this query?',
        ]
      : [
          'Help me create my first table',
          'Show a safe INSERT example',
          'Teach me how SQL JOINs work',
        ];
  const schemaTableCount = (
    mentorContext.schema.match(/\bCREATE\s+TABLE\b/gi) ?? []
  ).length;

  const clearMentorHistory = async () => {
    if (!mentorHistory.length) return;
    if (!window.confirm('Clear your saved AI Mentor conversation?')) return;
    try {
      await clearMentorConversation();
      setMentorHistory([]);
      setMentorAnswer(null);
      setMentorError('');
    } catch (caught) {
      setMentorError(
        caught instanceof Error
          ? caught.message
          : 'The mentor conversation could not be cleared.',
      );
    }
  };

  const applyMentorExample = () => {
    if (!mentorAnswer?.example_sql) return;
    window.dispatchEvent(
      new CustomEvent('write-lab-mentor-apply', {
        detail: mentorAnswer.example_sql,
      }),
    );
  };

  const copyMentorExample = async () => {
    if (!mentorAnswer?.example_sql) return;
    await navigator.clipboard.writeText(mentorAnswer.example_sql);
    setMentorCopied(true);
    window.setTimeout(() => setMentorCopied(false), 1_500);
  };

  useEffect(() => {
    let cancelled = false;
    const syncToCloud = async (progress: ChallengeProgress) => {
      if (cancelled) return;
      setSyncState('syncing');
      try {
        await syncChallengeProgressCloud(challengeProgressEntries(progress));
        if (!cancelled) setSyncState('synced');
      } catch {
        if (!cancelled) setSyncState('local');
      }
    };
    const initialLoad = window.setTimeout(() => {
      const local = loadChallengeProgress();
      setChallengeProgress(local);
      void (async () => {
        try {
          const cloud = cloudItemsToChallengeProgress(
            await getChallengeProgressCloud(),
          );
          if (cancelled) return;
          const merged = mergeChallengeProgress(cloud);
          setChallengeProgress(merged);
          await syncToCloud(merged);
        } catch {
          if (!cancelled) setSyncState('local');
        }
      })();
    }, 0);
    const updateProgress = (event: Event) => {
      const progress =
        (event as CustomEvent<ChallengeProgress>).detail ??
        loadChallengeProgress();
      setChallengeProgress(progress);
      if (Object.keys(progress).length) void syncToCloud(progress);
    };
    window.addEventListener('write-lab-progress', updateProgress);
    return () => {
      cancelled = true;
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
  const progressEntries = CHALLENGES.flatMap((challenge) => {
    const progress = challengeProgress[challenge.id];
    return progress ? [progress] : [];
  });
  const totalAttempts = progressEntries.reduce(
    (sum, progress) => sum + progress.attempts,
    0,
  );
  const successfulChecks = progressEntries.reduce(
    (sum, progress) =>
      sum + Math.max(0, progress.attempts - progress.failedAttempts),
    0,
  );
  const passEfficiency = totalAttempts
    ? Math.round((successfulChecks / totalAttempts) * 100)
    : 0;
  const firstTryWins = progressEntries.filter(
    (progress) => progress.passed && progress.failedAttempts === 0,
  ).length;
  const recommendedChallenge = CHALLENGES.map((challenge, index) => ({
    challenge,
    index,
    progress: challengeProgress[challenge.id],
  }))
    .filter(({ progress }) => !progress?.passed)
    .sort(
      (left, right) =>
        (right.progress?.failedAttempts ?? 0) -
          (left.progress?.failedAttempts ?? 0) || left.index - right.index,
    )[0];
  const masteryBadges = [
    {
      label: 'First win',
      detail: 'Complete 1 challenge',
      earned: completedChallenges >= 1,
    },
    {
      label: 'Query builder',
      detail: 'Complete 3 challenges',
      earned: completedChallenges >= 3,
    },
    {
      label: 'SQL pathfinder',
      detail: 'Complete all 6',
      earned: completedChallenges === CHALLENGES.length,
    },
  ];

  const resetProgress = () => {
    if (!window.confirm('Clear your challenge attempts and completion badges?'))
      return;
    const progress = clearChallengeProgress();
    setChallengeProgress(progress);
    setSelectedChallenge(null);
    setSyncState('syncing');
    void clearChallengeProgressCloud()
      .then(() => setSyncState('synced'))
      .catch(() => setSyncState('local'));
    window.dispatchEvent(
      new CustomEvent('write-lab-progress', { detail: progress }),
    );
  };

  return (
    <aside className="app-mentor overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4">
      <section className="overflow-hidden rounded-xl border border-[color:rgb(155_124_255_/_32%)] bg-[linear-gradient(145deg,rgb(155_124_255_/_9%),rgb(109_141_255_/_4%))]">
        <div className="border-b border-[color:rgb(155_124_255_/_20%)] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:rgb(155_124_255_/_16%)] text-[#b9a5ff]">
              <Bot size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold">Ask Apex AI</h2>
              <p className="text-xs text-[var(--muted)]">
                Answers from your live SQL workspace
              </p>
            </div>
            <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[var(--green)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
              Ready
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className="rounded-full border border-[var(--border)] bg-[#0b1018] px-2 py-1 text-[var(--muted-bright)]">
              {mentorContext.databaseName}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[#0b1018] px-2 py-1 text-[var(--muted)]">
              {schemaTableCount
                ? `${schemaTableCount} table${schemaTableCount === 1 ? '' : 's'} attached`
                : 'No tables yet'}
            </span>
            {mentorContext.currentSql.trim() ? (
              <span className="rounded-full border border-[color:rgb(109_141_255_/_28%)] bg-[color:rgb(109_141_255_/_8%)] px-2 py-1 text-[var(--blue-bright)]">
                Current SQL attached
              </span>
            ) : null}
            {mentorContext.databaseError ? (
              <span className="rounded-full border border-[color:rgb(255_107_135_/_28%)] bg-[color:rgb(255_107_135_/_7%)] px-2 py-1 text-[var(--red)]">
                Error attached
              </span>
            ) : null}
          </div>
          <form
            className="mt-3"
            onSubmit={(event) => {
              event.preventDefault();
              void askMentor();
            }}
          >
            <label
              htmlFor="editable-mentor-question"
              className="text-xs font-semibold text-[var(--muted-bright)]"
            >
              What are you stuck on?
            </label>
            <div className="mt-2 rounded-xl border border-[var(--border)] bg-[#090d14] p-2 focus-within:border-[#9b7cff]">
              <textarea
                id="editable-mentor-question"
                value={mentorQuestion}
                onChange={(event) => setMentorQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (event.ctrlKey || event.metaKey)
                  ) {
                    event.preventDefault();
                    void askMentor();
                  }
                }}
                rows={3}
                maxLength={1500}
                placeholder="Ask how to create a table, understand an error, write a JOIN, or improve your current script…"
                className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-5 text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2">
                <span className="text-xs text-[var(--muted)]">
                  Ctrl + Enter to ask
                </span>
                <button
                  type="submit"
                  disabled={!mentorQuestion.trim() || mentorLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-[linear-gradient(135deg,#806dff,#5d8dff)] px-3 py-2 text-xs font-bold text-white shadow-[0_5px_16px_rgb(128_109_255_/_20%)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {mentorLoading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  ) : (
                    <CornerDownLeft size={13} />
                  )}
                  {mentorLoading ? 'Thinking…' : 'Ask Apex AI'}
                </button>
              </div>
            </div>
          </form>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mentorPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={mentorLoading}
                onClick={() => void askMentor(prompt)}
                className="rounded-full border border-[var(--border)] bg-[#0b1018] px-2.5 py-1.5 text-xs text-[var(--muted-bright)] hover:border-[color:rgb(155_124_255_/_45%)] hover:text-[var(--text)]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {mentorHistoryLoading ? (
          <div className="flex items-center gap-2 border-b border-[color:rgb(155_124_255_/_16%)] px-4 py-3 text-xs text-[var(--muted)]">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border-bright)] border-t-[#b9a5ff]" />
            Loading your mentor conversation…
          </div>
        ) : mentorHistory.length ? (
          <details className="group border-b border-[color:rgb(155_124_255_/_16%)]">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--muted-bright)] hover:bg-white/[0.02]">
              <MessageSquareText size={14} className="text-[#b9a5ff]" />
              Previous questions
              <span className="rounded-full bg-[color:rgb(155_124_255_/_12%)] px-2 py-0.5 text-[#b9a5ff]">
                {mentorHistory.length}
              </span>
              <ChevronDown
                size={13}
                className="ml-auto text-[var(--muted)] transition group-open:rotate-180"
              />
            </summary>
            <div className="border-t border-[color:rgb(155_124_255_/_12%)] p-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void clearMentorHistory()}
                  className="flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--red)]"
                >
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              <div className="mt-2 space-y-1.5">
                {mentorHistory
                  .slice(-4)
                  .reverse()
                  .map((item) => {
                    const selected =
                      mentorAnswer?.id === item.id &&
                      mentorAnswer?.created_at === item.created_at;
                    return (
                      <button
                        key={`${item.id ?? 'pending'}-${item.created_at}`}
                        type="button"
                        onClick={() => setMentorAnswer(item)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${selected ? 'border-[color:rgb(155_124_255_/_42%)] bg-[color:rgb(155_124_255_/_10%)]' : 'border-[var(--border)] bg-[#0b1018] hover:border-[var(--border-bright)]'}`}
                      >
                        <span className="block truncate text-sm font-semibold text-[var(--text)]">
                          {item.question}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                          {item.answer}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </details>
        ) : null}

        {mentorLoading ? (
          <div className="flex items-center gap-3 p-4 text-sm text-[var(--muted-bright)]">
            <Sparkles size={16} className="animate-pulse text-[#b9a5ff]" />
            Studying your current workspace…
          </div>
        ) : null}

        {mentorError ? (
          <div className="m-4 flex gap-2 rounded-lg border border-[color:rgb(255_107_135_/_28%)] bg-[color:rgb(255_107_135_/_7%)] p-3 text-sm leading-5 text-[var(--red)]">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {mentorError}
          </div>
        ) : null}

        {mentorAnswer ? (
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#b9a5ff]">
                <Sparkles size={14} /> Mentor guidance
              </p>
              <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">
                {mentorAnswer.source === 'groq'
                  ? 'AI response'
                  : 'Built-in tutor'}
              </span>
            </div>
            <div className="ml-5 rounded-xl rounded-tr-sm border border-[color:rgb(109_141_255_/_24%)] bg-[color:rgb(109_141_255_/_9%)] px-3 py-2 text-sm leading-5 text-[var(--text)]">
              {mentorAnswer.question}
            </div>
            <p className="text-sm leading-6 text-[var(--muted-bright)]">
              {mentorAnswer.answer}
            </p>
            {mentorAnswer.steps.length ? (
              <ol className="space-y-2">
                {mentorAnswer.steps.map((step, index) => (
                  <li
                    key={`${index}-${step}`}
                    className="flex items-start gap-2.5 text-sm leading-5 text-[var(--muted-bright)]"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:rgb(155_124_255_/_15%)] font-mono text-xs text-[#b9a5ff]">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            ) : null}
            {mentorAnswer.concepts.length ? (
              <div className="flex flex-wrap gap-1.5">
                {mentorAnswer.concepts.map((concept) => (
                  <span
                    key={concept}
                    className="rounded-md border border-[color:rgb(109_141_255_/_22%)] bg-[color:rgb(109_141_255_/_8%)] px-2 py-1 font-mono text-xs text-[var(--blue-bright)]"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            ) : null}
            {mentorAnswer.example_sql ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Example SQL
                </p>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[#070b11] p-3 font-mono text-xs leading-5 text-[#d5dded]">
                  {mentorAnswer.example_sql}
                </pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={applyMentorExample}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--blue)] px-3 py-2 text-xs font-bold text-white hover:brightness-110"
                  >
                    <Check size={13} /> Use in editor
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyMentorExample()}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted-bright)] hover:bg-[var(--surface-muted)]"
                  >
                    <Clipboard size={13} />
                    {mentorCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : null}
            {mentorAnswer.caution ? (
              <div className="flex gap-2 rounded-lg border border-[color:rgb(246_199_111_/_25%)] bg-[color:rgb(246_199_111_/_6%)] p-3 text-xs leading-5 text-[#e4c98e]">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {mentorAnswer.caution}
              </div>
            ) : null}
            {mentorAnswer.follow_ups.length ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Continue learning
                </p>
                <div className="mt-2 space-y-1.5">
                  {mentorAnswer.follow_ups.map((followUp) => (
                    <button
                      key={followUp}
                      type="button"
                      onClick={() => setMentorQuestion(followUp)}
                      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[#0b1018] px-3 py-2 text-left text-xs leading-5 text-[var(--muted-bright)] hover:border-[color:rgb(155_124_255_/_42%)] hover:text-[var(--text)]"
                    >
                      <span>{followUp}</span>
                      <ArrowRight
                        size={13}
                        className="shrink-0 text-[#b9a5ff] transition group-hover:translate-x-0.5"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      <details className="group mt-3 overflow-hidden rounded-xl border border-[color:rgb(246_199_111_/_25%)] bg-[color:rgb(246_199_111_/_4%)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-3.5 text-sm font-semibold text-[var(--muted-bright)] hover:bg-[color:rgb(246_199_111_/_5%)]">
          <Award size={16} className="text-[#f6c76f]" />
          Practice challenges
          <span className="ml-auto text-xs text-[var(--muted)]">
            {completedChallenges}/{CHALLENGES.length}
          </span>
          <ChevronDown
            size={14}
            className="text-[var(--muted)] transition group-open:rotate-180"
          />
        </summary>
        <div className="border-t border-[color:rgb(246_199_111_/_16%)] p-4">
          <div>
            <progress
              aria-label="SQL challenge completion"
              max={CHALLENGES.length}
              value={completedChallenges}
              className="h-1.5 w-full accent-[var(--green)]"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted)]">
              <span>{completionPercent}% complete</span>
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
            <p
              className={`mt-2 flex items-center gap-1.5 text-[11px] ${syncState === 'local' ? 'text-[#f6c76f]' : 'text-[var(--muted)]'}`}
            >
              {syncState === 'local' ? (
                <CloudOff size={12} />
              ) : (
                <Cloud size={12} />
              )}
              {syncState === 'loading'
                ? 'Checking cloud progress…'
                : syncState === 'syncing'
                  ? 'Syncing progress…'
                  : syncState === 'synced'
                    ? 'Progress synced to your site'
                    : 'Cloud unavailable · saved on this device'}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-[var(--border)] bg-[#0b1018] p-2.5">
              <p className="text-base font-bold text-[var(--text)]">
                {passEfficiency}%
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                Check accuracy
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0b1018] p-2.5">
              <p className="text-base font-bold text-[var(--text)]">
                {totalAttempts}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Attempts</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[#0b1018] p-2.5">
              <p className="text-base font-bold text-[var(--text)]">
                {firstTryWins}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                First-try wins
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-[color:rgb(109_141_255_/_28%)] bg-[color:rgb(109_141_255_/_7%)] p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--blue-bright)]">
              {recommendedChallenge ? (
                <Target size={14} />
              ) : (
                <Trophy size={14} />
              )}
              {recommendedChallenge ? 'Recommended next' : 'Path complete'}
            </div>
            {recommendedChallenge ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">
                    {recommendedChallenge.challenge.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {recommendedChallenge.progress?.failedAttempts
                      ? `Retry ${recommendedChallenge.challenge.topic} · ${recommendedChallenge.progress.failedAttempts} failed check${recommendedChallenge.progress.failedAttempts === 1 ? '' : 's'}`
                      : `${recommendedChallenge.challenge.topic} · ${recommendedChallenge.challenge.difficulty}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChallenge(recommendedChallenge.challenge.id);
                    dispatchChallenge(recommendedChallenge.challenge);
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--blue)] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--blue-bright)]"
                >
                  {recommendedChallenge.progress ? 'Retry' : 'Start'}
                  <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-5 text-[var(--muted-bright)]">
                You completed every graded SQL challenge.
              </p>
            )}
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Mastery badges
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {masteryBadges.map((badge) => (
                <div
                  key={badge.label}
                  title={badge.detail}
                  className={`rounded-lg border p-2 text-center ${badge.earned ? 'border-[color:rgb(246_199_111_/_38%)] bg-[color:rgb(246_199_111_/_7%)]' : 'border-[var(--border)] bg-[#0b1018] opacity-55'}`}
                >
                  <Award
                    size={15}
                    className={`mx-auto ${badge.earned ? 'text-[#f6c76f]' : 'text-[var(--muted)]'}`}
                  />
                  <p className="mt-1 text-[10px] font-semibold text-[var(--muted-bright)]">
                    {badge.label}
                  </p>
                  <span className="sr-only">
                    {badge.earned ? 'Earned' : 'Locked'}: {badge.detail}
                  </span>
                </div>
              ))}
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
                    dispatchChallenge(challenge);
                  }}
                  className={`w-full rounded-lg border bg-[#0b1018] p-3 text-left ${progress?.passed ? 'border-[color:rgb(72_213_151_/_38%)]' : selectedChallenge === challenge.id ? 'border-[color:rgb(246_199_111_/_45%)]' : 'border-[var(--border)] hover:border-[color:rgb(246_199_111_/_38%)]'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="flex items-center gap-1.5 text-sm text-[var(--text)]">
                      {progress?.passed ? (
                        <CheckCircle2
                          size={14}
                          className="text-[var(--green)]"
                        />
                      ) : null}
                      {challenge.title}
                    </strong>
                    <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                      {challenge.topic} · {challenge.difficulty}
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
      </details>
      <details className="group mt-3 overflow-hidden rounded-xl border border-[var(--border)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-3.5 text-sm font-semibold text-[var(--muted-bright)] hover:bg-[var(--surface-raised)]">
          <FileCode2 size={15} className="text-[var(--blue-bright)]" />
          Query library
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            {EXAMPLE_GROUPS.reduce(
              (total, group) => total + group.examples.length,
              0,
            )}{' '}
            programs
          </span>
          <ChevronDown
            size={14}
            className="ml-auto text-[var(--muted)] transition group-open:rotate-180"
          />
        </summary>
        <div className="space-y-4 border-t border-[var(--border)] p-3">
          {EXAMPLE_GROUPS.map((group) => (
            <div key={group.category}>
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                {group.category}
              </p>
              <div className="space-y-2">
                {group.examples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('write-lab-example', {
                          detail: example.sql,
                        }),
                      )
                    }
                    className="group/example flex w-full items-start gap-2.5 rounded-lg border border-[var(--border)] bg-[#0b1018] px-3 py-2.5 text-left hover:border-[var(--border-bright)]"
                  >
                    <FileCode2
                      size={14}
                      className="mt-0.5 shrink-0 text-[var(--blue-bright)]"
                    />
                    <span className="min-w-0">
                      <strong className="block text-sm font-semibold text-[var(--muted-bright)] group-hover/example:text-[var(--text)]">
                        {example.label}
                      </strong>
                      <span className="mt-0.5 block text-[11px] leading-4 text-[var(--muted)]">
                        {example.description}
                      </span>
                    </span>
                    <ArrowRight
                      size={13}
                      className="ml-auto mt-0.5 shrink-0 text-[var(--muted)] transition group-hover/example:translate-x-0.5 group-hover/example:text-[var(--blue-bright)]"
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="px-1 pt-1 text-xs leading-5 text-[var(--muted)]">
            Select a program to replace the editor contents, then choose Run
            script. Every example prepares the data it needs and is safe inside
            your isolated SQLite database.
          </p>
        </div>
      </details>
    </aside>
  );
}
