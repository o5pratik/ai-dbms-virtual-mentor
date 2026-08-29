import unittest

from backend.sql_executor import QueryRejectedError, execute_read_only_query


class SqlExecutorTests(unittest.TestCase):
    def test_join_query_returns_expected_students(self) -> None:
        result = execute_read_only_query(
            """
            SELECT s.name, c.course_name
            FROM Student AS s
            JOIN Enrollment AS e ON s.student_id = e.student_id
            JOIN Course AS c ON e.course_id = c.course_id
            WHERE e.semester = 4
            ORDER BY s.name;
            """
        )
        self.assertEqual(result.columns, ["name", "course_name"])
        self.assertGreaterEqual(len(result.rows), 4)

    def test_destructive_statement_is_rejected(self) -> None:
        with self.assertRaises(QueryRejectedError):
            execute_read_only_query("DROP TABLE Student;")

    def test_multiple_statements_are_rejected_by_sqlite(self) -> None:
        with self.assertRaises(Exception):
            execute_read_only_query("SELECT 1; SELECT 2;")


if __name__ == "__main__":
    unittest.main()
