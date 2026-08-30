import re


CLAUSE_PATTERN = re.compile(r"\b(SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b", re.I)


def _clean(fragment: str) -> str:
    return fragment.strip().removesuffix(";").strip()


def analyze_sql(query: str) -> dict:
    sql = _clean(query)
    matches = list(CLAUSE_PATTERN.finditer(sql))
    clauses: dict[str, str] = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(sql)
        clauses[re.sub(r"\s+", " ", match.group(1).upper())] = _clean(sql[match.end():end])

    steps: list[dict] = []
    tables: list[str] = []
    warnings: list[str] = []
    from_body = clauses.get("FROM", "")
    from_head = _clean(re.split(r"\b(?:LEFT|RIGHT|FULL|INNER|CROSS)?\s*JOIN\b", from_body, maxsplit=1, flags=re.I)[0])
    source_match = re.match(r'^[`"\[]?([A-Za-z_]\w*)', from_head)
    source = source_match.group(1) if source_match else "data source"

    if from_body:
        tables.append(source)
        steps.append({"id": "source-1", "type": "source", "title": f"Read {source}", "detail": f"Start with rows from {source}. This is the query's primary data source.", "sql_fragment": f"FROM {from_head}", "concepts": ["FROM", "table scan"]})

    join_pattern = re.compile(r'\b((?:LEFT|RIGHT|FULL|INNER|CROSS)\s+)?JOIN\s+[`"\[]?([A-Za-z_]\w*)[`"\]]?(?:\s+(?:AS\s+)?((?!ON\b)[A-Za-z_]\w*))?(?:\s+ON\s+([\s\S]*?))?(?=\b(?:LEFT|RIGHT|FULL|INNER|CROSS)?\s*JOIN\b|$)', re.I)
    for index, match in enumerate(join_pattern.finditer(from_body), 1):
        kind = _clean(match.group(1) or "") or "INNER"
        name = match.group(2)
        alias = match.group(3) or ""
        condition = _clean(match.group(4) or "")
        tables.append(name)
        fragment = f"{kind} JOIN {name}{f' AS {alias}' if alias else ''}{f' ON {condition}' if condition else ''}"
        steps.append({"id": f"join-{index}", "type": "join", "title": f"Join {name}", "detail": f"Match rows using {condition}." if condition else f"Combine rows from {name}.", "sql_fragment": fragment, "concepts": [f"{kind} JOIN", "join condition" if condition else "Cartesian join"]})
        if not condition and kind.upper() != "CROSS":
            warnings.append(f"{name} is joined without an ON condition, which may create a Cartesian result.")

    def add_step(key: str, step_id: str, kind: str, title: str, detail_prefix: str, concepts: list[str]) -> None:
        body = clauses.get(key)
        if body:
            steps.append({"id": step_id, "type": kind, "title": title, "detail": f"{detail_prefix} {body}.", "sql_fragment": f"{key} {body}", "concepts": concepts})

    add_step("WHERE", "filter-1", "filter", "Filter rows", "Keep only rows where", ["WHERE", "predicate"])
    add_step("GROUP BY", "group-1", "group", "Group rows", "Place matching values into groups using", ["GROUP BY", "aggregation"])
    add_step("HAVING", "having-1", "having", "Filter groups", "Keep only grouped results where", ["HAVING", "aggregate predicate"])

    select = clauses.get("SELECT", "")
    if select:
        all_columns = select.strip() == "*"
        steps.append({"id": "project-1", "type": "project", "title": "Return every column" if all_columns else "Choose output columns", "detail": "Return all columns from the combined row set." if all_columns else f"Return only {select}.", "sql_fragment": f"SELECT {select}", "concepts": ["SELECT", "DISTINCT" if select.upper().startswith("DISTINCT ") else "projection"]})
    if re.match(r"^\s*\*", select):
        warnings.append("SELECT * returns every column. Name the columns when you only need a subset.")

    add_step("ORDER BY", "sort-1", "sort", "Sort results", "Order the final rows by", ["ORDER BY", "sorting"])
    limit = clauses.get("LIMIT")
    if limit:
        steps.append({"id": "limit-1", "type": "limit", "title": f"Limit to {limit}", "detail": f"Return at most {limit} rows after sorting.", "sql_fragment": f"LIMIT {limit}", "concepts": ["LIMIT", "result window"]})
    else:
        warnings.append("No LIMIT is present. Add one while exploring large tables.")

    join_count = sum(step["type"] == "join" for step in steps)
    complexity_score = join_count + (2 if clauses.get("GROUP BY") else 0) + (1 if clauses.get("HAVING") else 0) + max(0, len(re.findall(r"\bSELECT\b", sql, re.I)) - 1)
    complexity = "Advanced" if complexity_score >= 4 else "Moderate" if complexity_score >= 2 else "Simple"
    unique_tables = list(dict.fromkeys(tables))
    source_count = len(unique_tables) or 1
    summary = f"This {complexity.lower()} query processes {source_count} data source{'s' if source_count != 1 else ''} through {len(steps)} logical step{'s' if len(steps) != 1 else ''}."
    return {"summary": summary, "steps": steps, "tables": unique_tables, "estimated_complexity": complexity, "warnings": warnings}
