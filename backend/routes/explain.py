from fastapi import APIRouter

from ..ai_tutor import explain_query
from ..models import ExplainRequest


router = APIRouter(prefix="/api", tags=["AI Tutor"])


@router.post("/explain")
def explain_sql(request: ExplainRequest) -> dict:
    return explain_query(request.query, request.result_summary)
