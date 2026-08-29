import sqlite3

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..models import QueryRequest, QueryResponse
from ..productivity_store import record_history
from ..sql_executor import QueryRejectedError, execute_read_only_query


router = APIRouter(prefix="/api", tags=["SQL"])


@router.post("/execute", response_model=QueryResponse)
def execute_sql(request: QueryRequest) -> QueryResponse | JSONResponse:
    try:
        result = execute_read_only_query(request.query)
        record_history(request.query, True, len(result.rows), result.execution_time)
        return QueryResponse(
            success=True,
            columns=result.columns,
            rows=result.rows,
            row_count=len(result.rows),
            execution_time=result.execution_time,
        )
    except (sqlite3.Error, QueryRejectedError) as error:
        record_history(request.query, False, 0, 0, str(error))
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "execution_time": 0,
                "error": str(error),
            },
        )
