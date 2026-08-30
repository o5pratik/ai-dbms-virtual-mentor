export const COLLEGE_EDITOR_SCHEMA: Record<string, Array<{ name: string; type: string; description: string }>> = {
  Student: [
    { name: 'student_id', type: 'INTEGER', description: 'Primary key' }, { name: 'name', type: 'TEXT', description: 'Student name' },
    { name: 'marks', type: 'INTEGER', description: 'Score from 0 to 100' }, { name: 'dept_id', type: 'INTEGER', description: 'Foreign key to Department' },
  ],
  Course: [
    { name: 'course_id', type: 'INTEGER', description: 'Primary key' }, { name: 'course_name', type: 'TEXT', description: 'Course title' },
    { name: 'teacher_id', type: 'INTEGER', description: 'Foreign key to Teacher' },
  ],
  Teacher: [
    { name: 'teacher_id', type: 'INTEGER', description: 'Primary key' }, { name: 'name', type: 'TEXT', description: 'Teacher name' },
    { name: 'dept_id', type: 'INTEGER', description: 'Foreign key to Department' },
  ],
  Department: [{ name: 'dept_id', type: 'INTEGER', description: 'Primary key' }, { name: 'dept_name', type: 'TEXT', description: 'Unique department name' }],
  Enrollment: [
    { name: 'student_id', type: 'INTEGER', description: 'Foreign key to Student' }, { name: 'course_id', type: 'INTEGER', description: 'Foreign key to Course' },
    { name: 'semester', type: 'INTEGER', description: 'Semester from 1 to 8' },
  ],
};

const SQL_KEYWORDS = ['SELECT', 'DISTINCT', 'FROM', 'AS', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'INNER JOIN', 'ON', 'WHERE', 'AND', 'OR', 'GROUP BY', 'HAVING', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'UNION', 'COUNT', 'AVG', 'SUM', 'MIN', 'MAX'];
export { SQL_KEYWORDS };

export function formatSql(sql: string) {
  const hadSemicolon = /;\s*$/.test(sql);
  let formatted = sql.trim().replace(/;\s*$/, '').replace(/\s+/g, ' ');
  SQL_KEYWORDS.forEach((keyword) => { formatted = formatted.replace(new RegExp(`\\b${keyword.replace(' ', '\\s+')}\\b`, 'gi'), keyword); });
  formatted = formatted.replace(/\s+(FROM|LEFT JOIN|RIGHT JOIN|FULL JOIN|INNER JOIN|JOIN|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|UNION)\b/g, '\n$1');
  formatted = formatted.replace(/\s+(AND|OR)\s+/g, '\n  $1 ');
  return `${formatted}${hadSemicolon ? ';' : ''}`;
}

export type SqlDiagnostic = { start: number; end: number; message: string; severity: 'error' | 'warning' };

export function diagnoseSql(sql: string): SqlDiagnostic[] {
  const diagnostics: SqlDiagnostic[] = [];
  const addPattern = (pattern: RegExp, message: string, severity: 'error' | 'warning' = 'error') => {
    const match = pattern.exec(sql); if (match?.index !== undefined) diagnostics.push({ start: match.index, end: match.index + Math.max(1, match[0].length), message, severity });
  };
  addPattern(/\bSELECT\s+FROM\b/i, 'SELECT needs at least one output column.');
  addPattern(/,\s*FROM\b/i, 'Remove the trailing comma before FROM.');
  addPattern(/\b(?:ORDER|GROUP)\s+BY\s*(?=LIMIT\b|;|$)/i, 'Add a column after this clause.');
  addPattern(/\b(?:WHERE|HAVING|AND|OR)\s+[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?\s*(?:=|<>|!=|<=|>=|<|>)\s*(?=ORDER\b|GROUP\b|LIMIT\b|;|$)/i, 'Add a value after the comparison operator.');

  const stack: number[] = []; let quote = '';
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    if (quote) { if (character === quote && sql[index - 1] !== '\\') quote = ''; continue; }
    if (character === "'" || character === '"' || character === '`') { quote = character; continue; }
    if (character === '(') stack.push(index);
    else if (character === ')') { const open = stack.pop(); if (open === undefined) diagnostics.push({ start: index, end: index + 1, message: 'This closing parenthesis has no matching opening parenthesis.', severity: 'error' }); }
  }
  stack.forEach((index) => diagnostics.push({ start: index, end: index + 1, message: 'This opening parenthesis is not closed.', severity: 'error' }));

  const aliases = new Map<string, string>();
  for (const match of sql.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_]\w*)(?:\s+(?:AS\s+)?((?!ON\b|WHERE\b|JOIN\b|GROUP\b|ORDER\b|LIMIT\b)[A-Za-z_]\w*))?/gi)) {
    const table = Object.keys(COLLEGE_EDITOR_SCHEMA).find((name) => name.toLowerCase() === match[1].toLowerCase());
    if (!table) diagnostics.push({ start: (match.index ?? 0) + match[0].indexOf(match[1]), end: (match.index ?? 0) + match[0].indexOf(match[1]) + match[1].length, message: `Unknown CollegeDB table “${match[1]}”.`, severity: 'warning' });
    else { aliases.set(table.toLowerCase(), table); if (match[2]) aliases.set(match[2].toLowerCase(), table); }
  }
  for (const match of sql.matchAll(/\b([A-Za-z_]\w*)\.([A-Za-z_]\w*)\b/g)) {
    const table = aliases.get(match[1].toLowerCase()); if (!table) continue;
    if (!COLLEGE_EDITOR_SCHEMA[table].some((column) => column.name.toLowerCase() === match[2].toLowerCase())) diagnostics.push({ start: (match.index ?? 0) + match[1].length + 1, end: (match.index ?? 0) + match[0].length, message: `“${match[2]}” is not a column in ${table}.`, severity: 'warning' });
  }
  return diagnostics;
}
