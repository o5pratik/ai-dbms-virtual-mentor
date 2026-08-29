from fastapi import APIRouter

from ..ai_tutor import suggest_query
from ..models import SuggestRequest


router = APIRouter(prefix="/api", tags=["AI Tutor"])


@router.post("/suggest")
def suggest_sql(request: SuggestRequest) -> dict:
    return suggest_query(request.current_sql, request.instruction)
