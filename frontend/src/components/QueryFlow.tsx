'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Braces, Filter, Layers3, ListFilter, Network, Rows3, ScanSearch, SortAsc, TriangleAlert } from 'lucide-react';

import type { QueryAnalysis, QueryFlowStep, QueryStepType } from '../services/api';

const stepIcons: Record<QueryStepType, typeof Rows3> = {
  source: Rows3, join: Network, filter: Filter, group: Layers3,
  having: ListFilter, project: Braces, sort: SortAsc, limit: ScanSearch,
};

function StepButton({ step, index, selected, onSelect }: { step: QueryFlowStep; index: number; selected: boolean; onSelect: () => void }) {
  const Icon = stepIcons[step.type];
  return <button type="button" onClick={onSelect} className={`group min-w-[145px] rounded-xl border p-3 text-left transition ${selected ? 'border-[var(--blue)] bg-[color:rgb(109_141_255_/_12%)] shadow-[0_0_0_1px_rgb(109_141_255_/_12%)]' : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-bright)] hover:bg-[var(--surface-muted)]'}`}>
    <span className="flex items-center justify-between"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${selected ? 'bg-[var(--blue)] text-white' : 'bg-[color:rgb(109_141_255_/_10%)] text-[var(--blue)]'}`}><Icon size={14} /></span><span className="font-mono text-[9px] text-[var(--muted)]">STEP {index + 1}</span></span>
    <span className="mt-2 block truncate text-[11px] font-semibold text-[var(--text)]">{step.title}</span><span className="mt-0.5 block uppercase tracking-[0.12em] text-[9px] text-[var(--muted)]">{step.type}</span>
  </button>;
}

export function QueryFlow({ analysis }: { analysis: QueryAnalysis }) {
  const [selectedId, setSelectedId] = useState(analysis.steps[0]?.id ?? '');
  useEffect(() => setSelectedId(analysis.steps[0]?.id ?? ''), [analysis]);
  const selected = analysis.steps.find((step) => step.id === selectedId) ?? analysis.steps[0];
  return <div className="min-w-[620px] p-4">
    <div className="mb-3 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Network size={15} className="text-[var(--violet)]" /><p className="text-xs font-semibold">Logical query flow</p></div><p className="mt-1 text-[11px] text-[var(--muted)]">{analysis.summary} Select a step to inspect it.</p></div><span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-bright)]">{analysis.estimated_complexity}</span></div>
    <div className="result-scroll flex items-center gap-2 overflow-x-auto pb-3">{analysis.steps.map((step, index) => <div key={step.id} className="flex items-center gap-2"><StepButton step={step} index={index} selected={selected?.id === step.id} onSelect={() => setSelectedId(step.id)} />{index < analysis.steps.length - 1 ? <ArrowRight size={16} className="shrink-0 text-[var(--muted)]" /> : null}</div>)}</div>
    {selected ? <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[#0a0f17] p-3 md:grid-cols-[1fr_1.2fr]"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--blue)]">{selected.title}</p><p className="mt-1.5 text-[11px] leading-5 text-[var(--muted-bright)]">{selected.detail}</p><div className="mt-2 flex flex-wrap gap-1.5">{selected.concepts.map((concept) => <span key={concept} className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[9px] text-[var(--muted)]">{concept}</span>)}</div></div><pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[#070b11] p-3 font-mono text-[10px] leading-5 text-[#b9c7e4]"><code>{selected.sql_fragment}</code></pre></div> : <p className="rounded-xl border border-[var(--border)] p-4 text-xs text-[var(--muted)]">No logical steps were detected.</p>}
    {analysis.warnings.length ? <div className="mt-3 flex items-start gap-2 rounded-lg border border-[color:rgb(255_190_92_/_22%)] bg-[color:rgb(255_190_92_/_6%)] px-3 py-2 text-[10px] text-[#d7b67e]"><TriangleAlert size={13} className="mt-0.5 shrink-0" /><span>{analysis.warnings.join(' ')}</span></div> : null}
  </div>;
}
