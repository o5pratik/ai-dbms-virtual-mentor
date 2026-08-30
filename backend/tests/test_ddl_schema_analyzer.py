import unittest

from backend.ddl_schema_analyzer import analyze_ddl_schema


DDL = """
CREATE TABLE Author (
  author_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE Book (
  book_id INTEGER PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  author_id INTEGER,
  rating REAL CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT fk_author FOREIGN KEY (author_id) REFERENCES Author(author_id)
);
"""


class DdlSchemaAnalyzerTests(unittest.TestCase):
    def test_detects_tables_columns_keys_and_relationships(self) -> None:
        schema = analyze_ddl_schema(DDL)
        self.assertEqual(schema["totals"], {"tables": 2, "columns": 6, "primary_keys": 2, "foreign_keys": 1})
        self.assertEqual(schema["relationships"][0]["to_table"], "Author")
        book = next(table for table in schema["tables"] if table["name"] == "Book")
        self.assertEqual(next(column for column in book["columns"] if column["name"] == "title")["type"], "VARCHAR(120)")

    def test_rejects_input_without_create_table(self) -> None:
        with self.assertRaisesRegex(ValueError, "No CREATE TABLE"):
            analyze_ddl_schema("SELECT 1;")
