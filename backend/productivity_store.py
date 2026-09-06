import sqlite3

from .database import DATABASE_PATH, initialize_database


def _connect() -> sqlite3.Connection:
    initialize_database()
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def record_history(query: str, success: bool, row_count: int, execution_time: float, error: str | None = None) -> None:
    with _connect() as connection:
        connection.execute("INSERT INTO QueryHistory (query, success, row_count, execution_time, error) VALUES (?, ?, ?, ?, ?)", (query[:10_000], int(success), row_count, execution_time, error[:2_000] if error else None))


def list_history() -> list[dict]:
    with _connect() as connection:
        return [dict(row) for row in connection.execute("SELECT id, query, success, row_count, execution_time, error, executed_at FROM QueryHistory ORDER BY id DESC LIMIT 100")]


def clear_history() -> None:
    with _connect() as connection:
        connection.execute("DELETE FROM QueryHistory")


def list_saved() -> list[dict]:
    with _connect() as connection:
        return [dict(row) for row in connection.execute("SELECT id, name, query, created_at FROM SavedQuery ORDER BY id DESC LIMIT 100")]


def save_query(name: str, query: str) -> int:
    with _connect() as connection:
        cursor = connection.execute("INSERT INTO SavedQuery (name, query) VALUES (?, ?)", (name[:80], query[:10_000]))
        return int(cursor.lastrowid)


def delete_saved(query_id: int) -> None:
    with _connect() as connection:
        connection.execute("DELETE FROM SavedQuery WHERE id = ?", (query_id,))


def list_progress() -> list[dict]:
    with _connect() as connection:
        return [dict(row) for row in connection.execute("SELECT topic_id, completed, updated_at FROM LearningProgress ORDER BY topic_id")]


def update_progress(topic_id: str, completed: bool) -> None:
    with _connect() as connection:
        connection.execute("INSERT INTO LearningProgress (topic_id, completed, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(topic_id) DO UPDATE SET completed = excluded.completed, updated_at = CURRENT_TIMESTAMP", (topic_id[:80], int(completed)))


def list_challenge_progress() -> list[dict]:
    with _connect() as connection:
        return [dict(row) for row in connection.execute("SELECT challenge_id, attempts, failed_attempts, passed, passed_at, updated_at FROM ChallengeProgress ORDER BY challenge_id")]


def sync_challenge_progress(entries: list[dict]) -> None:
    statement = """
        INSERT INTO ChallengeProgress
            (challenge_id, attempts, failed_attempts, passed, passed_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(challenge_id) DO UPDATE SET
            attempts = MAX(ChallengeProgress.attempts, excluded.attempts),
            failed_attempts = MAX(ChallengeProgress.failed_attempts, excluded.failed_attempts),
            passed = MAX(ChallengeProgress.passed, excluded.passed),
            passed_at = CASE
                WHEN ChallengeProgress.passed_at IS NULL THEN excluded.passed_at
                WHEN excluded.passed_at IS NULL THEN ChallengeProgress.passed_at
                ELSE MIN(ChallengeProgress.passed_at, excluded.passed_at)
            END,
            updated_at = CURRENT_TIMESTAMP
    """
    with _connect() as connection:
        connection.executemany(
            statement,
            [
                (
                    entry["challenge_id"][:80],
                    entry["attempts"],
                    entry["failed_attempts"],
                    int(entry["passed"]),
                    entry["passed_at"],
                )
                for entry in entries
            ],
        )


def clear_challenge_progress() -> None:
    with _connect() as connection:
        connection.execute("DELETE FROM ChallengeProgress")
