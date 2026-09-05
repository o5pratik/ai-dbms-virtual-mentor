# AI DBMS Virtual Mentor

AI DBMS Virtual Mentor is a modern SQL learning workspace. Phase 13 adds one-click PracticeDB checkpoints and undo recovery, alongside device-local autosave, schema-aware mentor repairs, SQLite file import, selected-statement execution, adaptive curriculum, skill analytics, real execution plans, custom schema analysis, and persistent learning tools.

The supplied HTML prototype informed the dark IDE-style layout. Every workspace item is now connected to a working product view.

## Architecture

- **Frontend:** React, TypeScript, Tailwind CSS, Monaco Editor, Vinext/Vite
- **Local backend:** Python, FastAPI, Pydantic
- **Hosted backend:** same-origin Vinext API route on Cloudflare Workers
- **Database:** local SQLite (`database/college.db`) and hosted D1/SQLite CollegeDB
- **AI tutor:** optional server-side Groq integration with a deterministic built-in tutor fallback
- **Schema intelligence:** entity, column, primary-key, foreign-key, constraint, and cardinality analysis
- **Schema Lab:** analyze custom `CREATE TABLE` statements and explore the result as table cards or an interactive ER diagram
- **Query intelligence:** deterministic logical execution plans with clickable SQL stages, complexity, concepts, and learning tips
- **Editor intelligence:** CollegeDB-aware completions and hover help, live diagnostics, SQL formatting, and keyboard shortcuts
- **Planner intelligence:** database-native `EXPLAIN QUERY PLAN` output with scans, index lookups, temporary structures, and warnings
- **Adaptive learning:** 12 lessons across SQL basics, querying, database design, and transactions with runnable challenges, hints, quick checks, and mentor explanations
- **Skill analytics:** concept mastery, weak-area recommendations, practice coverage, and recurring error patterns derived from query history
- **Productivity:** D1-backed history, saved SQL, learning progress, practice analytics, and CSV/JSON export
- **Write Lab:** browser-isolated SQLite for DDL, DML, multi-statement scripts, transactions, selected-statement execution, `.db`/`.sqlite` import, schema inspection, reset, timeout protection, and `.sqlite` export
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
- `POST /api/fix` accepts `query`, an optional `database_error`, and optional Write Lab `mode` and `schema` context.
- `POST /api/analyze-query` accepts `query` and returns its logical execution flow.
- `POST /api/analyze-schema` accepts SQL DDL and returns detected entities, attributes, constraints, and relationships.
- `POST /api/query-plan` accepts a read-only query and returns SQLite planner operations.
- `GET /api/schema` returns tables, columns, constraints, row counts, and relationships.
- `GET/DELETE /api/history` lists or clears the latest 100 query attempts.
- `GET/POST/DELETE /api/saved` manages reusable read-only queries.
- `GET/POST /api/progress` reads and updates guided-learning progress.

Each response includes a `source` field (`groq` or `built-in`) so the interface reports which tutor answered.

## Database setup

Local CollegeDB is created and seeded automatically when FastAPI starts. The hosted D1 database is initialized through `drizzle/0000_college_schema.sql` during deployment. Both contain `Student`, `Course`, `Teacher`, `Department`, and `Enrollment`.

The Write Lab uses a separate temporary `PracticeDB` inside a Web Worker. It can open SQLite files up to 20 MB and run SQLite `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, `DELETE`, transaction, PRAGMA, selected statements, and multi-statement scripts without modifying CollegeDB. Its state lasts for the current tab unless exported. Vendor-specific MySQL, PostgreSQL, Oracle, or SQL Server procedures still require their matching database engine.

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
5. **Completed — Phase 6:** custom DDL schema analysis and pannable, zoomable ER diagrams.
6. **Completed — Phase 7:** schema-aware SQL editing and real SQLite execution plans.
7. **Completed — Phase 8:** expanded curriculum, interactive quick checks, and adaptive skill analytics.
8. **Completed — Phase 9:** isolated SQLite write sandbox with reset, export, schema inspection, multi-statement execution, transactions, and timeout protection.
9. **Completed — Phase 10:** SQLite file import, validation, current-file labeling, and highlighted-statement execution.
10. **Completed — Phase 11:** PracticeDB error explanations, schema-aware safe corrections, and review-before-apply mentor fixes.
11. **Completed — Phase 12:** automatic local PracticeDB snapshots, SQL draft recovery, and reset-safe saved state.
12. **Completed — Phase 13:** pre-run database checkpoints and one-click undo for scripts, resets, and SQLite imports.
