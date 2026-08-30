export type RawPlanRow = { id: number; parent: number; notused?: number; detail: string };
export type QueryPlanStep = {
  id: number;
  parent: number;
  detail: string;
  operation: 'scan' | 'search' | 'temporary' | 'compound' | 'other';
  table: string | null;
  index: string | null;
  uses_index: boolean;
};
export type QueryPlanResponse = {
  engine: 'SQLite';
  steps: QueryPlanStep[];
  summary: { scans: number; index_searches: number; temporary_structures: number };
  warnings: string[];
};

export function interpretQueryPlan(rows: RawPlanRow[]): QueryPlanResponse {
  const steps = rows.map((row) => {
    const detail = String(row.detail ?? '');
    const operation: QueryPlanStep['operation'] = /\bSCAN\b/i.test(detail) ? 'scan' : /\bSEARCH\b/i.test(detail) ? 'search' : /\b(?:TEMP|B-TREE)\b/i.test(detail) ? 'temporary' : /\b(?:UNION|COMPOUND|SUBQUERY|CO-ROUTINE)\b/i.test(detail) ? 'compound' : 'other';
    const table = detail.match(/\b(?:SCAN|SEARCH)\s+(?:TABLE\s+)?([`"[]?[A-Za-z_]\w*[`"\]]?)/i)?.[1]?.replace(/[`"[\]]/g, '') ?? null;
    const index = detail.match(/\bUSING\s+(?:AUTOMATIC\s+)?(?:COVERING\s+)?INDEX\s+([`"[]?[A-Za-z_]\w*[`"\]]?)/i)?.[1]?.replace(/[`"[\]]/g, '') ?? null;
    return { id: Number(row.id), parent: Number(row.parent), detail, operation, table, index, uses_index: Boolean(index) || /\bUSING\s+INTEGER\s+PRIMARY\s+KEY\b/i.test(detail) };
  });
  const summary = {
    scans: steps.filter((step) => step.operation === 'scan').length,
    index_searches: steps.filter((step) => step.operation === 'search' && step.uses_index).length,
    temporary_structures: steps.filter((step) => step.operation === 'temporary').length,
  };
  const warnings: string[] = [];
  steps.filter((step) => step.operation === 'scan' && !step.uses_index && step.table && !/\bCONSTANT\s+ROW\b/i.test(step.detail)).forEach((step) => warnings.push(`${step.table} is scanned without an index lookup.`));
  if (summary.temporary_structures) warnings.push('SQLite creates a temporary B-tree for part of this query, commonly sorting or grouping.');
  return { engine: 'SQLite', steps, summary, warnings };
}
