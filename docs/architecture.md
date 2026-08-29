# MVP architecture

The browser renders a React workspace with Monaco as the SQL editor. The frontend service sends a single query to `POST /api/execute`. In the hosted site, the same-origin Worker route validates the query and reads from a private D1/SQLite CollegeDB. During local FastAPI development, `NEXT_PUBLIC_API_URL` can route the same request to the Python SQL executor.

```text
React + Monaco
      |
      | POST /api/execute
      +--------------------------+
      |                          |
      v                          v
Hosted Worker route         Local FastAPI route
      |                          |
      v                          v
D1/SQLite CollegeDB         SQLite CollegeDB
      |                          |
      +------------+-------------+
                   v
      columns + rows + count + execution time
```

The frontend is hosted from the project root so it remains compatible with the Sites runtime. Product-specific UI modules live in `frontend/src`. Backend modules remain isolated under `backend`, making a future MySQL executor or Groq-powered tutor replaceable without rewriting the interface.

## Security boundary

- Both APIs accept one query per request.
- The hosted endpoint permits only `SELECT` and `WITH` statements and rejects comments, multiple statements, write keywords, schema changes, and extension loading.
- Local SQLite opens the database in read-only mode and an authorizer denies writes, schema changes, attachments, and transactions.
- Results stop at 500 rows and long-running statements are interrupted.
- No operating-system command execution is available through the API.
- Future Groq credentials belong only in `backend/.env`.
