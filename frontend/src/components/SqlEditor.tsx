'use client';

import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';

import { COLLEGE_EDITOR_SCHEMA, diagnoseSql, SQL_KEYWORDS } from '../services/sql-intelligence';

type SqlEditorProps = { value: string; onChange: (value: string) => void; onRun: () => void; onFormat: () => void };
type EditorInstance = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

function aliasMap(sql: string) {
  const aliases = new Map<string, string>();
  for (const match of sql.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_]\w*)(?:\s+(?:AS\s+)?((?!ON\b|WHERE\b|JOIN\b|GROUP\b|ORDER\b|LIMIT\b)[A-Za-z_]\w*))?/gi)) {
    const table = Object.keys(COLLEGE_EDITOR_SCHEMA).find((name) => name.toLowerCase() === match[1].toLowerCase());
    if (table) { aliases.set(table.toLowerCase(), table); if (match[2]) aliases.set(match[2].toLowerCase(), table); }
  }
  return aliases;
}

function updateMarkers(monaco: MonacoInstance, editor: EditorInstance, sql: string) {
  const model = editor.getModel(); if (!model) return;
  monaco.editor.setModelMarkers(model, 'dbms-mentor', diagnoseSql(sql).map((diagnostic) => {
    const start = model.getPositionAt(diagnostic.start); const end = model.getPositionAt(diagnostic.end);
    return { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column, message: diagnostic.message, severity: diagnostic.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning };
  }));
}

export function SqlEditor({ value, onChange, onRun, onFormat }: SqlEditorProps) {
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const disposables = useRef<Array<{ dispose: () => void }>>([]);
  const onRunRef = useRef(onRun);
  const onFormatRef = useRef(onFormat);
  onRunRef.current = onRun;
  onFormatRef.current = onFormat;

  useEffect(() => { if (editorRef.current && monacoRef.current) updateMarkers(monacoRef.current, editorRef.current, value); }, [value]);
  useEffect(() => () => { disposables.current.forEach((item) => item.dispose()); }, []);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor; monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current());
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => onFormatRef.current());
    disposables.current.push(monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
        const before = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
        const qualifier = before.match(/([A-Za-z_]\w*)\.\w*$/)?.[1]?.toLowerCase();
        const table = qualifier ? aliasMap(model.getValue()).get(qualifier) : null;
        const columnSuggestions = (table ? COLLEGE_EDITOR_SCHEMA[table] : Object.entries(COLLEGE_EDITOR_SCHEMA).flatMap(([tableName, columns]) => columns.map((column) => ({ ...column, tableName })))).map((column) => ({
          label: column.name, kind: monaco.languages.CompletionItemKind.Field, insertText: column.name,
          detail: `${'tableName' in column ? column.tableName : table} · ${column.type}`, documentation: column.description, range, sortText: '1',
        }));
        if (table) return { suggestions: columnSuggestions };
        const tableSuggestions = Object.keys(COLLEGE_EDITOR_SCHEMA).map((name) => ({ label: name, kind: monaco.languages.CompletionItemKind.Class, insertText: name, detail: `CollegeDB table · ${COLLEGE_EDITOR_SCHEMA[name].length} columns`, range, sortText: '0' }));
        const keywordSuggestions = SQL_KEYWORDS.map((keyword) => ({ label: keyword, kind: monaco.languages.CompletionItemKind.Keyword, insertText: keyword, detail: 'SQL keyword', range, sortText: '2' }));
        return { suggestions: [...tableSuggestions, ...columnSuggestions, ...keywordSuggestions] };
      },
    }));
    disposables.current.push(monaco.languages.registerHoverProvider('sql', {
      provideHover(model, position) {
        const word = model.getWordAtPosition(position); if (!word) return null;
        const table = Object.keys(COLLEGE_EDITOR_SCHEMA).find((name) => name.toLowerCase() === word.word.toLowerCase());
        if (table) return { range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn), contents: [{ value: `**${table}** — CollegeDB table` }, { value: COLLEGE_EDITOR_SCHEMA[table].map((column) => `\`${column.name}\` ${column.type}`).join(' · ') }] };
        const matches = Object.entries(COLLEGE_EDITOR_SCHEMA).flatMap(([tableName, columns]) => columns.filter((column) => column.name.toLowerCase() === word.word.toLowerCase()).map((column) => ({ tableName, column })));
        if (!matches.length) return null;
        return { range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn), contents: matches.map(({ tableName, column }) => ({ value: `**${tableName}.${column.name}** · ${column.type}\n\n${column.description}` })) };
      },
    }));
    updateMarkers(monaco, editor, value);
    editor.focus();
  };

  return <div className="min-h-[255px] flex-1 overflow-hidden bg-[#0b1019]"><Editor height="100%" defaultLanguage="sql" theme="vs-dark" value={value} onChange={(nextValue) => onChange(nextValue ?? '')} onMount={handleMount} loading={<div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Loading SQL editor…</div>} options={{ automaticLayout: true, minimap: { enabled: false }, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 22, padding: { top: 16, bottom: 16 }, scrollBeyondLastLine: false, smoothScrolling: true, wordWrap: 'on', tabSize: 2, formatOnPaste: true, bracketPairColorization: { enabled: true }, renderLineHighlight: 'all', quickSuggestions: { other: true, comments: false, strings: false }, suggestOnTriggerCharacters: true }} /></div>;
}
