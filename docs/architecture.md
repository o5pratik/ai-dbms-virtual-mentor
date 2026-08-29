# MVP architecture

The browser renders a React workspace with Monaco as the SQL editor. The frontend service sends a single query to `POST /api/execute`. FastAPI validates the request and delegates it to the SQL executor, which opens CollegeDB in read-only mode and returns a bounded result set.

```text
React + Monaco
      |
      | POST /api/execute
      v
FastAPI route -> read-only SQL executor -> SQLite CollegeDB
      |
      v
columns + rows + count + execution time
```

The frontend is hosted from the project root so it remains compatible with the Sites runtime. Product-specific UI modules live in `frontend/src`. Backend modules remain isolated under `backend`, making a future MySQL executor or Groq-powered tutor replaceable without rewriting the interface.

## Security boundary

- The API accepts one query per request.
- Only `SELECT`, `WITH`, `EXPLAIN`, and safe `PRAGMA` statements enter the executor.
- SQLite opens the database in read-only mode and an authorizer denies writes, schema changes, attachments, and transactions.
- Results stop at 500 rows and long-running statements are interrupted.
- No operating-system command execution is available through the API.
- Future Groq credentials belong only in `backend/.env`.
