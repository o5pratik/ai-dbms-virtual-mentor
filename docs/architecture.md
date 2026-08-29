# MVP architecture

The browser renders a React workspace with Monaco as the SQL editor. The frontend sends SQL execution requests to `POST /api/execute` and tutor requests to `/api/explain`, `/api/suggest`, or `/api/fix`. Hosted same-origin Worker routes serve both paths; local FastAPI exposes matching routes when `NEXT_PUBLIC_API_URL` is configured.

```text
React + Monaco
      |
      +-- POST /api/execute --> query sandbox --> D1 or local SQLite
      |
      +-- POST /api/{explain,suggest,fix}
                                 |
                                 +--> Groq when a server key is configured
                                 |
                                 +--> built-in tutor fallback
```

The frontend is hosted from the project root so it remains compatible with the Sites runtime. Product-specific UI modules live in `frontend/src`. Backend modules remain isolated under `backend`, keeping the database executor and tutor provider replaceable without rewriting the interface.

## Security boundary

- Both APIs accept one query per request.
- The hosted endpoint permits only `SELECT` and `WITH` statements and rejects comments, multiple statements, write keywords, schema changes, and extension loading.
- Local SQLite opens the database in read-only mode and an authorizer denies writes, schema changes, attachments, and transactions.
- Results stop at 500 rows and long-running statements are interrupted.
- No operating-system command execution is available through the API.
- Groq credentials remain server-side and are never returned to the browser.
- AI suggestions are constrained to one read-only `SELECT` or `WITH` query over the known CollegeDB schema.
