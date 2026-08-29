import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import initialize_database
from .routes.execute import router as execute_router
from .routes.explain import router as explain_router
from .routes.fix import router as fix_router
from .routes.schema import router as schema_router
from .routes.suggest import router as suggest_router


app = FastAPI(
    title="AI DBMS Virtual Mentor API",
    description="Controlled SQLite query execution for the DBMS learning workspace.",
    version="0.1.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.include_router(execute_router)
app.include_router(explain_router)
app.include_router(suggest_router)
app.include_router(fix_router)
app.include_router(schema_router)


@app.on_event("startup")
def prepare_database() -> None:
    initialize_database()


@app.get("/api/health", tags=["System"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "database": "CollegeDB"}
