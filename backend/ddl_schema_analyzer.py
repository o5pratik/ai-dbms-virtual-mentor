import re


CREATE_TABLE = re.compile(r'\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"\[]?([A-Za-z_]\w*)[`"\]]?\s*\(', re.I)


def _strip_comments(sql: str) -> str:
    return re.sub(r"--.*$", "", re.sub(r"/\*[\s\S]*?\*/", "", sql), flags=re.M)


def _unquote(value: str) -> str:
    return value.strip().strip('`"[]')


def _definitions(sql: str) -> list[tuple[str, str]]:
    source = _strip_comments(sql)
    output: list[tuple[str, str]] = []
    cursor = 0
    while match := CREATE_TABLE.search(source, cursor):
        depth, quote, index = 1, "", match.end()
        while index < len(source) and depth:
            character = source[index]
            if quote:
                if character == quote and source[index - 1] != "\\":
                    quote = ""
            elif character in "'\"`":
                quote = character
            elif character == "(":
                depth += 1
            elif character == ")":
                depth -= 1
            index += 1
        if depth:
            raise ValueError(f"The {match.group(1)} table has an unmatched parenthesis.")
        output.append((match.group(1), source[match.end():index - 1]))
        cursor = index
    return output


def _parts(body: str) -> list[str]:
    output, start, depth, quote = [], 0, 0, ""
    for index, character in enumerate(body):
        if quote:
            if character == quote and body[index - 1] != "\\":
                quote = ""
        elif character in "'\"`":
            quote = character
        elif character == "(":
            depth += 1
        elif character == ")":
            depth -= 1
        elif character == "," and depth == 0:
            output.append(body[start:index].strip())
            start = index + 1
    output.append(body[start:].strip())
    return [part for part in output if part]


def _names(fragment: str) -> list[str]:
    match = re.search(r"\(([^)]+)\)", fragment)
    return [_unquote(name) for name in match.group(1).split(",")] if match else []


def analyze_ddl_schema(sql: str) -> dict:
    definitions = _definitions(sql)
    if not definitions:
        raise ValueError("No CREATE TABLE statements were found.")
    if len(definitions) > 30:
        raise ValueError("Analyze up to 30 tables at a time.")

    tables, relationships, warnings = [], [], []
    for table_name, body in definitions:
        columns: list[dict] = []
        primary_keys, unique_columns = set(), set()
        pending_foreign_keys: list[tuple[list[str], str, list[str]]] = []
        for part in _parts(body):
            normalized = re.sub(r'^CONSTRAINT\s+[`"\[]?[A-Za-z_]\w*[`"\]]?\s+', '', part, flags=re.I)
            if re.match(r"^PRIMARY\s+KEY\b", normalized, re.I):
                primary_keys.update(_names(normalized))
            elif re.match(r"^UNIQUE\b", normalized, re.I):
                unique_columns.update(_names(normalized))
            elif re.match(r"^FOREIGN\s+KEY\b", normalized, re.I):
                reference = re.match(r'^FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+[`"\[]?([A-Za-z_]\w*)[`"\]]?\s*\(([^)]+)\)', normalized, re.I)
                if reference:
                    pending_foreign_keys.append(([_unquote(name) for name in reference.group(1).split(",")], reference.group(2), [_unquote(name) for name in reference.group(3).split(",")]))
            else:
                column_match = re.match(r'^[`"\[]?([A-Za-z_]\w*)[`"\]]?\s+([A-Za-z]+(?:\s*\([^)]*\))?)([\s\S]*)$', normalized)
                if not column_match:
                    warnings.append(f"Skipped an unrecognized definition in {table_name}: {part}")
                    continue
                name, raw_type, constraints = column_match.groups()
                reference = re.search(r'\bREFERENCES\s+[`"\[]?([A-Za-z_]\w*)[`"\]]?\s*\(([^)]+)\)', constraints, re.I)
                check = re.search(r"\bCHECK\s*\(([^)]+)\)", constraints, re.I)
                column = {"name": name, "type": re.sub(r"\s+", " ", raw_type.upper()), "nullable": not bool(re.search(r"\bNOT\s+NULL\b|\bPRIMARY\s+KEY\b", constraints, re.I))}
                if re.search(r"\bPRIMARY\s+KEY\b", constraints, re.I): column["primary_key"] = True
                if re.search(r"\bUNIQUE\b", constraints, re.I): column["unique"] = True
                if check: column["check"] = check.group(1).strip()
                if reference: column["foreign_key"] = {"table": reference.group(1), "column": _unquote(reference.group(2).split(",")[0])}
                columns.append(column)

        for column in columns:
            if column["name"] in primary_keys:
                column["primary_key"], column["nullable"] = True, False
            if column["name"] in unique_columns:
                column["unique"] = True
        for local_columns, target_table, target_columns in pending_foreign_keys:
            for index, column_name in enumerate(local_columns):
                column = next((item for item in columns if item["name"] == column_name), None)
                if column: column["foreign_key"] = {"table": target_table, "column": target_columns[index] if index < len(target_columns) else target_columns[0]}

        if not columns: warnings.append(f"{table_name} has no recognized columns.")
        foreign_count = sum("foreign_key" in column for column in columns)
        primary_count = sum(column.get("primary_key", False) for column in columns)
        tables.append({"name": table_name, "kind": "junction" if foreign_count >= 2 and primary_count >= 2 else "entity", "description": "Detected from the supplied CREATE TABLE definition.", "row_count": 0, "columns": columns})

    known_tables = {table["name"].lower() for table in tables}
    for table in tables:
        for column in table["columns"]:
            target = column.get("foreign_key")
            if not target: continue
            relationships.append({"id": f'{table["name"]}-{column["name"]}-{target["table"]}-{target["column"]}'.lower(), "from_table": table["name"], "from_column": column["name"], "to_table": target["table"], "to_column": target["column"], "cardinality": "many-to-one"})
            if target["table"].lower() not in known_tables:
                warnings.append(f'{table["name"]}.{column["name"]} references {target["table"]}, which is not included in this schema.')

    return {"database": "Analyzed schema", "engine": "SQL DDL", "tables": tables, "relationships": relationships, "warnings": warnings, "totals": {"tables": len(tables), "columns": sum(len(table["columns"]) for table in tables), "primary_keys": sum(sum(column.get("primary_key", False) for column in table["columns"]) for table in tables), "foreign_keys": len(relationships)}}
