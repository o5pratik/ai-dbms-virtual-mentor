'use client';

import { useMemo, useRef, useState } from 'react';
import { Focus, Hand, Minus, Network, Plus, RotateCcw } from 'lucide-react';

import type { SchemaResponse } from '../services/api';

type ErDiagramProps = { schema: SchemaResponse; selectedTable: string; onSelectTable: (table: string) => void; embedded?: boolean };
type Position = { x: number; y: number; width: number; height: number };

function createLayout(schema: SchemaResponse) {
  const positions = new Map<string, Position>();
  const cardWidth = 230;
  const columns = Math.min(3, Math.max(1, schema.tables.length));
  let y = 55;
  for (let row = 0; row * columns < schema.tables.length; row += 1) {
    const rowTables = schema.tables.slice(row * columns, row * columns + columns);
    const rowHeight = Math.max(...rowTables.map((table) => 52 + table.columns.length * 28), 150);
    rowTables.forEach((table, column) => positions.set(table.name, { x: 55 + column * 340, y, width: cardWidth, height: 52 + table.columns.length * 28 }));
    y += rowHeight + 105;
  }
  return { positions, width: Math.max(700, 110 + columns * 340), height: Math.max(520, y) };
}

export function ErDiagram({ schema, selectedTable, onSelectTable, embedded = false }: ErDiagramProps) {
  const layout = useMemo(() => createLayout(schema), [schema]);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 10, y: 10 });
  const drag = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number } | null>(null);
  const connected = new Set<string>([selectedTable]);
  schema.relationships.forEach((item) => { if (item.from_table === selectedTable || item.to_table === selectedTable) { connected.add(item.from_table); connected.add(item.to_table); } });
  const reset = () => { setZoom(0.9); setPan({ x: 10, y: 10 }); };
  const changeZoom = (amount: number) => setZoom((value) => Math.min(1.8, Math.max(0.45, Number((value + amount).toFixed(2)))));

  return <section className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-[#090e16] ${embedded ? 'rounded-xl border border-[var(--border)]' : ''}`}>
    <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--violet)]">Phase 6 · interactive relationship map</p><h1 className="mt-1 text-lg font-bold tracking-tight">ER Diagram</h1><p className="mt-1 text-xs text-[var(--muted)]">Drag the canvas, zoom in or out, and select an entity to trace its relationships.</p></div>
      <div className="flex items-center gap-1.5" onPointerDown={(event) => event.stopPropagation()}><span className="mr-1 hidden items-center gap-1 text-[9px] text-[var(--muted)] md:flex"><Hand size={11} /> Drag canvas</span><button type="button" onClick={() => changeZoom(-0.1)} title="Zoom out" className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2 text-[var(--muted)] hover:text-[var(--text)]"><Minus size={13} /></button><span className="w-11 text-center font-mono text-[9px] text-[var(--muted-bright)]">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => changeZoom(0.1)} title="Zoom in" className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2 text-[var(--muted)] hover:text-[var(--text)]"><Plus size={13} /></button><button type="button" onClick={reset} title="Reset canvas" className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2 text-[var(--muted)] hover:text-[var(--text)]"><RotateCcw size={13} /></button></div>
    </div>

    <div className={`relative min-h-0 flex-1 cursor-grab overflow-hidden bg-[radial-gradient(circle_at_center,rgb(109_141_255_/_7%),transparent_55%)] active:cursor-grabbing ${embedded ? 'min-h-[470px]' : ''}`}
      onPointerDown={(event) => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { pointerX: event.clientX, pointerY: event.clientY, panX: pan.x, panY: pan.y }; }}
      onPointerMove={(event) => { if (!drag.current) return; setPan({ x: drag.current.panX + event.clientX - drag.current.pointerX, y: drag.current.panY + event.clientY - drag.current.pointerY }); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onWheel={(event) => { event.preventDefault(); changeZoom(event.deltaY > 0 ? -0.08 : 0.08); }}>
      <svg width={layout.width} height={layout.height} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} className="block select-none" aria-label={`${schema.database} entity relationship diagram`}>
        <defs><pattern id="er-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1b2534" strokeWidth="0.7" /></pattern><marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#9b7cff" /></marker><marker id="arrow-muted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#344056" /></marker></defs>
        <rect width={layout.width} height={layout.height} fill="url(#er-grid)" />
        {schema.relationships.map((relationship) => {
          const from = layout.positions.get(relationship.from_table); const to = layout.positions.get(relationship.to_table); if (!from || !to) return null;
          const active = relationship.from_table === selectedTable || relationship.to_table === selectedTable;
          const x1 = from.x + from.width / 2, y1 = from.y + from.height / 2, x2 = to.x + to.width / 2, y2 = to.y + to.height / 2;
          return <g key={relationship.id}><path d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`} fill="none" stroke={active ? '#9b7cff' : '#344056'} strokeWidth={active ? 2.5 : 1.4} markerEnd={`url(#arrow-${active ? 'active' : 'muted'})`} /><rect x={(x1 + x2) / 2 - 40} y={(y1 + y2) / 2 - 10} width="80" height="20" rx="6" fill="#111827" stroke={active ? '#5f4daf' : '#293449'} /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 3} textAnchor="middle" fill={active ? '#c5b6ff' : '#718097'} fontSize="9" fontFamily="ui-monospace, monospace">many → one</text></g>;
        })}
        {schema.tables.map((table) => {
          const position = layout.positions.get(table.name)!; const selected = table.name === selectedTable; const related = connected.has(table.name);
          return <a key={table.name} href={`#${table.name}`} aria-label={`Focus ${table.name} table`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); onSelectTable(table.name); }} className="cursor-pointer outline-none"><g><rect x={position.x} y={position.y} width={position.width} height={position.height} rx="12" fill={selected ? '#151d35' : '#101722'} stroke={selected ? '#6d8dff' : related ? '#485b80' : '#263247'} strokeWidth={selected ? 2.4 : 1.2} />{selected ? <rect x={position.x + 1} y={position.y + 1} width="4" height={position.height - 2} rx="2" fill="#6d8dff" /> : null}<rect x={position.x} y={position.y} width={position.width} height="42" rx="12" fill={table.kind === 'junction' ? '#201a35' : selected ? '#1b2850' : '#151d2a'} /><path d={`M ${position.x} ${position.y + 42} H ${position.x + position.width}`} stroke={selected ? '#40578d' : '#263247'} /><text x={position.x + 16} y={position.y + 26} fill={selected ? '#b8c8ff' : '#e5eaf3'} fontSize="14" fontWeight="700">{table.name}</text><text x={position.x + position.width - 14} y={position.y + 25} textAnchor="end" fill="#718097" fontSize="8" letterSpacing="1">{table.kind.toUpperCase()}</text>{table.columns.map((column, index) => { const y = position.y + 65 + index * 28; return <g key={column.name}><text x={position.x + 15} y={y} fill={column.primary_key ? '#f6c76f' : column.foreign_key ? '#bba8ff' : '#aeb9ca'} fontSize="10" fontFamily="ui-monospace, monospace">{column.primary_key ? '◆' : column.foreign_key ? '◇' : '·'} {column.name}</text><text x={position.x + position.width - 14} y={y} textAnchor="end" fill="#65738a" fontSize="9" fontFamily="ui-monospace, monospace">{column.type}</text></g>; })}</g></a>;
        })}
      </svg>
    </div>
    <div className="flex shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-[10px] text-[var(--muted)]"><span className="flex items-center gap-2"><Network size={13} /> {schema.relationships.length} relationships mapped</span><span className="flex items-center gap-2"><Focus size={13} className="text-[var(--blue-bright)]" /> Focused: <strong className="text-[var(--text)]">{selectedTable || schema.tables[0]?.name}</strong></span></div>
  </section>;
}
