import unittest

from backend.query_analyzer import analyze_sql


class QueryAnalyzerTests(unittest.TestCase):
    def test_query_flow_follows_logical_execution_order(self) -> None:
        analysis = analyze_sql("""SELECT s.name, c.course_name
FROM Student AS s
JOIN Enrollment AS e ON s.student_id = e.student_id
JOIN Course AS c ON e.course_id = c.course_id
WHERE e.semester = 4
ORDER BY s.name
LIMIT 20;""")

        self.assertEqual([step["type"] for step in analysis["steps"]], ["source", "join", "join", "filter", "project", "sort", "limit"])
        self.assertEqual(analysis["tables"], ["Student", "Enrollment", "Course"])
        self.assertEqual(analysis["estimated_complexity"], "Moderate")
        self.assertEqual(analysis["warnings"], [])

    def test_query_flow_teaches_safe_exploration(self) -> None:
        analysis = analyze_sql("SELECT * FROM Student;")

        self.assertEqual(analysis["estimated_complexity"], "Simple")
        self.assertTrue(any("SELECT *" in warning for warning in analysis["warnings"]))
        self.assertTrue(any("LIMIT" in warning for warning in analysis["warnings"]))
