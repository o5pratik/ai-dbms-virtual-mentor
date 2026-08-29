# AI DBMS Virtual Mentor

AI DBMS Virtual Mentor is a modern SQL learning workspace. This repository contains the Phase 1 MVP requested in the project brief: a React interface with a Monaco SQL editor, a FastAPI execution service, a seeded SQLite CollegeDB, safe query execution, and a professional results table.

The supplied HTML prototype informed the dark IDE-style layout. Its simulated AI, schema, history, ER-diagram, and analytics features are intentionally not copied into the live product yet; those are preserved as later phases in the architecture.

## Architecture

- **Frontend:** React, TypeScript, Tailwind CSS, Monaco Editor, Vinext/Vite
- **Backend:** Python, FastAPI, Pydantic
- **Database:** SQLite (`database/college.db`)
- **Security:** read-only SQLite connection, statement authorizer, row and execution limits

The web entry points are in `app/` for the Sites-compatible Vite runtime. Reusable product UI and services are in `frontend/src/`. Backend code is fully separated under `backend/` so MySQL and Groq modules can be added later.

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

`GROQ_API_KEY` is documented for Phase 2 only and is not used by the MVP. It must remain on the backend.

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

## Database setup

CollegeDB is created and seeded automatically when the backend starts. Its tables are `Student`, `Course`, `Teacher`, `Department`, and `Enrollment`. Delete only the database file if you deliberately want it regenerated from the seed script.

## Tests and build

```powershell
python -m unittest discover -s backend\tests -v
npm run build
```

## Planned phases

1. **Phase 2:** Groq-backed explanations, suggestions, and fixes.
2. **Phase 3:** schema analyzer, entity/key detection, ER diagrams, relationships, and cardinality.
3. **Phase 4:** query history, saved queries, analytics, export, and learning topics.
