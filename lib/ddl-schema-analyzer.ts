import type { SchemaColumn, SchemaMetadata, SchemaRelationship, SchemaTable } from './college-schema';

type Definition = { name: string; body: string };

function stripComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

function unquote(value: string) {
  return value.replace(/^[`"[]|[`"\]]$/g, '');
}

function findDefinitions(sql: string): Definition[] {
  const source = stripComments(sql);
  const pattern = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[]?[A-Za-z_]\w*[`"\]]?)\s*\(/gi;
  const definitions: Definition[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    let depth = 1;
    let quote = '';
    let cursor = pattern.lastIndex;
    for (; cursor < source.length && depth > 0; cursor += 1) {
      const character = source[cursor];
      if (quote) {
        if (character === quote && source[cursor - 1] !== '\\') quote = '';
      } else if (character === "'" || character === '"' || character === '`') quote = character;
      else if (character === '(') depth += 1;
      else if (character === ')') depth -= 1;
    }
    if (depth !== 0) throw new Error(`The ${unquote(match[1])} table has an unmatched parenthesis.`);
    definitions.push({ name: unquote(match[1]), body: source.slice(pattern.lastIndex, cursor - 1) });
    pattern.lastIndex = cursor;
  }
  return definitions;
}

function splitDefinitions(body: string) {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = '';
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (quote) {
      if (character === quote && body[index - 1] !== '\\') quote = '';
    } else if (character === "'" || character === '"' || character === '`') quote = character;
    else if (character === '(') depth += 1;
    else if (character === ')') depth -= 1;
    else if (character === ',' && depth === 0) {
      parts.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(body.slice(start).trim());
  return parts.filter(Boolean);
}

function namesInParentheses(fragment: string) {
  return (fragment.match(/\(([^)]+)\)/)?.[1] ?? '').split(',').map((name) => unquote(name.trim())).filter(Boolean);
}

export function analyzeDdlSchema(sql: string): SchemaMetadata & { warnings: string[] } {
  const definitions = findDefinitions(sql);
  if (!definitions.length) throw new Error('No CREATE TABLE statements were found.');
  if (definitions.length > 30) throw new Error('Analyze up to 30 tables at a time.');

  const tables: SchemaTable[] = [];
  const relationships: SchemaRelationship[] = [];
  const warnings: string[] = [];

  for (const definition of definitions) {
    const columns: SchemaColumn[] = [];
    const tablePrimaryKeys = new Set<string>();
    const tableUnique = new Set<string>();
    const pendingForeignKeys: Array<{ columns: string[]; table: string; targets: string[] }> = [];

    for (const part of splitDefinitions(definition.body)) {
      const normalized = part.replace(/^CONSTRAINT\s+[`"[]?[A-Za-z_]\w*[`"\]]?\s+/i, '');
      if (/^PRIMARY\s+KEY\b/i.test(normalized)) namesInParentheses(normalized).forEach((name) => tablePrimaryKeys.add(name));
      else if (/^UNIQUE\b/i.test(normalized)) namesInParentheses(normalized).forEach((name) => tableUnique.add(name));
      else if (/^FOREIGN\s+KEY\b/i.test(normalized)) {
        const reference = normalized.match(/^FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([`"[]?[A-Za-z_]\w*[`"\]]?)\s*\(([^)]+)\)/i);
        if (reference) pendingForeignKeys.push({ columns: reference[1].split(',').map((name) => unquote(name.trim())), table: unquote(reference[2]), targets: reference[3].split(',').map((name) => unquote(name.trim())) });
      } else {
        const columnMatch = normalized.match(/^[`"[]?([A-Za-z_]\w*)[`"\]]?\s+([A-Za-z]+(?:\s*\([^)]*\))?)([\s\S]*)$/);
        if (!columnMatch) { warnings.push(`Skipped an unrecognized definition in ${definition.name}: ${part}`); continue; }
        const [, name, rawType, constraints] = columnMatch;
        const reference = constraints.match(/\bREFERENCES\s+([`"[]?[A-Za-z_]\w*[`"\]]?)\s*\(([^)]+)\)/i);
        const check = constraints.match(/\bCHECK\s*\(([^)]+)\)/i)?.[1]?.trim();
        const column: SchemaColumn = {
          name,
          type: rawType.toUpperCase().replace(/\s+/g, ' '),
          nullable: !/\bNOT\s+NULL\b/i.test(constraints) && !/\bPRIMARY\s+KEY\b/i.test(constraints),
          ...( /\bPRIMARY\s+KEY\b/i.test(constraints) ? { primary_key: true } : {} ),
          ...( /\bUNIQUE\b/i.test(constraints) ? { unique: true } : {} ),
          ...(check ? { check } : {}),
          ...(reference ? { foreign_key: { table: unquote(reference[1]), column: unquote(reference[2].split(',')[0].trim()) } } : {}),
        };
        columns.push(column);
      }
    }

    columns.forEach((column) => {
      if (tablePrimaryKeys.has(column.name)) { column.primary_key = true; column.nullable = false; }
      if (tableUnique.has(column.name)) column.unique = true;
    });
    pendingForeignKeys.forEach((foreignKey) => foreignKey.columns.forEach((columnName, index) => {
      const column = columns.find((item) => item.name === columnName);
      if (column) column.foreign_key = { table: foreignKey.table, column: foreignKey.targets[index] ?? foreignKey.targets[0] };
    }));

    if (!columns.length) warnings.push(`${definition.name} has no recognized columns.`);
    const foreignKeyCount = columns.filter((column) => column.foreign_key).length;
    const primaryKeyCount = columns.filter((column) => column.primary_key).length;
    tables.push({ name: definition.name, kind: foreignKeyCount >= 2 && primaryKeyCount >= 2 ? 'junction' : 'entity', description: `Detected from the supplied CREATE TABLE definition.`, row_count: 0, columns });
  }

  const knownTables = new Set(tables.map((table) => table.name.toLowerCase()));
  tables.forEach((table) => table.columns.forEach((column) => {
    if (!column.foreign_key) return;
    const target = column.foreign_key;
    relationships.push({ id: `${table.name}-${column.name}-${target.table}-${target.column}`.toLowerCase(), from_table: table.name, from_column: column.name, to_table: target.table, to_column: target.column, cardinality: 'many-to-one' });
    if (!knownTables.has(target.table.toLowerCase())) warnings.push(`${table.name}.${column.name} references ${target.table}, which is not included in this schema.`);
  }));

  return {
    database: 'Analyzed schema', engine: 'SQL DDL', tables, relationships, warnings,
    totals: {
      tables: tables.length,
      columns: tables.reduce((total, table) => total + table.columns.length, 0),
      primary_keys: tables.reduce((total, table) => total + table.columns.filter((column) => column.primary_key).length, 0),
      foreign_keys: relationships.length,
    },
  };
}
