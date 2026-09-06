import {
  BarChart3,
  BookOpen,
  Boxes,
  Braces,
  ChevronDown,
  Clock3,
  Database,
  DatabaseZap,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Save,
  Table2,
  type LucideIcon,
} from 'lucide-react';

export type WorkspaceView =
  | 'dashboard'
  | 'playground'
  | 'write-lab'
  | 'schema'
  | 'schema-lab'
  | 'er'
  | 'history'
  | 'saved'
  | 'analytics'
  | 'topics';

const navigation: Array<{
  label: string;
  icon: LucideIcon;
  view?: WorkspaceView;
}> = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'SQL Playground', icon: Braces, view: 'playground' as const },
  {
    label: 'Editable Playground',
    icon: FlaskConical,
    view: 'write-lab' as const,
  },
  { label: 'Schema Explorer', icon: Boxes, view: 'schema' as const },
  { label: 'Schema Lab', icon: DatabaseZap, view: 'schema-lab' as const },
  { label: 'ER Diagram', icon: Database, view: 'er' as const },
  { label: 'Query History', icon: Clock3, view: 'history' },
  { label: 'Saved Queries', icon: Save, view: 'saved' },
  { label: 'Analytics', icon: BarChart3, view: 'analytics' },
  { label: 'Learning Path', icon: BookOpen, view: 'topics' },
];
const tables = ['Student', 'Course', 'Teacher', 'Department', 'Enrollment'];

export function Sidebar({
  activeView,
  selectedTable,
  onNavigate,
  onSelectTable,
}: {
  activeView: WorkspaceView;
  selectedTable: string;
  onNavigate: (view: WorkspaceView) => void;
  onSelectTable: (table: string) => void;
}) {
  return (
    <aside className="app-sidebar panel-shadow overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4">
      <p className="px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
        Workspace
      </p>
      <nav className="mt-2 space-y-0.5" aria-label="Primary navigation">
        {navigation.map(({ label, icon: Icon, view }) => {
          const enabled = Boolean(view);
          const active = view === activeView;
          return (
            <button
              key={label}
              type="button"
              disabled={!enabled}
              onClick={() => view && onNavigate(view)}
              title={enabled ? label : `${label} — coming in a later phase`}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${active ? 'bg-[color:rgb(109_141_255_/_13%)] text-[var(--blue-bright)]' : enabled ? 'text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]' : 'cursor-not-allowed text-[var(--muted)] opacity-55'}`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-6 flex items-center justify-between px-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
          Database
        </p>
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--green)] shadow-[0_0_8px_var(--green)]"
          title="Connected"
        />
      </div>
      <button
        type="button"
        className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--text)]"
      >
        <ChevronDown size={14} className="text-[var(--muted)]" />
        <Database size={14} className="text-[var(--blue)]" />
        CollegeDB
      </button>
      <div className="ml-4 mt-1 space-y-0.5 border-l border-[var(--border)] pl-4">
        {tables.map((table) => (
          <button
            key={table}
            type="button"
            onClick={() => {
              onSelectTable(table);
              onNavigate('schema');
            }}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-raised)] hover:text-[var(--text)] ${(activeView === 'schema' || activeView === 'er') && selectedTable === table ? 'bg-[var(--surface-raised)] text-[var(--blue-bright)]' : 'text-[var(--muted)]'}`}
          >
            <Table2 size={13} /> {table}
          </button>
        ))}
      </div>

      <div className="mt-7 rounded-xl border border-[color:rgb(109_141_255_/_18%)] bg-[linear-gradient(145deg,rgb(109_141_255_/_9%),rgb(155_124_255_/_5%))] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <GraduationCap size={15} className="text-[var(--blue-bright)]" />{' '}
          Phase 20 workspace
        </div>
        <p className="mt-2 text-[11px] leading-4 text-[var(--muted)]">
          Query CollegeDB safely or switch to an editable database copy.
        </p>
      </div>
    </aside>
  );
}
