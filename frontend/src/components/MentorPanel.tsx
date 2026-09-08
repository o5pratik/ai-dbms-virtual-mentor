'use client';

import { useState } from 'react';
import { AlertCircle, Bot, Check, CheckCircle2, Clipboard, CornerDownLeft, Lightbulb, Sparkles, WandSparkles, X } from 'lucide-react';

import type { ExplanationResponse, FixResponse, SuggestionResponse, TutorSource } from '../services/api';

export type MentorView =
  | { kind: 'welcome' }
  | { kind: 'loading'; label: string }
  | { kind: 'error'; message: string }
  | { kind: 'explanation'; data: ExplanationResponse }
  | { kind: 'suggestion'; data: SuggestionResponse }
  | { kind: 'fix'; data: FixResponse };

type MentorPanelProps = {
  view: MentorView;
  instruction: string;
  onInstructionChange: (value: string) => void;
  onAsk: () => void;
  onApply: (sql: string) => void;
  onReject: () => void;
};

function SourceBadge({ source }: { source: TutorSource }) {
  return (
    <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
      {source === 'groq' ? 'Groq AI' : 'Built-in tutor'}
    </span>
  );
}

function SqlActions({ sql, onApply, onReject }: { sql: string; onApply: (sql: string) => void; onReject: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => onApply(sql)} className="flex items-center gap-1.5 rounded-lg bg-[var(--blue)] px-3 py-2 text-[10px] font-bold text-white hover:brightness-110"><Check size={12} /> Apply</button>
      <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[10px] font-semibold text-[var(--muted-bright)] hover:bg-[var(--surface-muted)]"><Clipboard size={12} /> {copied ? 'Copied' : 'Copy'}</button>
      <button type="button" onClick={onReject} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--text)]"><X size={12} /> Reject</button>
    </div>
  );
}

export function MentorPanel({ view, instruction, onInstructionChange, onAsk, onApply, onReject }: MentorPanelProps) {
  const source = view.kind === 'explanation' || view.kind === 'suggestion' || view.kind === 'fix' ? view.data.source : null;

  return (
    <aside className="app-mentor panel-shadow flex min-h-0 flex-col border-l border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:rgb(155_124_255_/_13%)] text-[#b9a5ff]"><Bot size={17} /></div>
          <div><p className="text-xs font-bold">Apex AI</p><p className="text-[10px] text-[var(--green)]">Ready</p></div>
        </div>
        {source ? <SourceBadge source={source} /> : <span className="h-2 w-2 rounded-full bg-[var(--green)] shadow-[0_0_8px_var(--green)]" />}
      </div>

      <div className="border-b border-[var(--border)] p-4">
        <label htmlFor="mentor-request" className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Ask Apex AI</label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[#0b1019] px-3 py-2 focus-within:border-[var(--blue)]">
          <input
            id="mentor-request"
            value={instruction}
            onChange={(event) => onInstructionChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && instruction.trim()) onAsk(); }}
            placeholder="e.g. Show students above 80 with courses"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
          <button type="button" onClick={onAsk} disabled={!instruction.trim() || view.kind === 'loading'} title="Generate SQL" className="rounded-md bg-[var(--surface-muted)] p-1.5 text-[var(--blue-bright)] disabled:opacity-40"><CornerDownLeft size={13} /></button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {view.kind === 'loading' ? (
          <div className="flex h-44 flex-col items-center justify-center text-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-bright)] border-t-[#b9a5ff]" />
            <p className="mt-3 text-xs font-semibold">{view.label}</p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">Reviewing the SQL and CollegeDB schema…</p>
          </div>
        ) : null}

        {view.kind === 'welcome' ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold"><Sparkles size={14} className="text-[#b9a5ff]" /> Your SQL tutor is ready</div>
              <p className="mt-3 text-xs leading-5 text-[var(--muted-bright)]">Use Explain to understand a query, AI Suggest to improve it, or Fix error after a failed run.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[['Explain', Sparkles], ['Suggest', Lightbulb], ['Fix', WandSparkles]].map(([label, Icon]) => {
                const TutorIcon = Icon as typeof Sparkles;
                return <div key={label as string} className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2 text-center text-[9px] text-[var(--muted)]"><TutorIcon className="mx-auto mb-1 text-[var(--blue-bright)]" size={13} />{label as string}</div>;
              })}
            </div>
          </div>
        ) : null}

        {view.kind === 'error' ? (
          <div className="flex gap-3 rounded-xl border border-[color:rgb(255_107_135_/_25%)] bg-[color:rgb(255_107_135_/_7%)] p-4"><AlertCircle size={17} className="shrink-0 text-[var(--red)]" /><div><p className="text-xs font-semibold text-[var(--red)]">Mentor request failed</p><p className="mt-1 text-[11px] leading-5 text-[var(--muted-bright)]">{view.message}</p></div></div>
        ) : null}

        {view.kind === 'explanation' ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold"><Sparkles size={14} className="text-[#b9a5ff]" /> Query explanation</div>
              <p className="mt-3 text-xs leading-5 text-[var(--muted-bright)]">{view.data.summary}</p>
              <div className="mt-4 space-y-2.5">
                {view.data.steps.map((step, index) => <div key={`${index}-${step}`} className="flex items-start gap-2.5 text-[11px] text-[var(--muted)]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border-bright)] bg-[var(--surface-muted)] font-mono text-[9px] text-[var(--blue-bright)]">{index + 1}</span><span className="pt-0.5 leading-4">{step}</span></div>)}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Concepts used</p>
              <div className="mt-3 flex flex-wrap gap-2">{view.data.concepts.map((concept) => <span key={concept} className="rounded-md border border-[color:rgb(109_141_255_/_18%)] bg-[color:rgb(109_141_255_/_8%)] px-2 py-1 font-mono text-[10px] text-[var(--blue-bright)]">{concept}</span>)}</div>
              {view.data.improvements.length ? <><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Possible improvements</p><ul className="mt-2 space-y-1.5 text-[10px] leading-4 text-[var(--muted-bright)]">{view.data.improvements.map((item) => <li key={item}>• {item}</li>)}</ul></> : null}
              <p className="mt-3 border-t border-[var(--border)] pt-3 text-[10px] leading-4 text-[var(--muted)]">{view.data.complexity}</p>
            </div>
          </div>
        ) : null}

        {view.kind === 'suggestion' ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold"><Lightbulb size={14} className="text-[var(--amber)]" /> SQL suggestion</div>
            <p className="mt-3 text-[11px] leading-5 text-[var(--muted-bright)]">{view.data.rationale}</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[#090d14] p-3 font-mono text-[10px] leading-4 text-[#c9d3e3]">{view.data.sql}</pre>
            <SqlActions sql={view.data.sql} onApply={onApply} onReject={onReject} />
          </div>
        ) : null}

        {view.kind === 'fix' ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold"><WandSparkles size={14} className={view.data.has_error ? 'text-[var(--amber)]' : 'text-[var(--green)]'} /> {view.data.has_error ? 'Suggested fix' : 'Query check'}</div>
            <p className="mt-3 text-[11px] leading-5 text-[var(--muted-bright)]">{view.data.error_explanation}</p>
            <p className="mt-2 text-[10px] leading-4 text-[var(--muted)]">{view.data.reason}</p>
            {view.data.has_error ? <><pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[#090d14] p-3 font-mono text-[10px] leading-4 text-[#c9d3e3]">{view.data.corrected_sql}</pre><SqlActions sql={view.data.corrected_sql} onApply={onApply} onReject={onReject} /></> : <div className="mt-4 flex items-center gap-2 rounded-lg border border-[color:rgb(72_213_151_/_20%)] bg-[color:rgb(72_213_151_/_6%)] p-3 text-[10px] text-[var(--green)]"><CheckCircle2 size={14} /> No correction is needed.</div>}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
