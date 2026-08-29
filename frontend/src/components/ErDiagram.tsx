import { Focus, Network, RotateCcw } from 'lucide-react';

import type { SchemaResponse } from '../services/api';

type ErDiagramProps = {
  schema: SchemaResponse;
  selectedTable: string;
  onSelectTable: (table: string) => void;
};

const positions: Record<string, { x: number; y: number }> = {
  Department: { x: 55, y: 58 },
  Teacher: { x: 385, y: 48 },
  Course: { x: 715, y: 78 },
  Student: { x: 65, y: 385 },
  Enrollment: { x: 475, y: 390 },
};

const paths: Record<string, { d: string; x: number; y: number }> = {
  'teacher-department': { d: 'M 385 126 C 330 126, 330 136, 275 136', x: 330, y: 112 },
  'course-teacher': { d: 'M 715 148 C 660 148, 660 126, 605 126', x: 660, y: 122 },
  'student-department': { d: 'M 165 385 C 165 330, 165 270, 165 210', x: 180, y: 296 },
  'enrollment-student': { d: 'M 475 454 C 405 454, 350 472, 285 472', x: 370, y: 442 },
  'enrollment-course': { d: 'M 585 390 C 585 315, 825 305, 825 196', x: 690, y: 300 },
};

export function ErDiagram({ schema, selectedTable, onSelectTable }: ErDiagramProps) {
  const connected = new Set<string>([selectedTable]);
  schema.relationships.forEach((item) => {
    if (item.from_table === selectedTable || item.to_table === selectedTable) {
      connected.add(item.from_table);
      connected.add(item.to_table);
    }
  });

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#090e16]">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--violet)]">Phase 3 · relationship map</p><h1 className="mt-1 text-lg font-bold tracking-tight">ER Diagram</h1><p className="mt-1 text-xs text-[var(--muted)]">Select an entity to trace its direct relationships and foreign-key paths.</p></div>
        <div className="flex items-center gap-2"><span className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-2 text-[9px] text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[#f6c76f]" /> PK</span><span className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-2 text-[9px] text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--violet)]" /> FK</span><button type="button" onClick={() => onSelectTable('Department')} title="Reset focus" className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2 text-[var(--muted)] hover:text-[var(--text)]"><RotateCcw size={13} /></button></div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_center,rgb(109_141_255_/_6%),transparent_50%)] p-4">
        <div className="mx-auto min-w-[900px] max-w-[1100px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0b1018] shadow-[inset_0_1px_rgb(255_255_255_/_2%)]">
          <svg viewBox="0 0 1000 650" className="block h-auto w-full" aria-label="CollegeDB entity relationship diagram">
            <defs>
              <pattern id="er-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1b2534" strokeWidth="0.7" /></pattern>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#9b7cff" /></marker>
              <marker id="arrow-muted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#344056" /></marker>
            </defs>
            <rect width="1000" height="650" fill="url(#er-grid)" />

            {schema.relationships.map((relationship) => {
              const path = paths[relationship.id];
              const active = relationship.from_table === selectedTable || relationship.to_table === selectedTable;
              return <g key={relationship.id}><path d={path.d} fill="none" stroke={active ? '#9b7cff' : '#344056'} strokeWidth={active ? 2.5 : 1.4} markerEnd={`url(#arrow-${active ? 'active' : 'muted'})`} /><rect x={path.x - 43} y={path.y - 10} width="86" height="20" rx="6" fill="#111827" stroke={active ? '#5f4daf' : '#293449'} /><text x={path.x} y={path.y + 3} textAnchor="middle" fill={active ? '#c5b6ff' : '#718097'} fontSize="9" fontFamily="ui-monospace, monospace">many → one</text></g>;
            })}

            {schema.tables.map((table) => {
              const position = positions[table.name];
              const width = 220;
              const height = 50 + table.columns.length * 29;
              const selected = table.name === selectedTable;
              const related = connected.has(table.name);
              return (
                <a key={table.name} href={`#${table.name}`} aria-label={`Focus ${table.name} table`} onClick={(event) => { event.preventDefault(); onSelectTable(table.name); }} className="cursor-pointer outline-none">
                <g>
                  <rect x={position.x} y={position.y} width={width} height={height} rx="12" fill={selected ? '#151d35' : '#101722'} stroke={selected ? '#6d8dff' : related ? '#485b80' : '#263247'} strokeWidth={selected ? 2.4 : 1.2} />
                  {selected ? <rect x={position.x + 1} y={position.y + 1} width="4" height={height - 2} rx="2" fill="#6d8dff" /> : null}
                  <rect x={position.x} y={position.y} width={width} height="42" rx="12" fill={table.kind === 'junction' ? '#201a35' : selected ? '#1b2850' : '#151d2a'} />
                  <path d={`M ${position.x} ${position.y + 42} H ${position.x + width}`} stroke={selected ? '#40578d' : '#263247'} />
                  <text x={position.x + 16} y={position.y + 26} fill={selected ? '#b8c8ff' : '#e5eaf3'} fontSize="14" fontWeight="700">{table.name}</text>
                  <text x={position.x + width - 14} y={position.y + 25} textAnchor="end" fill="#718097" fontSize="8" letterSpacing="1">{table.kind.toUpperCase()}</text>
                  {table.columns.map((column, index) => {
                    const y = position.y + 65 + index * 29;
                    return <g key={column.name}><text x={position.x + 15} y={y} fill={column.primary_key ? '#f6c76f' : column.foreign_key ? '#bba8ff' : '#aeb9ca'} fontSize="10" fontFamily="ui-monospace, monospace">{column.primary_key ? '◆' : column.foreign_key ? '◇' : '·'} {column.name}</text><text x={position.x + width - 14} y={y} textAnchor="end" fill="#65738a" fontSize="9" fontFamily="ui-monospace, monospace">{column.type}</text></g>;
                  })}
                </g>
                </a>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-[10px] text-[var(--muted)]"><span className="flex items-center gap-2"><Network size={13} /> {schema.relationships.length} relationships mapped</span><span className="flex items-center gap-2"><Focus size={13} className="text-[var(--blue-bright)]" /> Focused: <strong className="text-[var(--text)]">{selectedTable}</strong></span></div>
    </section>
  );
}
