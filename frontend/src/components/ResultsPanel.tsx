import { AlertCircle, CheckCircle2, Clock3, Rows3 } from 'lucide-react';

import type { QueryResponse } from '../services/api';

type ResultsPanelProps = {
  result: QueryResponse | null;
  error: string | null;
  running: boolean;
};

export function ResultsPanel({ result, error, running }: ResultsPanelProps) {
  return (
    <section className="flex min-h-[250px] flex-1 flex-col border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="flex h-full items-center gap-6 text-xs font-medium">
          <button className="relative h-full text-[var(--text)]" type="button">
            Output
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--blue)]" />
          </button>
          <button className="h-full text-[var(--muted)]" type="button" disabled>Execution plan</button>
          <button className="h-full text-[var(--muted)]" type="button" disabled>Messages</button>
        </div>
        {result ? (
          <div className="flex items-center gap-4 text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5"><Rows3 size={13} /> {result.row_count} rows</span>
            <span className="flex items-center gap-1.5"><Clock3 size={13} /> {result.execution_time} ms</span>
          </div>
        ) : null}
      </div>

      <div className="result-scroll min-h-0 flex-1 overflow-auto">
        {running ? (
          <div className="flex h-full min-h-44 items-center justify-center gap-3 text-sm text-[var(--muted)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-bright)] border-t-[var(--blue)]" />
            Running query…
          </div>
        ) : error ? (
          <div className="m-4 flex gap-3 rounded-xl border border-[color:rgb(255_107_135_/_28%)] bg-[color:rgb(255_107_135_/_7%)] p-4">
            <AlertCircle className="mt-0.5 shrink-0 text-[var(--red)]" size={18} />
            <div>
              <p className="text-sm font-semibold text-[var(--red)]">SQL error</p>
              <p className="mt-1 font-mono text-xs leading-5 text-[var(--muted-bright)]">{error}</p>
            </div>
          </div>
        ) : result ? (
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[var(--surface-raised)] text-[var(--muted-bright)]">
              <tr>
                <th className="w-12 border-b border-r border-[var(--border)] px-3 py-2.5 text-center font-medium">#</th>
                {result.columns.map((column) => (
                  <th key={column} className="whitespace-nowrap border-b border-r border-[var(--border)] px-4 py-2.5 font-semibold last:border-r-0">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-[12px] text-[#c9d3e3]">
              {result.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-[color:rgb(109_141_255_/_5%)]">
                  <td className="border-b border-r border-[var(--border)] px-3 py-2 text-center text-[var(--muted)]">{rowIndex + 1}</td>
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="whitespace-nowrap border-b border-r border-[var(--border)] px-4 py-2 last:border-r-0">
                      {cell === null ? <span className="italic text-[var(--muted)]">NULL</span> : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex h-full min-h-44 flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]">
              <CheckCircle2 size={18} className="text-[var(--muted)]" />
            </div>
            <p className="text-sm font-medium">Ready to run SQL</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Press Ctrl + Enter or use the Run button.</p>
          </div>
        )}
      </div>
    </section>
  );
}
