from fastapi import APIRouter

from ..models import QueryRequest
from ..query_analyzer import analyze_sql


router = APIRouter(prefix="/api", tags=["Query analysis"])


@router.post("/analyze-query")
def analyze_query(payload: QueryRequest) -> dict:
    return analyze_sql(payload.query)
