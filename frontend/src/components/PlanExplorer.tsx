'use client';

import { useState } from 'react';
import { AlertTriangle, Database, GitCompareArrows, HardDrive, Network, ScanLine, Search, Sparkles } from 'lucide-react';

import type { QueryAnalysis, QueryPlanResponse, QueryPlanStep } from '../services/api';
import { QueryFlow } from './QueryFlow';

const operationIcons = { scan: ScanLine, search: Search, temporary: HardDrive, compound: Network, other: Database };

export function PlanExplorer({ logical, database }: { logical: QueryAnalysis | null; database: QueryPlanResponse | null }) {
  const [mode, setMode] = useState<'database' | 'logical'>(database ? 'database' : 'logical');
  return <div className="min-w-[620px]">
    <div className="flex items-center justify-between border-b border-[var(--border)] bg-[#0a0f17] px-4 py-2"><span className="flex items-center gap-2 text-[10px] text-[var(--muted)]"><GitCompareArrows size={13} /> Compare database behavior with the learning flow</span><div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5"><button type="button" disabled={!database} onClick={() => setMode('database')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[9px] disabled:opacity-35 ${mode === 'database' ? 'bg-[var(--surface-raised)] text-[var(--green)]' : 'text-[var(--muted)]'}`}><Database size={11} /> SQLite plan</button><button type="button" disabled={!logical} onClick={() => setMode('logical')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[9px] disabled:opacity-35 ${mode === 'logical' ? 'bg-[var(--surface-raised)] text-[var(--blue-bright)]' : 'text-[var(--muted)]'}`}><Sparkles size={11} /> Learning flow</button></div></div>
    {mode === 'database' && database ? <SQLitePlan plan={database} /> : logical ? <QueryFlow analysis={logical} /> : null}
  </div>;
}

function SQLitePlan({ plan }: { plan: QueryPlanResponse }) {
  return <div className="p-4">
    <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Database size={15} className="text-[var(--green)]" /><p className="text-xs font-semibold">SQLite EXPLAIN QUERY PLAN</p></div><p className="mt-1 text-[11px] text-[var(--muted)]">These operations come directly from the database query planner.</p></div><div className="flex gap-2">{[[plan.summary.scans, 'scans'], [plan.summary.index_searches, 'index lookups'], [plan.summary.temporary_structures, 'temporary']].map(([value, label]) => <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-center"><p className="text-xs font-bold">{value}</p><p className="text-[8px] uppercase tracking-wider text-[var(--muted)]">{label}</p></div>)}</div></div>
    <div className="mt-4 space-y-2">{plan.steps.map((step, index) => <PlanStep key={`${step.id}-${index}`} step={step} index={index} />)}</div>
    {plan.warnings.length ? <div className="mt-3 flex gap-2 rounded-lg border border-[color:rgb(255_190_92_/_22%)] bg-[color:rgb(255_190_92_/_6%)] p-3 text-[10px] leading-5 text-[#d7b67e]"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span>{plan.warnings.join(' ')}</span></div> : <div className="mt-3 rounded-lg border border-[color:rgb(72_213_151_/_20%)] bg-[color:rgb(72_213_151_/_5%)] p-3 text-[10px] text-[var(--green)]">No obvious planner warnings were detected.</div>}
  </div>;
}

function PlanStep({ step, index }: { step: QueryPlanStep; index: number }) {
  const Icon = operationIcons[step.operation];
  const tone = step.operation === 'search' && step.uses_index ? 'text-[var(--green)] bg-[color:rgb(72_213_151_/_9%)] border-[color:rgb(72_213_151_/_22%)]' : step.operation === 'temporary' ? 'text-[#f6c76f] bg-[color:rgb(246_199_111_/_8%)] border-[color:rgb(246_199_111_/_22%)]' : 'text-[var(--blue-bright)] bg-[color:rgb(109_141_255_/_8%)] border-[color:rgb(109_141_255_/_20%)]';
  return <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tone}`}><Icon size={15} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Step {index + 1} · {step.operation}</span>{step.table ? <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--muted-bright)]">{step.table}</span> : null}{step.index ? <span className="rounded border border-[color:rgb(72_213_151_/_22%)] bg-[color:rgb(72_213_151_/_6%)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--green)]">INDEX {step.index}</span> : null}</div><p className="mt-1 truncate font-mono text-[10px] text-[#c9d3e3]" title={step.detail}>{step.detail}</p></div><span className="font-mono text-[8px] text-[var(--muted)]">#{step.id}</span></div>;
}
