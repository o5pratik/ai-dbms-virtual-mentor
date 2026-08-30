# AI DBMS Virtual Mentor

AI DBMS Virtual Mentor is a modern SQL learning workspace. Phase 5 combines the SQL playground, interactive tutor, schema analysis, ER diagram, persistent practice tools, and an educational query-flow analyzer.

The supplied HTML prototype informed the dark IDE-style layout. Every workspace item is now connected to a working product view.

## Architecture

- **Frontend:** React, TypeScript, Tailwind CSS, Monaco Editor, Vinext/Vite
- **Local backend:** Python, FastAPI, Pydantic
- **Hosted backend:** same-origin Vinext API route on Cloudflare Workers
- **Database:** local SQLite (`database/college.db`) and hosted D1/SQLite CollegeDB
- **AI tutor:** optional server-side Groq integration with a deterministic built-in tutor fallback
- **Schema intelligence:** entity, column, primary-key, foreign-key, constraint, and cardinality analysis
- **Query intelligence:** deterministic logical execution plans with clickable SQL stages, complexity, concepts, and learning tips
- **Productivity:** D1-backed history, saved SQL, learning progress, practice analytics, and CSV/JSON export
- **Security:** server-only AI credentials, read-only SQLite connection, statement authorizer, row and execution limits

The web entry points are in `app/` for the Sites-compatible Vite runtime. Reusable product UI and services are in `frontend/src/`. Hosted API routes live under `app/api/`; matching local FastAPI implementations are separated under `backend/`.

See [docs/architecture.md](docs/architecture.md) for the request flow and security boundary.

## Prerequisites

- Node.js 22.13 or newer
- Python 3.11 or newer

## Install

```powershell
npm install
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

Copy the example environment files if you need to change local ports:

```powershell
Copy-Item .env.example .env.local
Copy-Item backend\.env.example backend\.env
```

`NEXT_PUBLIC_API_URL` is optional. Leave it unset to use the hosted same-origin APIs, or set it to `http://localhost:8000` to use FastAPI during local development. `GROQ_API_KEY` is optional and must remain server-side. Without it, tutor features use the built-in fallback. `GROQ_MODEL` defaults to `openai/gpt-oss-120b`.

## Run locally

Start the API in one terminal:

```powershell
uvicorn backend.main:app --reload --port 8000
```

Start the frontend in another terminal:

```powershell
npm run dev
```

Open the local URL printed by the frontend. Run the starter query with the **Run** button or `Ctrl + Enter`.

## API

### `GET /api/health`

Returns the service and CollegeDB status.

### `POST /api/execute`

Request:

```json
{ "query": "SELECT * FROM Student;" }
```

Successful response:

```json
{
  "success": true,
  "columns": ["student_id", "name", "marks", "dept_id"],
  "rows": [[1, "Rahul Sharma", 85, 1]],
  "row_count": 1,
  "execution_time": 1.4,
  "error": null
}
```

Only read-only learning queries are accepted. Destructive statements return a safe `400` response.

### Tutor APIs

- `POST /api/explain` accepts `query` and an optional `result_summary`.
- `POST /api/suggest` accepts an `instruction` and optional `current_sql`.
- `POST /api/fix` accepts `query` and an optional `database_error`.
- `POST /api/analyze-query` accepts `query` and returns its logical execution flow.
- `GET /api/schema` returns tables, columns, constraints, row counts, and relationships.
- `GET/DELETE /api/history` lists or clears the latest 100 query attempts.
- `GET/POST/DELETE /api/saved` manages reusable read-only queries.
- `GET/POST /api/progress` reads and updates guided-learning progress.

Each response includes a `source` field (`groq` or `built-in`) so the interface reports which tutor answered.

## Database setup

Local CollegeDB is created and seeded automatically when FastAPI starts. The hosted D1 database is initialized through `drizzle/0000_college_schema.sql` during deployment. Both contain `Student`, `Course`, `Teacher`, `Department`, and `Enrollment`.

## Tests and build

```powershell
python -m unittest discover -s backend\tests -v
npm run build
```

## Roadmap

1. **Completed — Phase 2:** AI explanations, natural-language suggestions, and error fixes.
2. **Completed — Phase 3:** schema analyzer, entity/key detection, ER diagrams, relationships, and cardinality.
3. **Completed — Phase 4:** query history, saved queries, analytics, export, and learning topics.
4. **Completed — Phase 5:** query analysis, interactive execution flow, and database messages.
