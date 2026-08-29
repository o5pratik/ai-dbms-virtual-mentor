from .database import open_read_only_connection


DESCRIPTIONS = {
    "Department": "Academic departments in the college.",
    "Teacher": "Faculty members and their home departments.",
    "Course": "Courses offered and their assigned teachers.",
    "Student": "Students, marks, and department membership.",
    "Enrollment": "Links students to courses by semester.",
}


def analyze_schema() -> dict:
    with open_read_only_connection() as connection:
        table_names = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()]
        tables = []
        relationships = []

        for table_name in table_names:
            columns_info = connection.execute(f'PRAGMA table_info("{table_name}")').fetchall()
            foreign_keys = {row[3]: {"table": row[2], "column": row[4]} for row in connection.execute(f'PRAGMA foreign_key_list("{table_name}")').fetchall()}
            unique_columns: set[str] = set()
            for index in connection.execute(f'PRAGMA index_list("{table_name}")').fetchall():
                if index[2]:
                    index_columns = connection.execute(f'PRAGMA index_info("{index[1]}")').fetchall()
                    if len(index_columns) == 1:
                        unique_columns.add(index_columns[0][2])

            columns = []
            for column in columns_info:
                name = column[1]
                item = {"name": name, "type": column[2], "nullable": not bool(column[3])}
                if column[5]:
                    item["primary_key"] = True
                if name in unique_columns:
                    item["unique"] = True
                if name in foreign_keys:
                    item["foreign_key"] = foreign_keys[name]
                if table_name == "Student" and name == "marks":
                    item["check"] = "0–100"
                if table_name == "Enrollment" and name == "semester":
                    item["check"] = "1–8"
                columns.append(item)

            row_count = connection.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
            tables.append({"name": table_name, "kind": "junction" if table_name == "Enrollment" else "entity", "description": DESCRIPTIONS.get(table_name, f"Data stored in {table_name}."), "row_count": row_count, "columns": columns})
            for column, target in foreign_keys.items():
                relationships.append({"id": f"{table_name.lower()}-{target['table'].lower()}", "from_table": table_name, "from_column": column, "to_table": target["table"], "to_column": target["column"], "cardinality": "many-to-one"})

    return {
        "database": "CollegeDB",
        "engine": "SQLite",
        "tables": tables,
        "relationships": relationships,
        "totals": {
            "tables": len(tables),
            "columns": sum(len(table["columns"]) for table in tables),
            "primary_keys": sum(sum(1 for column in table["columns"] if column.get("primary_key")) for table in tables),
            "foreign_keys": len(relationships),
        },
    }
