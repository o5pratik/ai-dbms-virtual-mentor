import {
  BarChart3,
  BrainCircuit,
  BookOpen,
  Boxes,
  Braces,
  Clock3,
  Database,
  DatabaseZap,
  LibraryBig,
  LayoutDashboard,
  Save,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export type WorkspaceView =
  | 'dashboard'
  | 'playground'
  | 'write-lab'
  | 'editable-er'
  | 'schema'
  | 'schema-lab'
  | 'er'
  | 'history'
  | 'saved'
  | 'analytics'
  | 'topics'
  | 'quiz'
  | 'pyq'
  | 'learn'
  | 'team'
  | 'help';

export const primaryNavigation: Array<{
  label: string;
  icon: LucideIcon;
  view?: WorkspaceView;
}> = [
  { label: 'SQL Workspace', icon: Braces, view: 'playground' as const },
  { label: 'AI Quiz', icon: BrainCircuit, view: 'quiz' },
  { label: 'Topic-wise PYQs', icon: LibraryBig, view: 'pyq' },
  { label: 'ER Diagram', icon: Workflow, view: 'editable-er' },
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
        Database tools
      </p>
      <details
        className="group mt-2"
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

export function TopNavigation({
  activeView,
  onNavigate,
}: {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
}) {
  return (
    <nav
      className="app-topnav flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[color:rgb(11_16_24_/_96%)] px-3 py-1.5"
      aria-label="Main workspace navigation"
    >
      {primaryNavigation.map(({ label, icon: Icon, view }) => (
        <button
          key={label}
          type="button"
          onClick={() => view && onNavigate(view)}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeView === view ? 'bg-[linear-gradient(135deg,rgb(109_141_255_/_20%),rgb(155_124_255_/_16%))] text-[var(--text)] ring-1 ring-[color:rgb(109_141_255_/_28%)]' : 'text-[var(--muted-bright)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'}`}
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </nav>
  );
}
