'use client';

import Editor, { type OnMount } from '@monaco-editor/react';

type SqlEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
};

export function SqlEditor({ value, onChange, onRun }: SqlEditorProps) {
  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun);
    editor.focus();
  };

  return (
    <div className="min-h-[255px] flex-1 overflow-hidden bg-[#0b1019]">
      <Editor
        height="100%"
        defaultLanguage="sql"
        theme="vs-dark"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? '')}
        onMount={handleMount}
        loading={<div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Loading SQL editor…</div>}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          lineHeight: 22,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          wordWrap: 'on',
          tabSize: 2,
          formatOnPaste: true,
          bracketPairColorization: { enabled: true },
          renderLineHighlight: 'all',
        }}
      />
    </div>
  );
}
