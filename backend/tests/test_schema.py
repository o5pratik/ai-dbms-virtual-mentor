import unittest

from backend.schema_analyzer import analyze_schema


class SchemaAnalysisTests(unittest.TestCase):
    def test_schema_detects_entities_keys_and_relationships(self) -> None:
        response = analyze_schema()
        names = {table["name"] for table in response["tables"]}
        self.assertEqual(names, {"Student", "Course", "Teacher", "Department", "Enrollment"})
        self.assertEqual(response["totals"]["tables"], 5)
        self.assertEqual(response["totals"]["foreign_keys"], 5)
        self.assertEqual(len(response["relationships"]), 5)

        enrollment = next(table for table in response["tables"] if table["name"] == "Enrollment")
        self.assertEqual(enrollment["kind"], "junction")
        self.assertEqual(sum(1 for column in enrollment["columns"] if column.get("primary_key")), 2)


if __name__ == "__main__":
    unittest.main()
