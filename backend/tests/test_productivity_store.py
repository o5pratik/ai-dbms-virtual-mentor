import unittest

from backend.productivity_store import (
    clear_history,
    delete_saved,
    list_history,
    list_progress,
    list_saved,
    record_history,
    save_query,
    update_progress,
)


class ProductivityStoreTests(unittest.TestCase):
    def tearDown(self) -> None:
        clear_history()

    def test_history_saved_queries_and_progress_are_persistent(self) -> None:
        clear_history()
        record_history("SELECT * FROM Student;", True, 5, 1.2)
        self.assertEqual(list_history()[0]["row_count"], 5)

        saved_id = save_query("Student list", "SELECT * FROM Student;")
        self.assertTrue(any(item["id"] == saved_id for item in list_saved()))
        delete_saved(saved_id)
        self.assertFalse(any(item["id"] == saved_id for item in list_saved()))

        update_progress("select-basics", True)
        progress = {item["topic_id"]: item["completed"] for item in list_progress()}
        self.assertEqual(progress["select-basics"], 1)
        update_progress("select-basics", False)


if __name__ == "__main__":
    unittest.main()
