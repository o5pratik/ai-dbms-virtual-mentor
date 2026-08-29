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


if __name__ == "__main__":
    unittest.main()
