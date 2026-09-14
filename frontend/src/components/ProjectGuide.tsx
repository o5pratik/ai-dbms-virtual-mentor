'use client';

import Image from 'next/image';
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Code2,
  ExternalLink,
  FileText,
  GraduationCap,
  KeyRound,
  PlayCircle,
  Table2,
  Users,
} from 'lucide-react';

import type { WorkspaceView } from './Sidebar';

const references = [
  {
    category: 'Books',
    title: 'Database System Concepts, 7th Edition',
    detail: 'Abraham Silberschatz, Henry F. Korth, and S. Sudarshan.',
    href: 'https://www.db-book.com/',
  },
  {
    category: 'Books',
    title: 'Fundamentals of Database Systems, 7th Edition',
    detail: 'Ramez Elmasri and Shamkant B. Navathe.',
    href: 'https://www.pearson.com/en-us/subject-catalog/p/fundamentals-of-database-systems/P200000003546',
  },
  {
    category: 'Website',
    title: 'SQL As Understood by SQLite',
    detail: 'Official SQLite language and syntax documentation.',
    href: 'https://www.sqlite.org/lang.html',
  },
  {
    category: 'Educational resource',
    title: 'SQLite Foreign Key Support',
    detail:
      'Official guide to parent keys, child keys, and referential integrity.',
    href: 'https://www.sqlite.org/foreignkeys.html',
  },
  {
    category: 'Research paper',
    title: 'A Relational Model of Data for Large Shared Data Banks',
    detail: 'E. F. Codd, Communications of the ACM 13(6), 1970.',
    href: 'https://doi.org/10.1145/362384.362685',
  },
  {
    category: 'Video',
    title: 'SQL Tutorial — Full Database Course for Beginners',
    detail: 'freeCodeCamp.org course by Mike Dane.',
    href: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
  },
];

const conceptCards = [
  {
    icon: Table2,
    title: 'Tables organize data',
    text: 'A relational database stores related facts in tables. Each row is one record; each column describes one attribute of that record.',
  },
  {
    icon: KeyRound,
    title: 'Keys connect tables',
    text: 'A primary key uniquely identifies a row. A foreign key points to a related row in another table and protects the relationship between them.',
  },
  {
    icon: Code2,
    title: 'SQL works with the data',
    text: 'DDL creates the structure. DML inserts, updates, and deletes rows. SELECT reads data and can filter, group, sort, and join related tables.',
  },
];

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="border-b border-[var(--border)] pb-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--violet)]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted-bright)]">
        {description}
      </p>
    </header>
  );
}

export function LearnPage() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--background)]">
      <article className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
        <PageHeading
          eyebrow="Learn"
          title="Relational databases and SQL"
          description="Understand how a database represents connected information, then use SQL to create, change, retrieve, and verify that information."
        />

        <section className="py-7">
          <h2 className="text-xl font-bold text-[var(--text)]">
            Concept explanation
          </h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[var(--muted-bright)]">
            A relational database represents data as tables. Relationships are
            expressed through matching key values instead of storing the same
            information repeatedly. A DBMS validates these rules, processes SQL,
            and returns either a result table or a clear status message.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {conceptCards.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:rgb(109_141_255_/_12%)] text-[var(--blue-bright)]">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-bold text-[var(--text)]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-bright)]">
                  {text}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[color:rgb(72_213_151_/_25%)] bg-[color:rgb(72_213_151_/_6%)] p-5">
            <h3 className="font-bold text-[var(--text)]">The SQL workflow</h3>
            <ol className="mt-3 grid gap-3 text-sm leading-6 text-[var(--muted-bright)] sm:grid-cols-2 lg:grid-cols-4">
              {[
                'Define tables, columns, keys, and constraints.',
                'Insert or change rows with controlled statements.',
                'Query the data with SELECT, JOIN, and filters.',
                'Inspect output, messages, schema, and the ER diagram.',
              ].map((step, index) => (
                <li key={step} className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-xs font-bold text-[#07130e]">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-[var(--border)] py-7">
          <div className="flex items-center gap-3">
            <PlayCircle className="text-[var(--violet)]" size={22} />
            <h2 className="text-xl font-bold text-[var(--text)]">
              Educational video
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-bright)]">
            This beginner-friendly course demonstrates database design, tables,
            keys, CRUD operations, joins, and ER diagrams.
          </p>
          <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-[var(--border)] bg-black shadow-2xl">
            <iframe
              className="h-full w-full"
              src="https://www.youtube-nocookie.com/embed/HXV3zeQKqGY"
              title="SQL Tutorial — Full Database Course for Beginners"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>

        <section className="border-t border-[var(--border)] py-7">
          <h2 className="text-xl font-bold text-[var(--text)]">References</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-bright)]">
            Sources acknowledged for the explanations, examples, and learning
            sequence used in ApexDB Mentor.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {references.map((reference) => (
              <a
                key={`${reference.category}-${reference.title}`}
                href={reference.href}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--border-bright)]"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--blue-bright)]">
                  {reference.category}
                </span>
                <span className="mt-1 flex items-start justify-between gap-3 text-sm font-bold text-[var(--text)]">
                  {reference.title}
                  <ExternalLink
                    size={14}
                    className="mt-0.5 shrink-0 text-[var(--muted)] group-hover:text-[var(--blue-bright)]"
                  />
                </span>
                <span className="mt-1 block text-sm leading-5 text-[var(--muted)]">
                  {reference.detail}
                </span>
              </a>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}

const members = [
  {
    name: 'Pratik Raj',
    registerNumber: '25BCE5425',
    image: '/team/pratik-raj.jpg',
    position: 'left bottom',
    scale: 'scale(2.2)',
    origin: 'top left',
  },
  {
    name: 'Aarnav Jain',
    registerNumber: '25BCE5262',
    image: '/team/aarnav-jain.jpeg',
    position: '50% 20%',
    scale: 'scale(1)',
    origin: 'center',
  },
];

export function TeamPage() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--background)]">
      <article className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
        <PageHeading
          eyebrow="Developed By"
          title="Team Apex"
          description="ApexDB Mentor was designed and developed as an interactive DBMS learning environment for practising SQL safely."
        />
        <section className="mx-auto grid max-w-3xl gap-5 py-8 sm:grid-cols-2">
          {members.map((member) => (
            <article
              key={member.name}
              className="w-full max-w-64 justify-self-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[var(--surface-muted)]">
                <Image
                  src={member.image}
                  alt={`Photograph of ${member.name}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  style={{
                    objectPosition: member.position,
                    transform: member.scale,
                    transformOrigin: member.origin,
                  }}
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--violet)]">
                  Student developer
                </p>
                <h2 className="mt-1 text-xl font-bold text-[var(--text)]">
                  {member.name}
                </h2>
                <p className="mt-2 text-sm text-[var(--muted-bright)]">
                  Register number:{' '}
                  <span className="font-semibold text-[var(--text)]">
                    {member.registerNumber}
                  </span>
                </p>
              </div>
            </article>
          ))}
        </section>
        <section className="rounded-2xl border border-[color:rgb(109_141_255_/_28%)] bg-[linear-gradient(145deg,rgb(109_141_255_/_10%),rgb(155_124_255_/_7%))] p-6 text-center">
          <GraduationCap
            size={28}
            className="mx-auto text-[var(--blue-bright)]"
          />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Guided By
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--text)]">
            Dr. Swaminathan A
          </h2>
          <p className="mt-1 text-base text-[var(--muted-bright)]">
            Assistant Professor
          </p>
        </section>
      </article>
    </div>
  );
}

const helpSteps = [
  {
    title: 'Write or load a SQL program',
    text: 'Use the editor for CREATE, INSERT, SELECT, UPDATE, DELETE, DROP, transactions, and other supported SQLite statements. More contains examples, import, reset, undo, and export tools.',
  },
  {
    title: 'Run the program',
    text: 'Choose Run script to execute the full editor, or select one statement and choose Run selection. The isolated ProgramDB protects the CollegeDB reference data.',
  },
  {
    title: 'Read the result',
    text: 'Output shows result tables. Messages shows completion details or the exact SQLite error. Schema lists created objects, and ER Diagram visualizes tables and foreign-key relationships.',
  },
  {
    title: 'Ask Apex AI',
    text: 'Describe the doubt in the right panel. Apex AI receives the current SQL, schema, and latest error, then returns focused steps and an optional SQL example that you can place in the editor.',
  },
  {
    title: 'Save or download your work',
    text: 'ProgramDB is recovered locally. Use Download in the top bar to create a complete PDF, document, or text report containing input SQL, processing steps, messages, tables, schema, and final output.',
  },
];

export function HelpPage() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--background)]">
      <article className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
        <PageHeading
          eyebrow="Help"
          title="How to use ApexDB Mentor"
          description="Follow these steps to create a database program, execute it safely, understand the result, and download a complete report."
        />
        <ol className="space-y-4 py-7">
          {helpSteps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--blue)] text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--text)]">
                  {step.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-bright)]">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <section className="border-t border-[var(--border)] py-7">
          <h2 className="text-xl font-bold text-[var(--text)]">
            Controls and outputs
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[var(--text)]">
                <tr>
                  <th className="px-4 py-3">Control</th>
                  <th className="px-4 py-3">What it does</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)] text-[var(--muted-bright)]">
                {[
                  ['Run script', 'Executes all statements in editor order.'],
                  ['Run selection', 'Executes only the highlighted SQL.'],
                  ['Output', 'Displays columns and rows returned by queries.'],
                  [
                    'ER Diagram',
                    'Shows tables and declared foreign-key links.',
                  ],
                  ['Messages', 'Explains success, timing, changes, or errors.'],
                  [
                    'Ask Apex AI',
                    'Explains the current SQL or helps correct an error.',
                  ],
                  [
                    'Download',
                    'Creates a PDF, document, or text execution report.',
                  ],
                  [
                    'Day/Night',
                    'Switches the interface between light and dark themes.',
                  ],
                ].map(([control, meaning]) => (
                  <tr key={control}>
                    <th className="px-4 py-3 font-semibold text-[var(--text)]">
                      {control}
                    </th>
                    <td className="px-4 py-3 leading-6">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </article>
    </div>
  );
}

export function GuideContextPanel({
  activeView,
  onNavigate,
}: {
  activeView: Extract<WorkspaceView, 'learn' | 'team' | 'help'>;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const labels = {
    learn: {
      icon: BookOpen,
      title: 'Learn',
      text: 'Concepts, video, and references',
    },
    team: {
      icon: Users,
      title: 'Developed By',
      text: 'Team Apex and project guide',
    },
    help: { icon: CircleHelp, title: 'Help', text: 'Step-by-step user manual' },
  } as const;
  return (
    <aside className="app-mentor overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
        Project guide
      </p>
      <nav className="mt-3 space-y-2" aria-label="Project information">
        {(Object.keys(labels) as Array<keyof typeof labels>).map((view) => {
          const item = labels[view];
          const Icon = item.icon;
          return (
            <button
              key={view}
              type="button"
              onClick={() => onNavigate(view)}
              className={`w-full rounded-xl border p-3 text-left ${activeView === view ? 'border-[color:rgb(155_124_255_/_40%)] bg-[color:rgb(155_124_255_/_9%)]' : 'border-[var(--border)] hover:bg-[var(--surface-raised)]'}`}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                <Icon size={15} className="text-[var(--violet)]" />
                {item.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                {item.text}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="mt-4 rounded-xl border border-[color:rgb(72_213_151_/_24%)] bg-[color:rgb(72_213_151_/_6%)] p-4">
        <CheckCircle2 size={18} className="text-[var(--green)]" />
        <p className="mt-2 text-sm font-bold text-[var(--text)]">
          Ready to practise?
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-bright)]">
          Return to SQL Workspace to write, run, and visualize a program.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('playground')}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-[var(--green)] px-3 py-2 text-xs font-bold text-[#07130e]"
        >
          <FileText size={13} /> Open SQL Workspace
        </button>
      </div>
    </aside>
  );
}
