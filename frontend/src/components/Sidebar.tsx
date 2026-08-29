import { BarChart3, BookOpen, Boxes, Braces, ChevronDown, Clock3, Database, GraduationCap, LayoutDashboard, Save, Table2 } from 'lucide-react';

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'SQL Playground', icon: Braces, active: true },
  { label: 'Schema Explorer', icon: Boxes },
  { label: 'ER Diagram', icon: Database },
  { label: 'Query History', icon: Clock3 },
  { label: 'Saved Queries', icon: Save },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Learning Topics', icon: BookOpen },
];
const tables = ['Student', 'Course', 'Teacher', 'Department', 'Enrollment'];

export function Sidebar() {
  return (
    <aside className="app-sidebar panel-shadow overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4">
      <p className="px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Workspace</p>
      <nav className="mt-2 space-y-0.5" aria-label="Primary navigation">
        {navigation.map(({ label, icon: Icon, active }) => (
          <button key={label} type="button" disabled={!active} title={active ? label : `${label} — coming in a later phase`} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${active ? 'bg-[color:rgb(109_141_255_/_13%)] text-[var(--blue-bright)]' : 'text-[var(--muted)] hover:bg-[var(--surface-raised)]'}`}>
            <Icon size={15} /><span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-6 flex items-center justify-between px-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Database</p>
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] shadow-[0_0_8px_var(--green)]" title="Connected" />
      </div>
      <button type="button" className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--text)]">
        <ChevronDown size={14} className="text-[var(--muted)]" /><Database size={14} className="text-[var(--blue)]" />CollegeDB
      </button>
      <div className="ml-4 mt-1 space-y-0.5 border-l border-[var(--border)] pl-4">
        {tables.map((table) => (
          <button key={table} type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"><Table2 size={13} /> {table}</button>
        ))}
      </div>

      <div className="mt-7 rounded-xl border border-[color:rgb(109_141_255_/_18%)] bg-[linear-gradient(145deg,rgb(109_141_255_/_9%),rgb(155_124_255_/_5%))] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold"><GraduationCap size={15} className="text-[var(--blue-bright)]" /> MVP workspace</div>
        <p className="mt-2 text-[11px] leading-4 text-[var(--muted)]">The AI mentor, schema tools, and analytics unlock in the next phases.</p>
      </div>
    </aside>
  );
}
