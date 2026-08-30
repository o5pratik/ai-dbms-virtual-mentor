import re
import sqlite3
from dataclasses import dataclass
from time import perf_counter

from .database import open_read_only_connection


MAX_RESULT_ROWS = 500
MAX_VM_STEPS = 250_000
ALLOWED_PREFIXES = ("SELECT", "WITH", "EXPLAIN", "PRAGMA")

DENIED_ACTIONS = {
    sqlite3.SQLITE_INSERT,
    sqlite3.SQLITE_UPDATE,
    sqlite3.SQLITE_DELETE,
    sqlite3.SQLITE_ALTER_TABLE,
    sqlite3.SQLITE_CREATE_INDEX,
    sqlite3.SQLITE_CREATE_TABLE,
    sqlite3.SQLITE_CREATE_TEMP_INDEX,
    sqlite3.SQLITE_CREATE_TEMP_TABLE,
    sqlite3.SQLITE_CREATE_TEMP_TRIGGER,
    sqlite3.SQLITE_CREATE_TEMP_VIEW,
    sqlite3.SQLITE_CREATE_TRIGGER,
    sqlite3.SQLITE_CREATE_VIEW,
    sqlite3.SQLITE_DROP_INDEX,
    sqlite3.SQLITE_DROP_TABLE,
    sqlite3.SQLITE_DROP_TEMP_INDEX,
    sqlite3.SQLITE_DROP_TEMP_TABLE,
    sqlite3.SQLITE_DROP_TEMP_TRIGGER,
    sqlite3.SQLITE_DROP_TEMP_VIEW,
    sqlite3.SQLITE_DROP_TRIGGER,
    sqlite3.SQLITE_DROP_VIEW,
    sqlite3.SQLITE_ATTACH,
    sqlite3.SQLITE_DETACH,
    sqlite3.SQLITE_TRANSACTION,
}


@dataclass(frozen=True)
class ExecutionResult:
    columns: list[str]
    rows: list[list[str | int | float | None]]
    execution_time: float


class QueryRejectedError(ValueError):
    pass


def _validate_query(query: str) -> None:
    normalized = query.lstrip().upper()
    if not normalized.startswith(ALLOWED_PREFIXES):
        raise QueryRejectedError(
            "Only read-only SELECT, WITH, EXPLAIN, and PRAGMA queries are allowed in the learning sandbox."
        )


def _authorize(action: int, parameter_one: str | None, parameter_two: str | None, _database: str | None, _source: str | None) -> int:
    if action in DENIED_ACTIONS:
        return sqlite3.SQLITE_DENY
    if action == sqlite3.SQLITE_FUNCTION and (parameter_two or parameter_one or "").lower() == "load_extension":
        return sqlite3.SQLITE_DENY
    return sqlite3.SQLITE_OK


def execute_read_only_query(query: str) -> ExecutionResult:
    _validate_query(query)
    started = perf_counter()
    with open_read_only_connection() as connection:
        connection.set_authorizer(_authorize)
        remaining_steps = MAX_VM_STEPS

        def allow_progress() -> int:
            nonlocal remaining_steps
            remaining_steps -= 1_000
            return 1 if remaining_steps <= 0 else 0

        connection.set_progress_handler(allow_progress, 1_000)
        cursor = connection.execute(query)
        columns = [description[0] for description in cursor.description or []]
        records = cursor.fetchmany(MAX_RESULT_ROWS + 1)

    if len(records) > MAX_RESULT_ROWS:
        raise QueryRejectedError(
            f"This query returns more than {MAX_RESULT_ROWS} rows. Add a LIMIT clause and try again."
        )

    elapsed_ms = round((perf_counter() - started) * 1_000, 2)
    rows = [[record[column] for column in columns] for record in records]
    return ExecutionResult(columns=columns, rows=rows, execution_time=elapsed_ms)


def explain_read_only_query(query: str) -> dict:
    statement = query.strip().removesuffix(";").rstrip()
    if not statement.upper().startswith(("SELECT", "WITH")):
        raise QueryRejectedError("Execution plans are available only for SELECT and WITH queries.")
    if ";" in statement:
        raise QueryRejectedError("Generate a plan for one SQL statement at a time.")
    with open_read_only_connection() as connection:
        connection.set_authorizer(_authorize)
        rows = connection.execute(f"EXPLAIN QUERY PLAN {statement}").fetchall()

    steps = []
    for row in rows:
        detail = str(row[3])
        upper = detail.upper()
        operation = "scan" if "SCAN" in upper else "search" if "SEARCH" in upper else "temporary" if "TEMP" in upper or "B-TREE" in upper else "compound" if any(word in upper for word in ("UNION", "COMPOUND", "SUBQUERY", "CO-ROUTINE")) else "other"
        table_match = re.search(r"\b(?:SCAN|SEARCH)\s+(?:TABLE\s+)?([A-Za-z_]\w*)", detail, re.I)
        index_match = re.search(r"\bUSING\s+(?:AUTOMATIC\s+)?(?:COVERING\s+)?INDEX\s+([A-Za-z_]\w*)", detail, re.I)
        steps.append({"id": int(row[0]), "parent": int(row[1]), "detail": detail, "operation": operation, "table": table_match.group(1) if table_match else None, "index": index_match.group(1) if index_match else None, "uses_index": bool(index_match or re.search(r"USING\s+INTEGER\s+PRIMARY\s+KEY", detail, re.I))})

    summary = {"scans": sum(step["operation"] == "scan" for step in steps), "index_searches": sum(step["operation"] == "search" and step["uses_index"] for step in steps), "temporary_structures": sum(step["operation"] == "temporary" for step in steps)}
    warnings = [f'{step["table"]} is scanned without an index lookup.' for step in steps if step["operation"] == "scan" and not step["uses_index"] and step["table"] and "CONSTANT ROW" not in step["detail"].upper()]
    if summary["temporary_structures"]:
        warnings.append("SQLite creates a temporary B-tree for part of this query, commonly sorting or grouping.")
    return {"engine": "SQLite", "steps": steps, "summary": summary, "warnings": warnings}
