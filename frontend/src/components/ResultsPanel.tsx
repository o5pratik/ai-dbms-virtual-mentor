import { AlertCircle, CheckCircle2, Clock3, Download, Info, Rows3, WandSparkles } from 'lucide-react';

import type { QueryAnalysis, QueryResponse } from '../services/api';
import { QueryFlow } from './QueryFlow';

export type ResultTab = 'output' | 'plan' | 'messages';

type ResultsPanelProps = {
  result: QueryResponse | null;
  error: string | null;
  running: boolean;
  analysis: QueryAnalysis | null;
  analysisLoading: boolean;
  analysisError: string | null;
  activeTab: ResultTab;
  onTabChange: (tab: ResultTab) => void;
  onAnalyze: () => void;
  onFix?: () => void;
  onExportCsv?: () => void;
  onExportJson?: () => void;
};

export function ResultsPanel({ result, error, running, analysis, analysisLoading, analysisError, activeTab, onTabChange, onAnalyze, onFix, onExportCsv, onExportJson }: ResultsPanelProps) {
  const tabClass = (tab: ResultTab) => `relative h-full transition ${activeTab === tab ? 'text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--muted-bright)]'}`;
  return <section className="flex min-h-[250px] flex-1 flex-col border-t border-[var(--border)] bg-[var(--surface)]">
    <div className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
      <div className="flex h-full items-center gap-6 text-xs font-medium">{([['output', 'Output'], ['plan', 'Execution plan'], ['messages', 'Messages']] as const).map(([tab, label]) => <button key={tab} className={tabClass(tab)} type="button" onClick={() => { onTabChange(tab); if (tab === 'plan' && !analysis) onAnalyze(); }}>{label}{activeTab === tab ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--blue)]" /> : null}</button>)}</div>
      {result ? <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]"><span className="flex items-center gap-1.5"><Rows3 size={13} /> {result.row_count} rows</span><span className="flex items-center gap-1.5"><Clock3 size={13} /> {result.execution_time} ms</span>{activeTab === 'output' ? <div className="hidden items-center gap-1 border-l border-[var(--border)] pl-3 sm:flex"><Download size={12} /><button type="button" onClick={onExportCsv} className="rounded px-1.5 py-1 hover:bg-[var(--surface-muted)] hover:text-[var(--text)]">CSV</button><button type="button" onClick={onExportJson} className="rounded px-1.5 py-1 hover:bg-[var(--surface-muted)] hover:text-[var(--text)]">JSON</button></div> : null}</div> : null}
    </div>
    <div className="result-scroll min-h-0 flex-1 overflow-auto">
      {activeTab === 'plan' ? (analysisLoading ? <Loading label="Analyzing logical query flow…" /> : analysisError ? <Notice tone="error" title="Analysis unavailable" message={analysisError} /> : analysis ? <QueryFlow analysis={analysis} /> : <EmptyPlan onAnalyze={onAnalyze} />)
        : activeTab === 'messages' ? <Messages result={result} error={error} analysis={analysis} />
        : running ? <Loading label="Running query…" />
        : error ? <div className="m-4 flex gap-3 rounded-xl border border-[color:rgb(255_107_135_/_28%)] bg-[color:rgb(255_107_135_/_7%)] p-4"><AlertCircle className="mt-0.5 shrink-0 text-[var(--red)]" size={18} /><div><p className="text-sm font-semibold text-[var(--red)]">SQL error</p><p className="mt-1 font-mono text-xs leading-5 text-[var(--muted-bright)]">{error}</p>{onFix ? <button type="button" onClick={onFix} className="mt-3 flex items-center gap-1.5 rounded-lg border border-[color:rgb(255_107_135_/_28%)] bg-[color:rgb(255_107_135_/_8%)] px-2.5 py-1.5 text-[10px] font-semibold text-[#ff9daf] hover:bg-[color:rgb(255_107_135_/_14%)]"><WandSparkles size={12} /> Fix with mentor</button> : null}</div></div>
        : result ? <ResultTable result={result} /> : <Ready />}
    </div>
  </section>;
}

function ResultTable({ result }: { result: QueryResponse }) { return <table className="w-full border-collapse text-left text-xs"><thead className="sticky top-0 z-10 bg-[var(--surface-raised)] text-[var(--muted-bright)]"><tr><th className="w-12 border-b border-r border-[var(--border)] px-3 py-2.5 text-center font-medium">#</th>{result.columns.map((column) => <th key={column} className="whitespace-nowrap border-b border-r border-[var(--border)] px-4 py-2.5 font-semibold last:border-r-0">{column}</th>)}</tr></thead><tbody className="font-mono text-[12px] text-[#c9d3e3]">{result.rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-[color:rgb(109_141_255_/_5%)]"><td className="border-b border-r border-[var(--border)] px-3 py-2 text-center text-[var(--muted)]">{rowIndex + 1}</td>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="whitespace-nowrap border-b border-r border-[var(--border)] px-4 py-2 last:border-r-0">{cell === null ? <span className="italic text-[var(--muted)]">NULL</span> : String(cell)}</td>)}</tr>)}</tbody></table>; }
function Loading({ label }: { label: string }) { return <div className="flex h-full min-h-44 items-center justify-center gap-3 text-sm text-[var(--muted)]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-bright)] border-t-[var(--blue)]" />{label}</div>; }
function Ready() { return <div className="flex h-full min-h-44 flex-col items-center justify-center text-center"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]"><CheckCircle2 size={18} className="text-[var(--muted)]" /></div><p className="text-sm font-medium">Ready to run SQL</p><p className="mt-1 text-xs text-[var(--muted)]">Press Ctrl + Enter or use the Run button.</p></div>; }
function Notice({ tone, title, message }: { tone: 'error' | 'info'; title: string; message: string }) { const Icon = tone === 'error' ? AlertCircle : Info; return <div className="m-4 flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4"><Icon size={17} className={tone === 'error' ? 'text-[var(--red)]' : 'text-[var(--blue)]'} /><div><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">{message}</p></div></div>; }
function EmptyPlan({ onAnalyze }: { onAnalyze: () => void }) { return <div className="flex h-full min-h-44 flex-col items-center justify-center text-center"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]"><Info size={18} className="text-[var(--blue)]" /></div><p className="text-sm font-medium">Explore how this query runs</p><p className="mt-1 text-xs text-[var(--muted)]">Generate a clickable, educational query flow.</p><button type="button" onClick={onAnalyze} className="mt-3 rounded-lg bg-[var(--blue)] px-3 py-1.5 text-[10px] font-semibold text-white">Analyze query</button></div>; }
function Messages({ result, error, analysis }: { result: QueryResponse | null; error: string | null; analysis: QueryAnalysis | null }) { const messages: Array<{ tone: 'error' | 'info'; title: string; message: string }> = error ? [{ tone: 'error', title: 'Execution failed', message: error }] : result ? [{ tone: 'info', title: 'Execution completed', message: `${result.row_count} row${result.row_count === 1 ? '' : 's'} returned in ${result.execution_time} ms.` }] : [{ tone: 'info', title: 'No execution yet', message: 'Run the query to see database messages here.' }]; if (analysis) messages.push({ tone: 'info', title: 'Analysis ready', message: `${analysis.steps.length} logical steps detected · ${analysis.estimated_complexity} complexity${analysis.warnings.length ? ` · ${analysis.warnings.length} learning tip${analysis.warnings.length === 1 ? '' : 's'}` : ''}.` }); return <div>{messages.map((item) => <Notice key={item.title} {...item} />)}</div>; }
