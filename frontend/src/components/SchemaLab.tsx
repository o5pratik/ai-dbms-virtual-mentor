'use client';

import { useState } from 'react';
import { AlertCircle, Braces, CheckCircle2, Columns3, DatabaseZap, Eye, KeyRound, Link2, Network, Play, Table2 } from 'lucide-react';

import type { SchemaResponse } from '../services/api';
import { ErDiagram } from './ErDiagram';

const SAMPLE_DDL = `CREATE TABLE Author (
  author_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE Book (
  book_id INTEGER PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  author_id INTEGER NOT NULL,
  rating REAL CHECK (rating >= 0 AND rating <= 5),
  FOREIGN KEY (author_id) REFERENCES Author(author_id)
);`;

type Props = {
  analysis: SchemaResponse | null;
  loading: boolean;
  error: string;
  selectedTable: string;
  onSelectTable: (table: string) => void;
  onAnalyze: (sql: string) => void;
};

export function SchemaLab({ analysis, loading, error, selectedTable, onSelectTable, onAnalyze }: Props) {
  const [sql, setSql] = useState(SAMPLE_DDL);
  const [mode, setMode] = useState<'cards' | 'diagram'>('cards');
  const submit = () => { setMode('cards'); onAnalyze(sql); };

  return <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0b1018]">
    <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--green)]">Phase 6 · schema lab</p><h1 className="mt-1 text-lg font-bold tracking-tight">Analyze your own schema</h1><p className="mt-1 text-xs text-[var(--muted)]">Paste SQL DDL to detect tables, columns, keys, constraints, and relationships.</p></div>{analysis ? <div className="flex rounded-lg border border-[var(--border)] bg-[#0a0f17] p-1"><button type="button" onClick={() => setMode('cards')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] ${mode === 'cards' ? 'bg-[var(--surface-raised)] text-[var(--text)]' : 'text-[var(--muted)]'}`}><Columns3 size={12} /> Analysis</button><button type="button" onClick={() => setMode('diagram')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] ${mode === 'diagram' ? 'bg-[var(--surface-raised)] text-[var(--text)]' : 'text-[var(--muted)]'}`}><Network size={12} /> ER diagram</button></div> : null}</div>
    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(330px,0.8fr)_minmax(440px,1.5fr)]">
      <div className="flex min-h-[310px] flex-col border-b border-[var(--border)] bg-[#090e16] lg:border-b-0 lg:border-r">
        <div className="flex h-10 items-center justify-between border-b border-[var(--border)] px-4"><span className="flex items-center gap-2 font-mono text-[10px] text-[var(--muted-bright)]"><Braces size={13} className="text-[var(--green)]" /> schema.sql</span><button type="button" onClick={() => setSql(SAMPLE_DDL)} className="text-[9px] text-[var(--muted)] hover:text-[var(--text)]">Load sample</button></div>
        <textarea value={sql} onChange={(event) => setSql(event.target.value)} spellCheck={false} aria-label="CREATE TABLE statements" className="min-h-0 flex-1 resize-none bg-[#0a0e15] p-4 font-mono text-[11px] leading-6 text-[#c8d3e6] outline-none placeholder:text-[var(--muted)]" placeholder="CREATE TABLE ..." />
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3"><span className="text-[9px] text-[var(--muted)]">Up to 30 tables · analysis only</span><button type="button" onClick={submit} disabled={loading || !sql.trim()} className="flex items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--green),#3aaed8)] px-3.5 py-2 text-[10px] font-bold text-[#07120f] disabled:opacity-45"><Play size={12} fill="currentColor" /> {loading ? 'Analyzing…' : 'Analyze schema'}</button></div>
      </div>
      <div className="min-h-0 overflow-auto p-4">
        {loading ? <div className="flex h-full min-h-72 items-center justify-center gap-3 text-xs text-[var(--muted)]"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-bright)] border-t-[var(--green)]" />Reading DDL structure…</div>
          : error ? <div className="flex gap-3 rounded-xl border border-[color:rgb(255_107_135_/_28%)] bg-[color:rgb(255_107_135_/_7%)] p-4"><AlertCircle size={17} className="text-[var(--red)]" /><div><p className="text-xs font-semibold text-[var(--red)]">Schema analysis failed</p><p className="mt-1 text-[11px] leading-5 text-[var(--muted-bright)]">{error}</p></div></div>
          : analysis && mode === 'diagram' ? <ErDiagram schema={analysis} selectedTable={selectedTable || analysis.tables[0]?.name} onSelectTable={onSelectTable} embedded />
          : analysis ? <SchemaCards schema={analysis} selectedTable={selectedTable} onSelectTable={onSelectTable} />
          : <EmptyLab />}
      </div>
    </div>
  </section>;
}

function SchemaCards({ schema, selectedTable, onSelectTable }: { schema: SchemaResponse; selectedTable: string; onSelectTable: (table: string) => void }) {
  return <div><div className="grid grid-cols-4 gap-2">{[[schema.totals.tables, 'tables'], [schema.totals.columns, 'columns'], [schema.totals.primary_keys, 'primary keys'], [schema.totals.foreign_keys, 'relations']].map(([value, label]) => <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"><p className="text-sm font-bold">{value}</p><p className="text-[8px] uppercase tracking-wider text-[var(--muted)]">{label}</p></div>)}</div>
    <div className="mt-3 grid gap-3 xl:grid-cols-2">{schema.tables.map((table) => <button type="button" key={table.name} onClick={() => onSelectTable(table.name)} className={`overflow-hidden rounded-xl border bg-[var(--surface)] text-left transition ${selectedTable === table.name ? 'border-[var(--blue)] shadow-[0_0_0_1px_rgb(109_141_255_/_12%)]' : 'border-[var(--border)] hover:border-[var(--border-bright)]'}`}><div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5"><span className="flex items-center gap-2 text-xs font-bold"><Table2 size={13} className="text-[var(--blue-bright)]" />{table.name}</span><span className="text-[8px] uppercase tracking-wider text-[var(--muted)]">{table.kind}</span></div><div>{table.columns.map((column) => <div key={column.name} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--border)] px-3 py-2 last:border-0"><span className="flex min-w-0 items-center gap-2 font-mono text-[10px] text-[var(--muted-bright)]">{column.primary_key ? <KeyRound size={11} className="shrink-0 text-[#f6c76f]" /> : column.foreign_key ? <Link2 size={11} className="shrink-0 text-[var(--violet)]" /> : <span className="w-[11px]" />}{column.name}</span><span className="font-mono text-[9px] text-[var(--blue-bright)]">{column.type}</span></div>)}</div></button>)}</div>
    {schema.warnings?.length ? <div className="mt-3 rounded-lg border border-[color:rgb(255_190_92_/_22%)] bg-[color:rgb(255_190_92_/_6%)] p-3 text-[10px] leading-5 text-[#d7b67e]">{schema.warnings.join(' ')}</div> : null}
  </div>;
}

function EmptyLab() { return <div className="flex h-full min-h-72 flex-col items-center justify-center text-center"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:rgb(72_213_151_/_25%)] bg-[color:rgb(72_213_151_/_8%)] text-[var(--green)]"><DatabaseZap size={19} /></div><p className="mt-3 text-sm font-semibold">Your schema map starts here</p><p className="mt-1 max-w-xs text-[11px] leading-5 text-[var(--muted)]">Analyze the sample or replace it with your own CREATE TABLE statements.</p></div>; }

export function SchemaLabContextPanel({ schema }: { schema: SchemaResponse | null }) {
  return <aside className="app-mentor overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Schema mentor</p><div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4"><div className="flex items-center gap-2"><DatabaseZap size={16} className="text-[var(--green)]" /><p className="text-xs font-bold">DDL analyzer</p></div><p className="mt-3 text-[11px] leading-5 text-[var(--muted-bright)]">Use complete CREATE TABLE statements. Both inline references and table-level FOREIGN KEY constraints are detected.</p></div>{schema ? <><div className="mt-3 rounded-xl border border-[var(--border)] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Latest analysis</p><div className="mt-3 space-y-2 text-[11px]"><p className="flex justify-between"><span className="text-[var(--muted)]">Entities</span><strong>{schema.totals.tables}</strong></p><p className="flex justify-between"><span className="text-[var(--muted)]">Attributes</span><strong>{schema.totals.columns}</strong></p><p className="flex justify-between"><span className="text-[var(--muted)]">Relationships</span><strong>{schema.totals.foreign_keys}</strong></p></div></div><div className="mt-3 flex gap-2 rounded-xl border border-dashed border-[color:rgb(72_213_151_/_28%)] bg-[color:rgb(72_213_151_/_5%)] p-3"><CheckCircle2 size={14} className="shrink-0 text-[var(--green)]" /><p className="text-[10px] leading-4 text-[var(--muted-bright)]">Analysis is ready. Switch to ER diagram to explore it visually.</p></div></> : <div className="mt-3 flex gap-2 rounded-xl border border-[var(--border)] p-3"><Eye size={14} className="shrink-0 text-[var(--blue)]" /><p className="text-[10px] leading-4 text-[var(--muted)]">Results will appear as table cards with key and relationship markers.</p></div>}</aside>;
}
