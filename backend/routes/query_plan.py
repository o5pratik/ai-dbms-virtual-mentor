import sqlite3

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..models import QueryRequest
from ..sql_executor import QueryRejectedError, explain_read_only_query


router = APIRouter(prefix="/api", tags=["SQL"])


@router.post("/query-plan")
def query_plan(request: QueryRequest) -> dict | JSONResponse:
    try:
        return explain_read_only_query(request.query)
    except (sqlite3.Error, QueryRejectedError) as error:
        return JSONResponse(status_code=400, content={"error": str(error)})
