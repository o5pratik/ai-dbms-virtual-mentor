export type QueryStepType = 'source' | 'join' | 'filter' | 'group' | 'having' | 'project' | 'sort' | 'limit';

export type QueryFlowStep = {
  id: string;
  type: QueryStepType;
  title: string;
  detail: string;
  sql_fragment: string;
  concepts: string[];
};

export type QueryAnalysis = {
  summary: string;
  steps: QueryFlowStep[];
  tables: string[];
  estimated_complexity: 'Simple' | 'Moderate' | 'Advanced';
  warnings: string[];
};

const clausePattern = /\b(SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/gi;

function clean(fragment: string) {
  return fragment.trim().replace(/;$/, '').trim();
}

function clauseBodies(sql: string) {
  const matches = [...sql.matchAll(clausePattern)];
  return new Map(matches.map((match, index) => {
    const key = match[1].toUpperCase().replace(/\s+/g, ' ');
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? sql.length;
    return [key, clean(sql.slice(start, end))];
  }));
}

function tableName(fragment: string) {
  return fragment.match(/^([`"[]?[A-Za-z_]\w*[`"\]]?)/)?.[1]?.replace(/[`"[\]]/g, '') ?? 'data source';
}

export function analyzeSql(query: string): QueryAnalysis {
  const sql = clean(query);
  const clauses = clauseBodies(sql);
  const steps: QueryFlowStep[] = [];
  const tables: string[] = [];
  const warnings: string[] = [];
  const fromBody = clauses.get('FROM') ?? '';
  const fromBeforeJoin = clean(fromBody.split(/\b(?:LEFT|RIGHT|FULL|INNER|CROSS)?\s*JOIN\b/i)[0] ?? '');
  const source = tableName(fromBeforeJoin);

  if (fromBody) {
    tables.push(source);
    steps.push({ id: 'source-1', type: 'source', title: `Read ${source}`, detail: `Start with rows from ${source}. This is the query's primary data source.`, sql_fragment: `FROM ${fromBeforeJoin}`, concepts: ['FROM', 'table scan'] });
  }

  const joinPattern = /\b((?:LEFT|RIGHT|FULL|INNER|CROSS)\s+)?JOIN\s+([`"[]?[A-Za-z_]\w*[`"\]]?)(?:\s+(?:AS\s+)?((?!ON\b)[A-Za-z_]\w*))?(?:\s+ON\s+([\s\S]*?))?(?=\b(?:LEFT|RIGHT|FULL|INNER|CROSS)?\s*JOIN\b|$)/gi;
  let joinMatch: RegExpExecArray | null;
  let joinIndex = 0;
  while ((joinMatch = joinPattern.exec(fromBody)) !== null) {
    joinIndex += 1;
    const kind = clean(joinMatch[1] ?? '') || 'INNER';
    const name = joinMatch[2].replace(/[`"[\]]/g, '');
    const alias = joinMatch[3] ?? '';
    const condition = clean(joinMatch[4] ?? '');
    tables.push(name);
    const fragment = `${kind} JOIN ${name}${alias ? ` AS ${alias}` : ''}${condition ? ` ON ${condition}` : ''}`;
    steps.push({ id: `join-${joinIndex}`, type: 'join', title: `Join ${name}`, detail: condition ? `Match rows using ${condition}.` : `Combine rows from ${name}.`, sql_fragment: fragment, concepts: [`${kind} JOIN`, condition ? 'join condition' : 'Cartesian join'] });
    if (!condition && kind !== 'CROSS') warnings.push(`${name} is joined without an ON condition, which may create a Cartesian result.`);
  }

  const where = clauses.get('WHERE');
  if (where) steps.push({ id: 'filter-1', type: 'filter', title: 'Filter rows', detail: `Keep only rows where ${where}.`, sql_fragment: `WHERE ${where}`, concepts: ['WHERE', 'predicate'] });

  const group = clauses.get('GROUP BY');
  if (group) steps.push({ id: 'group-1', type: 'group', title: 'Group rows', detail: `Place matching values into groups using ${group}.`, sql_fragment: `GROUP BY ${group}`, concepts: ['GROUP BY', 'aggregation'] });

  const having = clauses.get('HAVING');
  if (having) steps.push({ id: 'having-1', type: 'having', title: 'Filter groups', detail: `Keep only grouped results where ${having}.`, sql_fragment: `HAVING ${having}`, concepts: ['HAVING', 'aggregate predicate'] });

  const select = clauses.get('SELECT') ?? '';
  if (select) steps.push({ id: 'project-1', type: 'project', title: select.trim() === '*' ? 'Return every column' : 'Choose output columns', detail: select.trim() === '*' ? 'Return all columns from the combined row set.' : `Return only ${select}.`, sql_fragment: `SELECT ${select}`, concepts: ['SELECT', select.toUpperCase().startsWith('DISTINCT ') ? 'DISTINCT' : 'projection'] });
  if (/^\s*\*/.test(select)) warnings.push('SELECT * returns every column. Name the columns when you only need a subset.');

  const order = clauses.get('ORDER BY');
  if (order) steps.push({ id: 'sort-1', type: 'sort', title: 'Sort results', detail: `Order the final rows by ${order}.`, sql_fragment: `ORDER BY ${order}`, concepts: ['ORDER BY', 'sorting'] });

  const limit = clauses.get('LIMIT');
  if (limit) steps.push({ id: 'limit-1', type: 'limit', title: `Limit to ${limit}`, detail: `Return at most ${limit} rows after sorting.`, sql_fragment: `LIMIT ${limit}`, concepts: ['LIMIT', 'result window'] });
  else warnings.push('No LIMIT is present. Add one while exploring large tables.');

  const joinCount = steps.filter((step) => step.type === 'join').length;
  const complexityScore = joinCount + (group ? 2 : 0) + (having ? 1 : 0) + (sql.match(/\bSELECT\b/gi)?.length ?? 1) - 1;
  const estimated_complexity = complexityScore >= 4 ? 'Advanced' : complexityScore >= 2 ? 'Moderate' : 'Simple';
  const uniqueTables = [...new Set(tables)];
  const summary = `This ${estimated_complexity.toLowerCase()} query processes ${uniqueTables.length || 1} data source${uniqueTables.length === 1 ? '' : 's'} through ${steps.length} logical step${steps.length === 1 ? '' : 's'}.`;

  return { summary, steps, tables: uniqueTables, estimated_complexity, warnings };
}
