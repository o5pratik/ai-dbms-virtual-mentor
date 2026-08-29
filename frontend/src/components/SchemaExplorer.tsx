import { ArrowRight, CheckCircle2, KeyRound, Link2, Rows3, Table2 } from 'lucide-react';

import type { SchemaResponse } from '../services/api';

type SchemaExplorerProps = {
  schema: SchemaResponse;
  selectedTable: string;
  onSelectTable: (table: string) => void;
};

function KeyBadge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'violet' | 'green' }) {
  const colors = {
    blue: 'border-[color:rgb(109_141_255_/_28%)] bg-[color:rgb(109_141_255_/_9%)] text-[var(--blue-bright)]',
    violet: 'border-[color:rgb(155_124_255_/_28%)] bg-[color:rgb(155_124_255_/_9%)] text-[#bba8ff]',
    green: 'border-[color:rgb(72_213_151_/_25%)] bg-[color:rgb(72_213_151_/_8%)] text-[var(--green)]',
  };
  return <span className={`rounded border px-1.5 py-0.5 font-mono text-[8px] font-bold ${colors[tone]}`}>{children}</span>;
}

export function SchemaExplorer({ schema, selectedTable, onSelectTable }: SchemaExplorerProps) {
  const table = schema.tables.find((item) => item.name === selectedTable) ?? schema.tables[0];
  const relationships = schema.relationships.filter((item) => item.from_table === table.name || item.to_table === table.name);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0b1018]">
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--blue-bright)]">Phase 3 · schema intelligence</p>
            <h1 className="mt-1 text-lg font-bold tracking-tight">Schema Explorer</h1>
            <p className="mt-1 text-xs text-[var(--muted)]">Inspect entities, constraints, keys, and detected relationships in CollegeDB.</p>
          </div>
          <div className="flex gap-2">
            {[
              [schema.totals.tables, 'tables'],
              [schema.totals.columns, 'columns'],
              [schema.totals.foreign_keys, 'relations'],
            ].map(([value, label]) => (
              <div key={label} className="min-w-16 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-center">
                <p className="text-sm font-bold text-[var(--text)]">{value}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="w-48 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[color:rgb(14_19_29_/_70%)] p-3">
          <p className="px-2 pb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Detected tables</p>
          <div className="space-y-1">
            {schema.tables.map((item) => (
              <button key={item.name} type="button" onClick={() => onSelectTable(item.name)} className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${item.name === table.name ? 'border-[color:rgb(109_141_255_/_35%)] bg-[color:rgb(109_141_255_/_12%)]' : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-raised)]'}`}>
                <span className="flex items-center justify-between gap-2 text-xs font-semibold"><span className="flex items-center gap-2"><Table2 size={13} className={item.name === table.name ? 'text-[var(--blue-bright)]' : 'text-[var(--muted)]'} />{item.name}</span><span className="font-mono text-[9px] text-[var(--muted)]">{item.row_count}</span></span>
                <span className="mt-1 block pl-5 text-[9px] capitalize text-[var(--muted)]">{item.kind} · {item.columns.length} fields</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><h2 className="text-base font-bold">{table.name}</h2><span className="rounded-full border border-[var(--border-bright)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--muted-bright)]">{table.kind}</span></div>
                <p className="mt-1 text-xs text-[var(--muted)]">{table.description}</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-[10px] text-[var(--muted)]"><Rows3 size={13} /> {table.row_count} sample rows</div>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="grid grid-cols-[minmax(130px,1.2fr)_80px_minmax(150px,1fr)] border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                <span>Column</span><span>Type</span><span>Constraints</span>
              </div>
              {table.columns.map((column) => (
                <div key={column.name} className="grid grid-cols-[minmax(130px,1.2fr)_80px_minmax(150px,1fr)] items-center border-b border-[var(--border)] px-4 py-3 last:border-b-0 hover:bg-[color:rgb(109_141_255_/_4%)]">
                  <span className="flex items-center gap-2 font-mono text-xs text-[#d8e0ee]">{column.primary_key ? <KeyRound size={12} className="text-[#f6c76f]" /> : column.foreign_key ? <Link2 size={12} className="text-[var(--violet)]" /> : <span className="h-3 w-3" />}{column.name}</span>
                  <span className="font-mono text-[10px] text-[var(--blue-bright)]">{column.type}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {column.primary_key ? <KeyBadge>PK</KeyBadge> : null}
                    {column.foreign_key ? <KeyBadge tone="violet">FK → {column.foreign_key.table}</KeyBadge> : null}
                    {column.unique ? <KeyBadge tone="green">UNIQUE</KeyBadge> : null}
                    {!column.nullable ? <KeyBadge tone="green">NOT NULL</KeyBadge> : null}
                    {column.check ? <KeyBadge tone="blue">CHECK {column.check}</KeyBadge> : null}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <h3 className="flex items-center gap-2 text-xs font-bold"><Link2 size={14} className="text-[var(--violet)]" /> Detected relationships</h3>
              <div className="mt-2 grid gap-2 lg:grid-cols-2">
                {relationships.length ? relationships.map((relationship) => {
                  const outgoing = relationship.from_table === table.name;
                  const left = outgoing ? `${relationship.from_table}.${relationship.from_column}` : `${relationship.to_table}.${relationship.to_column}`;
                  const right = outgoing ? `${relationship.to_table}.${relationship.to_column}` : `${relationship.from_table}.${relationship.from_column}`;
                  return <div key={relationship.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-mono text-[10px]"><span className="truncate text-[var(--muted-bright)]">{left}</span><ArrowRight size={12} className="shrink-0 text-[var(--violet)]" /><span className="truncate text-[var(--text)]">{right}</span></div>;
                }) : <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-xs text-[var(--muted)]"><CheckCircle2 size={14} /> No foreign-key relationships.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SchemaLoading({ error }: { error?: string }) {
  return <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0b1018]"><div className="text-center"><span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-bright)] border-t-[var(--blue)]" /><p className="mt-3 text-xs text-[var(--muted)]">{error ?? 'Analyzing CollegeDB schema…'}</p></div></div>;
}

export function SchemaContextPanel({ schema, selectedTable }: { schema: SchemaResponse; selectedTable: string }) {
  const table = schema.tables.find((item) => item.name === selectedTable) ?? schema.tables[0];
  const connections = schema.relationships.filter((item) => item.from_table === table.name || item.to_table === table.name);
  return <aside className="app-mentor overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Schema insights</p><div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:rgb(109_141_255_/_12%)] text-[var(--blue-bright)]"><Table2 size={15} /></div><div><p className="text-xs font-bold">{table.name}</p><p className="text-[9px] capitalize text-[var(--muted)]">{table.kind} table</p></div></div><p className="mt-3 text-[11px] leading-5 text-[var(--muted-bright)]">{table.description}</p></div><div className="mt-3 rounded-xl border border-[var(--border)] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Automatic analysis</p><div className="mt-3 space-y-2 text-[11px]"><p className="flex justify-between"><span className="text-[var(--muted)]">Columns</span><strong>{table.columns.length}</strong></p><p className="flex justify-between"><span className="text-[var(--muted)]">Primary keys</span><strong>{table.columns.filter((item) => item.primary_key).length}</strong></p><p className="flex justify-between"><span className="text-[var(--muted)]">Foreign keys</span><strong>{table.columns.filter((item) => item.foreign_key).length}</strong></p><p className="flex justify-between"><span className="text-[var(--muted)]">Connections</span><strong>{connections.length}</strong></p></div></div><div className="mt-3 rounded-xl border border-dashed border-[color:rgb(72_213_151_/_30%)] bg-[color:rgb(72_213_151_/_5%)] p-3 text-[10px] leading-4 text-[var(--muted-bright)]"><span className="font-semibold text-[var(--green)]">Analysis complete.</span> Keys and cardinality are derived from CollegeDB constraints.</div></aside>;
}
