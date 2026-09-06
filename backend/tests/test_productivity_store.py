import unittest

from backend.productivity_store import (
    clear_challenge_progress,
    clear_history,
    delete_saved,
    list_challenge_progress,
    list_history,
    list_progress,
    list_saved,
    record_history,
    save_query,
    sync_challenge_progress,
    update_progress,
)


class ProductivityStoreTests(unittest.TestCase):
    def tearDown(self) -> None:
        clear_challenge_progress()
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

    def test_challenge_progress_merges_without_losing_completion(self) -> None:
        clear_challenge_progress()
        sync_challenge_progress([
            {
                "challenge_id": "top-student",
                "attempts": 2,
                "failed_attempts": 2,
                "passed": False,
                "passed_at": None,
            }
        ])
        sync_challenge_progress([
            {
                "challenge_id": "top-student",
                "attempts": 3,
                "failed_attempts": 2,
                "passed": True,
                "passed_at": 1_700_000_000_000,
            }
        ])
        sync_challenge_progress([
            {
                "challenge_id": "top-student",
                "attempts": 1,
                "failed_attempts": 1,
                "passed": False,
                "passed_at": None,
            }
        ])
        item = list_challenge_progress()[0]
        self.assertEqual(item["attempts"], 3)
        self.assertEqual(item["failed_attempts"], 2)
        self.assertEqual(item["passed"], 1)
        self.assertEqual(item["passed_at"], 1_700_000_000_000)


if __name__ == "__main__":
    unittest.main()
