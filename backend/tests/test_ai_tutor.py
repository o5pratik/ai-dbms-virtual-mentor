import os
import unittest
from unittest.mock import patch

from backend.ai_tutor import explain_query, fix_query, suggest_query


class AiTutorFallbackTests(unittest.TestCase):
    def setUp(self) -> None:
        self.no_groq_key = patch.dict(os.environ, {"GROQ_API_KEY": ""})
        self.no_groq_key.start()

    def tearDown(self) -> None:
        self.no_groq_key.stop()

    def test_explain_identifies_query_steps(self) -> None:
        response = explain_query(
            "SELECT s.name FROM Student AS s WHERE s.marks > 80 ORDER BY s.name;"
        )
        self.assertEqual(response["source"], "built-in")
        self.assertIn("WHERE", response["concepts"])
        self.assertIn("ORDER BY", response["concepts"])
        self.assertGreaterEqual(len(response["steps"]), 3)

    def test_suggest_generates_read_only_join(self) -> None:
        response = suggest_query("", "Show students above 80 with their courses")
        self.assertEqual(response["source"], "built-in")
        self.assertTrue(response["sql"].lstrip().upper().startswith("SELECT"))
        self.assertIn("JOIN Enrollment", response["sql"])
        self.assertIn("marks > 80", response["sql"])

    def test_fix_repairs_multiple_typos(self) -> None:
        response = fix_query("SELEC * FORM Studnt;", "syntax error")
        self.assertTrue(response["has_error"])
        self.assertEqual(response["corrected_sql"], "SELECT * FROM Student;")

    def test_fix_completes_order_by_before_limit(self) -> None:
        query = """SELECT s.name, c.course_name, e.semester
FROM Student AS s
JOIN Enrollment AS e ON s.student_id = e.student_id
JOIN Course AS c ON e.course_id = c.course_id
WHERE e.semester = 4
ORDER BY
LIMIT 50;"""
        response = fix_query(query, 'near "LIMIT": syntax error')
        self.assertTrue(response["has_error"])
        self.assertIn("ORDER BY s.name\nLIMIT 50", response["corrected_sql"])

    def test_fix_detects_incomplete_clause_without_a_database_error(self) -> None:
        response = fix_query("SELECT name FROM Student WHERE;", "")
        self.assertTrue(response["has_error"])
        self.assertEqual(response["corrected_sql"], "SELECT name FROM Student ;")

    def test_fix_uses_database_error_to_correct_unknown_column(self) -> None:
        response = fix_query("SELECT nme FROM Student;", "no such column: nme")
        self.assertEqual(response["corrected_sql"], "SELECT name FROM Student;")

    def test_fix_removes_comparison_with_missing_value(self) -> None:
        query = """SELECT s.name, c.course_name, e.semester
FROM Student AS s
JOIN Enrollment AS e ON s.student_id = e.student_id
JOIN Course AS c ON e.course_id = c.course_id
WHERE e.semester =
ORDER BY s.name;"""
        response = fix_query(query, 'near "ORDER": syntax error')
        self.assertTrue(response["has_error"])
        self.assertNotIn("WHERE", response["corrected_sql"])
        self.assertIn("ORDER BY s.name", response["corrected_sql"])


if __name__ == "__main__":
    unittest.main()
