import {
  BarChart3,
  BookOpen,
  Boxes,
  Braces,
  Clock3,
  Database,
  DatabaseZap,
  LayoutDashboard,
  Save,
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
  | 'topics'
  | 'learn'
  | 'team'
  | 'help';

const primaryNavigation: Array<{
  label: string;
  icon: LucideIcon;
  view?: WorkspaceView;
}> = [
  { label: 'SQL Workspace', icon: Braces, view: 'playground' as const },
  { label: 'Learning Path', icon: BookOpen, view: 'topics' },
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
];

const secondaryNavigation: Array<{
  label: string;
  icon: LucideIcon;
  view: WorkspaceView;
}> = [
  { label: 'CollegeDB Schema', icon: Boxes, view: 'schema' as const },
  { label: 'Schema Lab', icon: DatabaseZap, view: 'schema-lab' as const },
  { label: 'CollegeDB ER', icon: Database, view: 'er' as const },
  { label: 'Query History', icon: Clock3, view: 'history' },
  { label: 'Saved Queries', icon: Save, view: 'saved' },
  { label: 'Analytics', icon: BarChart3, view: 'analytics' },
];

export function Sidebar({
  activeView,
  onNavigate,
}: {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
}) {
  return (
    <aside className="app-sidebar panel-shadow overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4">
      <p className="px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
        Start here
      </p>
      <nav className="mt-2 space-y-0.5" aria-label="Primary navigation">
        {primaryNavigation.map(({ label, icon: Icon, view }) => {
          const enabled = Boolean(view);
          const active = view === activeView;
          return (
            <button
              key={label}
              type="button"
              disabled={!enabled}
              onClick={() => view && onNavigate(view)}
              title={enabled ? label : `${label} — coming in a later phase`}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium transition-colors ${active ? 'bg-[color:rgb(109_141_255_/_13%)] text-[var(--blue-bright)]' : enabled ? 'text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]' : 'cursor-not-allowed text-[var(--muted)] opacity-55'}`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
      <details
        className="group mt-5 border-t border-[var(--border)] pt-3"
        open={secondaryNavigation.some(({ view }) => view === activeView)}
      >
        <summary className="cursor-pointer list-none rounded-lg px-2.5 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]">
          More tools
          <span className="float-right transition group-open:rotate-45">+</span>
        </summary>
        <nav className="mt-1 space-y-0.5" aria-label="Additional tools">
          {secondaryNavigation.map(({ label, icon: Icon, view }) => (
            <button
              key={view}
              type="button"
              onClick={() => onNavigate(view)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${activeView === view ? 'bg-[color:rgb(109_141_255_/_13%)] text-[var(--blue-bright)]' : 'text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>
      </details>
    </aside>
  );
}
